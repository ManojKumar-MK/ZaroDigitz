// Per-card pricing with quantity tiers. Used by the product page, cart, checkout and
// invoice, so the price a customer sees is the price on the invoice.

const num = (v, fallback) => (Number(v) > 0 ? Number(v) : fallback);

/** Smallest quantity and step for a product (cards default to 100, in steps of 50). */
export function qtyRules(product = {}) {
  return { min: num(product.minQty, 100), step: num(product.qtyStep, 50) };
}

/** Nearest allowed quantity: at least the minimum, then in whole steps above it. */
export function clampQty(product, qty) {
  const { min, step } = qtyRules(product);
  const n = Math.max(min, Math.round(Number(qty) || 0));
  return min + Math.ceil((n - min) / step) * step;
}

/** Per-card price for a quantity: the best tier reached, else the base price. */
export function priceForQty(product = {}, qty = 0) {
  const base = Number(product.basePrice ?? product.price ?? product.offerPrice ?? product.mrp) || 0;
  const tiers = Array.isArray(product.tiers) ? product.tiers : [];
  return tiers.reduce((best, t) => (qty >= Number(t.from) && Number(t.price) < best ? Number(t.price) : best), base);
}

/** Rows for the "Bulk price" table: [{ range: '100–199', price }]. */
export function tierRows(product = {}) {
  const { min } = qtyRules(product);
  const base = Number(product.basePrice ?? product.price ?? product.offerPrice ?? product.mrp) || 0;
  const tiers = (Array.isArray(product.tiers) ? product.tiers : []).filter((t) => Number(t.from) > min).sort((a, b) => a.from - b.from);
  if (!tiers.length) return [];
  const starts = [{ from: min, price: base }, ...tiers];
  return starts.map((t, i) => ({ range: starts[i + 1] ? `${t.from}–${starts[i + 1].from - 1}` : `${t.from}+`, price: Number(t.price) }));
}
