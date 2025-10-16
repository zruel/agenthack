import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type PathsConfig = {
  employeeXlsx: string;
  policyPdf: string;
  policyCacheXlsx: string;
  balancesXlsx: string;
  requestsXlsx: string;
  auditXlsx: string;
};

export const cfg = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'change-this-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),
  paths: {
    employeeXlsx: process.env.EMPLOYEE_XLSX || 'Employee_Data.xlsx',
    policyPdf: process.env.POLICY_PDF || 'Asset Purchase Policy.pdf',
    policyCacheXlsx: process.env.POLICY_CACHE_XLSX || 'Policy_Cache.xlsx',
    balancesXlsx: process.env.BALANCES_XLSX || 'Balances.xlsx',
    requestsXlsx: process.env.REQUESTS_XLSX || 'Requests.xlsx',
    auditXlsx: process.env.AUDIT_XLSX || 'Audit.xlsx',
  } as PathsConfig,
  mail: {
    provider: process.env.MAIL_PROVIDER || 'smtp',
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 1025),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'ABC Asset Agent <noreply@abc.local>',
  },
  sla: {
    statusToHours: {
      Pending: Number(process.env.SLA_PENDING_HOURS || 48),
      Approved: Number(process.env.SLA_APPROVED_HOURS || 0),
      Rejected: Number(process.env.SLA_REJECTED_HOURS || 0),
    },
  },
  llama: {
    serverUrl: process.env.LLAMA_SERVER_URL || 'http://localhost:8080',
    modelHint: process.env.LLAMA_MODEL_HINT || 'Llama-3-Instruct',
  },
};

export function ensurePathsExist() {
  const files = Object.values(cfg.paths);
  for (const file of files) {
    if (['Employee_Data.xlsx', 'Asset Purchase Policy.pdf'].includes(file)) {
      // Inputs expected to exist; warn if missing.
      if (!fs.existsSync(path.resolve(process.cwd(), file))) {
        console.warn(`Warning: expected input not found: ${file}`);
      }
    }
  }
}