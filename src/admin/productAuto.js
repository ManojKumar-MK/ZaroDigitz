// Suggestions for the product form: Tamil name from the English name, and a default
// description. Tamil words come first from the shop's own price list (so "LAKSHMI" is
// spelt the way the list spells it), then from Google transliteration via the API.
import { rawProducts } from '../data/products.js';
import { categoryBlurb } from '../seo/catalog.js';
import { apiRequest } from '../firebase/apiStore.js';
import { getFirebaseAuth } from '../firebase/client.js';

const norm = (w) => String(w).toUpperCase().replace(/[^A-Z0-9]/g, '');
// Words the Tamil names usually leave out.
const SKIP = new Set(['INCH', 'AND', 'OF', 'THE', 'WITH']);

/** English word → most common Tamil word, learned from products that have both names. */
export function buildDictionary(products = []) {
  const counts = new Map();
  for (const p of [...rawProducts, ...products]) {
    if (!p?.name || !p?.tamil) continue;
    const en = String(p.name).trim().split(/\s+/).filter((w) => !SKIP.has(norm(w)));
    const ta = String(p.tamil).trim().split(/[\s,]+/).filter(Boolean);
    if (en.length !== ta.length) continue; // only learn from names whose words line up
    en.forEach((w, i) => {
      const k = norm(w);
      if (!k || /^[0-9]/.test(k) || !/[A-Z]/.test(k)) return;
      const c = counts.get(k) || {};
      c[ta[i]] = (c[ta[i]] || 0) + 1;
      counts.set(k, c);
    });
  }
  const dict = new Map();
  counts.forEach((c, k) => dict.set(k, Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]));
  return dict;
}

/**
 * "4' inch GOLD LAKSHMI" → "4' கோல்டு லட்சுமி". Numbers, sizes and symbols stay as they are.
 * Unknown words are transliterated by Google (through the API); if that fails they stay in English.
 */
export async function tamilFromEnglish(name, dict) {
  const tokens = String(name || '').trim().split(/\s+/).filter(Boolean);
  const unknown = [...new Set(tokens.filter((w) => /[a-z]/i.test(w) && !SKIP.has(norm(w)) && !dict.has(norm(w))).map((w) => w.replace(/[^a-z]/gi, '').toLowerCase()).filter(Boolean))];
  let fetched = {};
  if (unknown.length) {
    try {
      await getFirebaseAuth();
      fetched = (await apiRequest('GET', `/v1/admin/translit?words=${encodeURIComponent(unknown.slice(0, 20).join(','))}`)).words || {};
    } catch { /* offline or not signed in: keep the English word */ }
  }
  return tokens
    .filter((w) => !SKIP.has(norm(w)))
    .map((w) => {
      if (!/[a-z]/i.test(w)) return w; // 4', 10, (5pcs) …
      const known = dict.get(norm(w));
      if (known) return known;
      const core = w.replace(/[^a-z]/gi, '').toLowerCase();
      const t = fetched[core];
      return t ? w.replace(/[a-z]+/i, t) : w; // keep brackets/punctuation around the word
    })
    .join(' ');
}

/** A plain default description built from the product's own details. */
export function defaultDescription({ name, category }) {
  if (!String(name || '').trim()) return '';
  return `${String(name).trim()} by Zaro Digitz, Sivakasi. ${categoryBlurb(category)} Personalised with your names, dates and wording; we send a proof on WhatsApp and print after you approve it.`;
}
