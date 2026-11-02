#!/usr/bin/env node
// After find-texas: check every city's websites, confirm claims in a real browser, merge into one
// Texas list, build previews and write emails. Safe to re-run: finished cities are skipped.
// Usage: node tools/process-texas.mjs [--top 400]
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, DATA, ROOT } from './lib/util.mjs';
import { readCsv, writeCsv } from './lib/csv.mjs';

const args = parseArgs();
const run = (script, ...a) => spawnSync(process.execPath, [join(ROOT, 'tools', script), ...a], { stdio: 'inherit', env: process.env });

const raw = readdirSync(DATA).filter((f) => /^leads-all-.+-tx\.csv$/.test(f) && !f.includes('texas'));
for (const f of raw) {
  const audited = join(DATA, f.replace(/\.csv$/, '-audited.csv'));
  if (existsSync(audited)) continue;
  console.log(`\n=== Checking websites: ${f}`);
  run('audit-sites.mjs', '--in', join(DATA, f), '--concurrency', '8');
  run('verify-claims.mjs', '--in', audited);
}

// Merge every city into one list, keeping the first copy of any business that appears in two cities.
const seen = new Set();
const all = [];
for (const f of readdirSync(DATA).filter((f) => /^leads-all-.+-tx-audited\.csv$/.test(f) && !f.includes('texas'))) {
  for (const l of readCsv(join(DATA, f))) {
    const k = `${l.name.toLowerCase()}|${(l.email || l.phone || l.address).toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    all.push(l);
  }
}
all.sort((a, b) => Number(b.score) - Number(a.score));
const merged = join(DATA, 'leads-all-texas-audited.csv');
writeCsv(merged, all);
console.log(`\nMerged ${all.length} businesses -> ${merged}`);
run('make-demos.mjs', '--in', merged, '--top', String(args.top ?? 400));
run('write-emails.mjs', '--in', merged, '--top', String(args.top ?? 400));
