import { Router, Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/DashboardService';

const router = Router();

/**
 * GET /api/dashboard/summary
 * Device overview, biometric statistics, and recent activity
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await dashboardService.getSummary();
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
