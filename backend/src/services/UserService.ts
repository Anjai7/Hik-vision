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

  /**
   * UNVERIFIED MUTATION: Create user
   * Marked unverified as per specification.
   */
  public async createUser(data: any): Promise<never> {
    throw new HikvisionError(
      'User creation directly to terminal is unverified on DS-K1T320MFWX firmware V3.5.2. Biometric and permission endpoints must be validated prior to enabling write operations.',
      'UNVERIFIED_ENDPOINT',
      501
    );
  }

  /**
   * UNVERIFIED MUTATION: Update user
   */
  public async updateUser(employeeNo: string, data: any): Promise<never> {
    throw new HikvisionError(
      `User update for employeeNo ${employeeNo} is unverified on DS-K1T320MFWX firmware V3.5.2.`,
      'UNVERIFIED_ENDPOINT',
      501
    );
  }

  /**
   * UNVERIFIED MUTATION: Delete user
   */
  public async deleteUser(employeeNo: string): Promise<never> {
    throw new HikvisionError(
      `User deletion for employeeNo ${employeeNo} is unverified on DS-K1T320MFWX firmware V3.5.2.`,
      'UNVERIFIED_ENDPOINT',
      501
    );
  }
}

export const userService = new UserService();
