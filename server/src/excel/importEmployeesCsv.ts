import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { ExcelStore } from './ExcelStore';

type CsvRow = {
  email_id: string;
  employee_id: string;
  name: string;
  designation: string;
  employee_level: string;
  department: string;
  fiscal_year?: string;
  max_purchase_limit_usd?: number | string;
  approved_assets?: string;
  spent_to_date_usd?: number | string;
  remaining_limit_usd?: number | string;
  car_requires_approval?: string;
  multiple_requests_allowed?: string;
};

function normalize(row: any) {
  const r = row as CsvRow;
  return {
    emailid: String((r as any).emailid || r.email_id || '').trim(),
    employeeid: String((r as any).employeeid || r.employee_id || '').trim(),
    name: String(r.name || '').trim(),
    designation: String(r.designation || '').trim(),
    employeelevel: String((r as any).employeelevel || r.employee_level || '').trim(),
    department: String(r.department || '').trim(),
    max_purchase_limit_usd: Number((r.max_purchase_limit_usd as any) || 0),
    approved_assets: String(r.approved_assets || '').trim(),
  };
}

function parseApprovedItems(s: string): string[] {
  // CSV uses semicolon-separated items, sometimes with extra details in parentheses and stray quotes
  const base = s.trim().replace(/^"|"$/g, '');
  return base
    .split(';')
    .map(x => x.replace(/\(.*?\)/g, '').replace(/^"|"$/g, '').trim())
    .filter(Boolean);
}

async function main() {
  const csvPath = process.env.EMPLOYEE_CSV || path.resolve(process.cwd(), '..', 'Employee data.csv');
  const empXlsx = process.env.EMPLOYEE_XLSX || 'Employee_Data.xlsx';
  const policyXlsx = process.env.POLICY_CACHE_XLSX || 'Policy_Cache.xlsx';

  const absCsv = path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);
  if (!fs.existsSync(absCsv)) {
    console.error('CSV file not found:', absCsv);
    process.exit(1);
  }

  // Try robust CSV parsing since the file wraps entire lines in quotes
  const raw = fs.readFileSync(absCsv, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  function stripOuterQuotes(s: string) {
    const t = s.trim();
    if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
    return t;
  }
  const headerParts = stripOuterQuotes(lines[0]).split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = stripOuterQuotes(line).split(',');
    const obj: any = {};
    headerParts.forEach((h, i) => {
      let v = (cols[i] ?? '').trim();
      // If a field itself is double-quoted because of inner quotes, strip them
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      // Unescape double-double-quotes
      v = v.replace(/""/g, '"');
      obj[h] = v;
    });
    return obj;
  });
  const normalized = rows.map(normalize).filter(r => r.emailid && r.employeeid);

  // Write employees to Employee_Data.xlsx (sheet: Employees)
  const empStore = new ExcelStore(empXlsx);
  const { workbook: empWb } = await empStore.read();
  empStore.writeRows(empWb, 'Employees', normalized.map(r => ({
    emailid: r.emailid,
    employeeid: r.employeeid,
    name: r.name,
    designation: r.designation,
    employeelevel: r.employeelevel,
    department: r.department,
  })));
  await empStore.write(empWb);

  // Aggregate policy by level from CSV
  const byLevel: Record<string, { purchase_limit: number; items: Set<string> }> = {};
  for (const r of normalized) {
    const level = (r.employeelevel || '').trim();
    if (!level) continue;
    if (!byLevel[level]) byLevel[level] = { purchase_limit: 0, items: new Set<string>() };
    const lim = Number(r.max_purchase_limit_usd || 0);
    if (lim > byLevel[level].purchase_limit) byLevel[level].purchase_limit = lim;
    for (const item of parseApprovedItems(r.approved_assets || '')) byLevel[level].items.add(item);
  }

  const policyRows = Object.entries(byLevel).map(([level, agg]) => ({
    level,
    purchase_limit: agg.purchase_limit,
    approved_items_list: Array.from(agg.items).join(', '),
    version: 'csv-seeded',
    parsed_at: new Date().toISOString(),
  }));

  const policyStore = new ExcelStore(policyXlsx);
  const { workbook: policyWb } = await policyStore.read();
  policyStore.writeRows(policyWb, 'Policy', policyRows);
  await policyStore.write(policyWb);

  console.log(`Imported ${normalized.length} employees and ${policyRows.length} policy levels from CSV.`);
}

main();