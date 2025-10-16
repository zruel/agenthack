import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import apiRouter from './api/routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
app.use(express.json({ limit: '1mb' }));
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: allowed.length ? allowed : '*', credentials: false }));
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.use('/api', apiRouter);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});