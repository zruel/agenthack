import path from 'path';
import XLSX from 'xlsx';
import { cfg } from '../../config.js';
import { readWorkbook, ensureSheet, writeWorkbook, readSheet, appendRow } from './excelStore.js';
import { nowIso, addHoursIso } from '../utils/time.js';
const REQUESTS = 'Requests';
const SLA = 'SLA';
export async function ensureRequestsWorkbook() {
    const file = path.resolve(process.cwd(), cfg.paths.requestsXlsx);
    const wb = await readWorkbook(file);
    ensureSheet(wb, REQUESTS, ['request_id', 'employeeid', 'emailid', 'item_category', 'amount', 'justification', 'status', 'approver_email', 'sla_due', 'created_at', 'updated_at', 'idempotency_key']);
    ensureSheet(wb, SLA, ['status', 'hours']);
    await writeWorkbook(file, wb);
}
export async function insertRequest(row) {
    const file = path.resolve(process.cwd(), cfg.paths.requestsXlsx);
    const wb = await readWorkbook(file);
    ensureSheet(wb, REQUESTS, ['request_id', 'employeeid', 'emailid', 'item_category', 'amount', 'justification', 'status', 'approver_email', 'sla_due', 'created_at', 'updated_at', 'idempotency_key']);
    const slaHours = cfg.sla?.statusToHours?.Pending ?? 48;
    const now = nowIso();
    appendRow(wb, REQUESTS, [row.request_id, row.employeeid, row.emailid, row.item_category, row.amount, row.justification, row.status, row.approver_email || '', addHoursIso(slaHours), now, now, row.idempotency_key || '']);
    await writeWorkbook(file, wb);
}
export async function listPendingRequests() {
    const file = path.resolve(process.cwd(), cfg.paths.requestsXlsx);
    const wb = await readWorkbook(file);
    ensureSheet(wb, REQUESTS, ['request_id', 'employeeid', 'emailid', 'item_category', 'amount', 'justification', 'status', 'approver_email', 'sla_due', 'created_at', 'updated_at', 'idempotency_key']);
    let rows = readSheet(wb, REQUESTS);
    rows = rows.filter(r => r.status === 'Pending');
    rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return rows;
}
export async function getRequestById(id) {
    const file = path.resolve(process.cwd(), cfg.paths.requestsXlsx);
    const wb = await readWorkbook(file);
    ensureSheet(wb, REQUESTS, ['request_id', 'employeeid', 'emailid', 'item_category', 'amount', 'justification', 'status', 'approver_email', 'sla_due', 'created_at', 'updated_at', 'idempotency_key']);
    const rows = readSheet(wb, REQUESTS);
    const row = rows.find(r => String(r.request_id) === id);
    return row || null;
}
export async function updateRequest(id, update) {
    const file = path.resolve(process.cwd(), cfg.paths.requestsXlsx);
    const wb = await readWorkbook(file);
    ensureSheet(wb, REQUESTS, ['request_id', 'employeeid', 'emailid', 'item_category', 'amount', 'justification', 'status', 'approver_email', 'sla_due', 'created_at', 'updated_at', 'idempotency_key']);
    const rows = readSheet(wb, REQUESTS);
    const idx = rows.findIndex(r => String(r.request_id) === id);
    if (idx < 0)
        return;
    rows[idx] = { ...rows[idx], ...update, updated_at: nowIso() };
    const wsData = [['request_id', 'employeeid', 'emailid', 'item_category', 'amount', 'justification', 'status', 'approver_email', 'sla_due', 'created_at', 'updated_at', 'idempotency_key']];
    for (const r of rows)
        wsData.push([r.request_id, r.employeeid, r.emailid, r.item_category, r.amount, r.justification, r.status, r.approver_email || '', r.sla_due, r.created_at, r.updated_at, r.idempotency_key || '']);
    wb.Sheets[REQUESTS] = XLSX.utils.aoa_to_sheet(wsData);
    await writeWorkbook(file, wb);
}
