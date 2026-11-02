#!/usr/bin/env node
// Turn a paying customer's preview into their finished website.
//
// 1) Start a client file from their preview data (run once, after they pay):
//      node tools/go-live.mjs --init "Mcs Automotive"
//    -> clients/<slug>.json  (fill in what they send you: logo, photos, hours, about, domain...)
// 2) Build the live site:
//      node tools/go-live.mjs --client clients/<slug>.json
//    -> sites/<slug>/ (index.html, robots.txt, sitemap.xml, photos)
// 3) Upload sites/<slug>/ to its own Cloudflare Pages project (see tools/templates/go-live-checklist.md).
import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync } from 'node:fs';
import { join, basename, extname, resolve } from 'node:path';
import { parseArgs, loadConfig, slugify, ROOT, DATA } from './lib/util.mjs';
import { readCsv } from './lib/csv.mjs';
import { renderSite } from './lib/site-template.mjs';
import { NICHES } from './lib/niches.mjs';

const args = parseArgs();
const cfg = loadConfig();
const CLIENTS = join(ROOT, 'clients');
const SITES = join(ROOT, 'sites');

if (args.init) {
  const name = String(args.init).toLowerCase();
  const files = existsSync(DATA) ? readdirSync(DATA).filter((f) => f.endsWith('-audited.csv')) : [];
  const lead = files.flatMap((f) => readCsv(join(DATA, f))).find((l) => l.name.toLowerCase() === name);
  if (!lead) {
    console.error(`Couldn't find "${args.init}" in data/*-audited.csv. Check the exact business name.`);
    process.exit(1);
  }
  const slug = slugify(`${lead.name} ${lead.city.split(',')[0]}`);
  const n = NICHES[lead.niche] ?? NICHES.roofer;
  const client = {
    _instructions: 'Fill in what the customer sends you. Leave a field empty ("" or []) to use the default. Photos/logo can be web links or files in clients/<slug>/.',
    name: lead.name,
    niche: lead.niche,
    city: lead.city,
    phone: lead.phone,
    email: lead.email,
    address: lead.address,
    domain: '',
    headline: '',
    tagline: '',
    about: '',
    services: n.services,
    serviceArea: '',
    hours: [],
    logo: '',
    photos: [],
    color: '',
    paidOn: new Date().toISOString().slice(0, 10),
    plan: 'Website + Hosting',
  };
  mkdirSync(join(CLIENTS, slug), { recursive: true });
  const out = join(CLIENTS, `${slug}.json`);
  if (existsSync(out) && !args.force) {
    console.error(`${out} already exists (use --force to overwrite).`);
    process.exit(1);
  }
  writeFileSync(out, JSON.stringify(client, null, 2) + '\n');
  console.log(`Created ${out}. Put their logo/photos in clients/${slug}/ and fill in the file, then:`);
  console.log(`  node tools/go-live.mjs --client clients/${slug}.json`);
  process.exit(0);
}

if (!args.client) {
  console.error('Usage:\n  node tools/go-live.mjs --init "Business Name"\n  node tools/go-live.mjs --client clients/<slug>.json');
  process.exit(1);
}

const clientPath = resolve(String(args.client));
const biz = JSON.parse(readFileSync(clientPath, 'utf8'));
const slug = basename(clientPath, '.json');
const assetsDir = join(CLIENTS, slug);
const outDir = join(SITES, slug);
mkdirSync(join(outDir, 'img'), { recursive: true });

// Local image files get copied next to the site; web links are used as-is.
const localize = (ref, i) => {
  if (!ref || /^https?:\/\//.test(ref)) return ref;
  const src = existsSync(ref) ? ref : join(assetsDir, ref);
  if (!existsSync(src)) {
    console.warn(`  Skipping missing image: ${ref}`);
    return '';
  }
  const name = `${i}${extname(src).toLowerCase()}`;
  copyFileSync(src, join(outDir, 'img', name));
  return `img/${name}`;
};
const site = { ...biz, logo: localize(biz.logo, 'logo'), photos: (biz.photos || []).map((p, i) => localize(p, `photo-${i + 1}`)).filter(Boolean) };

const problems = [];
if (!site.phone && !site.email) problems.push('no phone or email: customers have no way to reach them');
if (!site.domain) problems.push('no domain yet: the site will work on its .pages.dev address until you add one');
if (/preview/i.test(JSON.stringify(site))) problems.push('the word "preview" appears in their details; double-check the text');

writeFileSync(join(outDir, 'index.html'), renderSite(site, { mode: 'live', cfg }));
const base = site.domain ? `https://${site.domain}` : '';
writeFileSync(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ''}`);
if (base) writeFileSync(join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc></url></urlset>\n`);

console.log(`Built live site -> sites/${slug}/`);
for (const p of problems) console.log(`  ! ${p}`);
console.log(`Next: upload the sites/${slug} folder to a new Cloudflare Pages project named "${slug.slice(0, 50)}"`);
