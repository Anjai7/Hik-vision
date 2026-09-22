import { HikvisionClient } from './HikvisionClient';
import { UserCountResponse, UserInfo, UserInfoSearchResponse, HikvisionError } from './types';

export interface UserCountResult {
  userNumber: number;
  bindFingerprintUserNumber: number;
  bindFaceUserNumber: number;
  bindCardUserNumber: number;
  raw: unknown;
}

export interface SearchUsersOptions {
  position?: number;
  maxResults?: number;
  employeeNo?: string;
  searchId?: string;
}

export interface UserSearchResult {
  searchId: string;
  totalMatches: number;
  numOfMatches: number;
  users: UserInfo[];
  raw: unknown;
}

export function formatHikvisionDateTime(date: Date | string | null | undefined, fallback: string): string {
  if (!date) return fallback;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return fallback;
  const pad = (n: number) => String(n).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}`;
}

export class HikvisionUsers {
  constructor(private client: HikvisionClient) {}

  /**
   * Fetch total user and biometric enrollment counts
   */
  public async getUserCount(): Promise<UserCountResult> {
    const raw = await this.client.get<any>('/ISAPI/AccessControl/UserInfo/Count?format=json');
    const data = raw.UserInfoCount || raw;

    return {
      userNumber: Number(data.userNumber ?? 0),
      bindFingerprintUserNumber: Number(data.bindFingerprintUserNumber ?? 0),
      bindFaceUserNumber: Number(data.bindFaceUserNumber ?? 0),
      bindCardUserNumber: Number(data.bindCardUserNumber ?? 0),
      raw,
    };
  }

  /**
   * Search users with pagination parameters (searchResultPosition, maxResults)
   */
  public async searchUsers(options: SearchUsersOptions = {}): Promise<UserSearchResult> {
    const position = options.position ?? 0;
    const maxResults = options.maxResults ?? 30;
    const searchId = options.searchId || '1';

    const searchCond: Record<string, any> = {
      searchID: searchId,
      searchResultPosition: position,
      maxResults: maxResults,
    };

    if (options.employeeNo) {
      searchCond.EmployeeNoList = [{ employeeNo: options.employeeNo }];
    }

    const payload = {
      UserInfoSearchCond: searchCond,
    };

    const raw = await this.client.post<UserInfoSearchResponse>(
      '/ISAPI/AccessControl/UserInfo/Search?format=json',
      payload
    );

    const search = raw.UserInfoSearch || {};
    const users = Array.isArray(search.UserInfo) ? search.UserInfo : [];
    const totalMatches = Number(search.totalMatches ?? users.length);
    const numOfMatches = Number(search.numOfMatches ?? users.length);

    return {
      searchId: search.searchID || searchId,
      totalMatches,
      numOfMatches,
      users,
      raw,
    };
  }

  /**
   * Automatically fetch all users across multiple pages
   */
  public async fetchAllUsers(batchSize = 30): Promise<UserInfo[]> {
    const allUsers: UserInfo[] = [];
    let position = 0;
    let total = Infinity;

    while (position < total) {
      const result = await this.searchUsers({
        position,
        maxResults: batchSize,
      });

      if (!result.users || result.users.length === 0) {
        break;
      }

      allUsers.push(...result.users);
      total = result.totalMatches;
      position += result.users.length;

      if (position >= total) {
        break;
      }
    }

    return allUsers;
  }

  /**
   * Create user directly on the physical Hikvision terminal
   */
  public async createTerminalUser(user: {
    employeeNo: string;
    name: string;
    userType?: string;
    validFrom?: string | Date;
    validTo?: string | Date;
    belongGroup?: number | string;
    doorRight?: string;
  }): Promise<any> {
    const beginTime = formatHikvisionDateTime(user.validFrom, '2020-01-01T00:00:00');
    const endTime = formatHikvisionDateTime(user.validTo, '2035-12-31T23:59:59');
    const payload = {
      UserInfo: {
        employeeNo: user.employeeNo,
        name: user.name,
        userType: user.userType || 'normal',
        closeDelayEnabled: false,
        Valid: {
          enable: true,
          beginTime,
          endTime,
          timeType: 'local',
        },
        belongGroup: user.belongGroup !== undefined && user.belongGroup !== null ? String(user.belongGroup) : '',
        doorRight: user.doorRight || '1',
        RightPlan: [
          {
            doorNo: 1,
            planTemplateNo: '1',
          },
        ],
      },
    };

    try {
      return await this.client.post<any>('/ISAPI/AccessControl/UserInfo/Record?format=json', payload);
    } catch (postErr: any) {
      // If user already exists or Record fails, use SetUp (PUT) which creates or updates
      return await this.client.put<any>('/ISAPI/AccessControl/UserInfo/SetUp?format=json', payload);
    }
  }

  /**
   * Delete user directly from the physical Hikvision terminal
   */
  public async deleteTerminalUser(employeeNo: string): Promise<any> {
    const payload = {
      UserInfoDelCond: {
        EmployeeNoList: [{ employeeNo }],
      },
    };
    return this.client.put<any>('/ISAPI/AccessControl/UserInfo/Delete?format=json', payload);
  }

  /**
   * Update user validity time period on the physical terminal
   * Setting endTime in the past (e.g. yesterday) expires/blocks the user locally on the device!
   */
  public async updateUserValidity(employeeNo: string, options: {
    beginTime?: string | Date; // Format: YYYY-MM-DDTHH:mm:ss
    endTime?: string | Date;   // Format: YYYY-MM-DDTHH:mm:ss
    enable?: boolean;
    name?: string;
    userType?: string;
  }): Promise<any> {
    const beginTime = formatHikvisionDateTime(options.beginTime, '2020-01-01T00:00:00');
    const endTime = formatHikvisionDateTime(options.endTime, '2035-12-31T23:59:59');
    const enable = options.enable !== undefined ? options.enable : true;

    const isBlocked = options.enable === false || options.userType === 'blackList';
    const computedUserType = isBlocked ? 'blackList' : (options.userType || 'normal');

    const payload: any = {
      UserInfo: {
        employeeNo,
        name: options.name || '',
        userType: computedUserType,
        Valid: {
          enable: !isBlocked,
          beginTime,
          endTime,
          timeType: 'local',
        },
        doorRight: '1',
        RightPlan: [{ doorNo: 1, planTemplateNo: '1' }],
        gender: 'male',
        localUIRight: false,
        maxOpenDoorTime: 0,
        userVerifyMode: '',
        groupId: 1,
        userLevel: 'Employee',
        password: '',
      },
    };

    if (!payload.UserInfo.name && !options.name) {
      delete payload.UserInfo.name;
    }

    try {
      return await this.client.put<any>(
        '/ISAPI/AccessControl/UserInfo/Modify?format=json',
        payload
      );
    } catch (modErr) {
      // Fallback to SetUp if Modify fails
      return await this.client.put<any>(
        '/ISAPI/AccessControl/UserInfo/SetUp?format=json',
        payload
      );
    }
  }

  /**
   * Directly block or grant access period on physical Hikvision terminal
   */
  public async setTerminalUserAccess(employeeNo: string, access: {
    enable: boolean;
    validFrom?: string | Date;
    validTo?: string | Date;
    name?: string;
  }): Promise<any> {
    const beginTime = formatHikvisionDateTime(access.validFrom, '2020-01-01T00:00:00');
    // If disabled, set endTime to 2020-01-02 to invalidate on terminal clock
    const endTime = access.enable
      ? formatHikvisionDateTime(access.validTo, '2035-12-31T23:59:59')
      : '2020-01-02T00:00:00';

    return this.updateUserValidity(employeeNo, {
      enable: access.enable,
      beginTime,
      endTime,
      name: access.name,
    });
  }

  /**
   * Trigger physical terminal optical sensor to capture a fingerprint
   * Endpoint: POST /ISAPI/AccessControl/CaptureFingerPrint
   */
  public async captureFingerprint(options: {
    fingerNo?: number;
    timeoutMs?: number;
  } = {}): Promise<{
    fingerData?: string;
    fingerPrintQuality?: number;
    fingerNo: number;
    raw: any;
  }> {
    const fingerNo = options.fingerNo || 1;
    const timeoutMs = options.timeoutMs || 25000;

    const xml = `<CaptureFingerPrintCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
  <fingerNo>${fingerNo}</fingerNo>
</CaptureFingerPrintCond>`;

    try {
      const response = await this.client.post<any>(
        '/ISAPI/AccessControl/CaptureFingerPrint',
        xml,
        { timeoutMs }
      );

      // Parse XML response
      const rawStr = typeof response === 'string' ? response : JSON.stringify(response);
      const dataMatch = rawStr.match(/<fingerData>([^<]+)<\/fingerData>/i);
      const qualMatch = rawStr.match(/<fingerPrintQuality>([^<]+)<\/fingerPrintQuality>/i);

      return {
        fingerData: dataMatch ? dataMatch[1] : undefined,
        fingerPrintQuality: qualMatch ? Number(qualMatch[1]) : undefined,
        fingerNo,
        raw: response,
      };
    } catch (err: any) {
      if (err.statusCode === 408 || err.message?.includes('timed out')) {
        const timeoutError: any = new Error(
          'Sensor timed out. Please place your finger flat and firmly on the terminal scanner.'
        );
        timeoutError.statusCode = 408;
        throw timeoutError;
      }
      if (err.statusCode === 400 && (err.details?.subStatusCode === 'deviceError' || String(err.details).includes('deviceError'))) {
        const devError: any = new Error(
          'Fingerprint capture timed out or no finger detected on sensor. Please try again.'
        );
        devError.statusCode = 408;
        throw devError;
      }
      throw err;
    }
  }

  /**
   * Save/enroll captured fingerprint onto physical Hikvision terminal
   * Endpoint: POST /ISAPI/AccessControl/FingerPrint/SetUp?format=json
   */
  public async setupFingerprint(
    employeeNo: string,
    options: {
      fingerPrintID?: number;
      fingerData: string;
      fingerType?: string;
      cardReaderNo?: number;
    }
  ): Promise<any> {
    const payload = {
      FingerPrintCfg: {
        employeeNo,
        enableCardReader: [options.cardReaderNo || 1],
        fingerPrintID: options.fingerPrintID || 1,
        fingerType: options.fingerType || 'normalFP',
        fingerData: options.fingerData,
      },
    };

    const response = await this.client.post<any>(
      '/ISAPI/AccessControl/FingerPrint/SetUp?format=json',
      payload
    );

    return response;
  }

  /**
   * Retrieve enrolled fingerprints for a user from physical terminal
   * Endpoint: POST /ISAPI/AccessControl/FingerPrintUpload?format=json
   */
  public async getUserFingerprints(employeeNo: string): Promise<Array<{
    cardReaderNo: number;
    fingerPrintID: number;
    fingerType: string;
    fingerData?: string;
  }>> {
    const payload = {
      FingerPrintCond: {
        searchID: '1',
        employeeNo,
      },
    };

    try {
      const response = await this.client.post<any>(
        '/ISAPI/AccessControl/FingerPrintUpload?format=json',
        payload
      );

      const info = response.FingerPrintInfo || response;
      if (info.status === 'NoFP' || !Array.isArray(info.FingerPrintList)) {
        return [];
      }

      return info.FingerPrintList.map((fp: any) => ({
        cardReaderNo: Number(fp.cardReaderNo ?? 1),
        fingerPrintID: Number(fp.fingerPrintID ?? 1),
        fingerType: fp.fingerType || 'normalFP',
        fingerData: fp.fingerData,
      }));
    } catch (err: any) {
      // If terminal returns 404 or NoFP error, return empty list
      return [];
    }
  }

  /**
   * Fetch total enrolled fingerprints count on device
   * Endpoint: GET /ISAPI/AccessControl/FingerPrint/Count?format=json
   */
  public async getFingerprintCount(): Promise<number> {
    try {
      const res = await this.client.get<any>('/ISAPI/AccessControl/FingerPrint/Count?format=json');
      const count = res.FingerPrintCount?.fingerPrintNumber ?? res.fingerPrintNumber ?? 0;
      return Number(count);
    } catch {
      return 0;
    }
  }
}

