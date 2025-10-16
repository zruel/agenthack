import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthClaims { emailid: string; role: 'Employee' | 'Approver' | 'Admin'; }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: { code: 'unauthorized', message: 'Missing token' } });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as AuthClaims & jwt.JwtPayload;
    (req as any).user = { emailid: decoded.emailid, role: decoded.role };
    next();
  } catch (e) {
    return res.status(401).json({ error: { code: 'unauthorized', message: 'Invalid token' } });
  }
}

export function requireRole(role: AuthClaims['role']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthClaims | undefined;
    if (!user) return res.status(401).json({ error: { code: 'unauthorized', message: 'Missing auth' } });
    if (user.role !== role && user.role !== 'Admin') {
      return res.status(403).json({ error: { code: 'forbidden', message: 'Insufficient privileges' } });
    }
    next();
  };
}