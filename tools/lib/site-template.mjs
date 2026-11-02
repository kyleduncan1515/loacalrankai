// One template for both the free preview and the finished, live client site.
// mode 'preview': banner + hidden from Google.  mode 'live': no banner, SEO tags, LocalBusiness schema.
import { esc } from './util.mjs';
import { NICHES } from './niches.mjs';

export function renderSite(biz, { mode = 'preview', cfg = {} } = {}) {
  const n = NICHES[biz.niche] ?? NICHES.roofer;
  const live = mode === 'live';
  const city = (biz.city || '').split(',')[0];
  const color = biz.color || n.color;
  const services = biz.services?.length ? biz.services : n.services;
  const tel = (biz.phone || '').replace(/[^\d+]/g, '');
  const call = tel
    ? `<a class="btn" href="tel:${esc(tel)}">Call ${esc(biz.phone)}</a>`
    : biz.email ? `<a class="btn" href="mailto:${esc(biz.email)}">Email Us</a>` : `<a class="btn" href="#contact">Get a Quote</a>`;
  const title = `${biz.name} | ${n.label} in ${city}`;
  const description = biz.tagline || `${biz.name} provides ${n.label.toLowerCase()} services in ${city} and nearby areas. Call for a quote.`;
  const photos = (biz.photos || []).filter(Boolean);
  const hours = (biz.hours || []).filter(Boolean);

  const schema = live ? {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: biz.name,
    description,
    ...(biz.domain && { url: `https://${biz.domain}/` }),
    ...(biz.phone && { telephone: biz.phone }),
    ...(biz.email && { email: biz.email }),
    ...(biz.address && { address: biz.address }),
    ...(biz.serviceArea && { areaServed: biz.serviceArea }),
    ...(hours.length && { openingHours: hours }),
    ...(biz.logo && { logo: biz.logo }),
    ...(photos.length && { image: photos }),
  } : null;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${live ? '' : '<meta name="robots" content="noindex,nofollow">'}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${live && biz.domain ? `<link rel="canonical" href="https://${esc(biz.domain)}/">` : ''}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
${photos[0] ? `<meta property="og:image" content="${esc(photos[0])}">` : ''}
${schema ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>` : ''}
<style>
:root{--brand:${color};--ink:#1b1f24;--muted:#5b6470;--bg:#fff;--soft:#f4f6f8}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.55}
img{max-width:100%;display:block}
.preview{background:#111;color:#fff;font-size:13px;text-align:center;padding:8px 16px}
.preview a{color:#9fd3ff}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid #e6e9ed;position:sticky;top:0;background:#fff;z-index:2}
header strong{font-size:18px;display:flex;align-items:center;gap:10px}
header img{height:36px;width:auto}
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
.photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.photos img{border-radius:12px;aspect-ratio:4/3;object-fit:cover;width:100%}
.about p{max-width:720px;margin:0 auto;font-size:18px;color:var(--muted);text-align:center}
.why{background:var(--soft);max-width:none}.why .grid{max-width:1080px;margin:0 auto}
.why .card{background:#fff}
#contact{text-align:center}#contact p{color:var(--muted);font-size:18px;margin:6px 0}
#contact ul{list-style:none;padding:0;color:var(--muted)}
footer{padding:28px 20px;text-align:center;color:var(--muted);font-size:14px;border-top:1px solid #e6e9ed}
</style></head><body>
${live ? '' : `<div class="preview">Free preview built for ${esc(biz.name)} by ${esc(cfg.businessName)}. Not affiliated with or endorsed by ${esc(biz.name)}. Questions? <a href="mailto:${esc(cfg.replyEmail)}">${esc(cfg.replyEmail)}</a></div>`}
<header><strong>${biz.logo ? `<img src="${esc(biz.logo)}" alt="">` : ''}${esc(biz.name)}</strong>${call}</header>
<div class="hero">
  <h1>${esc(biz.headline || `${city}'s ${n.label} Team`)}</h1>
  <p>${esc(biz.tagline || `${biz.name} helps homeowners and businesses across ${city}. Call or send a message for a quote.`)}</p>
  ${call}
</div>
${biz.about ? `<section class="about"><h2>About Us</h2><p>${esc(biz.about)}</p></section>` : ''}
<section><h2>Our Services</h2><div class="grid">${services.map((s) => `<div class="card"><h3>${esc(s)}</h3><p>${esc(s)} for homes and businesses in ${esc(city)} and nearby areas.</p></div>`).join('')}</div></section>
${photos.length ? `<section><h2>Our Work</h2><div class="photos">${photos.map((p) => `<img src="${esc(p)}" alt="${esc(biz.name)} work" loading="lazy">`).join('')}</div></section>` : ''}
<section class="why"><h2>Why ${esc(city)} Calls Us</h2><div class="grid">
  <div class="card"><h3>Local</h3><p>Based in the ${esc(city)} area and serving ${esc(biz.serviceArea || 'neighbors nearby')}.</p></div>
  <div class="card"><h3>Easy to Reach</h3><p>Tap to call from your phone. Talk to a real person.</p></div>
  <div class="card"><h3>Clear Quotes</h3><p>Know what the job involves before work begins.</p></div>
</div></section>
<section id="contact"><h2>Get In Touch</h2>
  ${biz.address ? `<p>${esc(biz.address)}</p>` : ''}
  ${biz.phone ? `<p>${esc(biz.phone)}</p>` : ''}
  ${live && biz.email ? `<p><a href="mailto:${esc(biz.email)}">${esc(biz.email)}</a></p>` : ''}
  ${hours.length ? `<ul>${hours.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
  ${call}
</section>
<footer>&copy; ${new Date().getFullYear()} ${esc(biz.name)} &middot; ${esc(city)}</footer>
</body></html>`;
}
