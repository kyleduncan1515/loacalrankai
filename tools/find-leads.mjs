#!/usr/bin/env node
// Step 1: find local businesses for free using OpenStreetMap (no API key, no card).
// Usage: node tools/find-leads.mjs --city "Dallas, TX" --niche roofer
import { join } from 'node:path';
import { parseArgs, DATA, slugify } from './lib/util.mjs';
import { getNiche } from './lib/niches.mjs';
import { writeCsv } from './lib/csv.mjs';

const UA = 'LocalRankAI-lead-finder/1.0 (small business outreach research)';
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const args = parseArgs();
if (!args.city || !args.niche) {
  console.error('Usage: node tools/find-leads.mjs --city "Dallas, TX" --niche roofer');
  process.exit(1);
}
const niche = getNiche(args.niche);

async function geocode(city) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Geocoding failed: HTTP ${res.status}`);
  const [hit] = await res.json();
  if (!hit) throw new Error(`Could not find "${city}". Try "City, State".`);
  const [s, n, w, e] = hit.boundingbox.map(Number);
  return { s, w, n, e, display: hit.display_name };
}

async function overpass(query) {
  let lastErr;
  for (const endpoint of OVERPASS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      console.warn(`  ${new URL(endpoint).host} failed (${err.message}), trying next mirror...`);
    }
  }
  throw new Error(`All map servers failed: ${lastErr?.message}`);
}

const box = await geocode(args.city);
console.log(`Searching ${niche.plural} in ${box.display}`);
const bbox = `${box.s},${box.w},${box.n},${box.e}`;
const filters = niche.osm.map((t) => {
  const [k, v] = t.split('=');
  return `nwr["${k}"="${v}"](${bbox});`;
}).join('\n  ');
const data = await overpass(`[out:json][timeout:80];\n(\n  ${filters}\n);\nout center tags;`);

const seen = new Set();
const leads = [];
for (const el of data.elements ?? []) {
  const t = el.tags ?? {};
  if (!t.name) continue;
  const key = t.name.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  leads.push({
    name: t.name,
    niche: args.niche,
    city: args.city,
    phone: t.phone || t['contact:phone'] || '',
    email: t.email || t['contact:email'] || '',
    website: t.website || t['contact:website'] || t.url || '',
    address: [t['addr:housenumber'], t['addr:street'], t['addr:city'], t['addr:state'], t['addr:postcode']]
      .filter(Boolean).join(' '),
    facebook: t['contact:facebook'] || t.facebook || '',
    source: `osm:${el.type}/${el.id}`,
  });
}

const out = args.out ?? join(DATA, `leads-${args.niche}-${slugify(args.city)}.csv`);
writeCsv(out, leads);
const noSite = leads.filter((l) => !l.website).length;
console.log(`Found ${leads.length} businesses (${noSite} with no website listed) -> ${out}`);
console.log('Next: node tools/audit-sites.mjs --in ' + out);
