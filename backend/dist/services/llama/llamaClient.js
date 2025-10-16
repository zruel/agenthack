import axios from 'axios';
import { cfg } from '../../config.js';
export async function chat(messages, temperature = 0.2) {
    const url = `${cfg.llama.serverUrl}/v1/chat/completions`;
    const res = await axios.post(url, {
        model: cfg.llama.modelHint,
        messages,
        temperature,
        stream: false,
    });
    const text = res.data?.choices?.[0]?.message?.content || '';
    return text;
}
