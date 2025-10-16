import { loadPolicyCache } from '../policy/cache';
export function redactEligibility(eligibility) {
    return {
        emailid: maskEmail(eligibility.emailid),
        employeelevel: eligibility.employeelevel,
        department: eligibility.department,
        ytd_spend: eligibility.ytd_spend,
        available_balance: eligibility.available_balance
    };
}
function maskEmail(email) {
    const [user, domain] = email.split('@');
    const masked = user.slice(0, 2) + '***';
    return `${masked}@${domain}`;
}
export async function buildRetrievalContext(eligibility) {
    const policy = await loadPolicyCache();
    const levelRow = policy.find(p => p.level.toUpperCase() === String(eligibility.employeelevel).toUpperCase());
    const ctx = {
        Policy: levelRow || {},
        Eligibility: redactEligibility(eligibility)
    };
    return JSON.stringify(ctx, null, 2);
}
