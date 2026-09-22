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
      upsert: vi.fn(),
    },
    attendanceEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  checkDatabaseConnection: vi.fn().mockResolvedValue(true),
}));

describe('Hikvision Webhook Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.device.findFirst as any).mockResolvedValue({
      id: 'mock-device-id',
      host: 'https://192.168.1.100',
    });
    (prisma.device.update as any).mockResolvedValue({});
    (prisma.user.upsert as any).mockResolvedValue({});
  });

  it('successfully processes AccessControllerEvent JSON payload and returns 200 OK', async () => {
    (prisma.attendanceEvent.findFirst as any).mockResolvedValue(null);
    (prisma.attendanceEvent.create as any).mockResolvedValue({
      id: 'mock-event-1',
      serialNo: 999,
      employeeNo: '1001',
    });

    const payload = {
      eventType: 'AccessControllerEvent',
      AccessControllerEvent: {
        majorEventType: 5,
        subEventType: 75,
        name: 'Alice Smith',
        employeeNoString: '1001',
        cardNo: 'CARD123',
        currentVerifyMode: 'face',
        serialNo: 999,
        doorNo: 1,
        time: '2026-09-22T09:45:00Z',
      },
    };

    const res = await request(app)
      .post('/api/attendance/webhook')
      .send(payload)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.statusCode).toBe(1);
    expect(res.body.statusString).toBe('OK');
    expect(res.body.processedCount).toBe(1);

    expect(prisma.attendanceEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeNo: '1001',
          employeeName: 'Alice Smith',
          major: 5,
          minor: 75,
          verificationMode: 'face',
          serialNo: 999,
        }),
      })
    );
  });

  it('deduplicates events when same serialNo and employeeNo are re-sent', async () => {
    // Simulate event already exists
    (prisma.attendanceEvent.findFirst as any).mockResolvedValue({
      id: 'existing-event-id',
      serialNo: 999,
      employeeNo: '1001',
    });

    const payload = {
      eventType: 'AccessControllerEvent',
      AccessControllerEvent: {
        majorEventType: 5,
        subEventType: 75,
        employeeNoString: '1001',
        serialNo: 999,
        time: '2026-09-22T09:45:00Z',
      },
    };

    const res = await request(app)
      .post('/api/attendance/webhook')
      .send(payload)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.processedCount).toBe(0); // 0 new events created
    expect(prisma.attendanceEvent.create).not.toHaveBeenCalled();
  });
});
