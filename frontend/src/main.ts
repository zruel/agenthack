import './style.css';
import { getEligibility, submitRequest, approveRequest, rejectRequest, getTransactions, askPolicy, predictApproval, getPolicyForLevel, getBalance, adjustBalance, searchEmployees, setPurchaseLimit, countEmployees } from './api';

function showPage(id: string) {
  document.querySelectorAll<HTMLElement>('.page').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  // Single-page chat console: ensure Chat & Actions section is visible
  showPage('policy-qa');

  // Eligibility
  const eligForm = document.getElementById('eligibility-form') as HTMLFormElement | null;
  eligForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('eligibility-email') as HTMLInputElement).value.trim();
    const out = document.getElementById('eligibility-result') as HTMLPreElement;
    try {
      const data = await getEligibility(email);
      out.textContent = JSON.stringify(data, null, 2);
    } catch (err: any) {
      out.textContent = JSON.stringify(err?.response?.data || { error: 'request_failed', message: String(err) }, null, 2);
    }
  });

  // New Request
  const reqForm = document.getElementById('request-form') as HTMLFormElement | null;
  const predictBtn = document.getElementById('predict-btn') as HTMLButtonElement | null;
  reqForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const employeeid = (document.getElementById('req-employeeid') as HTMLInputElement).value.trim();
    const emailid = (document.getElementById('req-emailid') as HTMLInputElement).value.trim();
    const item = (document.getElementById('req-item') as HTMLInputElement).value.trim();
    const amount = Number((document.getElementById('req-amount') as HTMLInputElement).value);
    const justification = (document.getElementById('req-justification') as HTMLTextAreaElement).value.trim();
    const out = document.getElementById('request-result') as HTMLPreElement;
    try {
      const data = await submitRequest({ employeeid, emailid, item_category: item, amount, justification });
      out.textContent = JSON.stringify(data, null, 2);
    } catch (err: any) {
      out.textContent = JSON.stringify(err?.response?.data || { error: 'request_failed', message: String(err) }, null, 2);
    }
  });
  predictBtn?.addEventListener('click', async () => {
    const employeeid = (document.getElementById('req-employeeid') as HTMLInputElement).value.trim();
    const emailid = (document.getElementById('req-emailid') as HTMLInputElement).value.trim();
    const item = (document.getElementById('req-item') as HTMLInputElement).value.trim();
    const amount = Number((document.getElementById('req-amount') as HTMLInputElement).value);
    const justification = (document.getElementById('req-justification') as HTMLTextAreaElement).value.trim();
    const out = document.getElementById('predict-result') as HTMLPreElement;
    try {
      const data = await predictApproval({ employeeid, emailid, item_category: item, amount, justification });
      const msg = (data?.message?.content) || (data as any)?.response || JSON.stringify(data);
      out.textContent = String(msg);
    } catch (err: any) {
      out.textContent = JSON.stringify(err?.response?.data || { error: 'prediction_failed', message: String(err) }, null, 2);
    }
  });

  // Review
  (document.getElementById('approve-btn') as HTMLButtonElement | null)?.addEventListener('click', async () => {
    const id = (document.getElementById('rev-requestid') as HTMLInputElement).value.trim();
    const approver = (document.getElementById('rev-approver') as HTMLInputElement).value.trim();
    const notes = (document.getElementById('rev-notes') as HTMLTextAreaElement).value.trim();
    const out = document.getElementById('review-result') as HTMLPreElement;
    try {
      const data = await approveRequest(id, { approver_email: approver, notes });
      out.textContent = JSON.stringify(data, null, 2);
    } catch (err: any) {
      out.textContent = JSON.stringify(err?.response?.data || { error: 'approve_failed', message: String(err) }, null, 2);
    }
  });
  (document.getElementById('reject-btn') as HTMLButtonElement | null)?.addEventListener('click', async () => {
    const id = (document.getElementById('rev-requestid') as HTMLInputElement).value.trim();
    const approver = (document.getElementById('rev-approver') as HTMLInputElement).value.trim();
    const notes = (document.getElementById('rev-notes') as HTMLTextAreaElement).value.trim();
    const out = document.getElementById('review-result') as HTMLPreElement;
    try {
      const data = await rejectRequest(id, { approver_email: approver, notes });
      out.textContent = JSON.stringify(data, null, 2);
    } catch (err: any) {
      out.textContent = JSON.stringify(err?.response?.data || { error: 'reject_failed', message: String(err) }, null, 2);
    }
  });

  // Transactions
  (document.getElementById('tx-form') as HTMLFormElement | null)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const employeeid = (document.getElementById('tx-employeeid') as HTMLInputElement).value.trim();
    const from = (document.getElementById('tx-from') as HTMLInputElement).value;
    const to = (document.getElementById('tx-to') as HTMLInputElement).value;
    const out = document.getElementById('tx-result') as HTMLPreElement;
    try {
      const data = await getTransactions({ employeeid, from, to });
      out.textContent = JSON.stringify(data, null, 2);
    } catch (err: any) {
      out.textContent = JSON.stringify(err?.response?.data || { error: 'transactions_failed', message: String(err) }, null, 2);
    }
  });

  // Policy Chat
  const chatMessages = document.getElementById('chat-messages') as HTMLDivElement | null;
  const chatInputForm = document.getElementById('chat-form') as HTMLFormElement | null;
  const chatInput = document.getElementById('chat-input') as HTMLInputElement | null;
  const chatEmailEl = document.getElementById('qa-email') as HTMLInputElement | null;
  const predictForm = document.getElementById('chat-predict') as HTMLFormElement | null;
  const predItemEl = document.getElementById('pred-item') as HTMLInputElement | null;
  const predAmountEl = document.getElementById('pred-amount') as HTMLInputElement | null;
  const predJustEl = document.getElementById('pred-justification') as HTMLTextAreaElement | null;
  const predResultEl = document.getElementById('pred-result') as HTMLPreElement | null;
  // Actions
  const actEligibilityBtn = document.getElementById('act-eligibility') as HTMLButtonElement | null;
  const actRoleBtn = document.getElementById('act-role') as HTMLButtonElement | null;
  const balCheckForm = document.getElementById('balance-check') as HTMLFormElement | null;
  const balAdjustForm = document.getElementById('balance-adjust') as HTMLFormElement | null;
  const adjustDeltaEl = document.getElementById('adjust-delta') as HTMLInputElement | null;
  const adjustNotesEl = document.getElementById('adjust-notes') as HTMLInputElement | null;
  const txQuickForm = document.getElementById('tx-quick') as HTMLFormElement | null;
  const txFromEl = document.getElementById('txq-from') as HTMLInputElement | null;
  const txToEl = document.getElementById('txq-to') as HTMLInputElement | null;
  const reqQuickForm = document.getElementById('request-quick') as HTMLFormElement | null;
  const rqItemEl = document.getElementById('rq-item') as HTMLInputElement | null;
  const rqAmountEl = document.getElementById('rq-amount') as HTMLInputElement | null;
  const rqJustEl = document.getElementById('rq-just') as HTMLInputElement | null;
  const reviewApproveBtn = document.getElementById('rq-approve') as HTMLButtonElement | null;
  const reviewRejectBtn = document.getElementById('rq-reject') as HTMLButtonElement | null;
  const rqIdEl = document.getElementById('rq-id') as HTMLInputElement | null;
  const rqApproverEl = document.getElementById('rq-approver') as HTMLInputElement | null;
  let chatEmail = '';

  // Chat-only HR update flow state
  type PendingUpdate = {
    kind: 'set_purchase_limit' | 'adjust_available_balance';
    employee: { employeeid: string; emailid: string; name: string };
    delta?: number; // positive for increase, negative for decrease
    new_limit?: number;
    new_available?: number;
    notes?: string;
  };
  let pendingUpdate: PendingUpdate | null = null;

  // Step-by-step purchase request flow state
  type PendingRequest = {
    employeeid: string;
    emailid: string;
    step: 'item' | 'amount' | 'justification';
    item_category?: string;
    amount?: number;
    justification?: string;
  };
  let pendingRequest: PendingRequest | null = null;

  function maskEmail(email: string) {
    const [local, domain] = email.split('@');
    const head = local.slice(0, 2);
    return `${head}***@${domain}`;
  }

  function parseNumber(text: string) {
    const clean = text.replace(/[,\s]/g, '');
    const n = Number(clean);
    return Number.isFinite(n) ? n : NaN;
  }

  function normalizeQuotes(s: string) {
    return s.replace(/[’‘]/g, "'");
  }

  // Parse count questions like "how many managers" or "count of employees in Operations"
  function parseCountQuestion(input: string): null | { level?: string; department?: string; designation?: string } {
    const text = normalizeQuotes(input);
    const lower = text.toLowerCase();
    if (!/(how\s+many|count\s+of|total\s+number)/i.test(lower)) return null;
    // department: "in Operations department" or "in Operations"
    const deptMatch = text.match(/in\s+([A-Za-z &'-]+)(?:\s+department)?/i)?.[1];
    // role/designation: "how many managers" / "count of directors"
    const roleMatch = text.match(/(?:how\s+many|count\s+of)\s+([A-Za-z &'-]+?)s?(?:\s|\?|$)/i)?.[1];
    const filters: { level?: string; department?: string; designation?: string } = {};
    if (deptMatch) filters.department = deptMatch.trim();
    if (roleMatch) {
      const role = roleMatch.trim();
      // If user says "Senior IC", treat as level; otherwise as designation/role
      if (/senior\s*ic/i.test(role)) filters.level = role;
      else filters.designation = role;
    }
    // If no filters at all, return empty filters to get total employees
    if (!filters.level && !filters.department && !filters.designation) return {} as any;
    return filters;
  }

  function parseInstruction(input: string): null | { type: 'reduce_limit_by' | 'increase_limit_by' | 'set_limit_to'; name?: string; email?: string; employeeid?: string; amount: number; } {
    const text = normalizeQuotes(input);
    const lower = text.toLowerCase();
    // Try email extraction
    const emailMatch = text.match(/([\w.+-]+@[^\s]+)/);
    const email = emailMatch?.[1];
    // Employee ID like EMP046
    const empIdMatch = text.match(/\bEMP\d{3,}\b/i)?.[0];
    const employeeid = empIdMatch ? empIdMatch.toUpperCase() : undefined;
    // Name in possessive: "Amanda Tan's purchase limit"
    const namePoss = text.match(/([A-Za-z .'-]+)'s\s+purchase\s+limit/i)?.[1];
    const nameFor = text.match(/for\s+([A-Za-z .'-]+)/i)?.[1];
    const name = (namePoss || nameFor || '').trim() || undefined;
    // Amount patterns
    const byAmt = text.match(/by\s+\$?([0-9][0-9,\.]*)/i)?.[1];
    const toAmt = text.match(/to\s+\$?([0-9][0-9,\.]*)/i)?.[1];
    if ((/reduce|decrease/.test(lower)) && /purchase\s+limit/.test(lower) && byAmt) {
      const amt = parseNumber(byAmt);
      if (!Number.isFinite(amt)) return null;
      return { type: 'reduce_limit_by', name, email, employeeid, amount: amt };
    }
    if ((/increase|raise/.test(lower)) && /purchase\s+limit/.test(lower) && byAmt) {
      const amt = parseNumber(byAmt);
      if (!Number.isFinite(amt)) return null;
      return { type: 'increase_limit_by', name, email, employeeid, amount: amt };
    }
    if ((/set/.test(lower)) && /purchase\s+limit/.test(lower) && toAmt) {
      const amt = parseNumber(toAmt);
      if (!Number.isFinite(amt)) return null;
      return { type: 'set_limit_to', name, email, employeeid, amount: amt };
    }
    return null;
  }

  // Parse available balance instructions
  function parseBalanceInstruction(input: string): null | { type: 'reduce_balance_by' | 'increase_balance_by' | 'set_balance_to'; name?: string; email?: string; employeeid?: string; amount: number; } {
    const text = normalizeQuotes(input);
    const lower = text.toLowerCase();
    const emailMatch = text.match(/([\w.+-]+@[^\s]+)/);
    const email = emailMatch?.[1];
    const empIdMatch = text.match(/\bEMP\d{3,}\b/i)?.[0];
    const employeeid = empIdMatch ? empIdMatch.toUpperCase() : undefined;
    const namePoss = text.match(/([A-Za-z .'-]+)'s\s+available\s+balance/i)?.[1] || text.match(/([A-Za-z .'-]+)'s\s+balance/i)?.[1];
    const nameFor = text.match(/for\s+([A-Za-z .'-]+)/i)?.[1];
    const name = (namePoss || nameFor || '').trim() || undefined;
    const mentionBalance = /available\s+balance|balance/i.test(lower);
    const byAmt = text.match(/by\s+\$?([0-9][0-9,\.]*)/i)?.[1]
      || text.match(/with\s+plus\s+\$?([0-9][0-9,\.]*)/i)?.[1]
      || text.match(/with\s+minus\s+\$?([0-9][0-9,\.]*)/i)?.[1];
    const toAmt = text.match(/to\s+\$?([0-9][0-9,\.]*)/i)?.[1];
    if (mentionBalance && (/reduce|decrease/.test(lower)) && byAmt) {
      const amt = parseNumber(byAmt);
      if (!Number.isFinite(amt)) return null;
      return { type: 'reduce_balance_by', name, email, employeeid, amount: amt };
    }
    if (mentionBalance && (/increase|raise/.test(lower)) && byAmt) {
      const amt = parseNumber(byAmt);
      if (!Number.isFinite(amt)) return null;
      return { type: 'increase_balance_by', name, email, employeeid, amount: amt };
    }
    if (mentionBalance && (/set|update/.test(lower)) && toAmt) {
      const amt = parseNumber(toAmt);
      if (!Number.isFinite(amt)) return null;
      return { type: 'set_balance_to', name, email, employeeid, amount: amt };
    }
    // Special: "update balance with plus 100" (no explicit reduce/increase word)
    if (mentionBalance && /update/.test(lower) && byAmt) {
      const amt = parseNumber(byAmt);
      if (!Number.isFinite(amt)) return null;
      // Assume plus is increase, minus is reduce
      if (/minus/i.test(text)) return { type: 'reduce_balance_by', name, email, employeeid, amount: amt };
      return { type: 'increase_balance_by', name, email, employeeid, amount: amt };
    }
    return null;
  }

  async function resolveEmployee(name?: string, email?: string, employeeid?: string) {
    // 1) Direct lookup by employee ID
    if (employeeid) {
      const rows = await searchEmployees({ employeeid });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (row && row.employeeid) return row;
    }
    if (email) {
      const rows = await searchEmployees({ emailid: email });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (row && row.employeeid) return row;
    }
    if (name) {
      const rows = await searchEmployees({ name });
      const list: any[] = Array.isArray(rows) ? rows : [rows];
      // Prefer base record with email without '+' suffix
      const base = list.find(r => typeof r.emailid === 'string' && !r.emailid.includes('+')) || list[0];
      return base;
    }
    // 2) Fallback to current chat context email
    if (chatEmail) {
      try {
        const rows = await searchEmployees({ emailid: chatEmail });
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (row && row.employeeid) return row;
      } catch {}
    }
    return null;
  }

  async function startConfirmationFlow(instr: NonNullable<ReturnType<typeof parseInstruction>>) {
    const emp = await resolveEmployee(instr.name, instr.email, instr.employeeid);
    if (!emp || !emp.employeeid) {
      appendMessage('assistant', 'Employee not found. Provide a valid name or email.');
      return;
    }
    const elig = await getEligibility(emp.emailid);
    if (!elig || 'error' in elig) {
      appendMessage('assistant', 'Eligibility not found for the employee.');
      return;
    }
    let newLimit = elig.purchase_limit;
    let delta: number | undefined;
    if (instr.type === 'reduce_limit_by') { newLimit = Math.max(0, elig.purchase_limit - instr.amount); delta = -instr.amount; }
    else if (instr.type === 'increase_limit_by') { newLimit = elig.purchase_limit + instr.amount; delta = instr.amount; }
    else if (instr.type === 'set_limit_to') { newLimit = instr.amount; delta = undefined; }
    pendingUpdate = {
      kind: 'set_purchase_limit',
      employee: { employeeid: emp.employeeid, emailid: emp.emailid, name: emp.name },
      new_limit: newLimit,
      delta,
      notes: `HR update via chat: ${instr.type}`
    };
    const masked = maskEmail(emp.emailid);
    const verb = instr.type === 'set_limit_to'
      ? `setting purchase limit to ${newLimit}`
      : `${delta! < 0 ? 'reducing' : 'increasing'} purchase limit by ${Math.abs(delta!)}`;
    appendMessage('assistant', `Confirm ${verb} for ${emp.name} (${masked})? Reply 'Yes' or 'No'.`);
  }

  async function startBalanceConfirmationFlow(instr: NonNullable<ReturnType<typeof parseBalanceInstruction>>) {
    const emp = await resolveEmployee(instr.name, instr.email, instr.employeeid);
    if (!emp || !emp.employeeid) {
      appendMessage('assistant', 'Employee not found. Provide a valid name or email.');
      return;
    }
    const elig = await getEligibility(emp.emailid);
    if (!elig || 'error' in elig) {
      appendMessage('assistant', 'Eligibility not found for the employee.');
      return;
    }
    let target = elig.available_balance;
    let delta = 0;
    let verb = '';
    if (instr.type === 'reduce_balance_by') { delta = -instr.amount; target = Math.max(0, elig.available_balance + delta); verb = `reducing available balance by ${instr.amount}`; }
    else if (instr.type === 'increase_balance_by') { delta = instr.amount; target = elig.available_balance + delta; verb = `increasing available balance by ${instr.amount}`; }
    else if (instr.type === 'set_balance_to') { target = instr.amount; delta = target - elig.available_balance; verb = `setting available balance to ${target}`; }
    pendingUpdate = {
      kind: 'adjust_available_balance',
      employee: { employeeid: emp.employeeid, emailid: emp.emailid, name: emp.name },
      delta,
      new_available: target,
      notes: `HR update via chat: ${instr.type}`
    };
    const masked = maskEmail(emp.emailid);
    appendMessage('assistant', `Confirm ${verb} for ${emp.name} (${masked})? Reply 'Yes' or 'No'.`);
  }

  async function processConfirmation(answer: string) {
    if (!pendingUpdate) return false;
    if (!/^yes$/i.test(answer)) {
      appendMessage('assistant', 'No changes made.');
      pendingUpdate = null;
      return true;
    }
    const { employee, new_limit, delta, notes } = pendingUpdate;
    try {
      if (pendingUpdate.kind === 'set_purchase_limit' && typeof new_limit === 'number') {
        const resp = await setPurchaseLimit({ employeeid: employee.employeeid, new_limit, notes });
        const masked = maskEmail(employee.emailid);
        appendMessage('assistant', `Updated ${employee.name} (${masked}) purchase limit to ${resp.ytd_limit}. New available balance is ${resp.available_balance}.`);
      } else if (pendingUpdate.kind === 'adjust_available_balance' && typeof delta === 'number') {
        const resp = await adjustBalance({ employeeid: employee.employeeid, delta, notes });
        const masked = maskEmail(employee.emailid);
        const verb = delta < 0 ? 'reduced' : 'increased';
        appendMessage('assistant', `Available balance for ${employee.name} (${masked}) ${verb} by ${Math.abs(delta)}. New balance is ${resp.available_balance}.`);
      }
    } catch (err: any) {
      const e = err?.response?.data?.error || 'update_failed';
      appendMessage('assistant', `Update failed (${e}).`);
    } finally {
      pendingUpdate = null;
    }
    return true;
  }

  function appendMessage(role: 'user' | 'assistant', text: string) {
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function extractAmount(input: string): number | null {
    const m = input.match(/\$?([0-9][0-9,\.]+)/);
    if (!m) return null;
    const raw = m[1].replace(/,/g, '');
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function appendAssistantCard(title: string, rows: Array<[string, any]>) {
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = 'msg assistant';
    const itemsHtml = rows.map(([k, v]) => {
      const val = Array.isArray(v)
        ? `<ul>${v.map(x => `<li>${String(x)}</li>`).join('')}</ul>`
        : String(v);
      return `<tr><th>${k}</th><td>${val}</td></tr>`;
    }).join('');
    div.innerHTML = `<div class="card"><h4>${title}</h4><table class="kv-table">${itemsHtml}</table></div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Inline action helpers
  function appendAssistantActions(emp: { employeeid: string; emailid: string; name: string }) {
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = 'msg assistant';
    const id = `act-${emp.employeeid}-${Date.now()}`;
    div.innerHTML = `
      <div class="card actions">
        <p>Would you like to adjust balance or submit a purchase request for ${emp.name}?</p>
        <div class="btn-row">
          <button id="${id}-bal" class="btn">Adjust Balance</button>
          <button id="${id}-req" class="btn">Submit Request</button>
        </div>
      </div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    // Wire buttons
    const balBtn = document.getElementById(`${id}-bal`)!;
    const reqBtn = document.getElementById(`${id}-req`)!;
    balBtn.addEventListener('click', async () => {
      try {
        const bal = await getBalance(emp.employeeid);
        appendAssistantCard('Current Balance', [
          ['Employee ID', emp.employeeid],
          ['Available Balance', bal.available_balance],
          ['YTD Spend', bal.ytd_spend]
        ]);
      } catch (e: any) {
        try {
          const elig = await getEligibility(emp.emailid);
          if (elig && !('error' in elig)) {
            appendAssistantCard('Current Balance', [
              ['Employee ID', elig.employeeid],
              ['Available Balance', elig.available_balance],
              ['YTD Spend', elig.ytd_spend]
            ]);
          } else {
            appendMessage('assistant', 'Could not load balance info.');
          }
        } catch {
          appendMessage('assistant', 'Could not load balance info.');
        }
      } finally {
        appendMessage('assistant', 'Enter “increase balance by $100” or “reduce balance by $50”.');
        chatEmailEl && (chatEmailEl.value = emp.emailid);
        chatEmail = emp.emailid;
      }
    });
    reqBtn.addEventListener('click', () => {
      chatEmailEl && (chatEmailEl.value = emp.emailid);
      chatEmail = emp.emailid;
      pendingRequest = { employeeid: emp.employeeid, emailid: emp.emailid, step: 'item' };
      appendMessage('assistant', 'What is the item category?');
    });
  }

  async function processPendingRequest(answer: string): Promise<boolean> {
    if (!pendingRequest) return false;
    if (pendingRequest.step === 'item') {
      const item = answer.trim();
      if (!item) { appendMessage('assistant', 'Please specify the item category.'); return true; }
      pendingRequest.item_category = item;
      pendingRequest.step = 'amount';
      appendMessage('assistant', 'What is the amount?');
      return true;
    }
    if (pendingRequest.step === 'amount') {
      const amt = extractAmount(answer);
      if (amt === null || amt <= 0) { appendMessage('assistant', 'Please provide a valid positive amount (e.g., $250).'); return true; }
      pendingRequest.amount = amt;
      pendingRequest.step = 'justification';
      appendMessage('assistant', 'Please provide the justification.');
      return true;
    }
    if (pendingRequest.step === 'justification') {
      const just = answer.trim();
      if (!just) { appendMessage('assistant', 'Please provide a justification.'); return true; }
      pendingRequest.justification = just;
      try {
        const { employeeid, emailid, item_category, amount, justification } = pendingRequest;
        appendAssistantCard('Confirm Request', [
          ['Employee ID', employeeid],
          ['Item Category', item_category!],
          ['Amount', amount!],
          ['Justification', justification!]
        ]);
        const resp = await submitRequest({ employeeid, emailid, item_category: item_category!, amount: amount!, justification: justification! });
        appendAssistantCard('Request Submitted', [
          ['Request ID', resp.request_id || '—'],
          ['Status', resp.status || 'Submitted']
        ]);
      } catch (err: any) {
        const errObj = err?.response?.data?.error;
        const msg = errObj?.message || errObj?.code || String(err?.message || err || 'request_failed');
        appendMessage('assistant', `Request failed: ${msg}`);
      } finally {
        pendingRequest = null;
      }
      return true;
    }
    return false;
  }

  chatEmailEl?.addEventListener('change', () => {
    chatEmail = chatEmailEl.value.trim();
  });

  // Action: Check Eligibility
  actEligibilityBtn?.addEventListener('click', async () => {
    chatEmail = chatEmail || chatEmailEl?.value.trim() || '';
    if (!chatEmail) return appendMessage('assistant', 'Enter your email first.');
    try {
      const elig = await getEligibility(chatEmail);
      if (elig && !('error' in elig)) {
        appendAssistantCard('Eligibility', [
          ['Name', elig.name],
          ['Employee ID', elig.employeeid],
          ['Level', elig.employeelevel],
          ['Department', elig.department],
          ['Purchase Limit', elig.purchase_limit],
          ['Approved Items', elig.approved_items],
          ['YTD Spend', elig.ytd_spend],
          ['Available Balance', elig.available_balance]
        ]);
      } else {
        appendMessage('assistant', 'No eligibility found.');
      }
    } catch (err: any) {
      appendMessage('assistant', `Eligibility error: ${String(err?.message || err)}`);
    }
  });

  // Action: Check Role & Department
  actRoleBtn?.addEventListener('click', async () => {
    chatEmail = chatEmail || chatEmailEl?.value.trim() || '';
    if (!chatEmail) return appendMessage('assistant', 'Enter your email first.');
    try {
      const elig = await getEligibility(chatEmail);
      if (elig && !('error' in elig)) {
        appendAssistantCard('Your Role', [
          ['Employee ID', elig.employeeid],
          ['Level', elig.employeelevel],
          ['Department', elig.department],
          ['Manager', elig.manager || '—']
        ]);
      } else {
        appendMessage('assistant', 'No role info found.');
      }
    } catch (err: any) {
      appendMessage('assistant', `Role error: ${String(err?.message || err)}`);
    }
  });

  // Action: Load Balance
  balCheckForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    chatEmail = chatEmail || chatEmailEl?.value.trim() || '';
    if (!chatEmail) return appendMessage('assistant', 'Enter your email first.');
    try {
      const elig = await getEligibility(chatEmail);
      if (!elig || 'error' in elig) throw new Error('Eligibility not found');
      const bal = await getBalance(elig.employeeid);
      appendAssistantCard('Balance', [
        ['Employee ID', elig.employeeid],
        ['YTD Spend', bal.ytd_spend ?? elig.ytd_spend],
        ['Available Balance', bal.available_balance ?? elig.available_balance],
        ['Purchase Limit', bal.purchase_limit ?? elig.purchase_limit]
      ]);
    } catch (err: any) {
      appendMessage('assistant', `Balance error: ${String(err?.message || err)}`);
    }
  });

  // Action: Adjust Balance
  balAdjustForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    chatEmail = chatEmail || chatEmailEl?.value.trim() || '';
    if (!chatEmail) return appendMessage('assistant', 'Enter your email first.');
    const delta = Number(adjustDeltaEl?.value || 0);
    const notes = adjustNotesEl?.value.trim() || '';
    if (!delta) return appendMessage('assistant', 'Enter a non-zero adjustment amount.');
    try {
      const elig = await getEligibility(chatEmail);
      if (!elig || 'error' in elig) throw new Error('Eligibility not found');
      const bal = await adjustBalance({ employeeid: elig.employeeid, delta, notes });
      appendAssistantCard('Balance Adjusted', [
        ['Employee ID', elig.employeeid],
        ['Delta', delta],
        ['Notes', notes || '—'],
        ['YTD Spend', bal.ytd_spend],
        ['Available Balance', bal.available_balance]
      ]);
    } catch (err: any) {
      appendMessage('assistant', `Adjust error: ${String(err?.message || err)}`);
    }
  });

  // Action: Fetch Transactions
  txQuickForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    chatEmail = chatEmail || chatEmailEl?.value.trim() || '';
    if (!chatEmail) return appendMessage('assistant', 'Enter your email first.');
    const from = txFromEl?.value || '';
    const to = txToEl?.value || '';
    try {
      const elig = await getEligibility(chatEmail);
      if (!elig || 'error' in elig) throw new Error('Eligibility not found');
      const tx = await getTransactions({ employeeid: elig.employeeid, from, to });
      const rows = Array.isArray(tx) ? tx : [];
      appendAssistantCard('Transactions', [
        ['Count', rows.length],
        ['Latest', rows[0] ? `${rows[0].item_category} - ${rows[0].amount}` : '—']
      ]);
      appendMessage('assistant', JSON.stringify(rows, null, 2));
    } catch (err: any) {
      appendMessage('assistant', `Transactions error: ${String(err?.message || err)}`);
    }
  });

  // Action: Quick Request
  reqQuickForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    chatEmail = chatEmail || chatEmailEl?.value.trim() || '';
    if (!chatEmail) return appendMessage('assistant', 'Enter your email first.');
    const item_category = rqItemEl?.value.trim() || '';
    const amount = Number(rqAmountEl?.value || 0);
    const justification = rqJustEl?.value.trim() || '';
    if (!item_category || !amount || !justification) return appendMessage('assistant', 'Fill item, amount, and justification.');
    try {
      const elig = await getEligibility(chatEmail);
      if (!elig || 'error' in elig) throw new Error('Eligibility not found');
      const data = await submitRequest({ employeeid: elig.employeeid, emailid: chatEmail, item_category, amount, justification });
      appendAssistantCard('Request Submitted', [
        ['Request ID', data.request_id || '—'],
        ['Status', data.status || 'Submitted'],
        ['Item', item_category],
        ['Amount', amount]
      ]);
    } catch (err: any) {
      appendMessage('assistant', `Request error: ${String(err?.message || err)}`);
    }
  });

  // Action: Approve/Reject Quick
  reviewApproveBtn?.addEventListener('click', async () => {
    chatEmail = chatEmail || chatEmailEl?.value.trim() || '';
    const id = rqIdEl?.value.trim() || '';
    const approver_email = rqApproverEl?.value.trim() || '';
    if (!id || !approver_email) return appendMessage('assistant', 'Enter Request ID and Approver email.');
    try {
      const data = await approveRequest(id, { approver_email });
      appendAssistantCard('Approved', [['Request ID', id], ['Approver', approver_email], ['Status', data.status || 'Approved']]);
    } catch (err: any) {
      appendMessage('assistant', `Approve error: ${String(err?.message || err)}`);
    }
  });
  reviewRejectBtn?.addEventListener('click', async () => {
    chatEmail = chatEmail || chatEmailEl?.value.trim() || '';
    const id = rqIdEl?.value.trim() || '';
    const approver_email = rqApproverEl?.value.trim() || '';
    if (!id || !approver_email) return appendMessage('assistant', 'Enter Request ID and Approver email.');
    try {
      const data = await rejectRequest(id, { approver_email });
      appendAssistantCard('Rejected', [['Request ID', id], ['Approver', approver_email], ['Status', data.status || 'Rejected']]);
    } catch (err: any) {
      appendMessage('assistant', `Reject error: ${String(err?.message || err)}`);
    }
  });

  async function handleAsk(question: string) {
    // Capture any email mentioned inline in the question and remember it for personalization
    const emailInline = question.match(/([\w.+-]+@[A-Za-z0-9.-]+)/)?.[1];
    if (emailInline) chatEmail = emailInline.trim();
    chatEmail = chatEmail || chatEmailEl?.value?.trim() || '';
    appendMessage('user', question);
    // Count questions are answered via an API, no LLM required
    const countFilters = parseCountQuestion(question);
    if (countFilters) {
      try {
        const data = await countEmployees(countFilters);
        const subject = countFilters.designation ? countFilters.designation : (countFilters.level ? countFilters.level : 'employees');
        const where = countFilters.department ? ` in ${countFilters.department}` : '';
        appendMessage('assistant', `There are ${data.count} ${subject}${where}.`);
      } catch (err: any) {
        const e = err?.response?.data?.error || 'count_failed';
        appendMessage('assistant', `Count error (${e}). Please try again.`);
      }
      return;
    }
    // Direct employee lookup by ID like "details on EMP005"
    const empIdMatch = question.match(/\bEMP\d{3,}\b/i)?.[0];
    if (empIdMatch) {
      try {
        const empId = empIdMatch.toUpperCase();
        const rows = await searchEmployees({ employeeid: empId });
        const emp = Array.isArray(rows) ? rows[0] : rows;
        if (!emp || !emp.employeeid) {
          appendMessage('assistant', `No employee found for ${empId}.`);
          return;
        }
        chatEmail = emp.emailid || chatEmail;
        appendAssistantCard('Employee Details', [
          ['Name', emp.name],
          ['Employee ID', emp.employeeid],
          ['Email', emp.emailid],
          ['Level', emp.employeelevel || '—'],
          ['Department', emp.department || '—'],
          ['Designation', emp.designation || '—']
        ]);
        // Inline actions: adjust balance or submit request
        appendAssistantActions({ employeeid: emp.employeeid, emailid: emp.emailid, name: emp.name });
      } catch (err: any) {
        appendMessage('assistant', `Lookup error: ${String(err?.message || err)}`);
      }
      return;
    }
    // HR instruction parsing for chat-only updates
    const instr = parseInstruction(question);
    const balInstr = instr ? null : parseBalanceInstruction(question);
    if (instr || balInstr) {
      try {
        if (instr) await startConfirmationFlow(instr);
        else if (balInstr) await startBalanceConfirmationFlow(balInstr);
      } catch (err: any) {
        appendMessage('assistant', JSON.stringify({ error: 'parse_or_confirm_failed', message: String(err?.message || err) }));
      }
      return;
    }
    try {
      // For general policy Q&A, require a known email to personalize; otherwise give guidance
      if (!chatEmail) {
        appendMessage('assistant', 'For personalized answers, mention your company email in the chat (e.g., you@abc-company.com), or ask general count questions like “how many managers are there?”.');
        return;
      }
      // Fetch and render structured eligibility and policy tables first
      const elig = await getEligibility(chatEmail);
      if (!elig || ('error' in elig)) {
        appendMessage('assistant', 'I couldn’t find your record. Please verify your email or ask general questions (e.g., counts by role/department).');
        return;
      }
      appendAssistantCard('Your Eligibility', [
        ['Name', elig.name],
        ['Employee ID', elig.employeeid],
        ['Level', elig.employeelevel],
        ['Department', elig.department],
        ['Purchase Limit', elig.purchase_limit],
        ['Approved Items', elig.approved_items],
        ['YTD Spend', elig.ytd_spend],
        ['Available Balance', elig.available_balance]
      ]);
      try {
        const policy = await getPolicyForLevel(elig.employeelevel);
        appendAssistantCard(`Policy for ${elig.employeelevel}`, [
          ['Level', policy.level],
          ['Purchase Limit', policy.purchase_limit],
          ['Approved Items', (policy.approved_items_list || '').split(',').map((s: string) => s.trim()).filter(Boolean)],
          ['Version', policy.version],
          ['Parsed At', policy.parsed_at]
        ]);
      } catch {}
      const data = await askPolicy(chatEmail, question);
      const msg = (data?.message?.content) || (data as any)?.response || JSON.stringify(data);
      appendMessage('assistant', String(msg));
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || 'qa_failed';
      appendMessage('assistant', `Q&A error (${errMsg}). Try again later.`);
    }
  }

  chatInputForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = chatInput?.value.trim() || '';
    if (!q) return;
    chatInput!.value = '';
    if (pendingRequest) {
      const done = await processPendingRequest(q);
      if (done) return;
    }
    if (pendingUpdate) {
      const handled = await processConfirmation(q);
      if (!handled) await handleAsk(q);
    } else {
      await handleAsk(q);
    }
  });

  document.querySelectorAll<HTMLButtonElement>('.preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-question') || '';
      handleAsk(q);
    });
  });

  // Predict in chat
  predictForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    chatEmail = chatEmail || chatEmailEl?.value.trim() || '';
    if (!chatEmail) {
      appendMessage('assistant', 'Enter your email to predict approval.');
      return;
    }
    const item = predItemEl?.value.trim() || '';
    const amount = Number(predAmountEl?.value || 0);
    const justification = predJustEl?.value.trim() || '';
    try {
      const elig = await getEligibility(chatEmail);
      if (!elig || 'error' in elig) {
        appendMessage('assistant', 'Could not load eligibility for prediction.');
        return;
      }
      appendAssistantCard('Requested Item', [
        ['Item Category', item],
        ['Amount', amount],
        ['Justification', justification]
      ]);
      const resp = await predictApproval({ employeeid: elig.employeeid, emailid: chatEmail, item_category: item, amount, justification });
      const text = (resp?.message?.content) || (resp as any)?.response || '';
      appendMessage('assistant', text ? String(text) : 'Prediction completed.');
      if (predResultEl) predResultEl.textContent = String(text);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || 'prediction_failed';
      const msg = `Prediction error (${errMsg}).`;
      appendMessage('assistant', msg);
      if (predResultEl) predResultEl.textContent = msg;
    }
  });
});
