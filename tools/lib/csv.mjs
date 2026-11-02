// Tiny dependency-free CSV reader/writer (RFC 4180 style quoting).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v !== '')) rows.push(row);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const quote = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(records, columns) {
  const cols = columns ?? [...new Set(records.flatMap((r) => Object.keys(r)))];
  return [cols.join(','), ...records.map((r) => cols.map((c) => quote(r[c])).join(','))].join('\n') + '\n';
}

export const readCsv = (path) => parseCsv(readFileSync(path, 'utf8'));

export function writeCsv(path, records, columns) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, toCsv(records, columns));
}
