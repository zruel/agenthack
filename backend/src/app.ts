import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { cfg } from './config.js';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { auditMiddleware } from './middleware/audit.js';
// TODO: Wire real routers when ready; temporarily using minimal endpoints to satisfy build.

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cors({ origin: cfg.allowedOrigins }));
  app.use(helmet());
  app.use(morgan('combined'));

  const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
  app.use(limiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Public route: eligibility can be available without JWT if explicitly desired, but we enforce JWT here.
  app.get('/eligibility', authMiddleware(['Employee', 'Approver', 'Admin']), auditMiddleware, (_req, res) => res.json({ ok: true }));
  app.get('/requests', authMiddleware(['Employee', 'Approver', 'Admin']), auditMiddleware, (_req, res) => res.json({ ok: true }));
  app.get('/balances', authMiddleware(['Employee', 'Approver', 'Admin']), auditMiddleware, (_req, res) => res.json({ ok: true }));
  app.get('/transactions', authMiddleware(['Employee', 'Approver', 'Admin']), auditMiddleware, (_req, res) => res.json({ ok: true }));
  app.get('/approvals', authMiddleware(['Approver', 'Admin']), auditMiddleware, (_req, res) => res.json({ ok: true }));

  app.use(errorHandler);
  return app;
}