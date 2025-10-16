import jwt from 'jsonwebtoken';
export function requireAuth(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token)
        return res.status(401).json({ error: { code: 'unauthorized', message: 'Missing token' } });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        req.user = { emailid: decoded.emailid, role: decoded.role };
        next();
    }
    catch (e) {
        return res.status(401).json({ error: { code: 'unauthorized', message: 'Invalid token' } });
    }
}
export function requireRole(role) {
    return (req, res, next) => {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: { code: 'unauthorized', message: 'Missing auth' } });
        if (user.role !== role && user.role !== 'Admin') {
            return res.status(403).json({ error: { code: 'forbidden', message: 'Insufficient privileges' } });
        }
        next();
    };
}
