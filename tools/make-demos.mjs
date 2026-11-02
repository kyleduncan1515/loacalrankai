#!/usr/bin/env node
// Step 3: build a free, personalized preview website for each top prospect.
// Output goes to demos/<slug>/index.html — deploy the demos/ folder free on Cloudflare Pages.
// Usage: node tools/make-demos.mjs --in data/leads-...-audited.csv [--top 25] [--include-no-email]
// By default only builds previews for businesses we can actually email.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, loadConfig, slugify, ROOT } from './lib/util.mjs';
import { readCsv, writeCsv } from './lib/csv.mjs';
import { renderSite } from './lib/site-template.mjs';

const args = parseArgs();
if (!args.in) {
  console.error('Usage: node tools/make-demos.mjs --in data/leads-...-audited.csv [--top 25]');
  process.exit(1);
}
const cfg = loadConfig();
const top = Number(args.top ?? 25);
const DEMOS = join(ROOT, 'demos');

export const demoSlug = (lead) => slugify(`${lead.name} ${lead.city.split(',')[0]}`);

const leads = readCsv(args.in)
  .filter((l) => Number(l.score) >= 10 && (l.email || args['include-no-email']))
  .slice(0, top);
for (const lead of leads) {
  const slug = demoSlug(lead);
  mkdirSync(join(DEMOS, slug), { recursive: true });
  writeFileSync(join(DEMOS, slug, 'index.html'), renderSite(lead, { mode: 'preview', cfg }));
  lead.demo_url = `${cfg.demoBaseUrl.replace(/\/$/, '')}/${slug}/`;
}
// Keep the root page blank so the list of prospects is never public.
writeFileSync(join(DEMOS, 'index.html'), '<!doctype html><meta name="robots" content="noindex"><title>Previews</title>');
writeCsv(args.in, readCsv(args.in).map((l) => ({ ...l, demo_url: leads.find((x) => x.name === l.name)?.demo_url ?? l.demo_url ?? '' })));
console.log(`Built ${leads.length} preview sites in demos/ (demo_url added to ${args.in})`);
console.log('Deploy free:  npx wrangler pages deploy demos --project-name localrank-demos');
