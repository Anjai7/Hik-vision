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
