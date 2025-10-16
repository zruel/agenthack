import crypto from 'crypto';
export function sha256(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}
export function chainHash(prevChainHash, eventHash) {
    return sha256(prevChainHash + eventHash);
}
