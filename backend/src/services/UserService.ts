import { prisma } from '../db';
import { deviceService } from './DeviceService';
import { HikvisionError, HikvisionClient } from '../hikvision';
import { HikvisionUsers, formatHikvisionDateTime } from '../hikvision/HikvisionUsers';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  hasFP?: boolean;
  hasFace?: boolean;
  hasCard?: boolean;
}

export class UserService {
  public async getUsers(params: GetUsersQuery) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { employeeNo: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.hasFP !== undefined) {
      where.numOfFP = params.hasFP ? { gt: 0 } : 0;
    }
    if (params.hasFace !== undefined) {
      where.numOfFace = params.hasFace ? { gt: 0 } : 0;
    }
    if (params.hasCard !== undefined) {
      where.numOfCard = params.hasCard ? { gt: 0 } : 0;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { employeeNo: 'asc' },
        include: {
          device: {
            select: {
              name: true,
              model: true,
            },
          },
        },
      }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async getUserByEmployeeNo(employeeNo: string) {
    const user = await prisma.user.findFirst({
      where: { employeeNo },
      include: {
        device: {
          select: {
            name: true,
            model: true,
          },
        },
      },
    });

    return user;
  }

  public async createUser(data: {
    employeeNo: string;
    name: string;
    userType?: string;
    enabled?: boolean;
    gender?: string | null;
    groupId?: number | null;
    numOfCard?: number;
    validFrom?: string | Date | null;
    validTo?: string | Date | null;
  }) {
    const device = await deviceService.getOrCreateDefaultDevice();
    const existing = await prisma.user.findFirst({
      where: {
        deviceId: device.id,
        employeeNo: data.employeeNo.trim(),
      },
    });

    if (existing) {
      const err: any = new Error(`Employee with ID '${data.employeeNo}' already exists`);
      err.statusCode = 409;
      err.code = 'USER_ALREADY_EXISTS';
      throw err;
    }

    const newUser = await prisma.user.create({
      data: {
        deviceId: device.id,
        employeeNo: data.employeeNo.trim(),
        name: data.name.trim(),
        userType: data.userType || 'normal',
        enabled: data.enabled !== undefined ? data.enabled : true,
        gender: data.gender || null,
        groupId: data.groupId ? Number(data.groupId) : 1,
        numOfCard: data.numOfCard ? Number(data.numOfCard) : 0,
        validFrom: data.validFrom ? new Date(data.validFrom) : new Date('2020-01-01T00:00:00Z'),
        validTo: data.validTo ? new Date(data.validTo) : new Date('2035-12-31T23:59:59Z'),
        terminalSyncStatus: 'PENDING',
      },
      include: {
        device: {
          select: { name: true, model: true },
        },
      },
    });

    // Attempt direct provision on physical Hikvision terminal
    try {
      const client = new HikvisionClient({
        host: config.HIKVISION_HOST,
        username: config.HIKVISION_USERNAME,
        password: config.HIKVISION_PASSWORD,
        verifyTls: config.HIKVISION_VERIFY_TLS,
        timeoutMs: config.HIKVISION_TIMEOUT,
      });
      const hikUsers = new HikvisionUsers(client);
      const beginTime = formatHikvisionDateTime(newUser.validFrom, '2020-01-01T00:00:00');
      const endTime = formatHikvisionDateTime(newUser.validTo, '2035-12-31T23:59:59');
      await hikUsers.createTerminalUser({
        employeeNo: newUser.employeeNo,
        name: newUser.name,
        userType: newUser.userType,
        validFrom: beginTime,
        validTo: endTime,
      });
      await prisma.user.update({
        where: { id: newUser.id },
        data: {
          terminalSyncStatus: 'SYNCED',
          lastTerminalSyncAt: new Date(),
        },
      });
      logger.info(`[UserService] Created user ${newUser.employeeNo} (${newUser.name}) directly on physical terminal.`);
    } catch (pushErr: any) {
      logger.warn(`[UserService] Terminal direct provision failed: ${pushErr.message}. User saved as PENDING for background sync agent.`);
    }

    return newUser;
  }

  public async updateUser(
    employeeNo: string,
    data: {
      name?: string;
      userType?: string;
      enabled?: boolean;
      gender?: string | null;
      groupId?: number | null;
      validFrom?: string | Date | null;
      validTo?: string | Date | null;
    }
  ) {
    const existing = await prisma.user.findFirst({
      where: { employeeNo },
    });

    if (!existing) {
      const err: any = new Error(`Employee '${employeeNo}' not found`);
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        userType: data.userType !== undefined ? data.userType : undefined,
        enabled: data.enabled !== undefined ? data.enabled : undefined,
        gender: data.gender !== undefined ? data.gender : undefined,
        groupId: data.groupId !== undefined ? Number(data.groupId) : undefined,
        validFrom: data.validFrom !== undefined ? (data.validFrom ? new Date(data.validFrom) : null) : undefined,
        validTo: data.validTo !== undefined ? (data.validTo ? new Date(data.validTo) : null) : undefined,
        terminalSyncStatus: 'PENDING',
      },
      include: {
        device: {
          select: { name: true, model: true },
        },
      },
    });

    // Attempt direct update on physical Hikvision terminal
    let terminalSyncError: string | null = null;
    try {
      const client = new HikvisionClient({
        host: config.HIKVISION_HOST,
        username: config.HIKVISION_USERNAME,
        password: config.HIKVISION_PASSWORD,
        verifyTls: config.HIKVISION_VERIFY_TLS,
        timeoutMs: config.HIKVISION_TIMEOUT,
      });
      const hikUsers = new HikvisionUsers(client);
      const isExpired = updated.enabled === false || (updated.validTo && new Date(updated.validTo) < new Date());
      const beginTime = isExpired
        ? '2020-01-01T00:00:00'
        : formatHikvisionDateTime(updated.validFrom, '2020-01-01T00:00:00');
      const endTime = isExpired
        ? '2020-01-02T00:00:00'
        : formatHikvisionDateTime(updated.validTo, '2035-12-31T23:59:59');

      await hikUsers.updateUserValidity(updated.employeeNo, {
        beginTime,
        endTime,
        enable: updated.enabled,
        name: updated.name,
        userType: updated.userType,
      });

      await prisma.user.update({
        where: { id: updated.id },
        data: {
          terminalSyncStatus: 'SYNCED',
          lastTerminalSyncAt: new Date(),
        },
      });
      logger.info(`[UserService] Updated user ${updated.employeeNo} (${updated.name}) on physical terminal.`);
    } catch (pushErr: any) {
      terminalSyncError = pushErr.message || 'Terminal connection failed';
      logger.warn(`[UserService] Terminal direct update failed: ${terminalSyncError}. Marked PENDING for sync agent.`);
    }

    return {
      ...updated,
      terminalSync: {
        success: !terminalSyncError,
        error: terminalSyncError,
      },
    };
  }

  public async deleteUser(employeeNo: string) {
    const existing = await prisma.user.findFirst({
      where: { employeeNo },
    });

    if (!existing) {
      const err: any = new Error(`Employee '${employeeNo}' not found`);
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    // Attempt direct delete from physical Hikvision terminal
    try {
      const client = new HikvisionClient({
        host: config.HIKVISION_HOST,
        username: config.HIKVISION_USERNAME,
        password: config.HIKVISION_PASSWORD,
        verifyTls: config.HIKVISION_VERIFY_TLS,
        timeoutMs: config.HIKVISION_TIMEOUT,
      });
      const hikUsers = new HikvisionUsers(client);
      await hikUsers.deleteTerminalUser(employeeNo);
      logger.info(`[UserService] Deleted user ${employeeNo} directly from physical terminal.`);
    } catch (delErr: any) {
      logger.warn(`[UserService] Could not delete user from terminal: ${delErr.message}`);
    }

    await prisma.user.delete({
      where: { id: existing.id },
    });

    return { success: true, deletedEmployeeNo: employeeNo };
  }

  public async setAccessPeriod(
    employeeNo: string,
    data: {
      validFrom: string | Date;
      validTo: string | Date;
      enabled?: boolean;
    }
  ) {
    const enabled = data.enabled !== undefined ? data.enabled : true;
    return this.updateUser(employeeNo, {
      validFrom: data.validFrom,
      validTo: data.validTo,
      enabled,
      userType: enabled ? 'normal' : 'blackList',
    });
  }

  public async toggleUserStatus(employeeNo: string, enabled: boolean) {
    // When disabling, set validTo to yesterday and userType to blackList (strictly blocks on terminal)
    // When enabling, extend validTo to 2035 and set userType to normal
    const validTo = enabled ? new Date('2035-12-31T23:59:59Z') : new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.updateUser(employeeNo, {
      enabled,
      validTo,
      userType: enabled ? 'normal' : 'blackList',
    });
  }

  public async expireUser(employeeNo: string) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.updateUser(employeeNo, {
      enabled: false,
      validTo: yesterday,
      userType: 'blackList',
    });
  }

  public async grantAccess(employeeNo: string, years = 1) {
    const now = new Date();
    const future = new Date();
    future.setFullYear(future.getFullYear() + years);
    return this.updateUser(employeeNo, {
      enabled: true,
      validFrom: now,
      validTo: future,
      userType: 'normal',
    });
  }

  public async markUserSynced(employeeNo: string) {
    const existing = await prisma.user.findFirst({ where: { employeeNo } });
    if (!existing) return null;

    return prisma.user.update({
      where: { id: existing.id },
      data: {
        terminalSyncStatus: 'SYNCED',
        lastTerminalSyncAt: new Date(),
      },
    });
  }

  public async getPendingSyncUsers() {
    return prisma.user.findMany({
      where: { terminalSyncStatus: 'PENDING' },
      include: { device: true },
    });
  }
}

export const userService = new UserService();
