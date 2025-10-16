import { loadPolicyCache, PolicyRow } from '../excel/policyRepo.js';
import { computeEligibility } from '../eligibility/eligibilityService.js';

export type RetrievedContext = {
  policyRows: PolicyRow[];
  eligibility: any; // redacted subset
};

export async function buildContext(emailid: string): Promise<RetrievedContext> {
  const policyRows = await loadPolicyCache();
  const elig = await computeEligibility(emailid);
  const redacted = elig && !('error' in elig) ? {
    employeelevel: elig.employeelevel,
    purchaselimit: elig.purchaselimit,
    approveditems: elig.approveditems,
    available_balance: elig.available_balance,
  } : {};
  return { policyRows, eligibility: redacted };
}

export function contextToText(ctx: RetrievedContext) {
  const policyText = ctx.policyRows.map(r => `Level=${r.level} | Limit=${r.purchase_limit} | ApprovedItems=${r.approved_items_list}`).join('\n');
  const eligText = ctx.eligibility && ctx.eligibility.employeelevel ? `Eligibility: level=${ctx.eligibility.employeelevel}, limit=${ctx.eligibility.purchaselimit}, available=${ctx.eligibility.available_balance}, items=${(ctx.eligibility.approveditems||[]).join(', ')}` : 'Eligibility: unavailable';
  return `Policy_Cache.xlsx[Policy]:\n${policyText}\n\nUserEligibility(redacted):\n${eligText}`;
}