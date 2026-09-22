import { prisma } from '../db';
import { deviceService } from './DeviceService';
import { HikvisionError } from '../hikvision';

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
      },
      include: {
        device: {
          select: { name: true, model: true },
        },
      },
    });

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
      },
      include: {
        device: {
          select: { name: true, model: true },
        },
      },
    });

    return updated;
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

    await prisma.user.delete({
      where: { id: existing.id },
    });

    return { success: true, deletedEmployeeNo: employeeNo };
  }

  public async toggleUserStatus(employeeNo: string, enabled: boolean) {
    return this.updateUser(employeeNo, { enabled });
  }
}

export const userService = new UserService();
