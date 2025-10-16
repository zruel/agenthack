const store = new Map();
export function idempotencyMiddleware(req, res, next) {
    if (req.method !== 'POST')
        return next();
    const key = req.headers['idempotency-key'];
    if (!key || typeof key !== 'string')
        return next();
    const existing = store.get(key);
    if (existing)
        return res.status(existing.status).json(existing.body);
    const origJson = res.json.bind(res);
    res.json = (body) => {
        store.set(key, { status: res.statusCode || 200, body });
        return origJson(body);
    };
    next();
}
