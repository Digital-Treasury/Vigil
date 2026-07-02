#!/usr/bin/env node
/**
 * Vigil seed script — discovers each client's key pages and produces import data.
 *
 * For every client below it:
 *   1. reads the site's sitemap (falling back to homepage links),
 *   2. picks the most "valuable-page"-looking URLs (about/services/products/contact…),
 *   3. verifies each one actually returns 200,
 *   4. writes seed/vigil-seed.csv — and/or pushes straight into a running Vigil.
 *
 * Usage (from the repo root, Node 18+):
 *   node scripts/seed.mjs                          # discover + write seed/vigil-seed.csv
 *   node scripts/seed.mjs --push http://localhost:3000   # discover + import directly
 *   node scripts/seed.mjs --max 10                 # up to 10 pages per client (default 8)
 *   node scripts/seed.mjs --list my-clients.json   # use a custom client list
 *
 * Direct push requires the local instance to be running with DEV_AUTH_BYPASS=1
 * (production instances require a signed-in browser session — import the CSV
 * through the dashboard's "Import clients" dialog instead).
 */

// name: client name as it should appear in Vigil
// url:  primary site URL ('' = skipped with a warning until you fill it in)
// verify: true = URL was inferred, double-check it's the right site before running
const CLIENTS = [
  { name: 'Education Horizons (EHG/TES)', url: 'https://www.educationhorizons.com/' },
  { name: 'Universal Biosensors', url: 'https://universalbiosensors.com/' },
  { name: 'Digital Treasury (DT)', url: 'https://digitaltreasury.com.au/', verify: true },
  { name: 'International Mowers', url: 'https://intmowers.com.au/', verify: true },
  { name: "Bromley's Bread", url: 'https://bromleysbread.com.au/' },
  { name: 'Continence Foundation', url: '' }, // continence.org.au is assigned to "Inconfidence" below — confirm which is which
  { name: 'Brimbank City Council', url: 'https://www.brimbank.vic.gov.au/', verify: true },
  { name: 'AED Authority', url: 'https://aedauthority.com.au/' },
  { name: 'Farm Cafe', url: 'https://farmcafe.com.au/' },
  { name: 'MePACS', url: 'https://www.mepacs.com.au/', verify: true },
  { name: 'Merkle Tree Capital', url: 'https://merkle.com.au/' },
  { name: 'Synapse IT', url: '' },
  { name: 'Common Ventures (WPay)', url: 'https://wpay.io/' },
  { name: 'Dawn Mowers', url: 'http://dawn.com.au/' },
  { name: 'Primestone Wealth', url: 'https://primestonewealth.com.au/' },
  { name: 'Bins4Blokes', url: 'https://bins4blokes.org.au/' },
  { name: 'CFA Physiotherapy', url: 'https://cfaphysios.com.au/' },
  { name: 'Pelvic Floor First', url: 'https://www.pelvicfloorfirst.org.au/', verify: true },
  { name: 'Inconfidence', url: 'https://www.continence.org.au/' },
  { name: 'Continence Health Australia - Go Against The Flow', url: 'https://www.goagainsttheflow.org.au/' },
  { name: 'Kinetic IT', url: 'https://kineticit.com.au/' },
  { name: 'Triton (Universal Biosensors) - Sentia', url: 'https://universalbiosensors.com/' }, // same domain as Universal Biosensors — confirm whether Sentia has its own site
  { name: 'iHarvestCoWorking (Brimbank)', url: 'https://iharvestcoworking.com.au/' },
  { name: 'Sinclair Dermatology', url: 'https://www.sinclairdermatology.com.au/' },
  { name: 'Macdonnells Law', url: 'https://macdonnells.com.au/' },
  { name: 'VACL', url: 'https://vacl.org.au/', verify: true },
  { name: 'Master Plumbers', url: '' },
  { name: 'Impressive', url: '' },
  { name: 'The Battery Base', url: 'https://thebatterybase.com.au/' },
  { name: 'MediMark', url: '' },
];

const VIEWPORTS = 'desktop|mobile';
const UA = 'Mozilla/5.0 (compatible; VigilSeed/1.0; +https://github.com/Digital-Treasury/Vigil)';
const TIMEOUT_MS = 15000;

// ---------- CLI ----------
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? true);
};
const MAX_PAGES = parseInt(flag('--max') ?? '8', 10);
const PUSH_URL = flag('--push');
const LIST_FILE = flag('--list');

// ---------- helpers ----------
async function get(url, asText = true) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xml,*/*' },
    });
    return { ok: res.ok, status: res.status, url: res.url, body: asText && res.ok ? await res.text() : '' };
  } catch {
    return { ok: false, status: 0, url, body: '' };
  } finally {
    clearTimeout(timer);
  }
}

const NOISE =
  /\.(jpe?g|png|gif|webp|svg|pdf|zip|mp4|css|js|xml|ico|woff2?)($|\?)|wp-content|wp-json|wp-admin|\/(tag|category|author|feed|search|cart|checkout|my-account|account|login|wp-login|privacy|terms|cookies?|sitemap|comments?)([\/-]|$)|[?#]|mailto:|tel:/i;

function cleanPath(u, origin) {
  try {
    const url = new URL(u, origin);
    if (url.origin !== origin) return null;
    if (NOISE.test(url.href)) return null;
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path.length > 90) return null;
    return path;
  } catch {
    return null;
  }
}

const KEYWORDS = [
  [/about/i, 26], [/contact/i, 25], [/service/i, 24], [/product/i, 22],
  [/(pricing|fees|plans)/i, 20], [/team|people|staff|doctors?|practitioners?/i, 18],
  [/(what-we-do|solutions|treatments?|practice-areas?)/i, 18], [/shop|store|brands?/i, 15],
  [/faq|help/i, 14], [/^\/(news|blog|articles|resources)$/i, 12], [/locations?|clinics?|dealer/i, 12],
];

function score(path) {
  if (path === '/') return 1000;
  const depth = path.split('/').filter(Boolean).length;
  let s = depth === 1 ? 30 : depth === 2 ? 10 : -20;
  for (const [re, points] of KEYWORDS) if (re.test(path)) s += points;
  if (/\d{4}/.test(path)) s -= 15; // dated blog posts
  return s;
}

async function fromSitemaps(origin) {
  const found = new Set();
  for (const entry of ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml']) {
    const res = await get(origin + entry);
    if (!res.ok || !/<(urlset|sitemapindex)/i.test(res.body)) continue;
    let xml = res.body;
    if (/<sitemapindex/i.test(xml)) {
      const children = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
      // Page sitemaps first; skip obvious post/media maps to keep this quick.
      const ordered = [
        ...children.filter((c) => /page/i.test(c)),
        ...children.filter((c) => !/page|post|product|media|category|tag|author/i.test(c)),
        ...children.filter((c) => /post|product/i.test(c)),
      ].slice(0, 4);
      xml = '';
      for (const child of ordered) {
        const childRes = await get(child);
        if (childRes.ok) xml += childRes.body;
      }
    }
    for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      const path = cleanPath(match[1], origin);
      if (path) found.add(path);
      if (found.size > 400) break;
    }
    if (found.size) break;
  }
  return found;
}

async function fromHomepage(origin) {
  const found = new Set();
  const res = await get(origin + '/');
  if (!res.ok) return found;
  for (const match of res.body.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    const path = cleanPath(match[1], origin);
    if (path && path !== '/') found.add(path);
  }
  return found;
}

async function discover(client) {
  const home = await get(client.url, false);
  if (!home.ok) return { client, error: `site unreachable (HTTP ${home.status})`, pages: [] };
  const origin = new URL(home.url).origin;

  let paths = await fromSitemaps(origin);
  if (paths.size < 4) for (const p of await fromHomepage(origin)) paths.add(p);

  const ranked = [...paths]
    .filter((p) => p !== '/')
    .map((p) => ({ path: p, score: score(p) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PAGES * 3);

  const pages = [{ label: 'Homepage', url: origin + '/' }];
  for (const candidate of ranked) {
    if (pages.length >= MAX_PAGES) break;
    const res = await get(origin + candidate.path, false);
    if (res.ok && new URL(res.url).origin === origin) {
      const seg = candidate.path.split('/').filter(Boolean).pop() ?? '';
      const label = seg
        .split(/[-_]+/)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ');
      pages.push({ label: label || 'Page', url: origin + candidate.path });
    }
  }
  return { client: { ...client, url: origin + '/' }, pages };
}

// ---------- main ----------
const list = LIST_FILE
  ? JSON.parse(await import('fs').then((fs) => fs.promises.readFile(LIST_FILE, 'utf8')))
  : CLIENTS;

const withUrl = list.filter((c) => c.url);
const missing = list.filter((c) => !c.url);

console.log(`Discovering key pages for ${withUrl.length} clients (max ${MAX_PAGES} pages each)…\n`);

const results = [];
for (const client of withUrl) {
  process.stdout.write(`  ${client.name} … `);
  const result = await discover(client);
  results.push(result);
  console.log(result.error ? `✗ ${result.error}` : `${result.pages.length} pages${client.verify ? '  (⚠ URL inferred — verify!)' : ''}`);
}

const good = results.filter((r) => !r.error && r.pages.length);

// CSV in the dashboard "Import clients" format
const csvLines = ['client,url,label,viewports'];
for (const { client, pages } of good) {
  for (const page of pages) {
    csvLines.push(`${client.name},${page.url},${page.label},${VIEWPORTS}`);
  }
}
const fs = await import('fs');
fs.mkdirSync('seed', { recursive: true });
fs.writeFileSync('seed/vigil-seed.csv', csvLines.join('\n') + '\n');
console.log(`\n✔ Wrote seed/vigil-seed.csv — ${good.length} clients, ${csvLines.length - 1} pages`);

if (PUSH_URL && typeof PUSH_URL === 'string') {
  const payload = {
    clients: good.map(({ client, pages }) => ({
      name: client.name,
      url: client.url,
      pages: pages.map((p) => ({ label: p.label, url: p.url, viewports: ['desktop', 'mobile'] })),
    })),
  };
  const res = await fetch(`${PUSH_URL.replace(/\/+$/, '')}/api/clients/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const summary = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`✗ Import failed (HTTP ${res.status}): ${summary.error ?? 'is Vigil running with DEV_AUTH_BYPASS=1?'}`);
    process.exit(1);
  }
  console.log(`✔ Imported into ${PUSH_URL}:`, summary);
}

if (missing.length) {
  console.log(`\n⚠ Skipped (no URL yet — fill these in at the top of scripts/seed.mjs and re-run):`);
  for (const client of missing) console.log(`    · ${client.name}`);
}
const failed = results.filter((r) => r.error);
if (failed.length) {
  console.log(`\n⚠ Unreachable:`);
  for (const r of failed) console.log(`    · ${r.client.name} — ${r.error}`);
}
console.log('\nRe-running is safe: existing clients are matched by name and already-tracked pages are skipped.');
