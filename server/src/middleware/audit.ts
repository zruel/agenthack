import { Request, Response, NextFunction } from 'express';
import { appendAuditEvent } from '../services/audit';
import crypto from 'crypto';

export function auditMiddleware(req: Request, _res: Response, next: NextFunction) {
  (req as any).requestId = crypto.randomUUID();
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
  await appendAuditEvent({
    actor: args.actor,
    action: args.action,
    entity_type: args.entityType,
    entity_id: args.entityId,
    before_hash: args.beforeHash,
    after_hash: args.afterHash,
    ip: args.ip
  });
}