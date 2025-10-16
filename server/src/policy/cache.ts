import { ExcelStore } from '../excel/ExcelStore';

const policyCache = new ExcelStore(process.env.POLICY_CACHE_XLSX || 'Policy_Cache.xlsx');

export type PolicyRow = { level: string; purchase_limit: number; approved_items_list: string; version: string; parsed_at: string };

export async function loadPolicyCache(): Promise<PolicyRow[]> {
  const { workbook } = await policyCache.read();
  const rows = policyCache.readRows<PolicyRow>(workbook, 'Policy');
  return rows.filter(r => r.level);
}

export function approvedItemsForLevel(rows: PolicyRow[], level: string): string[] {
  const row = rows.find(r => r.level.toUpperCase() === level.toUpperCase());
  return row?.approved_items_list?.split(',').map(s => s.trim()).filter(Boolean) || [];
}

export function purchaseLimitForLevel(rows: PolicyRow[], level: string): number {
  const row = rows.find(r => r.level.toUpperCase() === level.toUpperCase());
  return Number(row?.purchase_limit || 0);
}