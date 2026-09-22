import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { attendanceService } from '../services/AttendanceService';
import { syncService } from '../services/SyncService';
import { validate } from '../middleware/validator';
import { syncRateLimiter } from '../middleware/rateLimiter';

const router = Router();

const getAttendanceQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 25)),
  from: z.string().optional(),
  to: z.string().optional(),
  employeeNo: z.string().optional(),
  search: z.string().optional(),
  verificationMode: z.string().optional(),
  major: z.string().optional().transform((v) => (v !== undefined ? parseInt(v, 10) : undefined)),
  minor: z.string().optional().transform((v) => (v !== undefined ? parseInt(v, 10) : undefined)),
});

const syncAttendanceBodySchema = z.object({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  major: z.number().optional(),
  minor: z.number().optional(),
});

/**
 * GET /api/attendance
 * List attendance events with date range, employee, and verification mode filtering
 */
router.get(
  '/',
  validate({ query: getAttendanceQuerySchema as any }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await attendanceService.getAttendance(req.query as any);
      res.json({
        success: true,
        data: result.events,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/attendance/sync
 * Sync attendance events from Hikvision terminal
 */
router.post(
  '/sync',
  syncRateLimiter,
  validate({ body: syncAttendanceBodySchema as any }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const syncResult = await syncService.syncEvents({
        startTime: req.body?.startTime,
        endTime: req.body?.endTime,
        major: req.body?.major,
        minor: req.body?.minor,
      });

      res.json({
        success: true,
        data: syncResult,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/attendance/:id
 * Get single attendance record with raw ISAPI JSON
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await attendanceService.getAttendanceById(req.params.id);
    if (!event) {
      res.status(404).json({
        success: false,
        error: {
          code: 'EVENT_NOT_FOUND',
          message: `Attendance event '${req.params.id}' not found`,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
