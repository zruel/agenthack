import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { cfg } from './config';
import { listModels, testGenerate } from './llama';

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/llama/test', async (req, res) => {
  try {
    const models = await listModels();
    const prompt = String(req.query.prompt || 'Say hello in one sentence.');
    const response = await testGenerate(prompt);
    res.json({ models, prompt, response, host: cfg.ollama.host, model: cfg.ollama.model });
  } catch (err: any) {
    res.status(500).json({ error: 'ollama_unavailable', message: err?.message || String(err) });
  }
});

const port = cfg.server.port;
app.listen(port, () => {
  console.log(`[fresh] server listening on http://localhost:${port}`);
});