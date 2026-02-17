// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      headers: req.headers,
    },
  }, 'Request error');

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
