import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // max 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please slow down',
    },
  },
});

export const syncRateLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // max 5 sync requests per 10s to avoid overwhelming terminal ISAPI
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'SYNC_RATE_LIMIT_EXCEEDED',
      message: 'Sync in progress or requested too frequently. Please wait a few seconds.',
    },
  },
});
