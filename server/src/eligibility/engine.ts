import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { ExcelStore } from '../excel/ExcelStore';
import { loadPolicyCache, purchaseLimitForLevel, approvedItemsForLevel } from '../policy/cache';

const employeeStore = new ExcelStore(process.env.EMPLOYEE_XLSX || 'Employee_Data.xlsx');
const balancesStore = new ExcelStore(process.env.BALANCES_XLSX || 'Balances.xlsx');

export type Eligibility = {
  emailid: string;
  employeeid: string;
  name: string;
  designation: string;
  employeelevel: string;
  department: string;
  purchase_limit: number;
  approved_items: string[];
  ytd_spend: number;
  available_balance: number;
};

export async function getEligibilityByEmail(emailid: string): Promise<Eligibility | null> {
  const { workbook: empWb } = await employeeStore.read();

  function normalizeRow(e: any) {
    const norm = {
      emailid: e.emailid || e.email_id || e.Email || e['Email ID'] || e.email || e.EMAIL || '',
      employeeid: e.employeeid || e.employee_id || e.EmployeeID || e['Employee ID'] || e.emp_id || '',
      name: e.name || e.Name || '',
      designation: e.designation || e.Designation || e.title || '',
      employeelevel: e.employeelevel || e.employee_level || e.level || e.Level || '',
      department: e.department || e.Department || e.dept || '',
    };
    return norm;
  }
  const empPath = path.resolve(process.cwd(), process.env.EMPLOYEE_XLSX || 'Employee_Data.xlsx');
  if (process.env.DEBUG_ELIGIBILITY === '1') {
    console.log('eligibility: empPath', empPath, fs.existsSync(empPath));
  }
  let wb: any = empWb as any;
  let sheetNames: string[] = wb.SheetNames || [];
  if (process.env.DEBUG_ELIGIBILITY === '1') {
    console.log('eligibility: wb sheets', sheetNames);
  }
  if (sheetNames.length === 0 && fs.existsSync(empPath)) {
    wb = XLSX.readFile(empPath);
    sheetNames = wb.SheetNames || [];
    if (process.env.DEBUG_ELIGIBILITY === '1') {
      console.log('eligibility: wb sheets (fallback)', sheetNames);
    }
  }
  let rawRows: any[] = [];
  for (const name of sheetNames) {
    const ws: any = wb.Sheets[name];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true }) as any[];
    if (process.env.DEBUG_ELIGIBILITY === '1') {
      console.log('eligibility: sheet', name, 'rows', rows.length, 'headers', Object.keys(rows[0] || {}));
    }
    if (rows.length) { rawRows = rows; break; }
  }
  const employees = rawRows.map(normalizeRow).filter(r => r.emailid && r.employeeid);
  // Debug: help diagnose header mismatches
  if (process.env.DEBUG_ELIGIBILITY === '1') {
    console.log('eligibility: rows', employees.length, 'sample', employees.slice(0, 3));
  }
  const emp = employees.find((e: any) => String(e.emailid).toLowerCase() === emailid.toLowerCase());
  if (!emp) return null;
  const policyRows = await loadPolicyCache();
  const limit = purchaseLimitForLevel(policyRows, emp.employeelevel);
  const approvedItems = approvedItemsForLevel(policyRows, emp.employeelevel);

  const { workbook: balWb } = await balancesStore.read();
  const balances = balancesStore.readRows<any>(balWb, 'Balances');
  let bal = balances.find((b: any) => String(b.employeeid) === String(emp.employeeid));
  if (!bal) {
    bal = { employeeid: emp.employeeid, employeelevel: emp.employeelevel, ytd_spend: 0, ytd_limit: limit, available_balance: limit, last_update: new Date().toISOString(), carryover_policy_flag: 'reset' };
    balances.push(bal);
    balancesStore.writeRows(balWb, 'Balances', balances);
    await balancesStore.write(balWb);
  }
  const eligibility: Eligibility = {
    emailid: emp.emailid,
    employeeid: emp.employeeid,
    name: emp.name,
    designation: emp.designation,
    employeelevel: emp.employeelevel,
    department: emp.department,
    purchase_limit: limit,
    approved_items: approvedItems,
    ytd_spend: Number(bal.ytd_spend || 0),
    available_balance: Number(bal.available_balance || (limit - Number(bal.ytd_spend || 0)))
  };
  return eligibility;
}