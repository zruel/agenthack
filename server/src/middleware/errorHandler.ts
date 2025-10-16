import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const error = {
    code: err.code || 'internal_error',
    message: err.message || 'Unexpected server error',
    details: err.details || undefined
  };
  res.status(status).json({ error });
}