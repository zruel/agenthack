import path from 'path';
import XLSX from 'xlsx';
import { cfg } from '../../config.js';
export function getEmployeeByEmail(emailid) {
    const file = path.resolve(process.cwd(), cfg.paths.employeeXlsx);
    const wb = XLSX.readFile(file);
    const sheetName = wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    const row = rows.find(r => String(r.emailid).toLowerCase() === emailid.toLowerCase());
    if (!row)
        return null;
    return {
        emailid: String(row.emailid),
        employeeid: String(row.employeeid),
        name: String(row.name),
        designation: String(row.designation ?? ''),
        employeelevel: String(row.employeelevel),
        department: String(row.department ?? ''),
    };
}
