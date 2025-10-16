import { getEmployeeByEmail } from '../excel/employeesRepo.js';
import { getPolicyForLevel } from '../excel/policyRepo.js';
import { ensureBalancesWorkbook, getBalance, upsertBalance } from '../excel/balancesRepo.js';

export async function computeEligibility(emailid: string) {
  const emp = getEmployeeByEmail(emailid);
  if (!emp) {
    return { error: 'No employee found for this email.' };
  }
  const policy = await getPolicyForLevel(emp.employeelevel);
  if (!policy) {
    return { error: `No policy found for level ${emp.employeelevel}` };
  }
  await ensureBalancesWorkbook();
  let bal = await getBalance(emp.employeeid);
  if (!bal) {
    bal = {
      employeeid: emp.employeeid,
      employeelevel: emp.employeelevel,
      ytd_spend: 0,
      ytd_limit: policy.purchase_limit,
      available_balance: policy.purchase_limit,
      last_update: new Date().toISOString(),
      carryover_policy_flag: 'reset',
    };
    await upsertBalance(bal);
  }
  const approvedItems = policy.approved_items_list.split(',').map(s => s.trim()).filter(Boolean);
  return {
    employeeemail: emp.emailid,
    employeename: emp.name,
    employeelevel: emp.employeelevel,
    department: emp.department,
    purchaselimit: policy.purchase_limit,
    approveditems: approvedItems,
    ytd_spend: bal.ytd_spend,
    available_balance: bal.available_balance,
  };
}