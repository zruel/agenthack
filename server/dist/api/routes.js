import { Router } from 'express';
import { z } from 'zod';
import { getEligibilityByEmail } from '../eligibility/engine';
import { ExcelStore } from '../excel/ExcelStore';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';
import { approveRejectSchema, createRequestSchema } from './validators';
import { idempotencyMiddleware } from '../middleware/idempotency';
export const router = Router();
router.use(idempotencyMiddleware);
const requestsStore = new ExcelStore(process.env.REQUESTS_XLSX || 'Requests.xlsx');
const balancesStore = new ExcelStore(process.env.BALANCES_XLSX || 'Balances.xlsx');
router.get('/eligibility', async (req, res, next) => {
    try {
        const emailid = String(req.query.emailid || '');
        if (!z.string().email().safeParse(emailid).success)
            return res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'No employee found for this email.' } });
        const data = await getEligibilityByEmail(emailid);
        if (!data)
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No employee found for this email.' } });
        res.json(data);
    }
    catch (e) {
        next(e);
    }
});
router.post('/requests', async (req, res, next) => {
    try {
        const parsed = createRequestSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Validation failed', details: parsed.error.flatten() } });
        const { employeeid, emailid, item_category, amount, justification } = parsed.data;
        const eligibility = await getEligibilityByEmail(emailid);
        if (!eligibility || eligibility.employeeid !== employeeid)
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No employee found for this email.' } });
        if (!eligibility.approved_items.includes(item_category)) {
            return res.status(400).json({ error: { code: 'ITEM_NOT_APPROVED', message: 'This item category isn’t approved for your level.' } });
        }
        if (amount > eligibility.available_balance) {
            return res.status(400).json({ error: { code: 'OVER_LIMIT', message: 'Requested amount exceeds your available balance.' } });
        }
        const { workbook, etag } = await requestsStore.read();
        const rows = requestsStore.readRows(workbook, 'Requests');
        const now = dayjs();
        const reqId = nanoid();
        rows.push({ request_id: reqId, employeeid, emailid, item_category, amount, justification, status: 'Pending', approver_email: '', sla_due: now.add(48, 'hour').toISOString(), created_at: now.toISOString(), updated_at: now.toISOString() });
        requestsStore.writeRows(workbook, 'Requests', rows);
        await requestsStore.write(workbook, etag);
        res.status(201).json({ request_id: reqId, status: 'Pending' });
    }
    catch (e) {
        next(e);
    }
});
router.get('/requests/:id', async (req, res, next) => {
    try {
        const { workbook } = await requestsStore.read();
        const rows = requestsStore.readRows(workbook, 'Requests');
        const r = rows.find(x => x.request_id === req.params.id);
        if (!r)
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
        res.json(r);
    }
    catch (e) {
        next(e);
    }
});
async function finalizeTransaction(requestRow, status, approver_email, notes) {
    const { workbook: balWb, etag: balEtag } = await balancesStore.read();
    const balRows = balancesStore.readRows(balWb, 'Balances');
    const txRows = balancesStore.readRows(balWb, 'Transactions');
    if (status === 'Approved') {
        const bal = balRows.find(b => String(b.employeeid) === String(requestRow.employeeid));
        const updatedSpend = Number(bal?.ytd_spend || 0) + Number(requestRow.amount);
        const updatedAvail = Number(bal?.ytd_limit || requestRow.amount) - updatedSpend;
        if (bal) {
            bal.ytd_spend = updatedSpend;
            bal.available_balance = updatedAvail;
            bal.last_update = new Date().toISOString();
        }
        txRows.push({ tx_id: nanoid(), employeeid: requestRow.employeeid, amount: requestRow.amount, item_category: requestRow.item_category, status: 'Approved', approved_by: approver_email, approved_at: new Date().toISOString(), requested_at: requestRow.created_at, notes: notes || '' });
        balancesStore.writeRows(balWb, 'Balances', balRows);
        balancesStore.writeRows(balWb, 'Transactions', txRows);
        await balancesStore.write(balWb, balEtag);
    }
}
router.post('/requests/:id/approve', async (req, res, next) => {
    try {
        const parsed = approveRejectSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Validation failed', details: parsed.error.flatten() } });
        const approver_email = parsed.data.approver_email;
        const notes = parsed.data.notes;
        const { workbook, etag } = await requestsStore.read();
        const rows = requestsStore.readRows(workbook, 'Requests');
        const r = rows.find(x => x.request_id === req.params.id);
        if (!r)
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
        if (r.status !== 'Pending')
            return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Request not pending' } });
        r.status = 'Approved';
        r.approver_email = approver_email;
        r.updated_at = new Date().toISOString();
        requestsStore.writeRows(workbook, 'Requests', rows);
        await requestsStore.write(workbook, etag);
        await finalizeTransaction(r, 'Approved', approver_email, notes);
        res.json({ request_id: r.request_id, status: r.status });
    }
    catch (e) {
        next(e);
    }
});
router.post('/requests/:id/reject', async (req, res, next) => {
    try {
        const parsed = approveRejectSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Validation failed', details: parsed.error.flatten() } });
        const approver_email = parsed.data.approver_email;
        const { workbook, etag } = await requestsStore.read();
        const rows = requestsStore.readRows(workbook, 'Requests');
        const r = rows.find(x => x.request_id === req.params.id);
        if (!r)
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
        if (r.status !== 'Pending')
            return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Request not pending' } });
        r.status = 'Rejected';
        r.approver_email = approver_email;
        r.updated_at = new Date().toISOString();
        requestsStore.writeRows(workbook, 'Requests', rows);
        await requestsStore.write(workbook, etag);
        res.json({ request_id: r.request_id, status: r.status });
    }
    catch (e) {
        next(e);
    }
});
router.get('/balances', async (req, res, next) => {
    try {
        const employeeid = String(req.query.employeeid || '');
        const { workbook } = await balancesStore.read();
        const rows = balancesStore.readRows(workbook, 'Balances');
        const bal = rows.find(b => String(b.employeeid) === employeeid);
        if (!bal)
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No balance entry' } });
        res.json(bal);
    }
    catch (e) {
        next(e);
    }
});
router.get('/transactions', async (req, res, next) => {
    try {
        const employeeid = String(req.query.employeeid || '');
        const from = String(req.query.from || '');
        const to = String(req.query.to || '');
        const { workbook } = await balancesStore.read();
        const rows = balancesStore.readRows(workbook, 'Transactions');
        let list = rows.filter(r => String(r.employeeid) === employeeid);
        if (from)
            list = list.filter(r => dayjs(r.approved_at || r.requested_at).isAfter(dayjs(from)));
        if (to)
            list = list.filter(r => dayjs(r.approved_at || r.requested_at).isBefore(dayjs(to)));
        res.json(list);
    }
    catch (e) {
        next(e);
    }
});
export default router;
