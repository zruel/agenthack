import { ExcelStore } from '../excel/ExcelStore';
import { loadPolicyCache, purchaseLimitForLevel, approvedItemsForLevel } from '../policy/cache';
const employeeStore = new ExcelStore(process.env.EMPLOYEE_XLSX || 'Employee_Data.xlsx');
const balancesStore = new ExcelStore(process.env.BALANCES_XLSX || 'Balances.xlsx');
export async function getEligibilityByEmail(emailid) {
    const { workbook: empWb } = await employeeStore.read();
    const employees = employeeStore.readRows(empWb, 'Sheet1').length > 0 ? employeeStore.readRows(empWb, 'Sheet1') : employeeStore.readRows(empWb, 'Employees');
    const emp = employees.find((e) => String(e.emailid).toLowerCase() === emailid.toLowerCase());
    if (!emp)
        return null;
    const policyRows = await loadPolicyCache();
    const limit = purchaseLimitForLevel(policyRows, emp.employeelevel);
    const approvedItems = approvedItemsForLevel(policyRows, emp.employeelevel);
    const { workbook: balWb } = await balancesStore.read();
    const balances = balancesStore.readRows(balWb, 'Balances');
    let bal = balances.find((b) => String(b.employeeid) === String(emp.employeeid));
    if (!bal) {
        bal = { employeeid: emp.employeeid, employeelevel: emp.employeelevel, ytd_spend: 0, ytd_limit: limit, available_balance: limit, last_update: new Date().toISOString(), carryover_policy_flag: 'reset' };
        balances.push(bal);
        balancesStore.writeRows(balWb, 'Balances', balances);
        await balancesStore.write(balWb);
    }
    const eligibility = {
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
