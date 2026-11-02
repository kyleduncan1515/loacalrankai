#!/usr/bin/env node
// Find small businesses across many Texas cities, one city at a time.
// Safe to stop and re-run: finished cities are skipped, half-finished ones resume.
// Usage: node tools/find-texas.mjs [--cities "Dallas, TX; Austin, TX"]
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, DATA, slugify, ROOT } from './lib/util.mjs';
import { ALL_NICHES } from './lib/niches.mjs';

// Ordered by size, Houston-area suburbs first (closest to Baytown).
export const TEXAS_CITIES = [
  'Pasadena, TX', 'Baytown, TX', 'Pearland, TX', 'League City, TX', 'Sugar Land, TX', 'Katy, TX', 'The Woodlands, TX', 'Conroe, TX', 'Galveston, TX', 'Beaumont, TX',
  'Dallas, TX', 'San Antonio, TX', 'Austin, TX', 'Fort Worth, TX', 'El Paso, TX', 'Arlington, TX', 'Corpus Christi, TX', 'Plano, TX', 'Lubbock, TX', 'Laredo, TX',
  'Irving, TX', 'Garland, TX', 'Frisco, TX', 'McKinney, TX', 'Amarillo, TX', 'Grand Prairie, TX', 'Brownsville, TX', 'Killeen, TX', 'Denton, TX', 'Mesquite, TX',
  'McAllen, TX', 'Waco, TX', 'Carrollton, TX', 'Midland, TX', 'Round Rock, TX', 'Abilene, TX', 'Odessa, TX', 'Richardson, TX', 'Tyler, TX', 'Lewisville, TX',
  'College Station, TX', 'San Angelo, TX', 'Allen, TX', 'Wichita Falls, TX', 'Edinburg, TX', 'Longview, TX', 'Bryan, TX', 'Temple, TX', 'New Braunfels, TX', 'Georgetown, TX',
];

const args = parseArgs();
const cities = args.cities ? String(args.cities).split(';').map((c) => c.trim()).filter(Boolean) : TEXAS_CITIES;
for (const [i, city] of cities.entries()) {
  const doneFile = join(DATA, `leads-all-${slugify(city)}.done.json`);
  const finished = existsSync(doneFile) && JSON.parse(readFileSync(doneFile, 'utf8')).length >= ALL_NICHES.length;
  if (finished) { console.log(`[${i + 1}/${cities.length}] ${city}: already done`); continue; }
  console.log(`[${i + 1}/${cities.length}] ${city}`);
  spawnSync(process.execPath, [join(ROOT, 'tools', 'find-leads.mjs'), '--city', city, '--niche', 'all', '--combined'], { stdio: 'inherit', env: process.env });
}
console.log('Done. Next: audit each city file, or run tools/process-texas.mjs');
