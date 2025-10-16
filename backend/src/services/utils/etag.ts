import fs from 'fs';
import { sha256 } from './crypto.js';

export function fileEtag(path: string) {
  const stat = fs.existsSync(path) ? fs.statSync(path) : undefined;
  const mtime = stat?.mtimeMs || 0;
  const content = fs.existsSync(path) ? fs.readFileSync(path) : Buffer.from('');
  const hash = sha256(content);
  return `${mtime}-${hash}`;
}