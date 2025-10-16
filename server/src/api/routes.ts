import { Router } from 'express';
import { z } from 'zod';
import { getEligibilityByEmail } from '../eligibility/engine';
import { ExcelStore } from '../excel/ExcelStore';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';
import { approveRejectSchema, createRequestSchema } from './validators';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { answerPolicyQA, predictApproval } from '../services/llama';
import { loadPolicyCache } from '../policy/cache';
import { readEmployeesCsv } from '../excel/readEmployeesCsv';

export const router = Router();
router.use(idempotencyMiddleware);

const requestsStore = new ExcelStore(process.env.REQUESTS_XLSX || 'Requests.xlsx');
const balancesStore = new ExcelStore(process.env.BALANCES_XLSX || 'Balances.xlsx');
const employeeStore = new ExcelStore(process.env.EMPLOYEE_XLSX || 'Employee_Data.xlsx');

router.get('/eligibility', async (req, res, next) => {
  try {
    const emailid = String(req.query.emailid || '');
    if (!z.string().email().safeParse(emailid).success) return res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'No employee found for this email.' } });
    const data = await getEligibilityByEmail(emailid);
    if (!data) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No employee found for this email.' } });
    res.json(data);
  } catch (e) { next(e); }
});

// Employee search by name or email to support HR chat flows
router.get('/employees/search', async (req, res, next) => {
  try {
    const name = String(req.query.name || '').trim();
    const emailid = String(req.query.emailid || '').trim();
    const employeeid = String((req.query as any).employeeid || '').trim();
    // Prefer CSV if present, else fall back to Excel
    let list = readEmployeesCsv();
    if (!list.length) {
      const { workbook } = await employeeStore.read();
      const rows = employeeStore.readRows<any>(workbook, 'Employees');
      list = rows.map(r => ({
        emailid: r.emailid,
        employeeid: r.employeeid,
        name: r.name,
        designation: r.designation,
        employeelevel: r.employeelevel,
        department: r.department
      }));
    }
    if (emailid) list = list.filter(r => String(r.emailid).toLowerCase() === emailid.toLowerCase());
    if (employeeid) list = list.filter(r => String(r.employeeid).toLowerCase() === employeeid.toLowerCase());
    if (name) list = list.filter(r => String(r.name).toLowerCase().includes(name.toLowerCase()));
    if (!list.length) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No matching employees' } });
    res.json(list);
  } catch (e) { next(e); }
});

// Employee counts by role/level/department
router.get('/employees/count', async (req, res, next) => {
  try {
    const level = String(req.query.level || '').trim();
    const department = String(req.query.department || '').trim();
    // Allow either `designation` or `role` as the same filter
    const designation = String((req.query as any).designation || (req.query as any).role || '').trim();
    let list = readEmployeesCsv();
    if (!list.length) {
      const { workbook } = await employeeStore.read();
      const rows = employeeStore.readRows<any>(workbook, 'Employees');
      list = rows.map(r => ({
        emailid: r.emailid,
        employeeid: r.employeeid,
        name: r.name,
        designation: r.designation,
        employeelevel: r.employeelevel,
        department: r.department
      }));
    }
    if (level) list = list.filter(r => String(r.employeelevel || '').toLowerCase() === level.toLowerCase());
    if (department) list = list.filter(r => String(r.department || '').toLowerCase() === department.toLowerCase());
    if (designation) list = list.filter(r => String(r.designation || '').toLowerCase().includes(designation.toLowerCase()));
    res.json({ count: list.length, criteria: { level, department, designation } });
  } catch (e) { next(e); }
});

// Requests listing with filters
router.get('/requests', async (req, res, next) => {
  try {
    const employeeid = String(req.query.employeeid || '').trim();
    const status = String(req.query.status || '').trim();
    const { workbook } = await requestsStore.read();
    const rows = requestsStore.readRows<any>(workbook, 'Requests');
    let list = rows;
    if (employeeid) list = list.filter(r => String(r.employeeid).toLowerCase() === employeeid.toLowerCase());
    if (status) list = list.filter(r => String(r.status).toLowerCase() === status.toLowerCase());
    res.json(list);
  } catch (e) { next(e); }
});

router.post('/requests', async (req, res, next) => {
  try {
    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Validation failed', details: parsed.error.flatten() } });
    const { employeeid, emailid, item_category, amount, justification } = parsed.data;
    const eligibility = await getEligibilityByEmail(emailid);
    if (!eligibility || eligibility.employeeid !== employeeid) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No employee found for this email.' } });
    if (!eligibility.approved_items.includes(item_category)) {
      return res.status(400).json({ error: { code: 'ITEM_NOT_APPROVED', message: 'This item category isn’t approved for your level.' } });
    }
    if (amount > eligibility.available_balance) {
      return res.status(400).json({ error: { code: 'OVER_LIMIT', message: 'Requested amount exceeds your available balance.' } });
    }
    const { workbook, etag } = await requestsStore.read();
    const rows = requestsStore.readRows<any>(workbook, 'Requests');
    const now = dayjs();
    const reqId = nanoid();
    rows.push({ request_id: reqId, employeeid, emailid, item_category, amount, justification, status: 'Pending', approver_email: '', sla_due: now.add(48, 'hour').toISOString(), created_at: now.toISOString(), updated_at: now.toISOString() });
    requestsStore.writeRows(workbook, 'Requests', rows);
    await requestsStore.write(workbook, etag);
    res.status(201).json({ request_id: reqId, status: 'Pending' });
  } catch (e) { next(e); }
});

router.get('/requests/:id', async (req, res, next) => {
  try {
    const { workbook } = await requestsStore.read();
    const rows = requestsStore.readRows<any>(workbook, 'Requests');
    const r = rows.find(x => x.request_id === req.params.id);
    if (!r) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
    res.json(r);
  } catch (e) { next(e); }
});

async function finalizeTransaction(requestRow: any, status: 'Approved' | 'Rejected', approver_email: string, notes?: string) {
  const { workbook: balWb, etag: balEtag } = await balancesStore.read();
  const balRows = balancesStore.readRows<any>(balWb, 'Balances');
  const txRows = balancesStore.readRows<any>(balWb, 'Transactions');
  if (status === 'Approved') {
    const bal = balRows.find(b => String(b.employeeid) === String(requestRow.employeeid));
    const updatedSpend = Number(bal?.ytd_spend || 0) + Number(requestRow.amount);
    const updatedAvail = Number(bal?.ytd_limit || requestRow.amount) - updatedSpend;
    if (bal) { bal.ytd_spend = updatedSpend; bal.available_balance = updatedAvail; bal.last_update = new Date().toISOString(); }
    txRows.push({ tx_id: nanoid(), employeeid: requestRow.employeeid, amount: requestRow.amount, item_category: requestRow.item_category, status: 'Approved', approved_by: approver_email, approved_at: new Date().toISOString(), requested_at: requestRow.created_at, notes: notes || '' });
    balancesStore.writeRows(balWb, 'Balances', balRows);
    balancesStore.writeRows(balWb, 'Transactions', txRows);
    await balancesStore.write(balWb, balEtag);
  }
}

router.post('/requests/:id/approve', async (req, res, next) => {
  try {
    const parsed = approveRejectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Validation failed', details: parsed.error.flatten() } });
    const approver_email = parsed.data.approver_email;
    const notes = parsed.data.notes;
    const { workbook, etag } = await requestsStore.read();
    const rows = requestsStore.readRows<any>(workbook, 'Requests');
    const r = rows.find(x => x.request_id === req.params.id);
    if (!r) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
    if (r.status !== 'Pending') return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Request not pending' } });
    r.status = 'Approved';
    r.approver_email = approver_email;
    r.updated_at = new Date().toISOString();
    requestsStore.writeRows(workbook, 'Requests', rows);
    await requestsStore.write(workbook, etag);
    await finalizeTransaction(r, 'Approved', approver_email, notes);
    res.json({ request_id: r.request_id, status: r.status });
  } catch (e) { next(e); }
});

router.post('/requests/:id/reject', async (req, res, next) => {
  try {
    const parsed = approveRejectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Validation failed', details: parsed.error.flatten() } });
    const approver_email = parsed.data.approver_email;
    const { workbook, etag } = await requestsStore.read();
    const rows = requestsStore.readRows<any>(workbook, 'Requests');
    const r = rows.find(x => x.request_id === req.params.id);
    if (!r) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
    if (r.status !== 'Pending') return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Request not pending' } });
    r.status = 'Rejected';
    r.approver_email = approver_email;
    r.updated_at = new Date().toISOString();
    requestsStore.writeRows(workbook, 'Requests', rows);
    await requestsStore.write(workbook, etag);
    res.json({ request_id: r.request_id, status: r.status });
  } catch (e) { next(e); }
});

router.get('/balances', async (req, res, next) => {
  try {
    const employeeid = String(req.query.employeeid || '');
    const { workbook } = await balancesStore.read();
    const rows = balancesStore.readRows<any>(workbook, 'Balances');
    const bal = rows.find(b => String(b.employeeid) === employeeid);
    if (!bal) {
      // Fallback: prefer CSV-derived values; else use Excel
      try {
        const csvList = readEmployeesCsv();
        const empCsv = csvList.find(e => String(e.employeeid) === employeeid);
        if (empCsv) {
          const limit = Number(empCsv.purchase_limit || 0);
          const spend = Number(empCsv.ytd_spend || 0);
          const avail = empCsv.available_balance !== undefined ? Number(empCsv.available_balance) : Math.max(0, limit - spend);
          return res.json({
            employeeid,
            employeelevel: empCsv.employeelevel || '',
            ytd_spend: spend,
            ytd_limit: limit,
            available_balance: avail,
            last_update: new Date().toISOString(),
            carryover_policy_flag: 'reset'
          });
        }
        const { workbook: empWb } = await employeeStore.read();
        const empRows = employeeStore.readRows<any>(empWb, 'Employees');
        const emp = empRows.find(e => String(e.employeeid) === employeeid);
        if (emp) {
          const limit = Number(emp.purchase_limit || 0);
          const spend = Number(emp.ytd_spend || 0);
          const avail = Number(emp.available_balance || Math.max(0, limit - spend));
          return res.json({
            employeeid,
            employeelevel: emp.employeelevel || '',
            ytd_spend: spend || 0,
            ytd_limit: limit,
            available_balance: avail,
            last_update: new Date().toISOString(),
            carryover_policy_flag: 'reset'
          });
        }
      } catch {}
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No balance entry' } });
    }
    res.json(bal);
  } catch (e) { next(e); }
});

// Adjust balance manually (admin/operator action)
router.post('/balances/adjust', async (req, res, next) => {
  try {
    const schema = z.object({
      employeeid: z.string().min(1),
      delta: z.number(),
      notes: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Validation failed', details: parsed.error.flatten() } });
    const { employeeid, delta, notes } = parsed.data;

    const { workbook, etag } = await balancesStore.read();
    const balRows = balancesStore.readRows<any>(workbook, 'Balances');
    const txRows = balancesStore.readRows<any>(workbook, 'Transactions');
    let bal = balRows.find(b => String(b.employeeid) === String(employeeid));
    if (!bal) {
      bal = { employeeid, employeelevel: '', ytd_spend: 0, ytd_limit: 0, available_balance: 0, last_update: new Date().toISOString(), carryover_policy_flag: 'reset' };
      balRows.push(bal);
    }
    const currentSpend = Number(bal.ytd_spend || 0);
    const limit = Number(bal.ytd_limit || 0);
    let newSpend = currentSpend + Number(delta);
    if (newSpend < 0) newSpend = 0;
    // If limit is unknown (0), keep available as 0; otherwise recompute
    const newAvail = limit > 0 ? Math.max(0, limit - newSpend) : 0;
    bal.ytd_spend = newSpend;
    bal.available_balance = newAvail;
    bal.last_update = new Date().toISOString();
    balancesStore.writeRows(workbook, 'Balances', balRows);
    txRows.push({ tx_id: nanoid(), employeeid, amount: delta, item_category: 'ManualAdjust', status: 'Adjusted', approved_by: 'system', approved_at: new Date().toISOString(), requested_at: new Date().toISOString(), notes: notes || '' });
    balancesStore.writeRows(workbook, 'Transactions', txRows);
    await balancesStore.write(workbook, etag);
    res.json(bal);
  } catch (e) { next(e); }
});

// Set purchase limit (ytd_limit) and recompute available balance
router.post('/balances/set-limit', async (req, res, next) => {
  try {
    const schema = z.object({
      employeeid: z.string().min(1),
      new_limit: z.number().nonnegative(),
      notes: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Validation failed', details: parsed.error.flatten() } });
    const { employeeid, new_limit, notes } = parsed.data;

    const { workbook, etag } = await balancesStore.read();
    const balRows = balancesStore.readRows<any>(workbook, 'Balances');
    const txRows = balancesStore.readRows<any>(workbook, 'Transactions');
    let bal = balRows.find(b => String(b.employeeid) === String(employeeid));
    const now = new Date().toISOString();
    const prev_limit = Number(bal?.ytd_limit || 0);
    if (!bal) {
      bal = { employeeid, employeelevel: '', ytd_spend: 0, ytd_limit: new_limit, available_balance: new_limit, last_update: now, carryover_policy_flag: 'reset' };
      balRows.push(bal);
    } else {
      bal.ytd_limit = new_limit;
      const spend = Number(bal.ytd_spend || 0);
      bal.available_balance = Math.max(0, new_limit - spend);
      bal.last_update = now;
    }
    balancesStore.writeRows(workbook, 'Balances', balRows);
    txRows.push({ tx_id: nanoid(), employeeid, amount: new_limit - prev_limit, item_category: 'LimitAdjust', status: 'LimitAdjusted', approved_by: 'system', approved_at: now, requested_at: now, notes: notes || '' });
    balancesStore.writeRows(workbook, 'Transactions', txRows);
    await balancesStore.write(workbook, etag);
    res.json(bal);
  } catch (e) { next(e); }
});

router.get('/transactions', async (req, res, next) => {
  try {
    const employeeid = String(req.query.employeeid || '');
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    const { workbook } = await balancesStore.read();
    const rows = balancesStore.readRows<any>(workbook, 'Transactions');
    let list = rows.filter(r => String(r.employeeid) === employeeid);
    if (from) list = list.filter(r => dayjs(r.approved_at || r.requested_at).isAfter(dayjs(from)));
    if (to) list = list.filter(r => dayjs(r.approved_at || r.requested_at).isBefore(dayjs(to)));
    res.json(list);
  } catch (e) { next(e); }
});

// Policy Q&A via local Ollama
router.get('/qa', async (req, res, next) => {
  try {
    const emailid = String(req.query.emailid || '').trim();
    const question = String(req.query.question || '').trim();
    if (!z.string().email().safeParse(emailid).success) return res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Invalid email' } });
    if (!question) return res.status(400).json({ error: { code: 'INVALID_QUESTION', message: 'Question is required' } });
    const eligibility = await getEligibilityByEmail(emailid);
    if (!eligibility) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No employee found for this email.' } });
    const data = await answerPolicyQA(eligibility, question);
    res.json(data);
  } catch (e) { next(e); }
});

// Fetch policy row for a given level to support structured UI cards
router.get('/policy', async (req, res, next) => {
  try {
    const level = String(req.query.level || '').trim();
    if (!level) return res.status(400).json({ error: { code: 'INVALID_LEVEL', message: 'Level is required' } });
    const rows = await loadPolicyCache();
    const row = rows.find(r => r.level.toUpperCase() === level.toUpperCase());
    if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No policy row for level' } });
    res.json(row);
  } catch (e) { next(e); }
});

// Predict approval likelihood using LLaMA
router.post('/predict', async (req, res, next) => {
  try {
    const schema = z.object({
      employeeid: z.string().min(1),
      emailid: z.string().email(),
      item_category: z.string().min(1),
      amount: z.number().positive(),
      justification: z.string().min(1)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Validation failed', details: parsed.error.flatten() } });
    const { employeeid, emailid, item_category, amount, justification } = parsed.data;
    const eligibility = await getEligibilityByEmail(emailid);
    if (!eligibility || eligibility.employeeid !== employeeid) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No employee found for this email.' } });
    const data = await predictApproval(eligibility, { item_category, amount, justification });
    res.json(data);
  } catch (e) { next(e); }
});

export default router;