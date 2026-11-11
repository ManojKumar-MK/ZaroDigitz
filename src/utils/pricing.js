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

/** Price per piece: the design's price plus any chosen options ("Front & back +₹0.30"). */
export function priceForQty(product = {}) {
  const base = Number(product.basePrice ?? product.price ?? product.offerPrice ?? product.mrp) || 0;
  return Math.round((base + (Number(product.optionsAdd) || 0)) * 100) / 100;
}

/** A product's option groups when they are switched on: [{ name, choices: [{ label, add }] }]. */
export function optionGroups(product = {}) {
  if (product.showOptions === false || !Array.isArray(product.options)) return [];
  return product.options.filter((g) => g && g.name && Array.isArray(g.choices) && g.choices.length);
}

/** Cart fields for the default choice of every option (quick "Add" from a product card). */
export function defaultOptions(product = {}) {
  const groups = optionGroups(product);
  if (!groups.length) return { options: undefined };
  const options = Object.fromEntries(groups.map((g) => [g.name, g.choices[0].label]));
  const optionsAdd = groups.reduce((sum, g) => sum + (Number(g.choices[0].add) || 0), 0);
  return { id: `${product.id}::${Object.values(options).join('|')}`, options, optionsAdd };
}
