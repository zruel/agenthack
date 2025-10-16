import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Unexpected error';
  const details = err.details || undefined;
  res.status(status).json({ error: { code, message, details } });
}