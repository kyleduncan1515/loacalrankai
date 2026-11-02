#!/usr/bin/env node
// Step 1: find local businesses for free using OpenStreetMap (no API key, no card).
// Usage: node tools/find-leads.mjs --city "Dallas, TX" --niche roofer
//        --niche all            every business type in lib/niches.mjs
//        --niche plumber,hvac   a comma-separated list
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs, DATA, slugify } from './lib/util.mjs';
import { getNiche, ALL_NICHES } from './lib/niches.mjs';
import { writeCsv, readCsv } from './lib/csv.mjs';

const UA = 'LocalRankAI-lead-finder/1.0 (small business outreach research)';
const OVERPASS = [
  ...(process.env.OVERPASS_URL ? [process.env.OVERPASS_URL] : []),
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const args = parseArgs();
if (!args.city || !args.niche) {
  console.error('Usage: node tools/find-leads.mjs --city "Dallas, TX" --niche roofer');
  process.exit(1);
}
const nicheKeys = args.niche === 'all' ? ALL_NICHES : String(args.niche).split(',').map((s) => s.trim());
nicheKeys.forEach(getNiche); // validate up front

async function geocode(city) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Geocoding failed: HTTP ${res.status}`);
  const [hit] = await res.json();
  if (!hit) throw new Error(`Could not find "${city}". Try "City, State".`);
  const [s, n, w, e] = hit.boundingbox.map(Number);
  return { s, w, n, e, display: hit.display_name };
}

// Tries each free mirror; the one that last worked goes first. Retries a few rounds since they get busy.
async function overpass(query) {
  let lastErr;
  for (let round = 1; round <= 3; round++) {
    for (const endpoint of [...OVERPASS]) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query),
          signal: AbortSignal.timeout(200_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        OVERPASS.splice(OVERPASS.indexOf(endpoint), 1);
        OVERPASS.unshift(endpoint);
        return json;
      } catch (err) {
        lastErr = err;
        if (args.verbose) console.warn(`  ${new URL(endpoint).host} failed (${err.message})`);
      }
    }
    if (round < 3) await new Promise((r) => setTimeout(r, 15_000 * round));
  }
  throw new Error(`all map servers busy (${lastErr?.message}); re-run later with --niche <that type>`);
}

const box = await geocode(args.city);
console.log(`Searching ${box.display}`);
const bbox = `${box.s},${box.w},${box.n},${box.e}`;
const cityName = args.city.split(',')[0].trim().toLowerCase();

const label = nicheKeys.length > 1 ? (args.niche === 'all' ? 'all' : 'mixed') : nicheKeys[0];
const out = args.out ?? join(DATA, `leads-${label}-${slugify(args.city)}.csv`);
// Resume support: results are saved after every business type, so an interrupted run picks up where it stopped.
const doneFile = out.replace(/\.csv$/, '.done.json');
const done = new Set(!args.fresh && existsSync(doneFile) ? JSON.parse(readFileSync(doneFile, 'utf8')) : []);
const leads = done.size && existsSync(out) ? readCsv(out) : [];
const seen = new Set(leads.map((l) => `${l.name.toLowerCase()}|${l.phone || l.address}`));
if (done.size) console.log(`Resuming: ${done.size} business types already saved (${leads.length} businesses). Use --fresh to start over.`);
// --combined: fetch every business type in ONE request (much faster), then sort each result into its type.
const groups = args.combined ? [{ key: '__all__', keys: nicheKeys.filter((k) => !done.has(k)) }] : nicheKeys.map((k) => ({ key: k, keys: [k] }));
const nicheOf = (t, keys) => keys.find((k) => getNiche(k).osm.some((f) => { const [a, b] = f.split('='); return t[a] === b; }));
for (const group of groups) {
  if (!group.keys.length || (group.key !== '__all__' && done.has(group.key))) continue;
  const label = group.key === '__all__' ? `${group.keys.length} business types` : getNiche(group.key).plural;
  const filters = [...new Set(group.keys.flatMap((k) => getNiche(k).osm))].map((t) => {
    const [k, v] = t.split('=');
    return `nwr["${k}"="${v}"](${bbox});`;
  }).join('\n  ');
  let data;
  try {
    data = await overpass(`[out:json][timeout:170];\n(\n  ${filters}\n);\nout center tags;`);
  } catch (err) {
    console.warn(`  ${label}: skipped (${err.message})`);
    continue;
  }
  let added = 0;
  for (const el of data.elements ?? []) {
    const t = el.tags ?? {};
    const key = nicheOf(t, group.keys);
    if (!key) continue;
    if (!t.name) continue;
    if (t.brand || t['brand:wikidata']) continue; // chains/franchises aren't small businesses
    const address = [t['addr:housenumber'], t['addr:street'], t['addr:city'], t['addr:state'], t['addr:postcode']]
      .filter(Boolean).join(' ');
    const phone = t.phone || t['contact:phone'] || '';
    const key2 = `${t.name.toLowerCase()}|${phone || address}`;
    if (seen.has(key2)) continue;
    seen.add(key2);
    leads.push({
      name: t.name,
      niche: key,
      city: t['addr:city'] && t['addr:city'].toLowerCase() !== cityName ? `${t['addr:city']}, ${t['addr:state'] ?? ''}`.replace(/, $/, '') : args.city,
      phone,
      email: t.email || t['contact:email'] || '',
      website: t.website || t['contact:website'] || t.url || '',
      address,
      facebook: t['contact:facebook'] || t.facebook || '',
      source: `osm:${el.type}/${el.id}`,
    });
    added++;
  }
  group.keys.forEach((k) => done.add(k));
  writeCsv(out, leads);
  writeFileSync(doneFile, JSON.stringify([...done]));
  console.log(`  ${label}: ${added}  (saved, ${leads.length} total)`);
  if (nicheKeys.length > 1) await new Promise((r) => setTimeout(r, 2000)); // be polite to the free servers
}

writeCsv(out, leads);
const missing = nicheKeys.filter((k) => !done.has(k));
if (missing.length) console.log(`Not finished (servers busy): ${missing.join(', ')}. Run the same command again to continue.`);
const noSite = leads.filter((l) => !l.website).length;
console.log(`Found ${leads.length} small businesses (${noSite} with no website listed) -> ${out}`);
console.log('Next: node tools/audit-sites.mjs --in ' + out);
