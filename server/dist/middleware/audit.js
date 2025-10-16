import { appendAuditEvent } from '../services/audit';
import crypto from 'crypto';
export function auditMiddleware(req, _res, next) {
    req.requestId = crypto.randomUUID();
    req.ip = req.ip || req.headers['x-forwarded-for'] || 'local';
    next();
}
export async function auditAction(args) {
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
