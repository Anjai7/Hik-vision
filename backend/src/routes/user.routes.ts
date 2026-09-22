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
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
});

const updateUserBodySchema = z.object({
  name: z.string().optional(),
  userType: z.string().optional(),
  enabled: z.boolean().optional(),
  gender: z.string().optional(),
  groupId: z.number().optional(),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
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
 * POST /api/users/:employeeNo/expire
 * Immediately expire/block user validity
 */
router.post('/:employeeNo/expire', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updatedUser = await userService.expireUser(req.params.employeeNo);
    res.json({
      success: true,
      data: updatedUser,
      message: `Access expired/blocked for employee '${req.params.employeeNo}'`,
    });
  } catch (error) {
    next(error);
  }
});

const setAccessPeriodBodySchema = z.object({
  validFrom: z.string().min(1, 'Valid From date is required'),
  validTo: z.string().min(1, 'Valid To date is required'),
  enabled: z.boolean().optional().default(true),
});

/**
 * POST /api/users/:employeeNo/access-period
 * Set custom access validity period and sync directly to terminal
 */
router.post(
  '/:employeeNo/access-period',
  validate({ body: setAccessPeriodBodySchema as any }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { validFrom, validTo, enabled } = req.body;
      const result = await userService.setAccessPeriod(req.params.employeeNo, {
        validFrom,
        validTo,
        enabled,
      });
      res.json({
        success: true,
        data: result,
        message: `Access period configured from ${validFrom} to ${validTo} for employee '${req.params.employeeNo}'`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/users/:employeeNo/grant
 * Grant/extend user validity
 */
router.post('/:employeeNo/grant', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const years = req.body?.years ? Number(req.body.years) : 1;
    const updatedUser = await userService.grantAccess(req.params.employeeNo, years);
    res.json({
      success: true,
      data: updatedUser,
      message: `Access granted for ${years} year(s) for employee '${req.params.employeeNo}'`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/sync/pending
 * Retrieve users pending terminal synchronization
 */
router.get('/sync/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pending = await userService.getPendingSyncUsers();
    res.json({
      success: true,
      data: pending,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:employeeNo/synced
 * Mark user as synchronized with physical terminal
 */
router.post('/:employeeNo/synced', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await userService.markUserSynced(req.params.employeeNo);
    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

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
