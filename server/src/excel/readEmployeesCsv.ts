import fs from 'fs';
import path from 'path';

export type CsvEmployee = {
  employeeid: string;
  name: string;
  emailid: string;
  employeelevel?: string;
  department?: string;
  purchase_limit?: number;
  approved_items_list?: string;
  ytd_spend?: number;
  available_balance?: number;
};

function parseNumber(val: any): number | undefined {
  if (val === null || val === undefined) return undefined;
  const s = String(val).replace(/^"|"$/g, '').replace(/[$,]/g, '').trim();
  const n = Number(s);
  return isFinite(n) ? n : undefined;
}

function normalizeHeader(h: string): string {
  const x = h.trim().replace(/^"|"$/g, '').toLowerCase();
  // Map CSV headers to canonical field names
  switch (x) {
    case 'email_id': return 'emailid';
    case 'employee_id': return 'employeeid';
    case 'employee_level': return 'employeelevel';
    case 'max_purchase_limit_usd': return 'purchase_limit';
    case 'approved_assets': return 'approved_items_list';
    case 'spent_to_date_usd': return 'ytd_spend';
    case 'remaining_limit_usd': return 'available_balance';
    default: return x;
  }
}

export function readEmployeesCsv(csvAbsolutePath?: string): CsvEmployee[] {
  // Default to repo-level CSV: ../Employee data.csv relative to server directory
  const csvPath = csvAbsolutePath || path.resolve(process.cwd(), '..', 'Employee data.csv');
  if (!fs.existsSync(csvPath)) return [];
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  // header mapping (handle quoted header line and underscored names)
  const header = lines[0].replace(/^"|"$/g, '').split(',').map(h => normalizeHeader(h));
  function col(name: string) {
    const idx = header.findIndex(h => h === name.toLowerCase());
    return idx >= 0 ? idx : -1;
  }
  const idxs = {
    employeeid: col('employeeid'),
    name: col('name'),
    emailid: col('emailid'),
    employeelevel: col('employeelevel'),
    department: col('department'),
    purchase_limit: col('purchase_limit'),
    approved_items_list: col('approved_items_list'),
    ytd_spend: col('ytd_spend'),
    available_balance: col('available_balance'),
  };
  const out: CsvEmployee[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/^"|"$/g, '');
    const cols = line.split(',');
    const get = (idx: number) => (idx >= 0 ? cols[idx]?.trim().replace(/^"|"$/g, '') : undefined) || undefined;
    const emp: CsvEmployee = {
      employeeid: get(idxs.employeeid) || '',
      name: get(idxs.name) || '',
      emailid: get(idxs.emailid) || '',
      employeelevel: get(idxs.employeelevel),
      department: get(idxs.department),
      purchase_limit: parseNumber(get(idxs.purchase_limit)),
      approved_items_list: get(idxs.approved_items_list),
      ytd_spend: parseNumber(get(idxs.ytd_spend)),
      available_balance: parseNumber(get(idxs.available_balance)),
    };
    if (emp.employeeid || emp.emailid) out.push(emp);
  }
  return out;
}