import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { prisma } from '../src/db';

vi.mock('../src/db', () => ({
  prisma: {
    device: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    attendanceEvent: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
  checkDatabaseConnection: vi.fn().mockResolvedValue(true),
}));

vi.mock('../src/hikvision/HikvisionClient', () => {
  return {
    HikvisionClient: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      request: vi.fn().mockResolvedValue({}),
    })),
  };
});

vi.mock('../src/hikvision/HikvisionUsers', () => {
  return {
    formatHikvisionDateTime: vi.fn().mockReturnValue('2026-09-22T00:00:00'),
    HikvisionUsers: vi.fn().mockImplementation(() => ({
      createTerminalUser: vi.fn().mockResolvedValue({ status: 'OK' }),
      updateUserValidity: vi.fn().mockResolvedValue({ status: 'OK' }),
      deleteTerminalUser: vi.fn().mockResolvedValue({ status: 'OK' }),
      getUserCount: vi.fn().mockResolvedValue({ userNumber: 3, bindFingerprintUserNumber: 2, bindFaceUserNumber: 1, bindCardUserNumber: 0 }),
      searchUsers: vi.fn().mockResolvedValue({ users: [], totalMatches: 0 }),
      fetchAllUsers: vi.fn().mockResolvedValue([]),
      captureFingerprint: vi.fn().mockResolvedValue({ fingerData: 'mock', fingerPrintQuality: 90, fingerNo: 1 }),
      setupFingerprint: vi.fn().mockResolvedValue({ status: 'OK' }),
      getUserFingerprints: vi.fn().mockResolvedValue([]),
    })),
  };
});

describe('User Management API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.device.findFirst as any).mockResolvedValue({
      id: 'mock-device-id',
      name: 'Hikvision DS-K1T320MFWX',
    });
  });

  it('POST /api/users successfully registers a new employee', async () => {
    (prisma.user.findFirst as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({
      id: 'usr-1',
      employeeNo: '201',
      name: 'John Doe',
      userType: 'normal',
      enabled: true,
      gender: 'male',
      groupId: 1,
      numOfCard: 1,
      device: { name: 'Hikvision DS-K1T320MFWX' },
    });

    const res = await request(app)
      .post('/api/users')
      .send({
        employeeNo: '201',
        name: 'John Doe',
        userType: 'normal',
        enabled: true,
        gender: 'male',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employeeNo).toBe('201');
    expect(res.body.data.name).toBe('John Doe');
  });

  it('PUT /api/users/:employeeNo successfully updates employee profile', async () => {
    (prisma.user.findFirst as any).mockResolvedValue({
      id: 'usr-1',
      employeeNo: '201',
      name: 'John Doe',
    });
    (prisma.user.update as any).mockResolvedValue({
      id: 'usr-1',
      employeeNo: '201',
      name: 'Johnathan Doe',
    });

    const res = await request(app)
      .put('/api/users/201')
      .send({ name: 'Johnathan Doe' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Johnathan Doe');
  });

  it('DELETE /api/users/:employeeNo successfully deletes employee', async () => {
    (prisma.user.findFirst as any).mockResolvedValue({
      id: 'usr-1',
      employeeNo: '201',
    });
    (prisma.user.delete as any).mockResolvedValue({});

    const res = await request(app).delete('/api/users/201');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deletedEmployeeNo).toBe('201');
  });

  it('POST /api/users/:employeeNo/access-period updates validity and syncs to terminal', async () => {
    (prisma.user.findFirst as any).mockResolvedValue({
      id: 'usr-1',
      employeeNo: '201',
      name: 'John Doe',
      enabled: true,
    });
    (prisma.user.update as any).mockResolvedValue({
      id: 'usr-1',
      employeeNo: '201',
      name: 'John Doe',
      validFrom: new Date('2026-09-22T00:00:00Z'),
      validTo: new Date('2027-09-22T23:59:59Z'),
      enabled: true,
      device: { name: 'Hikvision DS-K1T320MFWX' },
    });

    const res = await request(app)
      .post('/api/users/201/access-period')
      .send({
        validFrom: '2026-09-22',
        validTo: '2027-09-22',
        enabled: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Access period configured');
  });
});
