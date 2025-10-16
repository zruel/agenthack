import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { cfg } from '../config.js';

export type UserClaims = {
  emailid: string;
  role: 'Employee' | 'Approver' | 'Admin';
};

export function authMiddleware(allowedRoles: UserClaims['role'][] = ['Employee']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    }
    try {
      const decoded = jwt.verify(token, cfg.jwtSecret) as UserClaims;
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
      }
      (req as any).user = decoded;
      next();
    } catch (e) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    }
  };
}