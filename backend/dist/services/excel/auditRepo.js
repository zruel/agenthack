import path from 'path';
import { cfg } from '../../config.js';
import { readWorkbook, ensureSheet, writeWorkbook, readSheet, appendRow } from './excelStore.js';
import { nowIso } from '../utils/time.js';
import { sha256, chainHash } from '../utils/crypto.js';
const SHEET = 'Audit';
export async function ensureAuditWorkbook() {
    const file = path.resolve(process.cwd(), cfg.paths.auditXlsx);
    const wb = await readWorkbook(file);
    ensureSheet(wb, SHEET, ['event_id', 'actor', 'action', 'entity_type', 'entity_id', 'before_hash', 'after_hash', 'timestamp', 'ip', 'chain_hash']);
    await writeWorkbook(file, wb);
}
export async function appendAuditEvent(args) {
    const file = path.resolve(process.cwd(), cfg.paths.auditXlsx);
    const wb = await readWorkbook(file);
    ensureSheet(wb, SHEET, ['event_id', 'actor', 'action', 'entity_type', 'entity_id', 'before_hash', 'after_hash', 'timestamp', 'ip', 'chain_hash']);
    const prevRows = readSheet(wb, SHEET);
    const prevChain = prevRows.length ? (prevRows[prevRows.length - 1].chain_hash || '') : '';
    const now = nowIso();
    const eventId = sha256(`${args.actor}-${args.action}-${args.entityId}-${now}`);
    const eventHash = sha256(JSON.stringify(args));
    const chain = chainHash(prevChain, eventHash);
    appendRow(wb, SHEET, [eventId, args.actor, args.action, args.entityType, args.entityId, args.beforeHash || '', args.afterHash || '', now, args.ip || '', chain]);
    await writeWorkbook(file, wb);
}
