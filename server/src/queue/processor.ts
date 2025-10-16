import { ExcelStore } from '../excel/ExcelStore';
import dayjs from 'dayjs';
import { sendMail, renderTemplate } from '../services/mailer';

const requestsStore = new ExcelStore(process.env.REQUESTS_XLSX || 'Requests.xlsx');

export function startQueueProcessor() {
  setInterval(async () => {
    try {
      const { workbook, etag } = await requestsStore.read();
      const rows = requestsStore.readRows<any>(workbook, 'Requests');
      const pending = rows.filter(r => r.status === 'Pending').sort((a, b) => a.created_at.localeCompare(b.created_at));
      if (!pending.length) return;
      const next = pending[0];
      if (!next.justification || next.justification.trim().length < 3) {
        next.status = 'NeedsInfo';
        next.updated_at = new Date().toISOString();
        requestsStore.writeRows(workbook, 'Requests', rows);
        await requestsStore.write(workbook, etag);
        await sendMail(next.emailid, 'Request needs more info', renderTemplate('sla_breach', { request_id: next.request_id }));
        return;
      }
      // Notify approver if present
      if (next.approver_email) {
        await sendMail(next.approver_email, 'Approval needed', renderTemplate('approval_needed', { request_id: next.request_id, name: next.emailid, level: 'n/a' }));
      }
    } catch (e) {
      // swallow to keep loop running
    }
  }, 2000);
}