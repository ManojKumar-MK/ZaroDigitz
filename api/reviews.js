// Google reviews for the storefront, from the official Places API (New).
// Needs GOOGLE_PLACES_API_KEY in the Hostinger environment. GOOGLE_PLACE_ID is optional:
// without it the listing is found once by name ("Zaro Digitz Sivakasi") and remembered.
// Results are cached in the meta table for 12 hours, so the API is called rarely.
import { pool } from './db.js';

const KEY = () => process.env.GOOGLE_PLACES_API_KEY || '';
const QUERY = () => process.env.GOOGLE_PLACE_QUERY || 'Zaro Digitz, Maruthu Pandiyar Mettu Street, Sivakasi';
const CACHE = 'google_reviews';
const TTL = 12 * 60 * 60 * 1000;

export const reviewsConfigured = () => Boolean(KEY());

async function readMeta(name) {
  const [rows] = await pool.query('SELECT value FROM meta WHERE name = ?', [name]);
  return rows.length ? JSON.parse(rows[0].value) : null;
}
async function writeMeta(name, value) {
  await pool.query('INSERT INTO meta (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [name, JSON.stringify(value)]);
}

async function placeId() {
  if (process.env.GOOGLE_PLACE_ID) return process.env.GOOGLE_PLACE_ID;
  const known = await readMeta('google_place_id');
  if (known?.id) return known.id;
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY(), 'X-Goog-FieldMask': 'places.id,places.displayName' },
    body: JSON.stringify({ textQuery: QUERY(), languageCode: 'en', regionCode: 'IN' }),
  });
  const j = await r.json();
  const id = j?.places?.[0]?.id;
  if (!id) throw new Error(j?.error?.message || 'Listing not found on Google');
  await writeMeta('google_place_id', { id, name: j.places[0].displayName?.text || '' });
  return id;
}

async function fetchFromGoogle() {
  const id = await placeId();
  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=en`, {
    headers: { 'X-Goog-Api-Key': KEY(), 'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri' },
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Google ${r.status}`);
  return {
    fetchedAt: Date.now(),
    rating: j.rating || null,
    count: j.userRatingCount || 0,
    url: j.googleMapsUri || null,
    reviews: (j.reviews || []).map((v) => ({
      author: v.authorAttribution?.displayName || 'Google user',
      authorUrl: v.authorAttribution?.uri || null,
      photo: v.authorAttribution?.photoUri || null,
      rating: v.rating || 0,
      text: v.text?.text || v.originalText?.text || '',
      when: v.relativePublishTimeDescription || '',
    })).filter((v) => v.text),
  };
}

/** Cached reviews; refreshes in the background when older than 12 hours. */
export async function getReviews() {
  if (!reviewsConfigured()) return { configured: false, reviews: [] };
  const cached = await readMeta(CACHE).catch(() => null);
  const fresh = cached && Date.now() - cached.fetchedAt < TTL;
  if (fresh) return { configured: true, ...cached };
  try {
    const data = await fetchFromGoogle();
    await writeMeta(CACHE, data);
    return { configured: true, ...data };
  } catch (e) {
    console.warn('google reviews:', e.message);
    return cached ? { configured: true, ...cached, stale: true } : { configured: true, reviews: [], error: e.message };
  }
}
