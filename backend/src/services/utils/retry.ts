export async function retryWithBackoff<T>(fn: () => Promise<T>, opts: { retries?: number; baseMs?: number; jitter?: boolean } = {}) {
  const retries = opts.retries ?? 3;
  const baseMs = opts.baseMs ?? 50;
  const jitter = opts.jitter ?? true;
  let attempt = 0;
  let lastError: any;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const wait = baseMs * Math.pow(2, attempt) + (jitter ? Math.random() * baseMs : 0);
      await new Promise(r => setTimeout(r, wait));
      attempt++;
    }
  }
  throw lastError;
}