#!/usr/bin/env node
// Step 2: check each lead's website and rank who most needs help.
// Usage: node tools/audit-sites.mjs --in data/leads-roofer-dallas-tx.csv
import { parseArgs, mapLimit } from './lib/util.mjs';
import { readCsv, writeCsv } from './lib/csv.mjs';

const args = parseArgs();
if (!args.in) {
  console.error('Usage: node tools/audit-sites.mjs --in data/leads-....csv');
  process.exit(1);
}
const THIS_YEAR = new Date().getFullYear();
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36';

const normalizeUrl = (u) => (/^https?:\/\//i.test(u) ? u : `http://${u}`);
const IGNORE_EMAIL = /\.(png|jpe?g|gif|webp|svg)$|example\.|sentry|wixpress|godaddy|domain\.com/i;

async function audit(lead) {
  const r = { ...lead, status: '', issues: '', score: 0, load_seconds: '', copyright_year: '', title: '' };
  const issues = [];
  if (!lead.website) {
    r.status = 'no-website';
    r.score = 100;
    r.issues = 'no website';
    return r;
  }
  const started = Date.now();
  try {
    const res = await fetch(normalizeUrl(lead.website), {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    const html = (await res.text()).slice(0, 500_000);
    const secs = (Date.now() - started) / 1000;
    r.load_seconds = secs.toFixed(1);
    if (!res.ok) {
      r.status = 'broken';
      r.score = 90;
      r.issues = `site returns error ${res.status}`;
      return r;
    }
    r.status = 'ok';
    r.title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '').trim().slice(0, 120);
    if (!res.url.startsWith('https://')) { issues.push('no https (browsers show "Not secure")'); r.score += 25; }
    if (!/<meta[^>]+name=["']?viewport/i.test(html)) { issues.push('not mobile-friendly'); r.score += 35; }
    if (secs > 4) { issues.push(`slow to load (${secs.toFixed(1)}s)`); r.score += 15; }
    const years = [...html.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1]));
    if (years.length) {
      const y = Math.max(...years);
      r.copyright_year = y;
      if (y <= THIS_YEAR - 3) { issues.push(`looks outdated (© ${y})`); r.score += 20; }
    }
    if (!/tel:/i.test(html)) { issues.push('no tap-to-call button'); r.score += 10; }
    if (/wix\.com|weebly|godaddysites|sites\.google/i.test(html + res.url)) { issues.push('basic site builder'); r.score += 5; }
    if (!lead.email) {
      const found = [...html.matchAll(/mailto:([^"'?\s>]+)/gi)].map((m) => decodeURIComponent(m[1]))
        .concat(html.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? [])
        .find((e) => !IGNORE_EMAIL.test(e));
      if (found) r.email = found.toLowerCase();
    }
  } catch (err) {
    r.status = 'down';
    r.score = 95;
    issues.push(`site won't load (${err.name === 'TimeoutError' ? 'timed out' : err.message})`);
  }
  r.issues = issues.join('; ');
  return r;
}

const leads = readCsv(args.in);
console.log(`Auditing ${leads.length} businesses...`);
let done = 0;
const results = await mapLimit(leads, 6, async (l) => {
  const r = await audit(l);
  process.stdout.write(`\r  ${++done}/${leads.length}`);
  return r;
});
results.sort((a, b) => b.score - a.score);
const out = args.out ?? args.in.replace(/\.csv$/, '-audited.csv');
writeCsv(out, results);

const count = (s) => results.filter((r) => r.status === s).length;
console.log(`\nDone -> ${out}`);
console.log(`  no website: ${count('no-website')} | down/broken: ${count('down') + count('broken')} | have email: ${results.filter((r) => r.email).length}`);
console.log(`  Top 5 prospects:`);
for (const r of results.slice(0, 5)) console.log(`   [${r.score}] ${r.name} — ${r.issues || 'looks fine'}`);
console.log('Next: node tools/make-demos.mjs --in ' + out + '   then   node tools/write-emails.mjs --in ' + out);
