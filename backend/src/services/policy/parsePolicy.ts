import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { cfg } from '../../config.js';
import { sha256 } from '../utils/crypto.js';
import { savePolicyRows, PolicyRow } from '../excel/policyRepo.js';

function extractPolicy(text: string): PolicyRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows: PolicyRow[] = [];

  // Heuristic: find blocks that contain level and limit info
  let currentLevel: string | null = null;
  let currentLimit: number | null = null;
  let currentItems: string[] = [];

  const flush = () => {
    if (currentLevel && typeof currentLimit === 'number') {
      rows.push({
        level: currentLevel,
        purchase_limit: currentLimit,
        approved_items_list: currentItems.join(', '),
        version: '',
        parsed_at: ''
      });
    }
    currentLevel = null;
    currentLimit = null;
    currentItems = [];
  };

  for (const line of lines) {
    const levelMatch = line.match(/level\s*[:\-]?\s*(\w+)/i);
    const limitMatch = line.match(/(purchase\s*limit|limit)\s*[:\-]?\s*\$?([\d,]+)/i);
    const approvedMatch = line.match(/approved\s*items?\s*[:\-]?\s*(.+)$/i);

    if (levelMatch) {
      if (currentLevel) flush();
      currentLevel = levelMatch[1];
      continue;
    }
    if (limitMatch) {
      const raw = limitMatch[2].replace(/[,]/g, '');
      currentLimit = Number(raw);
      continue;
    }
    if (approvedMatch) {
      const items = approvedMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
      currentItems.push(...items);
      continue;
    }
    // table-like detection: e.g., Level, Limit, Items columns
    const cells = line.split(/\s{2,}|\t|\|/).map(c => c.trim()).filter(Boolean);
    if (cells.length >= 3 && /level/i.test(cells[0]) === false) {
      const maybeLevel = cells[0];
      const maybeLimit = cells[1].replace(/\$|,/g, '');
      const maybeItems = cells.slice(2).join(', ');
      if (maybeLevel && !isNaN(Number(maybeLimit))) {
        if (currentLevel) flush();
        currentLevel = maybeLevel;
        currentLimit = Number(maybeLimit);
        currentItems = maybeItems.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        flush();
      }
    }
  }
  if (currentLevel) flush();

  // Validate sample rows and checksum summary
  const checksum = sha256(rows.map(r => `${r.level}:${r.purchase_limit}:${r.approved_items_list}`).join('|'));
  if (rows.length === 0) {
    throw new Error('POLICY_PARSE_FAILED: No rows extracted');
  }
  // Simple validation: ensure numeric limits
  for (const r of rows) {
    if (typeof r.purchase_limit !== 'number' || isNaN(r.purchase_limit)) {
      throw new Error(`POLICY_PARSE_FAILED: Invalid limit for level ${r.level}`);
    }
  }
  console.log(`Policy parsed: ${rows.length} rows, checksum=${checksum}`);
  return rows;
}

export async function main() {
  const pdfPath = path.resolve(process.cwd(), cfg.paths.policyPdf);
  const buffer = fs.readFileSync(pdfPath);
  const parsed = await pdfParse(buffer);
  const rows = extractPolicy(parsed.text);
  const version = sha256(buffer);
  const parsedAt = new Date().toISOString();
  await savePolicyRows(rows, version, parsedAt);
  console.log(`Saved policy cache version=${version} at ${parsedAt}`);
}

if (process.argv[1] && process.argv[1].endsWith('parsePolicy.ts')) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}