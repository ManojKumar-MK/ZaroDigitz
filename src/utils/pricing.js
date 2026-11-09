// One price per piece and any quantity: quantities and best prices for big orders are
// settled on WhatsApp or a call. (Kept as helpers so the cart, product page and invoice agree.)

/** Quantity rules: start at 1, step by 1. */
export function qtyRules() {
  return { min: 1, step: 1 };
}

/** A whole number of at least 1. */
export function clampQty(product, qty) {
  return Math.max(1, Math.round(Number(qty) || 0));
}

/** Price per piece (the same at every quantity). */
export function priceForQty(product = {}) {
  return Number(product.basePrice ?? product.price ?? product.offerPrice ?? product.mrp) || 0;
}
