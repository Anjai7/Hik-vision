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

const createUserBodySchema = z.object({
  employeeNo: z.string().min(1, 'Employee ID is required'),
  name: z.string().min(1, 'Employee Name is required'),
  userType: z.string().optional().default('normal'),
  enabled: z.boolean().optional().default(true),
  gender: z.string().optional(),
  groupId: z.number().optional().default(1),
  numOfCard: z.number().optional().default(0),
});

const updateUserBodySchema = z.object({
  name: z.string().optional(),
  userType: z.string().optional(),
  enabled: z.boolean().optional(),
  gender: z.string().optional(),
  groupId: z.number().optional(),
});

/**
 * POST /api/users
 * Create a new employee/user
 */
router.post(
  '/',
  validate({ body: createUserBodySchema as any }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const newUser = await userService.createUser(req.body);
      res.status(201).json({
        success: true,
        data: newUser,
        message: 'Employee registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/users/:employeeNo
 * Update employee details
 */
router.put(
  '/:employeeNo',
  validate({ body: updateUserBodySchema as any }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updatedUser = await userService.updateUser(req.params.employeeNo, req.body);
      res.json({
        success: true,
        data: updatedUser,
        message: 'Employee updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/users/:employeeNo/status
 * Quick toggle access status (enabled/disabled)
 */
router.patch(
  '/:employeeNo/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { enabled } = req.body;
      const updatedUser = await userService.toggleUserStatus(req.params.employeeNo, !!enabled);
      res.json({
        success: true,
        data: updatedUser,
        message: `Access ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/users/:employeeNo
 * Remove employee
 */
router.delete('/:employeeNo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await userService.deleteUser(req.params.employeeNo);
    res.json({
      success: true,
      data: result,
      message: 'Employee removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
