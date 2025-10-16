import crypto from 'crypto';

export function sha256(input: string | Buffer) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function chainHash(prev: string, current: string) {
  return sha256(prev + current);
}