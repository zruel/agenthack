export function errorHandler(err, _req, res, _next) {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'Unexpected error';
    const details = err.details || undefined;
    res.status(status).json({ error: { code, message, details } });
}
