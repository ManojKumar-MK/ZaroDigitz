// Additional charges applied on top of the cart subtotal (handling, packing, delivery…).
// The live list comes from Firestore settings/shop.charges (editable in /admin → Settings);
// these defaults are used until that document exists or when Firebase is off.
export const DEFAULT_CHARGES = [
  { id: 'courier', label: 'Courier charges', type: 'fixed', value: 0 },
];

export const DEFAULT_CHARGES_NOTE = 'Courier charges depend on your location and are confirmed with the design proof.';

export function describeCharge(charge) {
  return charge.type === 'percent' ? `${charge.label} (${charge.value}%)` : charge.label;
}

/** Human sentence for FAQ / terms, e.g. "Handling & forwarding charges of 3%". */
export function describeCharges(charges = DEFAULT_CHARGES) {
  const active = (charges || []).filter((c) => Number(c.value) > 0);
  if (!active.length) return 'No additional charges';
  return active
    .map((c) => (c.type === 'percent' ? `${c.label} of ${c.value}%` : `${c.label} of ₹${Number(c.value).toLocaleString('en-IN')}`))
    .join(', ');
}

/**
 * computeCharges(12500, charges) -> { lines: [{ id, label, type, value, amount }], total }
 * Percent charges apply to the subtotal; fixed charges are flat rupee amounts.
 */
export function computeCharges(subtotal, charges = DEFAULT_CHARGES) {
  const base = Number(subtotal) || 0;
  const lines = (charges || [])
    .filter((c) => c && Number(c.value) > 0 && base > 0)
    .map((c) => {
      const value = Number(c.value) || 0;
      const amount = c.type === 'percent' ? Math.round((base * value) / 100) : Math.round(value);
      return { id: c.id || c.label, label: describeCharge(c), type: c.type, value, amount };
    });
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}
