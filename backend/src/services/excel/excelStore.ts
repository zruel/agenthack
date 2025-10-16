import fs from 'fs';
import path from 'path';
import lockfile from 'proper-lockfile';
import XLSX from 'xlsx';
import { fileEtag } from '../utils/etag.js';
import { retryWithBackoff } from '../utils/retry.js';

export type Workbook = XLSX.WorkBook;

export async function readWorkbook(filePath: string) {
  return await retryWithBackoff(() => Promise.resolve(_read(filePath)));
}

export async function writeWorkbook(filePath: string, wb: Workbook, ifMatchEtag?: string) {
  return await retryWithBackoff(async () => {
    const etag = fileEtag(filePath);
    if (ifMatchEtag && etag !== ifMatchEtag) {
      const err = new Error('ETAG_MISMATCH');
      (err as any).code = 'ETAG_MISMATCH';
      throw err;
    }

    const release = await _lock(filePath);
    try {
      const tmp = filePath + '.tmp';
      XLSX.writeFile(wb, tmp, { bookType: 'xlsx' });
      fs.renameSync(tmp, filePath);
    } finally {
      await release();
    }
  }, { retries: 3, baseMs: 50, jitter: true });
}

function _read(filePath: string): Workbook {
  if (!fs.existsSync(filePath)) {
    const wb = XLSX.utils.book_new();
    return wb;
  }
  return XLSX.readFile(filePath);
}

async function _lock(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const release = await lockfile.lock(filePath, { retries: { retries: 3, factor: 2, minTimeout: 50 } });
  return release;
}

export function ensureSheet(wb: Workbook, sheetName: string, headers: string[]) {
  if (!wb.SheetNames.includes(sheetName)) {
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
}

export function appendRow(wb: Workbook, sheetName: string, row: any[]) {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  data.push(row);
  const newWs = XLSX.utils.aoa_to_sheet(data);
  wb.Sheets[sheetName] = newWs;
}

export function readSheet(wb: Workbook, sheetName: string): any[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
}