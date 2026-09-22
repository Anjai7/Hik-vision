import { Router, Request, Response, NextFunction } from 'express';
import { deviceService } from '../services/DeviceService';
import { syncService } from '../services/SyncService';
import { syncRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/device
 * Returns current device configuration and stored metadata
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const device = await deviceService.getOrCreateDefaultDevice();
    const safeConfig = deviceService.getClient().getConfig();

    res.json({
      success: true,
      data: {
        ...device,
        connection: safeConfig,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/device/status
 * Quick connectivity status check
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await deviceService.testConnection();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/device/test
 * Explicit hardware connection test with latency measurement
 */
router.post('/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testResult = await deviceService.testConnection();
    res.json({
      success: true,
      data: testResult,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/device/sync
 * Trigger full synchronization (users + events)
 */
router.post('/sync', syncRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const syncResult = await syncService.syncAll();
    res.json({
      success: syncResult.success,
      data: syncResult,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
