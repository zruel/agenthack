export async function retryWithBackoff(fn, retries = 5, baseMs = 50) {
    let attempt = 0;
    let lastErr;
    while (attempt < retries) {
        try {
            return await fn();
        }
        catch (err) {
            lastErr = err;
            const delay = baseMs * Math.pow(2, attempt) + Math.floor(Math.random() * 25);
            await new Promise((r) => setTimeout(r, delay));
            attempt++;
        }
    }
    throw lastErr;
}
