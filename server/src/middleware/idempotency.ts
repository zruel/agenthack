import { Request, Response, NextFunction } from 'express';
const store = new Map<string, { status: number; body: any }>();

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST') return next();
  const key = req.headers['idempotency-key'];
  if (!key || typeof key !== 'string') return next();
  const existing = store.get(key);
  if (existing) return res.status(existing.status).json(existing.body);
  const origJson = res.json.bind(res);
  res.json = (body: any) => {
    store.set(key, { status: res.statusCode || 200, body });
    return origJson(body);
  };
  next();
}