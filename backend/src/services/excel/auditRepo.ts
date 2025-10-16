import path from 'path';
import XLSX from 'xlsx';
import { cfg } from '../../config.js';
import { readWorkbook, ensureSheet, writeWorkbook, readSheet, appendRow } from './excelStore.js';
import { nowIso } from '../utils/time.js';
import { sha256, chainHash } from '../utils/crypto.js';

export type AuditRow = {
  event_id: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_hash?: string;
  after_hash?: string;
  timestamp: string;
  ip?: string;
  chain_hash: string;
};

const SHEET = 'Audit';

export async function ensureAuditWorkbook() {
  const file = path.resolve(process.cwd(), cfg.paths.auditXlsx);
  const wb = await readWorkbook(file);
  ensureSheet(wb, SHEET, ['event_id', 'actor', 'action', 'entity_type', 'entity_id', 'before_hash', 'after_hash', 'timestamp', 'ip', 'chain_hash']);
  await writeWorkbook(file, wb);
}

export async function appendAuditEvent(args: { actor: string; action: string; entityType: string; entityId: string; beforeHash?: string; afterHash?: string; ip?: string; }) {
  const file = path.resolve(process.cwd(), cfg.paths.auditXlsx);
  const wb = await readWorkbook(file);
  ensureSheet(wb, SHEET, ['event_id', 'actor', 'action', 'entity_type', 'entity_id', 'before_hash', 'after_hash', 'timestamp', 'ip', 'chain_hash']);
  const prevRows = readSheet(wb, SHEET) as AuditRow[];
  const prevChain = prevRows.length ? (prevRows[prevRows.length - 1].chain_hash || '') : '';
  const now = nowIso();
  const eventId = sha256(`${args.actor}-${args.action}-${args.entityId}-${now}`);
  const eventHash = sha256(JSON.stringify(args));
  const chain = chainHash(prevChain, eventHash);
  appendRow(wb, SHEET, [eventId, args.actor, args.action, args.entityType, args.entityId, args.beforeHash || '', args.afterHash || '', now, args.ip || '', chain]);
  await writeWorkbook(file, wb);
}