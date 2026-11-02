#!/usr/bin/env node
// Step 2b: double-check "not mobile-friendly" and "no tap-to-call" in a real phone-sized browser.
// The quick audit reads raw HTML; many sites add these with JavaScript, so we confirm before we claim.
// Usage: node tools/verify-claims.mjs --in data/leads-...-audited.csv
import { createRequire } from 'node:module';
import { parseArgs, mapLimit } from './lib/util.mjs';
import { readCsv, writeCsv } from './lib/csv.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const args = parseArgs();
if (!args.in) {
  console.error('Usage: node tools/verify-claims.mjs --in data/leads-...-audited.csv');
  process.exit(1);
}

const WEIGHTS = { 'not mobile-friendly': 35, 'no tap-to-call button': 10 };
const leads = readCsv(args.in);
const todo = leads.filter((l) => l.status === 'ok' && /not mobile-friendly|no tap-to-call/.test(l.issues));
console.log(`Checking ${todo.length} sites in a real phone browser...`);

const browser = await chromium.launch();
let dropped = 0;
let done = 0;
await mapLimit(todo, 4, async (lead) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  try {
    await page.goto(lead.website, { timeout: 30_000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const seen = await page.evaluate(() => ({
      viewport: !!document.querySelector('meta[name=viewport]'),
      width: document.documentElement.scrollWidth,
      tel: !!document.querySelector('a[href^="tel:"]'),
    }));
    const issues = lead.issues.split('; ').filter(Boolean).filter((i) => {
      const fine = (i === 'not mobile-friendly' && seen.viewport && seen.width <= 420) || (i === 'no tap-to-call button' && seen.tel);
      if (fine) { lead.score = Number(lead.score) - WEIGHTS[i]; dropped++; }
      return !fine;
    });
    lead.issues = issues.join('; ');
  } catch {
    // Couldn't load it in the browser either: drop the claims rather than risk being wrong.
    for (const i of Object.keys(WEIGHTS)) if (lead.issues.includes(i)) lead.score = Number(lead.score) - WEIGHTS[i];
    lead.issues = lead.issues.split('; ').filter((i) => !WEIGHTS[i]).join('; ');
    dropped++;
  } finally {
    await ctx.close();
    if (++done % 25 === 0) console.log(`  ${done}/${todo.length}`);
  }
});
await browser.close();
leads.sort((a, b) => Number(b.score) - Number(a.score));
writeCsv(args.in, leads);
console.log(`Done. Removed ${dropped} claims that didn't hold up in a real browser -> ${args.in}`);
