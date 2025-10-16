import { appendAuditEvent } from '../services/excel/auditRepo.js';
import { sha256 } from '../services/utils/crypto.js';
export function auditMiddleware(req, _res, next) {
    // Attach requestId and ip for downstream auditing
    req.requestId = sha256(`${Date.now()}-${Math.random()}`);
    req.ip = req.ip || req.headers['x-forwarded-for'] || 'local';
    next();
}
export async function auditAction(args) {
    await appendAuditEvent(args);
}
