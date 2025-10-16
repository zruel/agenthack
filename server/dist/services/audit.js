import { ExcelStore } from '../excel/ExcelStore';
import { sha256, chainHash } from './utils/crypto';
const auditStore = new ExcelStore(process.env.AUDIT_XLSX || 'Audit.xlsx');
export async function appendAuditEvent(args) {
    const { workbook } = await auditStore.read();
    const rows = auditStore.readRows(workbook, 'Audit');
    const prev = rows[rows.length - 1];
    const event_id = cryptoRandom();
    const timestamp = args.timestamp || new Date().toISOString();
    const eventHash = sha256(JSON.stringify({ event_id, ...args, timestamp }));
    const prevChain = prev?.chain_hash || '';
    const chain_hash = chainHash(prevChain, eventHash);
    rows.push({ event_id, actor: args.actor, action: args.action, entity_type: args.entity_type, entity_id: args.entity_id, before_hash: args.before_hash || '', after_hash: args.after_hash || '', timestamp, ip: args.ip || '', chain_hash });
    auditStore.writeRows(workbook, 'Audit', rows);
    await auditStore.write(workbook);
}
function cryptoRandom() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
