import { HikvisionClient, HikvisionDevice, HikvisionUsers, ParsedDeviceInfo } from '../hikvision';
import { prisma } from '../db';
import { config } from '../config';
import { logger } from '../utils/logger';

export class DeviceService {
  private client: HikvisionClient;
  private deviceIsapi: HikvisionDevice;
  private usersIsapi: HikvisionUsers;

  constructor() {
    this.client = new HikvisionClient({
      host: config.HIKVISION_HOST,
      username: config.HIKVISION_USERNAME,
      password: config.HIKVISION_PASSWORD,
      verifyTls: config.HIKVISION_VERIFY_TLS,
      timeoutMs: config.HIKVISION_TIMEOUT,
    });
    this.deviceIsapi = new HikvisionDevice(this.client);
    this.usersIsapi = new HikvisionUsers(this.client);
  }

  public getClient(): HikvisionClient {
    return this.client;
  }

  public getDeviceIsapi(): HikvisionDevice {
    return this.deviceIsapi;
  }

  public getUsersIsapi(): HikvisionUsers {
    return this.usersIsapi;
  }

  /**
   * Find or create the primary device in the database matching current configuration
   */
  public async getOrCreateDefaultDevice() {
    try {
      let device = await prisma.device.findFirst({
        where: { host: config.HIKVISION_HOST },
      });

      if (!device) {
        device = await prisma.device.create({
          data: {
            name: 'Hikvision DS-K1T320MFWX',
            host: config.HIKVISION_HOST,
            username: config.HIKVISION_USERNAME,
            model: 'DS-K1T320MFWX',
            firmware: 'V3.5.2',
            enabled: true,
          },
        });
      }

      return device;
    } catch (error: any) {
      logger.warn('Could not query/create device in database', { error: error.message });
      // Return transient fallback device object if database is currently offline
      return {
        id: 'default-terminal',
        name: 'Hikvision DS-K1T320MFWX',
        host: config.HIKVISION_HOST,
        username: config.HIKVISION_USERNAME,
        model: 'DS-K1T320MFWX',
        firmware: 'V3.5.2',
        serialNo: null,
        enabled: true,
        lastSeenAt: null,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Test live ISAPI connectivity and return hardware details
   */
  public async testConnection(): Promise<{
    online: boolean;
    latencyMs: number;
    deviceInfo?: ParsedDeviceInfo;
    userCounts?: {
      userNumber: number;
      bindFingerprintUserNumber: number;
      bindFaceUserNumber: number;
      bindCardUserNumber: number;
    };
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const [deviceInfo, userCounts] = await Promise.all([
        this.deviceIsapi.getDeviceInfo(),
        this.usersIsapi.getUserCount().catch(() => undefined),
      ]);

      const latencyMs = Date.now() - startTime;

      // Update lastSeenAt and serial/firmware in database if reachable
      try {
        await prisma.device.updateMany({
          where: { host: config.HIKVISION_HOST },
          data: {
            model: deviceInfo.model,
            firmware: deviceInfo.firmwareVersion,
            serialNo: deviceInfo.serialNumber,
            lastSeenAt: new Date(),
          },
        });
      } catch (dbError: any) {
        logger.debug('Skipping DB device update during testConnection', { error: dbError.message });
      }

      return {
        online: true,
        latencyMs,
        deviceInfo,
        userCounts: userCounts
          ? {
              userNumber: userCounts.userNumber,
              bindFingerprintUserNumber: userCounts.bindFingerprintUserNumber,
              bindFaceUserNumber: userCounts.bindFaceUserNumber,
              bindCardUserNumber: userCounts.bindCardUserNumber,
            }
          : undefined,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      logger.error('Device connection test failed', { error: error.message });
      return {
        online: false,
        latencyMs,
        error: error.message || 'Failed to connect to Hikvision terminal',
      };
    }
  }
}

export const deviceService = new DeviceService();
