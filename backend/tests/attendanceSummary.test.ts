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
    },
    attendanceEvent: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
  checkDatabaseConnection: vi.fn().mockResolvedValue(true),
}));

describe('Attendance Summary & Timesheet Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/attendance/summary calculates firstIn, lastOut, and duration', async () => {
    const mockEvents = [
      {
        id: 'ev-1',
        employeeNo: '101',
        employeeName: 'Alice',
        eventTime: new Date('2026-09-22T09:00:00Z'),
        major: 5,
        minor: 104,
        verificationMode: 'face',
      },
      {
        id: 'ev-2',
        employeeNo: '101',
        employeeName: 'Alice',
        eventTime: new Date('2026-09-22T17:30:00Z'),
        major: 5,
        minor: 104,
        verificationMode: 'face',
      },
    ];

    (prisma.attendanceEvent.findMany as any).mockResolvedValue(mockEvents);

    const res = await request(app).get('/api/attendance/summary');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);

    const record = res.body.data[0];
    expect(record.employeeNo).toBe('101');
    expect(record.employeeName).toBe('Alice');
    expect(record.punchesCount).toBe(2);
    expect(record.durationMinutes).toBe(510); // 8h 30m = 510m
    expect(record.durationFormatted).toBe('8h 30m');
  });

  it('GET /api/attendance/summary/export returns downloadable CSV attachment', async () => {
    (prisma.attendanceEvent.findMany as any).mockResolvedValue([
      {
        id: 'ev-1',
        employeeNo: '101',
        employeeName: 'Alice',
        eventTime: new Date('2026-09-22T09:00:00Z'),
        major: 5,
        minor: 104,
        verificationMode: 'face',
      },
    ]);

    const res = await request(app).get('/api/attendance/summary/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.text).toContain('Employee ID');
    expect(res.text).toContain('First In');
  });
});
