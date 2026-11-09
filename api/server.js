// Zaro Digitz backend API: https://digitz-api.zarocrackers.com
// A Firestore-compatible document API on MySQL, so the website keeps its exact data
// shapes and logic. Admins are identified by their Firebase Authentication ID token.
import express from 'express';
import { pool, migrate, isConfigured } from './db.js';
import { authenticate } from './auth.js';
import { getDoc, queryDocs, writeOps, importDocs, stats, HttpError } from './store.js';
import { gscConfigured, serviceAccountEmail, readSnapshot, syncOnce, KEY_PAGES } from './gsc.js';
import { nextInvoiceNumber, renumberPreview, renumberApply, renumberUndo } from './invoices.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const VERSION = '0.8.0';
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || 'https://digitz.zarocrackers.com,http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:3009,http://localhost:3009,http://127.0.0.1:4199')
  .split(',').map((s) => s.trim()).filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '12mb' }));

// CORS: only the shop's own origins may call the API from a browser.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.use(authenticate);

// Simple per-IP limit for anonymous writes (one checkout = about 4 writes): 600 per 10 minutes.
// High because the website server also saves every order from its single IP (about 3 writes each).
const hits = new Map();
function limitAnonymousWrites(req, res, next) {
  if (req.auth?.admin) return next();
  const key = req.ip || 'unknown';
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (list.length >= 600) return res.status(429).json({ ok: false, error: 'too many requests' });
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.delete(hits.keys().next().value);
  return next();
}

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(req.method, req.path, e);
    res.status(status).json({ ok: false, error: status === 500 ? 'server error' : e.message });
  }
};
const requireAdmin = (req) => { if (!req.auth?.admin) throw new HttpError(403, 'admin only'); };
const ctxOf = (req) => ({ admin: Boolean(req.auth?.admin) });

/* ---------------- health ---------------- */

let schemaReady = false;
let schemaError = null;
app.get('/', (_req, res) => res.json({ service: 'zaro-api', ok: true, version: VERSION }));
app.get('/health', async (req, res) => {
  const out = { ok: true, service: 'zaro-api', version: VERSION, db: 'not configured', schema: schemaReady, clientIp: req.ip, time: new Date().toISOString() };
  if (isConfigured()) {
    const t0 = Date.now();
    try {
      const [rows] = await pool.query('SELECT VERSION() AS v');
      out.db = { ok: true, version: rows[0].v, ms: Date.now() - t0 };
    } catch (e) {
      out.ok = false;
      out.db = { ok: false, error: e.code || e.message };
    }
  }
  if (schemaError) out.schemaError = schemaError;
  res.status(out.ok ? 200 : 503).json(out);
});

/* ---------------- documents (Firestore-compatible) ---------------- */

app.post('/v1/docs/get', wrap(async (req, res) => {
  res.json({ ok: true, ...(await getDoc(req.body?.path, ctxOf(req))) });
}));

app.post('/v1/docs/query', wrap(async (req, res) => {
  res.json({ ok: true, ...(await queryDocs(req.body || {}, ctxOf(req))) });
}));

app.post('/v1/docs/write', limitAnonymousWrites, wrap(async (req, res) => {
  res.json({ ok: true, results: await writeOps(req.body?.ops, ctxOf(req)) });
}));

/* ---------------- shop-wide invoice numbers (ZD/26-27/0001, per financial year) ---------------- */

app.post('/v1/invoice-number', limitAnonymousWrites, wrap(async (_req, res) => {
  res.json({ ok: true, ...(await nextInvoiceNumber()) });
}));

// One-time renumbering of existing orders: preview, apply (with backup) and undo. Admin only.
app.get('/v1/admin/invoices/renumber', wrap(async (req, res) => { requireAdmin(req); res.json({ ok: true, ...(await renumberPreview()) }); }));
app.post('/v1/admin/invoices/renumber', wrap(async (req, res) => {
  requireAdmin(req);
  if (req.body?.confirm !== true) throw new HttpError(400, 'confirm required');
  res.json({ ok: true, ...(await renumberApply()) });
}));
app.post('/v1/admin/invoices/renumber-undo', wrap(async (req, res) => { requireAdmin(req); res.json({ ok: true, ...(await renumberUndo()) }); }));

/* ---------------- for the website server (SEO pages, sitemap, photos) ---------------- */

// Products + shop settings in one call; cached briefly by the CDN.
app.get('/v1/catalog', wrap(async (_req, res) => {
  const ctx = { admin: false };
  const [{ docs }, settings] = await Promise.all([queryDocs({ collection: 'products' }, ctx), getDoc('settings/shop', ctx)]);
  res.setHeader('Cache-Control', 'public, max-age=30');
  res.json({ ok: true, at: Date.now(), products: docs, settings: settings.data || {} });
}));

// Uploaded product photo as an image (stored as a data URL, like in Firestore).
app.get('/v1/img/:code', wrap(async (req, res) => {
  const d = await getDoc(`productImages/${req.params.code}`, { admin: false });
  const m = /^data:([^;]+);base64,(.*)$/s.exec(d.data?.dataUrl || '');
  if (!m) return res.status(404).json({ ok: false, error: 'no photo' });
  res.setHeader('Content-Type', d.data.contentType || m[1]);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  if (d.data.updatedAt?.__ts) res.setHeader('X-Photo-Version', String(d.data.updatedAt.__ts));
  return res.end(Buffer.from(m[2], 'base64'));
}));

/* ---------------- admin: migration from Firestore ---------------- */

app.post('/v1/admin/import', wrap(async (req, res) => {
  requireAdmin(req);
  const { collection, docs } = req.body || {};
  if (!Array.isArray(docs) || docs.length > 500) throw new HttpError(400, 'docs must be an array of up to 500');
  res.json({ ok: true, ...(await importDocs(collection, docs)) });
}));

app.get('/v1/admin/stats', wrap(async (req, res) => {
  requireAdmin(req);
  res.json({ ok: true, collections: await stats() });
}));

/* ---------------- admin: Google Search Console ---------------- */

const GSC_STALE_MS = 12 * 60 * 60 * 1000;
app.get('/v1/admin/gsc', wrap(async (req, res) => {
  requireAdmin(req);
  const configured = gscConfigured();
  const snapshot = configured ? await readSnapshot() : null;
  const stale = configured && (!snapshot || Date.now() - snapshot.syncedAt > GSC_STALE_MS);
  if (stale) syncOnce().catch((e) => console.warn('gsc sync failed:', e.message)); // refresh in the background
  res.json({ ok: true, configured, serviceAccount: serviceAccountEmail(), keyPages: KEY_PAGES, refreshing: stale, snapshot });
}));

app.post('/v1/admin/gsc/sync', wrap(async (req, res) => {
  requireAdmin(req);
  if (!gscConfigured()) throw new HttpError(400, 'Search Console key not set in Hostinger');
  try {
    res.json({ ok: true, snapshot: await syncOnce() });
  } catch (e) {
    throw new HttpError(502, e.message);
  }
}));

/* ---------------- admin: English → Tamil transliteration (product names) ---------------- */

const TRANSLIT_CACHE = new Map();
async function transliterateWord(word) {
  const key = word.toLowerCase();
  if (TRANSLIT_CACHE.has(key)) return TRANSLIT_CACHE.get(key);
  const url = `https://inputtools.google.com/request?text=${encodeURIComponent(key)}&itc=ta-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;
  const r = await fetch(url);
  const j = await r.json().catch(() => null);
  const out = j?.[0] === 'SUCCESS' ? j[1]?.[0]?.[1]?.[0] || null : null;
  if (out) { TRANSLIT_CACHE.set(key, out); if (TRANSLIT_CACHE.size > 5000) TRANSLIT_CACHE.delete(TRANSLIT_CACHE.keys().next().value); }
  return out;
}

// GET /v1/admin/translit?words=gold,lakshmi → { ok, words: { gold: 'கோல்டு', ... } }
app.get('/v1/admin/translit', wrap(async (req, res) => {
  requireAdmin(req);
  const words = String(req.query.words || '').split(',').map((w) => w.trim()).filter((w) => /^[a-z]{1,30}$/i.test(w)).slice(0, 20);
  const pairs = await Promise.all(words.map(async (w) => [w, await transliterateWord(w).catch(() => null)]));
  res.json({ ok: true, words: Object.fromEntries(pairs.filter(([, t]) => t)) });
}));

// Public: Tamil spelling suggestions for the personalisation editor (rate limited like writes).
app.get('/v1/translit', limitAnonymousWrites, wrap(async (req, res) => {
  const words = String(req.query.words || '').split(',').map((w) => w.trim()).filter((w) => /^[a-z]{1,30}$/i.test(w)).slice(0, 12);
  const pairs = await Promise.all(words.map(async (w) => [w, await transliterateWord(w).catch(() => null)]));
  res.json({ ok: true, words: Object.fromEntries(pairs.filter(([, t]) => t)) });
}));

app.get('/v1/admin/whoami', (req, res) => res.json({ ok: true, auth: req.auth }));

app.use((_req, res) => res.status(404).json({ ok: false, error: 'not found' }));

app.listen(port, () => console.log(`zaro-api ${VERSION} listening on ${port}`));

if (isConfigured()) {
  migrate()
    .then((n) => { schemaReady = true; console.log(`schema ready (${n} statements)`); })
    .catch((e) => { schemaError = e.code || e.message; console.error('schema migration failed:', e); });
}
