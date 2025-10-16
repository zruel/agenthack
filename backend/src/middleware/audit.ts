import { Request, Response, NextFunction } from 'express';
import { appendAuditEvent } from '../services/excel/auditRepo.js';
import { sha256 } from '../services/utils/crypto.js';

export function auditMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Attach requestId and ip for downstream auditing
  (req as any).requestId = sha256(`${Date.now()}-${Math.random()}`);
  (req as any).ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'local';
  next();
}

export async function auditAction(args: {
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeHash?: string;
  afterHash?: string;
  ip?: string;
}) {
  await appendAuditEvent(args);
}