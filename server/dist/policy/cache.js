import { ExcelStore } from '../excel/ExcelStore';
const policyCache = new ExcelStore(process.env.POLICY_CACHE_XLSX || 'Policy_Cache.xlsx');
export async function loadPolicyCache() {
    const { workbook } = await policyCache.read();
    const rows = policyCache.readRows(workbook, 'Policy');
    return rows.filter(r => r.level);
}
export function approvedItemsForLevel(rows, level) {
    const row = rows.find(r => r.level.toUpperCase() === level.toUpperCase());
    return row?.approved_items_list?.split(',').map(s => s.trim()).filter(Boolean) || [];
}
export function purchaseLimitForLevel(rows, level) {
    const row = rows.find(r => r.level.toUpperCase() === level.toUpperCase());
    return Number(row?.purchase_limit || 0);
}
