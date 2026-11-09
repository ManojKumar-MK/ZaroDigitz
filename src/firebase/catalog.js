// Dynamic catalog: Firestore `products/{code}` documents override / extend the static
// price list in src/data/products.js, and `settings/shop` carries store-wide knobs.
// The merge result is pushed through saveCatalogProducts(), which every page already
// listens to via the 'digitz-catalog-updated' event, so no page needed to change.
import { getFirebase, isFirebaseEnabled } from './client';
import { DEFAULT_CHARGES, DEFAULT_CHARGES_NOTE } from '../data/charges';
import { DEFAULT_WHATSAPP_GREETING } from '../utils/whatsapp';
import {
  rawProducts,
  normalizeProduct,
  saveCatalogProducts,
  setDiscountPercent,
  DISCOUNT_PERCENT,
} from '../data/products';

export const DEFAULT_SETTINGS = {
  discountPercent: DISCOUNT_PERCENT,
  announcement: '',
  acceptingOrders: true,
  whatsappNumber: '917010935230',
  // 'prompt' = confirmation page first, then a slide-in WhatsApp prompt (default)
  // 'auto'   = open WhatsApp immediately when the order is placed
  // 'off'    = only the button on the confirmation page
  whatsappAfterOrder: 'prompt',
  whatsappGreeting: DEFAULT_WHATSAPP_GREETING,
  telegramEnabled: true,
  charges: DEFAULT_CHARGES,
  chargesNote: DEFAULT_CHARGES_NOTE,
  showNoteOnInvoice: false,
  ga4Id: '',
  googlePlaceId: '', // blank = the listing in src/seo/site.js
  googleCid: '',
  customCategories: [], // [{ name, tamil, blurb }] added in Admin → Products → Categories
  seoPages: {}, // { '/path': { title, description } } set in Admin → SEO
  seoChecklist: {}, // { key: 'YYYY-MM-DD' } setup steps ticked in Admin → SEO
  updatedAt: null,
};

const PRODUCT_FIELDS = ['name', 'tamil', 'category', 'brand', 'per', 'unit', 'mrp', 'offerPrice', 'image', 'active', 'sortOrder', 'description', 'seoTitle', 'seoDescription'];

/** Strip a product down to the fields stored in Firestore. */
export function toProductDoc(product) {
  const doc = {};
  PRODUCT_FIELDS.forEach((key) => {
    if (product[key] !== undefined) doc[key] = product[key];
  });
  doc.code = product.code;
  if (doc.active === undefined) doc.active = true;
  if (doc.sortOrder === undefined) doc.sortOrder = product.sno ?? product.id ?? 0;
  // Auto-resolved /products/ paths are derived from the name at runtime; don't persist them.
  if (typeof doc.image === 'string' && doc.image.startsWith('/products/')) doc.image = '';
  return doc;
}

/** Merge Firestore product docs over the static list. Inactive products are dropped. */
export function mergeCatalog(firestoreProducts) {
  const byCode = new Map(rawProducts.map((p) => [p.code, { ...p }]));
  let nextId = Math.max(0, ...rawProducts.map((p) => Number(p.id) || 0)) + 1;
  firestoreProducts.forEach((doc) => {
    const code = doc.code || doc.id;
    const base = byCode.get(code) || { id: nextId++, sno: doc.sortOrder ?? nextId, code, image: '' };
    byCode.set(code, { ...base, ...doc, code });
  });
  return [...byCode.values()]
    .filter((p) => p.active !== false)
    .sort((a, b) => (a.sortOrder ?? a.sno ?? 0) - (b.sortOrder ?? b.sno ?? 0) || (a.id ?? 0) - (b.id ?? 0))
    .map((p, index) => normalizeProduct({ ...p, sno: index + 1 }));
}

/**
 * Storefront: keep the local catalog in sync with Firestore. Resolves to an
 * unsubscribe function, or a no-op when Firebase is not configured.
 */
export async function startCatalogSync({ onSettings } = {}) {
  if (!isFirebaseEnabled) return () => {};
  // 1) The website server keeps a cached copy of the catalog: no Firestore reads per visitor.
  try {
    const r = await fetch('/api/catalog', { headers: { Accept: 'application/json' }, cache: 'no-cache' }); // always the latest after admin edits
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
      const j = await r.json();
      if (j.ok && Array.isArray(j.products)) {
        const s = { ...DEFAULT_SETTINGS, ...(j.settings || {}) };
        onSettings?.(s);
        setDiscountPercent(s.discountPercent);
        saveCatalogProducts(mergeCatalog(j.products));
        return () => {};
      }
    }
  } catch { /* no server (dev, other hosting): fall back to Firestore below */ }
  // 2) Fallback: live Firestore listeners (each visitor reads every product doc).
  const { db, fs } = await getFirebase();
  let products = null;
  let settings = { ...DEFAULT_SETTINGS };

  const push = () => {
    if (products === null) return; // wait for the first products snapshot
    setDiscountPercent(settings.discountPercent);
    saveCatalogProducts(mergeCatalog(products));
  };

  const unsubSettings = fs.onSnapshot(fs.doc(db, 'settings', 'shop'), (snap) => {
    settings = { ...DEFAULT_SETTINGS, ...(snap.exists() ? snap.data() : {}) };
    onSettings?.(settings);
    push();
  }, (err) => console.warn('settings sync failed', err));

  const unsubProducts = fs.onSnapshot(fs.collection(db, 'products'), (snap) => {
    products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    push();
  }, (err) => console.warn('catalog sync failed', err));

  return () => { unsubSettings(); unsubProducts(); };
}

/* ---------------- admin side ---------------- */

export async function subscribeProducts(onChange) {
  const { db, fs } = await getFirebase();
  return fs.onSnapshot(fs.collection(db, 'products'), (snap) =>
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export async function upsertProduct(code, data) {
  const { db, fs } = await getFirebase();
  await fs.setDoc(fs.doc(db, 'products', code), { ...toProductDoc({ ...data, code }), updatedAt: fs.serverTimestamp() }, { merge: true });
  notifyCatalogChanged();
}

export async function deleteProductDoc(code) {
  const { db, fs } = await getFirebase();
  await fs.deleteDoc(fs.doc(db, 'products', code));
  notifyCatalogChanged();
}

/** One-time import of the static price list into Firestore (skips codes that already exist). */
export async function seedProductsFromStatic({ overwrite = false } = {}) {
  const { db, fs } = await getFirebase();
  const existing = new Set((await fs.getDocs(fs.collection(db, 'products'))).docs.map((d) => d.id));
  const todo = rawProducts.filter((p) => overwrite || !existing.has(p.code));
  for (let i = 0; i < todo.length; i += 400) {
    const batch = fs.writeBatch(db);
    todo.slice(i, i + 400).forEach((p) => {
      batch.set(fs.doc(db, 'products', p.code), { ...toProductDoc(p), updatedAt: fs.serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  }
  notifyCatalogChanged();
  return { written: todo.length, skipped: rawProducts.length - todo.length };
}

export async function subscribeSettings(onChange) {
  const { db, fs } = await getFirebase();
  return fs.onSnapshot(fs.doc(db, 'settings', 'shop'), (snap) =>
    onChange({ ...DEFAULT_SETTINGS, ...(snap.exists() ? snap.data() : {}) })
  );
}

/** Shop-defined categories ([{ name, tamil, blurb }]); built-in ones are in src/data/products.js. */
export async function saveCustomCategories(list) {
  await saveSettings({ customCategories: list.map((c) => ({ name: String(c.name).trim(), tamil: String(c.tamil || '').trim(), blurb: String(c.blurb || '').trim() })) });
}

export async function saveSettings(patch) {
  const { db, fs } = await getFirebase();
  await fs.setDoc(fs.doc(db, 'settings', 'shop'), { ...patch, updatedAt: fs.serverTimestamp() }, { merge: true });
  notifyCatalogChanged();
}

/* ---------------- uploaded product photos ----------------
 * productImages/{code} = { dataUrl, contentType, bytes, updatedAt }. Kept out of
 * products/{code} so the storefront's catalog download stays small; the server
 * streams them at /img/p/<code>.
 */
export const productImageUrl = (code, version = Date.now()) => `/img/p/${encodeURIComponent(code)}?v=${version}`;

export async function saveProductImage(code, dataUrl) {
  const { db, fs } = await getFirebase();
  const contentType = (dataUrl.match(/^data:([^;]+);base64,/) || [])[1] || 'image/jpeg';
  const bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
  if (bytes > 900 * 1024) throw new Error('Photo is too large even after compression; try a smaller one');
  await fs.setDoc(fs.doc(db, 'productImages', code), { dataUrl, contentType, bytes, updatedAt: fs.serverTimestamp() });
  notifyCatalogChanged();
  return productImageUrl(code);
}

/**
 * The website server caches the catalog for hours to save Firestore reads; after any
 * catalog/settings change, ask it to re-read now. Fire-and-forget, never throws.
 */
export function notifyCatalogChanged() {
  try { fetch('/api/seo/refresh', { method: 'POST', keepalive: true }).catch(() => {}); } catch { /* ignore */ }
}

export async function deleteProductImage(code) {
  const { db, fs } = await getFirebase();
  await fs.deleteDoc(fs.doc(db, 'productImages', code));
  notifyCatalogChanged();
}
