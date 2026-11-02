#!/usr/bin/env node
// Step 4: write a personalized cold email + 2 follow-ups for every prospect with an email address.
// Usage: node tools/write-emails.mjs --in data/leads-...-audited.csv [--top 25]
// Output: data/emails-....csv (for mail merge) and data/emails-....md (easy copy/paste)
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, loadConfig, firstName, DATA } from './lib/util.mjs';
import { readCsv, writeCsv } from './lib/csv.mjs';
import { NICHES } from './lib/niches.mjs';

const args = parseArgs();
if (!args.in) {
  console.error('Usage: node tools/write-emails.mjs --in data/leads-...-audited.csv');
  process.exit(1);
}
const cfg = loadConfig();
const top = Number(args.top ?? 25);
// "Good morning" before noon Houston time, otherwise "Good afternoon". Override with --greeting morning|afternoon.
const houstonHour = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }));
const greeting = args.greeting ? `Good ${args.greeting}` : houstonHour < 12 ? 'Good morning' : 'Good afternoon';

function opener(lead, n) {
  const city = lead.city.split(',')[0];
  const issues = lead.issues.toLowerCase();
  if (lead.status === 'no-website')
    return `I was looking for ${n.plural} in ${city} and couldn't find a website for ${lead.name}. If you don't have one yet, a lot of ${n.pain} may never find you.`;
  if (lead.status === 'broken')
    return `I tried to visit your website (${lead.website}) and it showed an error page instead of your site. That means ${n.pain} are probably landing on a competitor instead.`;
  if (lead.status === 'down')
    return `I tried to visit your website (${lead.website}) and the address doesn't work anymore. That means ${n.pain} are probably landing on a competitor instead.`;
  if (issues.includes('mobile'))
    return `I pulled up ${lead.website} on my phone and it isn't built for mobile, so it's hard to read and tap. Most ${n.pain} are on a phone.`;
  if (issues.includes('https'))
    return `When I opened ${lead.website}, my browser flagged it as "Not secure," which scares off a lot of ${n.pain}.`;
  if (issues.includes('outdated'))
    return `I came across ${lead.website} and it looks like it hasn't been updated in a while (${lead.copyright_year}).`;
  if (issues.includes('tap-to-call'))
    return `I pulled up ${lead.website} on my phone and there's no tap-to-call button, so ${n.pain} have to copy your number by hand. A lot of them just call the next business instead.`;
  if (issues.includes('slow'))
    return `I tried ${lead.website} on my phone and it took ${lead.load_seconds} seconds to load. Most people give up after about 3 seconds and call someone else.`;
  return `I came across ${lead.name} while looking at ${n.plural} in ${city} and saw a few quick wins for your site and Google listing.`;
}

// Version B: shorter, no links at all (better inbox placement); offers to send the preview.
function shortOpener(lead, n) {
  const city = lead.city.split(',')[0];
  const issues = lead.issues.toLowerCase();
  const next = /salon|barber|beauty|grooming/.test(lead.niche) ? 'book with someone else' : 'call the next business';
  if (lead.status === 'no-website') return `I was looking for ${n.plural} in ${city} and couldn't find a website for ${lead.name}. A lot of people searching on their phone may never find you.`;
  if (lead.status === 'broken') return `I tried to visit your website and it's showing an error page instead of your site, so ${n.pain} are probably landing on a competitor instead.`;
  if (lead.status === 'down') return `I tried to visit your website and the address doesn't work anymore, so ${n.pain} are probably landing on a competitor instead.`;
  if (issues.includes('mobile')) return `I pulled up your website on my phone and it isn't built for mobile, so it's hard to read and tap.`;
  if (issues.includes('https')) return `When I opened your website, my browser flagged it as "Not secure," which scares off a lot of ${n.pain}.`;
  if (issues.includes('outdated')) return `I came across your website and it looks like it hasn't been updated since ${lead.copyright_year}.`;
  if (issues.includes('tap-to-call')) return `I pulled up your website on my phone and there's no tap-to-call button, so people have to copy your number by hand. A lot of them just ${next} instead.`;
  if (issues.includes('slow')) return `I tried your website on my phone and it took ${lead.load_seconds} seconds to load. Most people give up after about 3 seconds.`;
  return `I came across ${lead.name} and saw a few quick wins for your website.`;
}

function emails(lead) {
  const n = NICHES[lead.niche] ?? NICHES.roofer;
  const first = firstName(lead.name);
  const hi = `${greeting}${first ? ` ${first}` : ''},`;
  const local = cfg.yourCity && !/^your city/i.test(cfg.yourCity) ? `I'm a local web designer here in ${cfg.yourCity}, ` : '';
  const demo = lead.demo_url
    ? `${local ? local + 'so' : 'So'} I put together a free preview of what a new site could look like for you:\n${lead.demo_url}\n\nIt works great on phones and has a tap-to-call button.`
    : `${local ? local + 'and I' : 'I'} can put together a free preview of a new mobile-friendly site for you, with no cost and no obligation.`;
  const footer = `\n\n${cfg.yourName}\n${cfg.businessName}${cfg.siteUrl && !/your-business-site/.test(cfg.siteUrl) ? `\n${cfg.siteUrl}` : ''}\n${cfg.mailingAddress}\nNot interested? Just reply "no thanks" and I won't email again.`;
  const footerNoLink = `\n\n${cfg.yourName}\n${cfg.businessName}\n${cfg.mailingAddress}\nNot interested? Just reply "no thanks" and I won't email again.`;
  return {
    subject1: `${lead.name}: quick idea for your website`,
    body1: `${hi}\n\n${opener(lead, n)}\n\n${demo}\n\nIf you like it, I can make it live and keep it updated for a small monthly fee. Want me to send details?${footer}`,
    body1b: `${hi}\n\n${shortOpener(lead, n)}\n\nI'm a local web designer${cfg.yourCity && !/^your city/i.test(cfg.yourCity) ? ` in ${cfg.yourCity}` : ''} and I already put together a free preview of a new site for you. Want me to send you the link?${footerNoLink}`,
    subject2: `Re: ${lead.name}: quick idea for your website`,
    body2: `${hi}\n\nJust bumping this up in case it got buried.${lead.demo_url ? ` The preview is still here: ${lead.demo_url}` : ''}\n\nHappy to tweak anything (colors, photos, services) at no cost so you can see it exactly how you'd want it.${footer}`,
    subject3: `Re: ${lead.name}: quick idea for your website`,
    body3: `${hi}\n\nLast note from me. If now isn't the right time, no worries at all.\n\n${lead.demo_url ? `Your preview stays up here if you want it later: ${lead.demo_url}\n\n` : ''}It's $99/month with no setup fee and no contract, and that includes hosting and updates. Just reply "yes" anytime and I'll get it live for you.${footer}`,
  };
}

const all = readCsv(args.in);
// Only email businesses where we found a real, specific problem to talk about.
// Bounced and opted-out addresses (data/do-not-email.txt) are never emailed again.
const DNE = join(DATA, 'do-not-email.txt');
const sentTo = new Set(existsSync(DNE) ? readFileSync(DNE, 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim().toLowerCase()).filter(Boolean) : []);
// Not a fit: non-profits/government, and franchise dealerships (big companies with their own web teams).
// Placeholder addresses left in website templates, and corporate/franchise mail domains.
const FAKE_OR_CORPORATE_EMAIL = /@(mysite|mystore|example|domain|yourdomain|email|website|yoursite|company|regiscorp|planetbeach)\.(com|org|net)$|^(example|test|name|your|info@example)/i;
const NOT_A_BUSINESS = /\b(planet beach|local \d+|union|church|ministr|school|academy of|association|chamber|city of|county|isd|chevrolet|ford|toyota|honda|nissan|hyundai|kia|dodge|jeep|subaru|mazda|bmw|mercedes|lexus|dealership)\b/i;
const withEmail = all
  .filter((l) => l.email && Number(l.score) >= 10 && !NOT_A_BUSINESS.test(l.name) && !FAKE_OR_CORPORATE_EMAIL.test(l.email))
  // Drop weak "problems" (recent copyright year, site-builder only) and keep leads that still have a real one.
  .map((l) => ({ ...l, issues: l.issues.split('; ').filter((i) => i && i !== 'basic site builder'
    && !(i.startsWith('looks outdated') && Number(l.copyright_year) > new Date().getFullYear() - 4)).join('; ') }))
  .filter((l) => l.status !== 'ok' || l.issues)
  // one email per inbox and per business, even if they list two addresses or own two locations
  .filter((l) => {
    const keys = [l.email.toLowerCase(), `name:${l.name.toLowerCase()}`];
    if (keys.some((k) => sentTo.has(k))) return false;
    keys.forEach((k) => sentTo.add(k));
    return true;
  })
  .slice(0, top);
const rows = withEmail.map((l) => ({ email: l.email, name: l.name, phone: l.phone, demo_url: l.demo_url ?? '', ...emails(l) }));
const base = args.in.replace(/leads-/, 'emails-').replace(/-audited\.csv$|\.csv$/, '');
writeCsv(`${base}.csv`, rows);
writeFileSync(`${base}.md`, rows.map((r) =>
  `## ${r.name} <${r.email}>\n\n**Day 1: ${r.subject1}**\n\n${r.body1}\n\n**Day 4: ${r.subject2}**\n\n${r.body2}\n\n**Day 8: ${r.subject3}**\n\n${r.body3}\n`).join('\n---\n\n'));

const noEmail = all.filter((l) => !l.email && Number(l.score) >= 10).length;
console.log(`Wrote ${rows.length} email sequences -> ${base}.csv and ${base}.md`);
if (noEmail) console.log(`${noEmail} good prospects have no email listed; check their Facebook page or website contact form.`);
