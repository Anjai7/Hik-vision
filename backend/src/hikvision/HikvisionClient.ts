import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { HikvisionAuth } from './HikvisionAuth';
import { HikvisionConfig, HikvisionError } from './types';

interface InternalRequestOptions {
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  retryCount?: number;
}

interface HttpResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  data: string;
}

export class HikvisionClient {
  private config: HikvisionConfig;
  private auth: HikvisionAuth;
  private httpsAgent: https.Agent;
  private httpAgent: http.Agent;

  constructor(config: HikvisionConfig) {
    this.config = {
      host: config.host.replace(/\/+$/, ''),
      username: config.username,
      password: config.password || '',
      verifyTls: config.verifyTls ?? false,
      timeoutMs: config.timeoutMs ?? 10000,
    };
    this.auth = new HikvisionAuth();
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: this.config.verifyTls,
      keepAlive: false,
    });
    this.httpAgent = new http.Agent({
      keepAlive: false,
    });
  }

  public updateConfig(partialConfig: Partial<HikvisionConfig>): void {
    this.config = {
      ...this.config,
      ...partialConfig,
      host: partialConfig.host ? partialConfig.host.replace(/\/+$/, '') : this.config.host,
    };
    if (partialConfig.verifyTls !== undefined) {
      this.httpsAgent = new https.Agent({
        rejectUnauthorized: this.config.verifyTls,
        keepAlive: true,
      });
    }
    this.auth.resetChallenge();
  }

  public getConfig(): Omit<HikvisionConfig, 'password'> {
    const { password: _, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Raw HTTP request handler using Node https/http module
   */
  private executeRequest(
    targetUrl: URL,
    method: string,
    headers: Record<string, string>,
    bodyStr?: string,
    timeoutMs?: number
  ): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const isHttps = targetUrl.protocol === 'https:';
      const transport = isHttps ? https : http;
      const agent = isHttps ? this.httpsAgent : this.httpAgent;
      const effectiveTimeout = timeoutMs ?? this.config.timeoutMs;

      const options: https.RequestOptions = {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method,
        headers,
        agent,
        timeout: effectiveTimeout,
      };

      const req = transport.request(options, (res) => {
        let responseData = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 500,
            headers: res.headers,
            data: responseData,
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(
          new HikvisionError(
            `Request timed out after ${this.config.timeoutMs}ms`,
            'TIMEOUT_ERROR',
            408
          )
        );
      });

      req.on('error', (err: any) => {
        reject(
          new HikvisionError(
            `Network error communicating with Hikvision device: ${err.message || 'Unknown error'}`,
            'NETWORK_ERROR',
            502,
            { code: err.code }
          )
        );
      });

      if (bodyStr) {
        req.write(bodyStr);
      }
      req.end();
    });
  }

  /**
   * Main request method supporting automatic Digest Authentication negotiation and retry
   */
  public async request<T = any>(
    method: string,
    endpointPath: string,
    body?: unknown,
    retryCount = 0,
    options?: { timeoutMs?: number; headers?: Record<string, string> }
  ): Promise<T> {
    const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
    const targetUrl = new URL(`${this.config.host}${cleanPath}`);
    const uri = `${targetUrl.pathname}${targetUrl.search}`;

    const headers: Record<string, string> = {
      Accept: 'application/json, text/xml, application/xml, text/plain, */*',
      ...(options?.headers || {}),
    };

    let bodyStr: string | undefined;
    if (body !== undefined && body !== null) {
      bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] =
          typeof body === 'string' && body.trim().startsWith('<')
            ? 'application/xml; charset=UTF-8'
            : 'application/json';
      }
      headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
    }

    // If we have a cached challenge, preemptively attach Authorization header
    if (this.auth.getChallenge()) {
      try {
        const authHeader = this.auth.generateAuthorizationHeader(
          method,
          uri,
          this.config.username,
          this.config.password || ''
        );
        headers['Authorization'] = authHeader;
      } catch (e) {
        // Fall back to unauthenticated initial request
        this.auth.resetChallenge();
      }
    }

    const response = await this.executeRequest(targetUrl, method, headers, bodyStr, options?.timeoutMs);

    // Handle 401 Unauthorized -> Perform Digest Authentication
    if (response.statusCode === 401) {
      if (retryCount >= 2) {
        throw new HikvisionError(
          'Authentication failed with Hikvision device (invalid username or password)',
          'AUTHENTICATION_FAILED',
          401
        );
      }

      const authHeader = response.headers['www-authenticate'] || response.headers['WWW-Authenticate'];
      const challengeStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;

      if (!challengeStr) {
        throw new HikvisionError(
          'Device returned 401 without WWW-Authenticate header',
          'INVALID_AUTH_CHALLENGE',
          401
        );
      }

      const challenge = this.auth.parseChallenge(challengeStr);
      if (!challenge) {
        throw new HikvisionError(
          'Could not parse Digest challenge from WWW-Authenticate header',
          'MALFORMED_AUTH_CHALLENGE',
          401
        );
      }

      // Retry request with newly computed Digest header
      return this.request<T>(method, endpointPath, body, retryCount + 1, options);
    }

    // Non-success status code handling
    if (response.statusCode < 200 || response.statusCode >= 300) {
      let errorDetails: unknown = response.data;
      try {
        errorDetails = JSON.parse(response.data);
      } catch {
        // keep text
      }
      throw new HikvisionError(
        `Hikvision ISAPI returned error status ${response.statusCode}`,
        'ISAPI_ERROR',
        response.statusCode,
        errorDetails
      );
    }

    // Parse JSON response
    try {
      if (!response.data || response.data.trim() === '') {
        return {} as T;
      }
      return JSON.parse(response.data) as T;
    } catch (parseError: any) {
      // If response is XML or text, return as object or raw
      return response.data as unknown as T;
    }
  }

  public async get<T = any>(
    path: string,
    options?: { timeoutMs?: number; headers?: Record<string, string> }
  ): Promise<T> {
    return this.request<T>('GET', path, undefined, 0, options);
  }

  public async post<T = any>(
    path: string,
    body?: unknown,
    options?: { timeoutMs?: number; headers?: Record<string, string> }
  ): Promise<T> {
    return this.request<T>('POST', path, body, 0, options);
  }

  public async put<T = any>(
    path: string,
    body?: unknown,
    options?: { timeoutMs?: number; headers?: Record<string, string> }
  ): Promise<T> {
    return this.request<T>('PUT', path, body, 0, options);
  }

  public async delete<T = any>(
    path: string,
    options?: { timeoutMs?: number; headers?: Record<string, string> }
  ): Promise<T> {
    return this.request<T>('DELETE', path, undefined, 0, options);
  }
}
