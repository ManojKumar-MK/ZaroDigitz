// IndexNow: tells Bing, Yandex, Seznam, Naver and others about new or changed pages
// straight away (Google does not use IndexNow; it reads the sitemap).
// The key is public by design; the same value is served at /<key>.txt.
import { SITE_URL } from '../src/seo/site.js';

export const INDEXNOW_KEY = 'ee8710cafc7ad61d750393c2705b3bb4';
const host = new URL(SITE_URL).host;
let lastFull = 0;

/** Submit up to 10,000 absolute URLs. Never throws; returns the HTTP status or an error string. */
export async function submitUrls(urls) {
  const list = [...new Set(urls)].filter((u) => u.startsWith(SITE_URL)).slice(0, 10000);
  if (!list.length || process.env.INDEXNOW === '0' || process.env.FIRESTORE_EMULATOR_HOST || process.env.SEO_LIVE_CATALOG === '0') return 'skipped';
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`, urlList: list }),
    });
    console.log(`[indexnow] submitted ${list.length} URLs -> ${r.status}`);
    return r.status;
  } catch (e) {
    console.warn('[indexnow] failed:', e?.message || e);
    return String(e?.message || e);
  }
}

/** Every URL in the sitemap, at most once a day (called after start-up). */
export async function submitSitemap(sitemapXml) {
  if (Date.now() - lastFull < 864e5) return 'recent';
  lastFull = Date.now();
  return submitUrls([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&')));
}
