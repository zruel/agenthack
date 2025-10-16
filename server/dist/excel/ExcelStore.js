import fs from 'fs';
import path from 'path';
import lockfile from 'proper-lockfile';
import crypto from 'crypto';
import XLSX from 'xlsx';
import { retryWithBackoff } from '../utils/retry';
function fileHash(filePath) {
    const buf = fs.readFileSync(filePath);
    const h = crypto.createHash('sha256').update(buf).digest('hex');
    return h;
}
export class ExcelStore {
    constructor(filePath) {
        this.filePath = filePath;
    }
    async read() {
        const abs = path.resolve(process.cwd(), this.filePath);
        if (!fs.existsSync(abs)) {
            const wb = XLSX.utils.book_new();
            return { workbook: wb, etag: 'new' };
        }
        const workbook = XLSX.readFile(abs);
        const stat = fs.statSync(abs);
        const etag = `${stat.mtimeMs}-${fileHash(abs)}`;
        return { workbook, etag };
    }
    async write(workbook, expectedEtag) {
        const abs = path.resolve(process.cwd(), this.filePath);
        await retryWithBackoff(async () => {
            let release = null;
            try {
                // Acquire lock
                await fs.promises.mkdir(path.dirname(abs), { recursive: true });
                release = await lockfile.lock(abs, { retries: { retries: 5, factor: 1.5, minTimeout: 50, maxTimeout: 500 } }).catch(async () => {
                    // If file doesn't exist, lock the directory to serialize creation
                    return await lockfile.lock(path.dirname(abs));
                });
                if (expectedEtag && fs.existsSync(abs)) {
                    const currentEtag = `${fs.statSync(abs).mtimeMs}-${fileHash(abs)}`;
                    if (currentEtag !== expectedEtag) {
                        const err = new Error('etag_mismatch');
                        err.status = 409;
                        throw err;
                    }
                }
                const tmp = abs + '.tmp';
                XLSX.writeFile(workbook, tmp);
                await fs.promises.rename(tmp, abs);
            }
            finally {
                if (release)
                    await release();
            }
        }, 5, 50);
    }
    sheet(wb, name) {
        let ws = wb.Sheets[name];
        if (!ws) {
            ws = XLSX.utils.aoa_to_sheet([[]]);
            XLSX.utils.book_append_sheet(wb, ws, name);
        }
        return ws;
    }
    readRows(wb, sheetName) {
        const ws = this.sheet(wb, sheetName);
        return XLSX.utils.sheet_to_json(ws);
    }
    writeRows(wb, sheetName, rows) {
        const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        wb.Sheets[sheetName] = ws;
    }
}
