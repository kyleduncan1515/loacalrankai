#!/usr/bin/env node
// Step 2: check each lead's website and rank who most needs help.
// Usage: node tools/audit-sites.mjs --in data/leads-roofer-dallas-tx.csv
import { lookup } from 'node:dns/promises';
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
const IGNORE_EMAIL = /\.(png|jpe?g|gif|webp|svg)$|example\.|sentry|wixpress|godaddy|domain\.com|@mysite\.|@mystore\.|@yourdomain\.|@email\.com/i;

function findEmail(html) {
  return [...html.matchAll(/mailto:([^"'?\s>]+)/gi)].map((m) => { try { return decodeURIComponent(m[1]); } catch { return m[1]; } })
    .concat(html.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}(?:\.[a-z]{2,})?/gi) ?? [])
    .map((e) => e.toLowerCase())
    .find((e) => !IGNORE_EMAIL.test(e) && /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(e));
}

const FREEMAIL = /@(gmail|yahoo|hotmail|outlook|aol|icloud|live|msn|att|sbcglobal|comcast|me|ymail|protonmail)\./i;

async function audit(input) {
  const lead = { ...input };
  // No website listed, but the email is at their own domain? Then they almost certainly have a site there.
  if (!lead.website && lead.email && !FREEMAIL.test(lead.email)) lead.website = `https://${lead.email.split('@')[1]}`;
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
    const get = (url) => fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(15_000) });
    let res = await get(normalizeUrl(lead.website));
    // A broken deep link (old page) doesn't mean the site is broken: check their home page instead.
    if (res.status === 404 && new URL(res.url).pathname !== '/') {
      res = await get(new URL('/', res.url).href);
      r.website = res.url;
    }
    const html = (await res.text()).slice(0, 4_000_000);
    const secs = (Date.now() - started) / 1000;
    r.load_seconds = secs.toFixed(1);
    if ([400, 401, 403, 406, 429, 503].includes(res.status) || (res.status >= 300 && res.status < 400)) {
      // Bot protection or a redirect we could not follow: not proof the site is broken, so make no claim.
      r.status = 'unchecked';
      r.issues = `could not check (site blocked our checker, HTTP ${res.status})`;
      return r;
    }
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
      if (y <= THIS_YEAR - 4) { issues.push(`looks outdated (© ${y})`); r.score += 20; }
    }
    if (!/tel:/i.test(html)) { issues.push('no tap-to-call button'); r.score += 10; }
    if (/wix\.com|weebly|godaddysites|sites\.google/i.test(html + res.url)) { issues.push('basic site builder'); r.score += 5; }
    if (!lead.email) r.email = findEmail(html) ?? '';
    // No email on the home page? Check the usual contact pages too.
    for (const path of ['/contact', '/contact-us', '/about']) {
      if (r.email) break;
      try {
        const page = await fetch(new URL(path, res.url), { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8_000) });
        if (page.ok) r.email = findEmail((await page.text()).slice(0, 4_000_000)) ?? '';
      } catch { /* page missing or slow; skip */ }
    }
  } catch (err) {
    // Only call a site "down" when we're sure: its domain no longer exists. Anything else
    // (timeouts, network hiccups on our side) might be our problem, not theirs.
    const host = new URL(normalizeUrl(lead.website)).hostname;
    const dead = await lookup(host).then(() => false, (e) => e.code === 'ENOTFOUND');
    if (dead) {
      r.status = 'down';
      r.score = 95;
      issues.push('domain no longer works');
    } else {
      r.status = 'unchecked';
      issues.push(`could not check (${err.name === 'TimeoutError' ? 'timed out' : 'connection failed'})`);
    }
  }
  r.issues = issues.join('; ');
  // An email at a domain that doesn't exist will bounce (and hurt your sender reputation): drop it.
  if (r.email && !FREEMAIL.test(r.email)) {
    const exists = await lookup(r.email.split('@')[1]).then(() => true, (e) => e.code !== 'ENOTFOUND');
    if (!exists) r.email = '';
  }
  return r;
}

const leads = readCsv(args.in);
console.log(`Auditing ${leads.length} businesses...`);
let done = 0;
const results = await mapLimit(leads, Number(args.concurrency ?? 10), async (l) => {
  const r = await audit(l);
  if (++done % 100 === 0 || done === leads.length) process.stdout.write(process.stdout.isTTY ? `\r  ${done}/${leads.length}` : `  ${done}/${leads.length}\n`);
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
