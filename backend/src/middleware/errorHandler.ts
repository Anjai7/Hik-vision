import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HikvisionError } from '../hikvision';
import { logger } from '../utils/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Hikvision custom errors
  if (err instanceof HikvisionError) {
    logger.warn(`Hikvision ISAPI Error [${err.code}]: ${err.message}`, {
      path: req.path,
      statusCode: err.statusCode,
    });

    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request input',
        details: err.errors,
      },
    });
    return;
  }

  // Generic internal server error
  logger.error('Unhandled server error', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
  });
}
