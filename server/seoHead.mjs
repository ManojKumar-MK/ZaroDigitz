// Server-side SEO for GoDaddy Node hosting (no Chrome there, so no pre-render):
// - per-URL <title>, description, canonical, robots, Open Graph/Twitter and JSON-LD
//   written into index.html before it is sent, so every crawler sees the right page;
// - live catalog from Firestore (admin-added products, edited prices, hidden products);
// - dynamic sitemap.xml.
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { rawProducts, normalizeProduct, getOfferPrice, setDiscountPercent, DISCOUNT_PERCENT } from '../src/data/products.js';
import { applyCustomCategories, SHOP_CATEGORIES, CATEGORY_BY_SLUG, GUIDES, categoryMeta, productMeta, categoryPath, productPath, findProductBySlug, guidePath, faqSchema, getFaqs, slugify } from '../src/seo/catalog.js';
import { SITE_URL, SITE_NAME, DEFAULT_TITLE, DEFAULT_DESCRIPTION, DEFAULT_IMAGE, absoluteUrl, breadcrumbSchema, safeUrl } from '../src/seo/site.js';
import { staticPage, staticDescription, seoOverride, fullTitle } from '../src/seo/pages.js';
import { bodyFor } from './seoBody.mjs';
import { DATA_BACKEND } from '../src/firebase/client.js';

// Same switch as the website: 'api' = MySQL on Hostinger (digitz-digitz-api.zarocrackers.com), 'firebase' = Firestore.
const BACKEND = process.env.DATA_BACKEND || DATA_BACKEND;
const DATA_API_URL = String(process.env.DATA_API_URL || 'https://digitz-digitz-api.zarocrackers.com').replace(/\/+$/, '');
/** API JSON ({__ts: ms}) → objects with toDate()/toMillis(), like Firestore timestamps. */
const withTimestamps = (v) => (Array.isArray(v) ? v.map(withTimestamps)
  : v && typeof v === 'object' ? ('__ts' in v && Object.keys(v).length === 1 ? { toDate: () => new Date(v.__ts), toMillis: () => v.__ts } : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, withTimestamps(x)])))
    : v);

/** Products (as doc-like objects) and shop settings from the active backend. */
async function readCatalogSource() {
  if (BACKEND === 'api') {
    const r = await fetch(`${DATA_API_URL}/v1/catalog`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`catalog API ${r.status}`);
    const j = await r.json();
    return { productDocs: (j.products || []).map((d) => ({ id: d.id, data: () => withTimestamps(d.data) })), settings: withTimestamps(j.settings || {}) };
  }
  firestore();
  const [snap, settingsSnap] = await Promise.all([getDocs(collection(db, 'products')), getDoc(doc(db, 'settings', 'shop'))]);
  return { productDocs: snap.docs, settings: settingsSnap.exists() ? settingsSnap.data() : {} };
}

// Public web config (same values as .env.production; not secrets).
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAp6axw40OGtRp0mkWu6g2QIzobqRebQz0',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'zaro-a083f',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:8265629298:web:b70f7a371ed1da72ae0ceb',
};
// Firestore's free plan allows 50k reads a day and one catalog load is ~210 reads, so the
// server keeps the catalog for 6 hours. Every save in the admin calls /api/seo/refresh,
// so changes still show within seconds.
const CACHE_MS = 6 * 60 * 60 * 1000;
const FAIL_RETRY_MS = 5 * 60 * 1000; // after a failed load (e.g. quota exhausted), wait before retrying
let db = null;
function firestore() {
  if (db) return db;
  db = getFirestore(initializeApp(firebaseConfig, 'seo-server'));
  const emu = process.env.FIRESTORE_EMULATOR_HOST; // local testing only
  if (emu) { const [host, port] = emu.split(':'); connectFirestoreEmulator(db, host, Number(port)); }
  return db;
}
let cache = { at: 0, products: null, settings: null, docs: null, live: false, pending: null };

function staticCatalog() {
  return rawProducts.map((p) => normalizeProduct(p));
}

async function loadLive() {
  if (process.env.SEO_LIVE_CATALOG === '0') return { products: staticCatalog(), settings: {}, docs: null, live: false };
  const { productDocs, settings } = await readCatalogSource();
  const snap = { docs: productDocs };
  const byCode = new Map(rawProducts.map((p) => [p.code, { ...p }]));
  snap.docs.forEach((d) => { const data = d.data(); const code = data.code || d.id; byCode.set(code, { ...(byCode.get(code) || { id: null, image: '' }), ...data, code }); });
  applyCustomCategories(settings.customCategories); // admin-added categories get pages and sitemap entries
  const previous = DISCOUNT_PERCENT;
  setDiscountPercent(settings.discountPercent ?? previous);
  const products = [...byCode.values()].map((p) => ({ ...normalizeProduct(p), active: p.active !== false, updatedAt: p.updatedAt?.toDate ? p.updatedAt.toDate() : null }));
  // Raw Firestore docs (plain JSON) for the storefront's /api/catalog.
  const plain = (v) => (v?.toMillis ? v.toMillis() : v);
  const docs = snap.docs.map((d) => { const data = d.data(); return { id: d.id, ...data, updatedAt: plain(data.updatedAt) }; });
  return { products, settings, docs, live: true };
}

/** Live catalog, cached for 6 hours (refreshed on every admin save); falls back to the last good copy or the built-in list. */
export async function getCatalog({ force = false } = {}) {
  const fresh = cache.products && Date.now() - cache.at < CACHE_MS && !force;
  if (fresh) return cache;
  if (!cache.pending) {
    cache.pending = loadLive()
      .then((r) => { cache = { at: Date.now(), products: r.products, settings: r.settings, docs: r.docs, live: r.live, pending: null }; return cache; })
      .catch((e) => {
        console.warn('[seo] live catalog unavailable, keeping the last copy:', e?.message || e);
        // Keep the last live copy (and its docs) if we had one; retry in a few minutes, not on every request.
        cache = { ...cache, at: Date.now() - CACHE_MS + FAIL_RETRY_MS, products: cache.products || staticCatalog().map((p) => ({ ...p, active: true })), settings: cache.settings || {}, pending: null };
        return cache;
      });
  }
  // Serve stale data immediately when we have it; only the very first request waits.
  return cache.products && !force ? cache : cache.pending;
}

// A product the cache doesn't know may have just been added (admin saves also refresh):
// re-read the live catalog at most every 10 minutes, so crawlers hitting unknown URLs can't burn reads.
let lastForced = 0;
/** Admin "Publish now": re-read at most every 3 seconds; a call inside that window waits and then re-reads. */
let lastPublish = 0;
let queuedPublish = null;
export async function refreshNow() {
  const wait = 3000 - (Date.now() - lastPublish);
  if (wait > 0) {
    queuedPublish = queuedPublish || new Promise((r) => setTimeout(r, wait)).then(() => { queuedPublish = null; lastPublish = Date.now(); return getCatalog({ force: true }); });
    return queuedPublish;
  }
  lastPublish = Date.now();
  return getCatalog({ force: true });
}

async function refreshForMiss() {
  if (Date.now() - lastForced < 10 * 60 * 1000) return getCatalog();
  lastForced = Date.now();
  return getCatalog({ force: true });
}

const page = (title, description, path, extra = {}) => ({ title: title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`, description, canonical: absoluteUrl(path), image: DEFAULT_IMAGE, robots: 'index, follow, max-image-preview:large', type: 'website', jsonLd: [], status: 200, ...extra });
const crumbs = (...items) => breadcrumbSchema([{ name: 'Home', path: '/' }, ...items]);
const endOfYear = () => `${new Date().getFullYear()}-12-31`;

function productJsonLd(p) {
  const price = getOfferPrice(p);
  const meta = productMeta(p);
  return {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.code, category: p.category,
    description: p.description || meta.longDescription, brand: { '@type': 'Brand', name: p.brand || 'Zaro' },
    image: absoluteUrl(safeUrl(p.image || '/zaro-logo.png')), url: absoluteUrl(productPath(p)),
    ...(price != null ? { offers: { '@type': 'Offer', price, priceCurrency: 'INR', priceValidUntil: endOfYear(), availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition', url: absoluteUrl(productPath(p)), seller: { '@id': `${SITE_URL}/#business` } } } : {}),
  };
}

function itemList(name, path, items) {
  return {
    '@context': 'https://schema.org', '@type': 'ItemList', name, url: absoluteUrl(path), numberOfItems: items.length,
    itemListElement: items.filter((p) => getOfferPrice(p) != null).slice(0, 100).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absoluteUrl(productPath(p)), name: p.name })),
  };
}

/* ---------------- uploaded product photos ---------------- */
const IMG_CACHE = new Map(); // code -> { buf, type, version, at }
const IMG_TTL = 24 * 60 * 60 * 1000; // links carry ?v=, so a new upload is a new cache key

/** Uploaded product photo from Firestore productImages/{code}, cached in memory. */
export async function getProductImage(code, version = '') {
  const key = `${code}:${version}`;
  const hit = IMG_CACHE.get(key);
  if (hit && Date.now() - hit.at < IMG_TTL) return hit;
  if (BACKEND === 'api') {
    const r = await fetch(`${DATA_API_URL}/v1/img/${encodeURIComponent(code)}`);
    if (r.status === 404) { IMG_CACHE.delete(key); return null; }
    if (!r.ok) throw new Error(`image API ${r.status}`);
    const entry = { buf: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || 'image/webp', version: Number(r.headers.get('x-photo-version')) || 0, at: Date.now() };
    if (IMG_CACHE.size > 150) IMG_CACHE.delete(IMG_CACHE.keys().next().value);
    IMG_CACHE.set(key, entry);
    return entry;
  }
  firestore();
  const snap = await getDoc(doc(db, 'productImages', code));
  if (!snap.exists()) { IMG_CACHE.delete(key); return null; }
  const { dataUrl = '', contentType, updatedAt } = snap.data();
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  if (!m) return null;
  const entry = { buf: Buffer.from(m[2], 'base64'), type: contentType || m[1], version: updatedAt?.toMillis ? updatedAt.toMillis() : 0, at: Date.now() };
  if (IMG_CACHE.size > 150) IMG_CACHE.delete(IMG_CACHE.keys().next().value);
  IMG_CACHE.set(key, entry);
  return entry;
}

/** Head data for a path, or { status: 404 } when the page doesn't exist. Admin overrides win. */
export async function headFor(pathname) {
  const base = await baseHead(pathname);
  if (base.status !== 200 || /noindex/.test(base.robots)) return base;
  const catalog = await getCatalog();
  const canonicalPath = new URL(base.canonical).pathname.replace(/\/+$/, '') || '/';
  let body = '';
  try { body = bodyFor(canonicalPath, catalog); } catch (e) { console.warn('[seo] body failed for', canonicalPath, e?.message || e); }
  const h = { ...base, body };
  const o = seoOverride(catalog.settings, canonicalPath);
  if (!o) return h;
  return { ...h, ...(o.title ? { title: fullTitle(o.title) } : {}), ...(o.description ? { description: o.description } : {}), overridden: true };
}

async function baseHead(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const noindex = (title) => page(title, DEFAULT_DESCRIPTION, path, { robots: 'noindex, nofollow' });
  if (path === '/cart') return noindex('Your Cart');
  if (path === '/checkout') return noindex('Checkout');
  if (path === '/admin' || path.startsWith('/admin/')) return noindex('Admin');
  if (path.startsWith('/invoice/')) return noindex('Invoice');

  const { products, settings } = await getCatalog();
  const visible = products.filter((p) => p.active !== false);

  if (path === '/') return page(DEFAULT_TITLE, DEFAULT_DESCRIPTION, '/', { title: DEFAULT_TITLE, jsonLd: [faqSchema(getFaqs(settings))] });
  const sp = staticPage(path);
  if (sp) {
    const extra = path === '/cards' ? [itemList('Zaro Digitz Card Designs', path, visible)] : [];
    return page(sp.title, staticDescription(sp, visible.length), path, { jsonLd: [crumbs({ name: sp.crumb, path }), ...extra] });
  }

  let m = path.match(/^\/cards\/([^/]+)$/);
  if (m) {
    let category = CATEGORY_BY_SLUG[m[1]];
    if (!category) { await refreshForMiss(); category = CATEGORY_BY_SLUG[m[1]]; } // maybe just added in the admin
    if (!category) return { status: 404 };
    const items = visible.filter((p) => p.category === category);
    const meta = categoryMeta(category, items);
    return page(meta.title, meta.description, path, { jsonLd: [crumbs({ name: 'All Designs', path: '/cards' }, { name: category, path }), itemList(`${category} - Zaro Digitz`, path, items)] });
  }
  m = path.match(/^\/product\/([^/]+)$/);
  if (m) {
    let p = findProductBySlug(visible, m[1]);
    if (!p) { const again = await refreshForMiss(); p = findProductBySlug(again.products.filter((x) => x.active !== false), m[1]); }
    if (!p) return { status: 404 };
    if (path !== productPath(p)) return { status: 301, location: productPath(p) }; // old code-only link or renamed product
    const meta = productMeta(p);
    return page(meta.title, meta.description, productPath(p), { image: absoluteUrl(safeUrl(p.image || '/og-image.jpg')), type: 'product', overridden: Boolean(p.seoTitle || p.seoDescription), jsonLd: [crumbs({ name: 'All Designs', path: '/cards' }, { name: p.category, path: categoryPath(p.category) }, { name: p.name, path: productPath(p) }), productJsonLd(p)] });
  }
  m = path.match(/^\/guides\/([^/]+)$/);
  if (m) {
    const g = GUIDES.find((x) => x.slug === m[1]);
    if (!g) return { status: 404 };
    return page(g.title, g.description, guidePath(g), { type: 'article', jsonLd: [crumbs({ name: 'Guides', path: '/guides' }, { name: g.title, path: guidePath(g) }), { '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.description, datePublished: g.datePublished, dateModified: g.datePublished, image: DEFAULT_IMAGE, mainEntityOfPage: absoluteUrl(guidePath(g)), author: { '@id': `${SITE_URL}/#business` }, publisher: { '@id': `${SITE_URL}/#business` } }] });
  }
  return { status: 404 };
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Write head data into the built index.html. */
export function injectHead(html, h) {
  const setMeta = (src, attr, key, value) => {
    const re = new RegExp(`(<meta\\s+${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content=")[^"]*(")`, 'i');
    return re.test(src) ? src.replace(re, `$1${esc(value)}$2`) : src.replace('</head>', `    <meta ${attr}="${key}" content="${esc(value)}" />\n  </head>`);
  };
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(h.title)}</title>`);
  out = out.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i, `$1${esc(h.canonical)}$2`);
  out = setMeta(out, 'name', 'description', h.description);
  out = setMeta(out, 'name', 'robots', h.robots);
  out = setMeta(out, 'property', 'og:type', h.type);
  out = setMeta(out, 'property', 'og:title', h.title);
  out = setMeta(out, 'property', 'og:description', h.description);
  out = setMeta(out, 'property', 'og:url', h.canonical);
  out = setMeta(out, 'property', 'og:image', h.image);
  out = setMeta(out, 'name', 'twitter:title', h.title);
  out = setMeta(out, 'name', 'twitter:description', h.description);
  out = setMeta(out, 'name', 'twitter:image', h.image);
  if (h.image !== DEFAULT_IMAGE) out = out.replace(/\s*<meta property="og:image:(width|height)" content="\d+" \/>/g, '');
  // data-seo-managed: the client <Seo> component replaces these on hydration (no duplicates).
  const ld = (h.jsonLd || []).map((j) => `    <script type="application/ld+json" data-seo-managed="true">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n');
  if (ld) out = out.replace('</head>', `${ld}\n  </head>`);
  if (h.body) out = out.replace('<div id="root"></div>', `<div id="root">${h.body}</div>`);
  return out;
}

/** sitemap.xml with live products (hidden ones excluded, admin-added included). */
export async function buildSitemap(staticRoutes) {
  const { products } = await getCatalog();
  const today = new Date().toISOString().slice(0, 10);
  const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const rows = staticRoutes.filter((r) => !r.path.startsWith('/product/'));
  products.filter((p) => p.active !== false).forEach((p) => rows.push({
    path: productPath(p), lastmod: p.updatedAt ? p.updatedAt.toISOString().slice(0, 10) : today, changefreq: 'weekly', priority: '0.6',
    image: p.image && (p.image.startsWith('/products/') || p.image.startsWith('/img/')) ? `${SITE_URL}${p.image}` : (/^https?:/.test(p.image || '') ? p.image : null), imageTitle: p.name,
  }));
  const urls = rows.map((r) => {
    const loc = r.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${r.path}`;
    const img = r.image ? `\n    <image:image><image:loc>${xmlEsc(safeUrl(r.image))}</image:loc><image:title>${xmlEsc(r.imageTitle)}</image:title></image:image>` : '';
    return `  <url>\n    <loc>${xmlEsc(loc)}</loc>\n    <lastmod>${r.lastmod || today}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>${img}\n  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`;
}

export { SHOP_CATEGORIES, slugify };
