// Termini – builds static city pages for Google (free, runs in GitHub Actions).
// Reads public salon data with the Supabase anon key from config.js and writes:
//   qytet/index.html, qytet/<city>/index.html, qytet/cities.json, sitemap.xml, robots.txt
// Run locally: node tools/build-seo.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url).pathname;
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(root + 'config.js', 'utf8'), sandbox);
const C = sandbox.window.TERMINI_CONFIG || {};
const SITE = (process.env.SITE_URL || C.SITE_URL || '').replace(/\/?$/, '/');
const URL_ = process.env.SUPABASE_URL || C.SUPABASE_URL, KEY = process.env.SUPABASE_ANON_KEY || C.SUPABASE_ANON_KEY;
const APP = C.APP_NAME || 'Termini';
const today = new Date().toISOString().slice(0, 10);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => String(s).toLowerCase().replace(/ë/g, 'e').replace(/ç/g, 'c').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CAT = { barber: ['Berber', 'Berberë', 'HairSalon'], salon: ['Sallon bukurie', 'Sallone bukurie', 'BeautySalon'], nails: ['Thonjtë', 'Studio thonjsh', 'NailSalon'], spa: ['Spa / Masazh', 'Spa dhe masazh', 'DaySpa'] };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const money = n => `${Number(n || 0).toLocaleString('de-DE')} ${C.CURRENCY || 'ALL'}`;

function writeBasics(cityUrls) {
  const urls = [SITE, ...cityUrls];
  writeFileSync(root + 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  writeFileSync(root + 'robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
}

async function get(path) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

const page = ({ title, desc, canonical, body, depth, jsonld }) => `<!DOCTYPE html>
<html lang="sq"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(SITE)}icons/og-image.jpg">
<link rel="icon" href="${depth}icons/icon.svg" type="image/svg+xml"><meta name="theme-color" content="#F4F5FA">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap">
<style>
*{box-sizing:border-box}body{margin:0;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#14162B;background:#F4F5FA}
a{color:#2B3FE0}.w{max-width:1100px;margin:0 auto;padding:20px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;color:#14162B;text-decoration:none}
.brand img{border-radius:11px}.btn{display:inline-block;background:#2B3FE0;color:#fff;text-decoration:none;font-weight:800;padding:11px 16px;border-radius:14px}
.hero{margin:18px 0 22px;padding:30px;border-radius:28px;color:#fff;background:radial-gradient(70% 90% at 100% 100%,rgba(255,106,61,.85),transparent 60%),linear-gradient(135deg,#7B5CFF,#2B3FE0)}
.hero h1{margin:0 0 8px;font-size:34px;letter-spacing:-.03em;line-height:1.1}.hero p{margin:0;color:#E7E9FF}
h2{font-size:22px;margin:28px 0 12px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.card{background:#fff;border-radius:22px;padding:14px;box-shadow:0 2px 10px rgba(20,22,43,.06);display:flex;gap:12px;align-items:flex-start}
.card img,.av{width:84px;height:84px;border-radius:16px;object-fit:cover;flex:none;background:#E3E7FF;display:grid;place-items:center;font-weight:800;color:#2B3FE0;font-size:22px}
.card h3{margin:0 0 4px;font-size:17px}.m{color:#5B5F7A;font-size:14px;margin:2px 0}.r{color:#B45309;font-weight:800}
.card .btn{margin-top:8px;padding:8px 12px;font-size:14px;border-radius:12px}.cities{display:flex;flex-wrap:wrap;gap:8px}
.cities a{background:#fff;padding:9px 14px;border-radius:999px;text-decoration:none;font-weight:700;color:#14162B;box-shadow:0 2px 8px rgba(20,22,43,.06)}
footer{margin-top:40px;padding:20px 0;border-top:1px solid #E4E6F0;color:#5B5F7A;font-size:14px}
</style>${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}</head>
<body><div class="w"><header><a class="brand" href="${depth}"><img src="${depth}icons/icon.svg" alt="" width="36" height="36">${esc(APP)}</a><a class="btn" href="${depth}#auth">Hyr / Regjistrohu</a></header>
${body}
<footer>© ${new Date().getFullYear()} ${esc(APP)} · Rezervime online për berberë dhe sallone bukurie në Shqipëri · <a href="${depth}">Kreu</a> · <a href="${depth}qytet/">Të gjitha qytetet</a></footer></div></body></html>`;

async function main() {
  if (!SITE || SITE === '/') { console.log('SITE_URL missing in config.js – skipping'); return; }
  if (!URL_ || !KEY) { console.log('Supabase not configured yet – writing robots.txt and sitemap.xml only'); writeBasics([]); return; }
  const salons = await get(`salons?select=id,name,category,city,address,phone,description,hours,photos,rating_avg,rating_count&status=eq.active&or=(plan_until.is.null,plan_until.gte.${today})&order=name`);
  const services = await get('services?select=salon_id,price&active=eq.true');
  const minPrice = {}; services.forEach(s => { minPrice[s.salon_id] = Math.min(minPrice[s.salon_id] ?? Infinity, Number(s.price)); });
  const byCity = {};
  salons.forEach(s => { const k = slug(s.city || ''); if (!k) return; (byCity[k] = byCity[k] || { name: s.city.trim(), slug: k, salons: [] }).salons.push(s); });
  const cities = Object.values(byCity).sort((a, b) => b.salons.length - a.salons.length);
  if (existsSync(root + 'qytet')) rmSync(root + 'qytet', { recursive: true });
  mkdirSync(root + 'qytet', { recursive: true });
  const cityLinks = depth => `<div class="cities">${cities.map(c => `<a href="${depth}qytet/${c.slug}/">${esc(c.name)} (${c.salons.length})</a>`).join('')}</div>`;

  for (const c of cities) {
    const groups = Object.keys(CAT).map(k => [k, c.salons.filter(s => s.category === k)]).filter(([, l]) => l.length);
    const card = s => {
      const ph = (s.photos || [])[0];
      return `<article class="card">${ph ? `<img src="${esc(ph.url)}" alt="${esc(s.name)}" loading="lazy">` : `<div class="av">${esc(s.name.slice(0, 2).toUpperCase())}</div>`}
        <div><h3>${esc(s.name)}</h3><p class="m">${s.rating_count ? `<span class="r">★ ${Number(s.rating_avg).toFixed(1)}</span> (${s.rating_count}) · ` : ''}${esc(CAT[s.category]?.[0] || '')}${Number.isFinite(minPrice[s.id]) ? ` · nga ${esc(money(minPrice[s.id]))}` : ''}</p>
        <p class="m">${esc(s.address)}, ${esc(s.city)}</p><a class="btn" href="../../#salon/${s.id}">Rezervo online</a></div></article>`;
    };
    const jsonld = { '@context': 'https://schema.org', '@type': 'ItemList', name: `Berberë dhe sallone në ${c.name}`, itemListElement: c.salons.map((s, i) => ({
      '@type': 'ListItem', position: i + 1, item: {
        '@type': CAT[s.category]?.[2] || 'HairSalon', name: s.name, url: `${SITE}#salon/${s.id}`, telephone: s.phone || undefined,
        image: (s.photos || [])[0]?.url, description: s.description || undefined,
        address: { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: s.city, addressCountry: 'AL' },
        aggregateRating: s.rating_count ? { '@type': 'AggregateRating', ratingValue: Number(s.rating_avg), reviewCount: s.rating_count } : undefined,
        priceRange: Number.isFinite(minPrice[s.id]) ? `nga ${money(minPrice[s.id])}` : undefined,
        openingHoursSpecification: (s.hours || []).map((h, d) => h && { '@type': 'OpeningHoursSpecification', dayOfWeek: DAYS[d], opens: h.open, closes: h.close }).filter(Boolean)
      } })) };
    const title = `Berberë dhe sallone në ${c.name} – Rezervo online | ${APP}`;
    const desc = `Rezervo online te ${c.salons.length} berberë dhe sallone bukurie në ${c.name}. Shiko orët e lira live, çmimet dhe vlerësimet. Falas për klientët.`;
    const body = `<section class="hero"><h1>Berberë dhe sallone në ${esc(c.name)}</h1><p>${esc(desc)}</p></section>
      ${groups.map(([k, l]) => `<h2>${esc(CAT[k][1])} në ${esc(c.name)}</h2><div class="grid">${l.map(card).join('')}</div>`).join('')}
      <h2>Qytete të tjera</h2>${cityLinks('../../')}`;
    mkdirSync(root + `qytet/${c.slug}`, { recursive: true });
    writeFileSync(root + `qytet/${c.slug}/index.html`, page({ title, desc, canonical: `${SITE}qytet/${c.slug}/`, body, depth: '../../', jsonld }));
  }
  writeFileSync(root + 'qytet/index.html', page({
    title: `Berberë dhe sallone sipas qytetit | ${APP}`, desc: 'Gjej berberë, sallone bukurie, studio thonjsh dhe spa në qytetin tënd dhe rezervo online.',
    canonical: `${SITE}qytet/`, depth: '../', body: `<section class="hero"><h1>Zgjidh qytetin</h1><p>Berberë dhe sallone bukurie në gjithë Shqipërinë, me rezervim online.</p></section>${cityLinks('../')}`
  }));
  writeFileSync(root + 'qytet/cities.json', JSON.stringify(cities.map(c => ({ name: c.name, slug: c.slug, count: c.salons.length }))));
  writeBasics([`${SITE}qytet/`, ...cities.map(c => `${SITE}qytet/${c.slug}/`)]);
  console.log(`Built ${cities.length} city pages for ${salons.length} salons`);
}
main().catch(e => { console.error(e); process.exit(1); });
