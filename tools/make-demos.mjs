#!/usr/bin/env node
// Step 3: build a free, personalized preview website for each top prospect.
// Output goes to demos/<slug>/index.html — deploy the demos/ folder free on Cloudflare Pages.
// Usage: node tools/make-demos.mjs --in data/leads-...-audited.csv [--top 25] [--include-no-email]
// By default only builds previews for businesses we can actually email.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, loadConfig, slugify, esc, ROOT } from './lib/util.mjs';
import { readCsv, writeCsv } from './lib/csv.mjs';
import { NICHES } from './lib/niches.mjs';

const args = parseArgs();
if (!args.in) {
  console.error('Usage: node tools/make-demos.mjs --in data/leads-...-audited.csv [--top 25]');
  process.exit(1);
}
const cfg = loadConfig();
const top = Number(args.top ?? 25);
const DEMOS = join(ROOT, 'demos');

export const demoSlug = (lead) => slugify(`${lead.name} ${lead.city.split(',')[0]}`);

function page(lead) {
  const n = NICHES[lead.niche] ?? NICHES.roofer;
  const city = lead.city.split(',')[0];
  const tel = lead.phone.replace(/[^\d+]/g, '');
  const call = tel
    ? `<a class="btn" href="tel:${esc(tel)}">Call ${esc(lead.phone)}</a>`
    : `<a class="btn" href="#contact">Get a Quote</a>`;
  const services = n.services.map((s) => `<div class="card"><h3>${esc(s)}</h3><p>${esc(s)} for homes and businesses in ${esc(city)} and nearby areas.</p></div>`).join('');
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(lead.name)} | ${esc(n.label)} in ${esc(city)}</title>
<style>
:root{--brand:${n.color};--ink:#1b1f24;--muted:#5b6470;--bg:#fff;--soft:#f4f6f8}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.55}
.preview{background:#111;color:#fff;font-size:13px;text-align:center;padding:8px 16px}
.preview a{color:#9fd3ff}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid #e6e9ed;position:sticky;top:0;background:#fff;z-index:2}
header strong{font-size:18px}
.btn{display:inline-block;background:var(--brand);color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;white-space:nowrap}
header .btn{padding:9px 14px;font-size:14px}
.hero{padding:64px 20px;background:linear-gradient(135deg,var(--brand),#1b1f24);color:#fff;text-align:center}
.hero h1{font-size:clamp(28px,6vw,48px);margin:0 0 12px;line-height:1.15}
.hero p{font-size:18px;opacity:.92;max-width:640px;margin:0 auto 26px}
.hero .btn{background:#fff;color:var(--brand)}
section{padding:56px 20px;max-width:1080px;margin:0 auto}
h2{font-size:30px;margin:0 0 24px;text-align:center}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.card{background:var(--soft);border-radius:14px;padding:22px}
.card h3{margin:0 0 6px;color:var(--brand)}.card p{margin:0;color:var(--muted)}
.why{background:var(--soft);max-width:none}.why .grid{max-width:1080px;margin:0 auto}
.why .card{background:#fff}
#contact{text-align:center}#contact p{color:var(--muted);font-size:18px}
footer{padding:28px 20px;text-align:center;color:var(--muted);font-size:14px;border-top:1px solid #e6e9ed}
</style></head><body>
<div class="preview">Free preview built for ${esc(lead.name)} by ${esc(cfg.businessName)}. Not affiliated with or endorsed by ${esc(lead.name)}. Questions? <a href="mailto:${esc(cfg.replyEmail)}">${esc(cfg.replyEmail)}</a></div>
<header><strong>${esc(lead.name)}</strong>${call}</header>
<div class="hero">
  <h1>${esc(city)}'s ${esc(n.label)} Team</h1>
  <p>${esc(lead.name)} helps homeowners and businesses across ${esc(city)}. Call or send a message for a quote.</p>
  ${call}
</div>
<section><h2>Our Services</h2><div class="grid">${services}</div></section>
<section class="why"><h2>Why ${esc(city)} Calls Us</h2><div class="grid">
  <div class="card"><h3>Local</h3><p>Based in the ${esc(city)} area and serving neighbors nearby.</p></div>
  <div class="card"><h3>Easy to Reach</h3><p>Tap to call from your phone. Talk to a real person.</p></div>
  <div class="card"><h3>Clear Quotes</h3><p>Know what the job involves before work begins.</p></div>
</div></section>
<section id="contact"><h2>Get In Touch</h2>
  ${lead.address ? `<p>${esc(lead.address)}</p>` : ''}
  ${lead.phone ? `<p>${esc(lead.phone)}</p>` : ''}
  ${call}
</section>
<footer>&copy; ${new Date().getFullYear()} ${esc(lead.name)} &middot; ${esc(city)}</footer>
</body></html>`;
}

const leads = readCsv(args.in)
  .filter((l) => Number(l.score) > 0 && (l.email || args['include-no-email']))
  .slice(0, top);
for (const lead of leads) {
  const slug = demoSlug(lead);
  mkdirSync(join(DEMOS, slug), { recursive: true });
  writeFileSync(join(DEMOS, slug, 'index.html'), page(lead));
  lead.demo_url = `${cfg.demoBaseUrl.replace(/\/$/, '')}/${slug}/`;
}
// Keep the root page blank so the list of prospects is never public.
writeFileSync(join(DEMOS, 'index.html'), '<!doctype html><meta name="robots" content="noindex"><title>Previews</title>');
writeCsv(args.in, readCsv(args.in).map((l) => ({ ...l, demo_url: leads.find((x) => x.name === l.name)?.demo_url ?? l.demo_url ?? '' })));
console.log(`Built ${leads.length} preview sites in demos/ (demo_url added to ${args.in})`);
console.log('Deploy free:  npx wrangler pages deploy demos --project-name localrank-demos');
