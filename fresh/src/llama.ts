import axios from 'axios';
import { cfg } from './config';

export async function testGenerate(prompt: string) {
  const url = `${cfg.ollama.host}/api/generate`;
  const res = await axios.post(url, {
    model: cfg.ollama.model,
    prompt,
    stream: false,
    options: { temperature: 0.2 }
  });
  return res.data?.response || '';
}

export async function listModels() {
  const url = `${cfg.ollama.host}/api/tags`;
  const res = await axios.get(url);
  return res.data?.models || [];
}