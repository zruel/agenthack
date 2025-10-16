import crypto from 'crypto';
export function sha256(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}
export function chainHash(prev, current) {
    return sha256(prev + current);
}
