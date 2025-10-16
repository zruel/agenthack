import path from 'path';
import XLSX from 'xlsx';
import { cfg } from '../../config.js';
import { readWorkbook, ensureSheet, writeWorkbook, readSheet, appendRow } from './excelStore.js';
import { nowIso } from '../utils/time.js';

export type BalanceRow = {
  employeeid: string;
  employeelevel: string;
  ytd_spend: number;
  ytd_limit: number;
  available_balance: number;
  last_update: string;
  carryover_policy_flag: string;
};

export type TransactionRow = {
  tx_id: string;
  employeeid: string;
  amount: number;
  item_category: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  requested_at: string;
  notes?: string;
};

const BALANCES = 'Balances';
const TRANSACTIONS = 'Transactions';

export async function ensureBalancesWorkbook() {
  const file = path.resolve(process.cwd(), cfg.paths.balancesXlsx);
  const wb = await readWorkbook(file);
  ensureSheet(wb, BALANCES, ['employeeid', 'employeelevel', 'ytd_spend', 'ytd_limit', 'available_balance', 'last_update', 'carryover_policy_flag']);
  ensureSheet(wb, TRANSACTIONS, ['tx_id', 'employeeid', 'amount', 'item_category', 'status', 'approved_by', 'approved_at', 'requested_at', 'notes']);
  await writeWorkbook(file, wb);
}

export async function getBalance(employeeid: string): Promise<BalanceRow | null> {
  const file = path.resolve(process.cwd(), cfg.paths.balancesXlsx);
  const wb = await readWorkbook(file);
  ensureSheet(wb, BALANCES, ['employeeid', 'employeelevel', 'ytd_spend', 'ytd_limit', 'available_balance', 'last_update', 'carryover_policy_flag']);
  const rows = readSheet(wb, BALANCES) as BalanceRow[];
  const row = rows.find(r => String(r.employeeid) === employeeid);
  return row || null;
}

export async function upsertBalance(row: BalanceRow) {
  const file = path.resolve(process.cwd(), cfg.paths.balancesXlsx);
  const wb = await readWorkbook(file);
  ensureSheet(wb, BALANCES, ['employeeid', 'employeelevel', 'ytd_spend', 'ytd_limit', 'available_balance', 'last_update', 'carryover_policy_flag']);
  const rows = readSheet(wb, BALANCES) as BalanceRow[];
  const idx = rows.findIndex(r => String(r.employeeid) === row.employeeid);
  if (idx >= 0) {
    rows[idx] = row;
  } else {
    rows.push(row);
  }
  const wsData: (string | number)[][] = [['employeeid', 'employeelevel', 'ytd_spend', 'ytd_limit', 'available_balance', 'last_update', 'carryover_policy_flag']];
  for (const r of rows) wsData.push([r.employeeid, r.employeelevel, r.ytd_spend, r.ytd_limit, r.available_balance, r.last_update, r.carryover_policy_flag]);
  wb.Sheets[BALANCES] = XLSX.utils.aoa_to_sheet(wsData);
  await writeWorkbook(file, wb);
}

export async function appendTransaction(tx: TransactionRow) {
  const file = path.resolve(process.cwd(), cfg.paths.balancesXlsx);
  const wb = await readWorkbook(file);
  ensureSheet(wb, TRANSACTIONS, ['tx_id', 'employeeid', 'amount', 'item_category', 'status', 'approved_by', 'approved_at', 'requested_at', 'notes']);
  appendRow(wb, TRANSACTIONS, [tx.tx_id, tx.employeeid, tx.amount, tx.item_category, tx.status, tx.approved_by || '', tx.approved_at || '', tx.requested_at || nowIso(), tx.notes || '']);
  await writeWorkbook(file, wb);
}

export async function listTransactions(employeeid: string, from?: string, to?: string): Promise<TransactionRow[]> {
  const file = path.resolve(process.cwd(), cfg.paths.balancesXlsx);
  const wb = await readWorkbook(file);
  ensureSheet(wb, TRANSACTIONS, ['tx_id', 'employeeid', 'amount', 'item_category', 'status', 'approved_by', 'approved_at', 'requested_at', 'notes']);
  let rows = readSheet(wb, TRANSACTIONS) as TransactionRow[];
  rows = rows.filter(r => String(r.employeeid) === employeeid);
  if (from) rows = rows.filter(r => r.requested_at >= from);
  if (to) rows = rows.filter(r => r.requested_at <= to);
  return rows;
}