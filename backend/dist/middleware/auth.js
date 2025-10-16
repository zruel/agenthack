import jwt from 'jsonwebtoken';
import { cfg } from '../config.js';
export function authMiddleware(allowedRoles = ['Employee']) {
    return (req, res, next) => {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (!token) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
        }
        try {
            const decoded = jwt.verify(token, cfg.jwtSecret);
            if (!allowedRoles.includes(decoded.role)) {
                return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
            }
            req.user = decoded;
            next();
        }
        catch (e) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
        }
    };
}
