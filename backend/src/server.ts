import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import deviceRoutes from './routes/device.routes';
import userRoutes from './routes/user.routes';
import attendanceRoutes from './routes/attendance.routes';
import dashboardRoutes from './routes/dashboard.routes';
import webhookRoutes from './routes/webhook.routes';
import { checkDatabaseConnection, prisma } from './db';
import { syncService } from './services/SyncService';

const app = express();

// Security and CORS
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: config.CORS_ORIGIN || '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiter (skip for webhook endpoint so terminal events are never dropped)
app.use((req, res, next) => {
  if (req.path.includes('/webhook') || req.path.includes('/listen')) {
    return next();
  }
  return apiRateLimiter(req, res, next);
});

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// API Routes
app.use('/api/webhook', webhookRoutes);
app.use('/api/attendance/webhook', webhookRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get(['/health', '/api/health'], async (req, res) => {
  const dbOk = await checkDatabaseConnection();
  res.json({
    status: 'ok',
    database: dbOk ? 'connected' : 'disconnected',
    terminalHost: config.HIKVISION_HOST,
    timestamp: new Date().toISOString(),
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server if not running in test or explicitly in serverless function mode
const isServerless = process.env.VERCEL_SERVERLESS === '1' || process.env.NODE_ENV === 'test';

if (!isServerless) {
  const listenPort = process.env.PORT ? parseInt(process.env.PORT, 10) : config.PORT;
  app.listen(listenPort, '0.0.0.0', async () => {
    logger.info(`=======================================================`);
    logger.info(` Hikvision Attendance Backend Started`);
    logger.info(` Port: ${listenPort}`);
    logger.info(` Target Terminal: ${config.HIKVISION_HOST}`);
    logger.info(` Webhook Endpoint: /api/attendance/webhook`);
    logger.info(` Mode: ${config.NODE_ENV}`);
    logger.info(`=======================================================`);

    // Check database connection on startup
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      logger.warn(`Database is not reachable at ${config.DATABASE_URL}. Ensure database is configured.`);
    } else {
      logger.info(`Database connection verified.`);
    }

    // Start background auto-sync only when running locally / dedicated server
    if (config.AUTO_SYNC_INTERVAL_SEC > 0) {
      syncService.startAutoSync();
    }
  });
}

export default app;
