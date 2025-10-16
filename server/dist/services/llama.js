import axios from 'axios';
import { buildRetrievalContext, redactEligibility } from './retrieval';
import { approvalPredictionPrompt, qaPrompt } from './prompts';
const baseUrl = process.env.LLAMA_SERVER_URL || 'http://localhost:11434';
export async function predictApproval(eligibility, request) {
    const ctx = await buildRetrievalContext(eligibility);
    const input = approvalPredictionPrompt({ context: ctx, eligibility: redactEligibility(eligibility), request });
    const resp = await axios.post(`${baseUrl}/v1/chat/completions`, {
        model: process.env.LLAMA_MODEL_HINT || 'llama3',
        messages: [
            { role: 'system', content: 'You are a policy assistant. Ground all answers in provided context with citations.' },
            { role: 'user', content: input }
        ],
        temperature: 0.2,
        max_tokens: 256
    });
    return resp.data;
}
export async function answerPolicyQA(eligibility, question) {
    const ctx = await buildRetrievalContext(eligibility);
    const input = qaPrompt({ context: ctx, eligibility: redactEligibility(eligibility), question });
    const resp = await axios.post(`${baseUrl}/v1/chat/completions`, {
        model: process.env.LLAMA_MODEL_HINT || 'llama3',
        messages: [
            { role: 'system', content: 'You are a policy assistant. Ground all answers in provided context with citations.' },
            { role: 'user', content: input }
        ],
        temperature: 0.2,
        max_tokens: 512
    });
    return resp.data;
}
