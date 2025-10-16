import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { ExcelStore } from '../excel/ExcelStore';

const policyPdf = process.env.POLICY_PDF || 'Asset Purchase Policy.pdf';
const policyCache = new ExcelStore(process.env.POLICY_CACHE_XLSX || 'Policy_Cache.xlsx');

function extractPolicies(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: { level: string; purchase_limit: number; approved_items_list: string }[] = [];
  let currentLevel = '';
  let currentLimit = 0;
  let currentItems: string[] = [];
  for (const line of lines) {
    const levelMatch = line.match(/level\s*([A-Za-z0-9]+)/i);
    const limitMatch = line.match(/(limit|purchase\s*limit)\s*[:\-]?\s*\$?([0-9,]+)/i);
    const itemsMatch = line.match(/approved\s*items?\s*[:\-]?\s*(.+)$/i);
    if (levelMatch) {
      if (currentLevel) {
        items.push({ level: currentLevel, purchase_limit: currentLimit, approved_items_list: currentItems.join(', ') });
        currentItems = [];
        currentLimit = 0;
      }
      currentLevel = levelMatch[1].toUpperCase();
    }
    if (limitMatch) {
      currentLimit = Number(limitMatch[2].replace(/,/g, ''));
    }
    if (itemsMatch) {
      currentItems = itemsMatch[1].split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    }
  }
  if (currentLevel) items.push({ level: currentLevel, purchase_limit: currentLimit, approved_items_list: currentItems.join(', ') });
  return items.filter(i => i.level && i.purchase_limit >= 0);
}

async function parseAndCache() {
  const abs = path.resolve(process.cwd(), policyPdf);
  if (!fs.existsSync(abs)) throw new Error(`Policy PDF not found: ${policyPdf}`);
  const data = await pdf(fs.readFileSync(abs));
  const items = extractPolicies(data.text);
  if (items.length === 0) throw new Error('No policy rows parsed; check PDF format.');
  const version = `v${Date.now()}`;
  const parsed_at = new Date().toISOString();
  const { workbook } = await policyCache.read();
  policyCache.writeRows(workbook, 'Policy', items.map(i => ({ ...i, version, parsed_at })));
  await policyCache.write(workbook);
  console.log(`Parsed ${items.length} policy rows into Policy_Cache.xlsx with version ${version}`);
}

parseAndCache().catch(err => {
  console.error('Policy parsing failed', err);
  process.exit(1);
});