import fs from 'fs';
import { sha256 } from './crypto';
export function fileEtag(filePath) {
    if (!fs.existsSync(filePath))
        return 'new';
    const stat = fs.statSync(filePath);
    const buf = fs.readFileSync(filePath);
    return `${stat.mtimeMs}-${sha256(buf)}`;
}
