import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userService } from '../services/UserService';
import { syncService } from '../services/SyncService';
import { validate } from '../middleware/validator';
import { syncRateLimiter } from '../middleware/rateLimiter';

const router = Router();

const getUsersQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
  search: z.string().optional(),
  hasFP: z.string().optional().transform((v) => (v !== undefined ? v === 'true' : undefined)),
  hasFace: z.string().optional().transform((v) => (v !== undefined ? v === 'true' : undefined)),
  hasCard: z.string().optional().transform((v) => (v !== undefined ? v === 'true' : undefined)),
});

/**
 * GET /api/users
 * Search and list users with pagination and biometric filters
 */
router.get(
  '/',
  validate({ query: getUsersQuerySchema as any }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.getUsers(req.query as any);
      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/users/sync
 * Sync users directly from Hikvision terminal into database
 */
router.post('/sync', syncRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const syncResult = await syncService.syncUsers();
    res.json({
      success: true,
      data: syncResult,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:employeeNo
 * Get user detail by employee number
 */
router.get('/:employeeNo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserByEmployeeNo(req.params.employeeNo);
    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: `User with employeeNo '${req.params.employeeNo}' not found`,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users (Unverified endpoint)
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await userService.createUser(req.body);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/:employeeNo (Unverified endpoint)
 */
router.put('/:employeeNo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await userService.updateUser(req.params.employeeNo, req.body);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/users/:employeeNo (Unverified endpoint)
 */
router.delete('/:employeeNo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await userService.deleteUser(req.params.employeeNo);
  } catch (error) {
    next(error);
  }
});

export default router;
