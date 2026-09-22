import { deviceService } from './DeviceService';
import { HikvisionEvents } from '../hikvision/HikvisionEvents';
import { prisma } from '../db';
import { logger } from '../utils/logger';

export interface SyncResult {
  success: boolean;
  syncType: 'USERS' | 'EVENTS' | 'FULL';
  usersProcessed: number;
  eventsProcessed: number;
  durationMs: number;
  error?: string;
}

import { config } from '../config';

export class SyncService {
  private eventsIsapi: HikvisionEvents;
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private isAutoSyncing = false;

  constructor() {
    this.eventsIsapi = new HikvisionEvents(deviceService.getClient());
  }

  public startAutoSync(intervalSec = config.AUTO_SYNC_INTERVAL_SEC): void {
    if (intervalSec <= 0 || this.autoSyncTimer) return;
    logger.info(`Starting automatic background event sync every ${intervalSec}s...`);

    this.autoSyncTimer = setInterval(async () => {
      if (this.isAutoSyncing) return;
      this.isAutoSyncing = true;
      try {
        const result = await this.syncEvents();
        if (result.count > 0) {
          logger.info(`Auto-sync captured ${result.count} new event(s) from terminal.`);
        }
      } catch (err: any) {
        logger.debug('Auto-sync background check error:', { error: err.message });
      } finally {
        this.isAutoSyncing = false;
      }
    }, intervalSec * 1000);
  }

  public stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  /**
   * Synchronize all users from Hikvision terminal into PostgreSQL
   */
  public async syncUsers(): Promise<{ count: number; durationMs: number }> {
    const startTime = Date.now();
    const device = await deviceService.getOrCreateDefaultDevice();
    const usersIsapi = deviceService.getUsersIsapi();

    // Create sync state record
    let syncState: any = null;
    try {
      syncState = await prisma.syncState.create({
        data: {
          deviceId: device.id,
          syncType: 'USERS',
          status: 'IN_PROGRESS',
        },
      });
    } catch (e: any) {
      logger.debug('SyncState record creation bypassed', { error: e.message });
    }

    try {
      logger.info('Starting user synchronization from Hikvision device...');
      const terminalUsers = await usersIsapi.fetchAllUsers(30);

      let processedCount = 0;
      for (const u of terminalUsers) {
        if (!u.employeeNo) continue;

        const validObj = (u.Valid as any) || {};
        const isBlacklisted = u.userType === 'blackList';
        const isEnabled = !isBlacklisted && validObj.enable !== false;
        const validFrom = validObj.beginTime ? new Date(validObj.beginTime) : null;
        const validTo = validObj.endTime ? new Date(validObj.endTime) : null;

        await prisma.user.upsert({
          where: {
            deviceId_employeeNo: {
              deviceId: device.id,
              employeeNo: u.employeeNo,
            },
          },
          update: {
            name: u.name || 'Unnamed',
            userType: u.userType || 'normal',
            enabled: isEnabled,
            numOfFP: Number(u.numOfFP ?? 0),
            numOfFace: Number(u.numOfFace ?? 0),
            numOfCard: Number(u.numOfCard ?? 0),
            validFrom,
            validTo,
            gender: u.gender || null,
            groupId: u.groupId ? Number(u.groupId) : 1,
            terminalSyncStatus: 'SYNCED',
            lastTerminalSyncAt: new Date(),
            updatedAt: new Date(),
          },
          create: {
            deviceId: device.id,
            employeeNo: u.employeeNo,
            name: u.name || 'Unnamed',
            userType: u.userType || 'normal',
            enabled: isEnabled,
            numOfFP: Number(u.numOfFP ?? 0),
            numOfFace: Number(u.numOfFace ?? 0),
            numOfCard: Number(u.numOfCard ?? 0),
            validFrom,
            validTo,
            gender: u.gender || null,
            groupId: u.groupId ? Number(u.groupId) : 1,
            terminalSyncStatus: 'SYNCED',
            lastTerminalSyncAt: new Date(),
          },
        });
        processedCount++;
      }

      const durationMs = Date.now() - startTime;

      if (syncState) {
        await prisma.syncState.update({
          where: { id: syncState.id },
          data: {
            status: 'SUCCESS',
            itemsProcessed: processedCount,
            completedAt: new Date(),
          },
        });
      }

      await prisma.device.update({
        where: { id: device.id },
        data: { lastSyncAt: new Date() },
      });

      logger.info(`User sync completed successfully: ${processedCount} users processed in ${durationMs}ms`);
      return { count: processedCount, durationMs };
    } catch (error: any) {
      logger.error('User sync failed', { error: error.message });
      if (syncState) {
        await prisma.syncState.update({
          where: { id: syncState.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
            completedAt: new Date(),
          },
        });
      }
      throw error;
    }
  }

  /**
   * Synchronize attendance/access events from Hikvision terminal into PostgreSQL
   */
  public async syncEvents(options: {
    startTime?: string;
    endTime?: string;
    major?: number;
    minor?: number;
  } = {}): Promise<{ count: number; durationMs: number }> {
    const startTime = Date.now();
    const device = await deviceService.getOrCreateDefaultDevice();

    let syncState: any = null;
    try {
      syncState = await prisma.syncState.create({
        data: {
          deviceId: device.id,
          syncType: 'EVENTS',
          status: 'IN_PROGRESS',
        },
      });
    } catch (e: any) {
      logger.debug('SyncState record creation bypassed', { error: e.message });
    }

    try {
      logger.info('Starting attendance event synchronization from Hikvision device...', options);

      const events = await this.eventsIsapi.fetchAllEvents({
        startTime: options.startTime,
        endTime: options.endTime,
        major: options.major ?? 0,
        minor: options.minor ?? 0,
        maxResults: 30,
      });

      let storedCount = 0;
      for (const ev of events) {
        const eventTime = ev.time ? new Date(ev.time) : new Date();
        const serialNo = ev.serialNo !== undefined ? Number(ev.serialNo) : 0;
        const employeeNo = ev.employeeNoString || null;

        // Upsert or find existing to ensure duplicate prevention
        const existing = await prisma.attendanceEvent.findFirst({
          where: {
            deviceId: device.id,
            serialNo: serialNo,
            eventTime: eventTime,
            employeeNo: employeeNo,
          },
        });

        if (!existing) {
          await prisma.attendanceEvent.create({
            data: {
              deviceId: device.id,
              employeeNo: employeeNo,
              employeeName: ev.name || null,
              eventTime: eventTime,
              major: Number(ev.major),
              minor: Number(ev.minor),
              verificationMode: ev.currentVerifyMode || null,
              doorNo: ev.doorNo !== undefined ? Number(ev.doorNo) : null,
              cardReaderNo: ev.cardReaderNo !== undefined ? Number(ev.cardReaderNo) : null,
              serialNo: serialNo,
              rawEvent: typeof ev === 'string' ? ev : JSON.stringify(ev),
            },
          });
          storedCount++;
        }
      }

      const durationMs = Date.now() - startTime;

      if (syncState) {
        await prisma.syncState.update({
          where: { id: syncState.id },
          data: {
            status: 'SUCCESS',
            itemsProcessed: storedCount,
            completedAt: new Date(),
          },
        });
      }

      await prisma.device.update({
        where: { id: device.id },
        data: { lastSyncAt: new Date() },
      });

      logger.info(`Event sync completed successfully: ${storedCount} new events stored in ${durationMs}ms`);
      return { count: storedCount, durationMs };
    } catch (error: any) {
      logger.error('Event sync failed', { error: error.message });
      if (syncState) {
        await prisma.syncState.update({
          where: { id: syncState.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
            completedAt: new Date(),
          },
        });
      }
      throw error;
    }
  }

  /**
   * Run full synchronization (Users then Events)
   */
  public async syncAll(): Promise<SyncResult> {
    const startTime = Date.now();
    try {
      const userSync = await this.syncUsers();
      const eventSync = await this.syncEvents();

      return {
        success: true,
        syncType: 'FULL',
        usersProcessed: userSync.count,
        eventsProcessed: eventSync.count,
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        syncType: 'FULL',
        usersProcessed: 0,
        eventsProcessed: 0,
        durationMs: Date.now() - startTime,
        error: error.message || 'Sync operation failed',
      };
    }
  }
}

export const syncService = new SyncService();
