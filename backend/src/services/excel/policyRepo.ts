import path from 'path';
import XLSX from 'xlsx';
import { cfg } from '../../config.js';
import { readWorkbook, ensureSheet, writeWorkbook, readSheet } from './excelStore.js';

export type PolicyRow = {
  level: string;
  purchase_limit: number;
  approved_items_list: string; // comma-separated
  version: string;
  parsed_at: string;
};

const SHEET = 'Policy';

export async function loadPolicyCache(): Promise<PolicyRow[]> {
  const file = path.resolve(process.cwd(), cfg.paths.policyCacheXlsx);
  const wb = await readWorkbook(file);
  ensureSheet(wb, SHEET, ['level', 'purchase_limit', 'approved_items_list', 'version', 'parsed_at']);
  return readSheet(wb, SHEET) as PolicyRow[];
}

export async function getPolicyForLevel(level: string): Promise<PolicyRow | null> {
  const rows = await loadPolicyCache();
  const row = rows.find(r => String(r.level).toLowerCase() === level.toLowerCase());
  return row || null;
}

export async function savePolicyRows(rows: PolicyRow[], version: string, parsedAt: string) {
  const file = path.resolve(process.cwd(), cfg.paths.policyCacheXlsx);
  const wb = await readWorkbook(file);
  ensureSheet(wb, SHEET, ['level', 'purchase_limit', 'approved_items_list', 'version', 'parsed_at']);
  const wsData: (string | number)[][] = [['level', 'purchase_limit', 'approved_items_list', 'version', 'parsed_at']];
  for (const r of rows) {
    wsData.push([r.level, r.purchase_limit, r.approved_items_list, version, parsedAt]);
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  wb.Sheets[SHEET] = ws;
  await writeWorkbook(file, wb);
}