// Google Search Console → MySQL, for the admin SEO page.
// Uses a service account (read-only) whose JSON key is the env var GSC_SERVICE_ACCOUNT_JSON
// (or GSC_SERVICE_ACCOUNT_B64), set in Hostinger hPanel. The account's email must be added
// in Search Console → Settings → Users and permissions (Restricted is enough).
import crypto from 'node:crypto';
import { pool } from './db.js';

const SITE = process.env.GSC_SITE || 'sc-domain:zarocrackers.com';
const SITE_URL = 'https://digitz.zarocrackers.com';
// Pages whose index status is checked on every sync (URL Inspection API, 2,000/day quota).
export const KEY_PAGES = ['/', '/cards', '/about', '/contact'];

function credentials() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON || (process.env.GSC_SERVICE_ACCOUNT_B64 ? Buffer.from(process.env.GSC_SERVICE_ACCOUNT_B64, 'base64').toString('utf8') : '');
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (!j.client_email || !j.private_key) return null;
    return { email: j.client_email, key: String(j.private_key).replace(/\\n/g, '\n') };
  } catch {
    return null;
  }
}

export const gscConfigured = () => Boolean(credentials());
export const serviceAccountEmail = () => credentials()?.email || null;

let token = { value: null, exp: 0 };
async function accessToken() {
  if (token.value && Date.now() < token.exp - 60000) return token.value;
  const c = credentials();
  if (!c) throw new Error('Search Console key not set');
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: c.email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(c.key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`Google sign-in failed: ${j.error_description || j.error || r.status}`);
  token = { value: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return token.value;
}

async function google(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j.error?.message || `Google API ${r.status}`;
    throw new Error(r.status === 403 ? `${msg} (add ${serviceAccountEmail()} in Search Console → Settings → Users and permissions)` : msg);
  }
  return j;
}

const ymd = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5);

function searchAnalytics(body) {
  return google(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, { dataState: 'all', ...body });
}

const row = (r) => ({ clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 });

/** Pull everything the SEO page shows and store it. Returns the saved snapshot. */
export async function syncSearchConsole() {
  const end = ymd(daysAgo(1));
  const range = (days) => ({ startDate: ymd(daysAgo(days)), endDate: end });
  const [daily, q28, p28, q90, p90] = await Promise.all([
    searchAnalytics({ ...range(480), dimensions: ['date'], rowLimit: 500 }), // ~16 months, the API maximum
    searchAnalytics({ ...range(28), dimensions: ['query'], rowLimit: 50 }),
    searchAnalytics({ ...range(28), dimensions: ['page'], rowLimit: 50 }),
    searchAnalytics({ ...range(90), dimensions: ['query'], rowLimit: 50 }),
    searchAnalytics({ ...range(90), dimensions: ['page'], rowLimit: 50 }),
  ]);
  const inspections = [];
  for (const path of KEY_PAGES) {
    const url = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
    try {
      const j = await google('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', { inspectionUrl: url, siteUrl: SITE });
      const s = j.inspectionResult?.indexStatusResult || {};
      inspections.push({ path, url, verdict: s.verdict || 'UNKNOWN', coverage: s.coverageState || '', lastCrawl: s.lastCrawlTime || null, googleCanonical: s.googleCanonical || null, userCanonical: s.userCanonical || null, robots: s.robotsTxtState || null });
    } catch (e) {
      inspections.push({ path, url, verdict: 'ERROR', coverage: e.message });
    }
  }
  const snapshot = {
    site: SITE,
    syncedAt: Date.now(),
    daily: (daily.rows || []).map((r) => ({ date: r.keys[0], ...row(r) })),
    queries: { 28: (q28.rows || []).map((r) => ({ query: r.keys[0], ...row(r) })), 90: (q90.rows || []).map((r) => ({ query: r.keys[0], ...row(r) })) },
    pages: { 28: (p28.rows || []).map((r) => ({ page: r.keys[0], ...row(r) })), 90: (p90.rows || []).map((r) => ({ page: r.keys[0], ...row(r) })) },
    inspections,
  };
  await pool.query('INSERT INTO meta (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', ['gsc', JSON.stringify(snapshot)]);
  return snapshot;
}

export async function readSnapshot() {
  const [rows] = await pool.query('SELECT value FROM meta WHERE name = ?', ['gsc']);
  return rows.length ? JSON.parse(rows[0].value) : null;
}

// One sync at a time; repeated requests share it.
let running = null;
export function syncOnce() {
  if (!running) running = syncSearchConsole().finally(() => { running = null; });
  return running;
}
