import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('API Input Validation (Zod)', () => {
  const getUsersQuerySchema = z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
    search: z.string().optional(),
    hasFP: z.string().optional().transform((v) => (v !== undefined ? v === 'true' : undefined)),
    hasFace: z.string().optional().transform((v) => (v !== undefined ? v === 'true' : undefined)),
    hasCard: z.string().optional().transform((v) => (v !== undefined ? v === 'true' : undefined)),
  });

  const getAttendanceQuerySchema = z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 25)),
    from: z.string().optional(),
    to: z.string().optional(),
    employeeNo: z.string().optional(),
    verificationMode: z.string().optional(),
    major: z.string().optional().transform((v) => (v !== undefined ? parseInt(v, 10) : undefined)),
    minor: z.string().optional().transform((v) => (v !== undefined ? parseInt(v, 10) : undefined)),
  });

  it('should parse and apply default pagination values', () => {
    const parsed = getUsersQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.hasFP).toBeUndefined();
  });

  it('should transform query string boolean filters', () => {
    const parsed = getUsersQuerySchema.parse({
      hasFP: 'true',
      hasFace: 'false',
    });
    expect(parsed.hasFP).toBe(true);
    expect(parsed.hasFace).toBe(false);
  });

  it('should parse attendance query numeric and date filters', () => {
    const parsed = getAttendanceQuerySchema.parse({
      page: '3',
      limit: '50',
      major: '5',
      minor: '38',
      from: '2026-09-01T00:00:00Z',
      to: '2026-09-21T23:59:59Z',
    });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(50);
    expect(parsed.major).toBe(5);
    expect(parsed.minor).toBe(38);
    expect(parsed.from).toBe('2026-09-01T00:00:00Z');
  });
});
