import nodemailer from 'nodemailer';

const provider = process.env.MAIL_PROVIDER || 'smtp';
const host = process.env.SMTP_HOST || 'localhost';
const port = Number(process.env.SMTP_PORT || 1025);
const secure = process.env.SMTP_SECURE === 'true';
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';
const from = process.env.MAIL_FROM || 'ABC Asset Agent <noreply@abc.local>';

let transporter: nodemailer.Transporter;
if (provider === 'smtp') {
  transporter = nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass } : undefined });
} else {
  transporter = nodemailer.createTransport({ jsonTransport: true });
}

export async function sendMail(to: string, subject: string, html: string) {
  const info = await transporter.sendMail({ from, to, subject, html });
  return info.messageId || 'local';
}

export function renderTemplate(name: string, data: Record<string, any>) {
  // Minimal inline templating using simple replacements
  const templates: Record<string, string> = {
    request_received: `<h2>Request Received</h2><p>Hi {{name}}, your request {{request_id}} for {{item_category}} (\${{amount}}) is now Pending.</p>`,
    approval_needed: `<h2>Approval Needed</h2><p>Request {{request_id}} requires your approval for {{name}} ({{level}}).</p>`,
    approved: `<h2>Approved</h2><p>Your request {{request_id}} has been approved.</p>`,
    rejected: `<h2>Rejected</h2><p>Your request {{request_id}} has been rejected.</p>`,
    sla_breach: `<h2>SLA Breach</h2><p>Request {{request_id}} is past its SLA due.</p>`
  };
  let html = templates[name] || '';
  for (const [k, v] of Object.entries(data)) {
    html = html.replaceAll(`{{${k}}}`, String(v));
  }
  return html;
}