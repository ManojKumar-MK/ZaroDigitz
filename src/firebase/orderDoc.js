// Pure order-document builders, shared by the website (src/firebase/orders.js) and the
// website server, which saves the order too when it forwards it to Telegram.

/** Public tracking id: order number + last 4 digits of the mobile (both needed to look it up). */
export function trackingIdFor(orderNumber, mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  const last4 = digits.slice(-4).padStart(4, '0');
  return `${String(orderNumber || '').trim().toUpperCase()}-${last4}`;
}


function pad(n, w = 2) {
  return String(n).padStart(w, '0');
}

/** Human-friendly, collision-resistant order number: ZD-251020-7K3Q */
export function generateOrderNumber(date = new Date()) {
  const yymmdd = `${pad(date.getFullYear() % 100)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  const rnd = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint8Array(4))
    : Array.from({ length: 4 }, () => Math.floor(Math.random() * 256));
  for (const b of rnd) suffix += alphabet[b % alphabet.length];
  return `ZD-${yymmdd}-${suffix}`;
}

/**
 * Normalise the checkout snapshot ({ form, cart, totalAmount, delivery, grandTotal })
 * into the Firestore order document. The raw snapshot is kept too so the exact
 * invoice PDF can be regenerated from the admin panel.
 */
export function buildOrderDocument(snapshot, { invoiceNumber, telegram, orderNumber } = {}) {
  const { form = {}, cart = [], totalAmount = 0, charges = [], chargesTotal = 0, note = '', delivery = 0, grandTotal = 0, invoiceUrl = null } = snapshot;
  const items = cart.map((item) => ({
    id: item.id ?? null,
    code: item.code ?? null,
    name: item.name,
    category: item.category ?? null,
    brand: item.brand ?? null,
    price: Number(item.price) || 0,
    mrp: item.mrp ?? null,
    quantity: Number(item.quantity) || 0,
    lineTotal: (Number(item.price) || 0) * (Number(item.quantity) || 0),
    ...(item.custom ? { custom: true } : {}),
    ...(item.options ? { options: item.options } : {}),
    ...(item.personalisation ? { personalisation: { token: item.personalisation.token || null, summary: item.personalisation.summary || [] } } : {}),
  }));
  const mobile = String(form.mobile || '').replace(/\D/g, '');
  const finalOrderNumber = orderNumber || generateOrderNumber();
  return {
    orderNumber: finalOrderNumber,
    trackingId: trackingIdFor(finalOrderNumber, mobile),
    invoiceNumber: invoiceNumber || null,
    invoiceUrl: invoiceUrl || null,
    status: 'new',
    paymentStatus: 'unpaid',
    source: 'website',
    customer: {
      name: form.fullName || '',
      mobile,
      altMobile: String(form.altMobile || '').replace(/\D/g, ''),
      email: form.email || '',
      address: form.address || '',
      city: form.city || '',
      district: form.district || '',
      state: form.state || '',
      country: form.country || '',
      pincode: form.pincode || '',
    },
    customerKey: mobile || (form.email || '').toLowerCase() || 'unknown',
    event: form.eventFor || form.eventDate || form.eventNotes ? { for: String(form.eventFor || '').slice(0, 160), date: String(form.eventDate || '').slice(0, 20), notes: String(form.eventNotes || '').slice(0, 2000) } : null,
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: Number(totalAmount) || 0,
    charges: (charges || []).map((c) => ({ id: c.id, label: c.label, type: c.type, value: c.value, amount: Number(c.amount) || 0 })),
    chargesTotal: Number(chargesTotal) || 0,
    chargesNote: note || '',
    delivery: Number(delivery) || 0,
    grandTotal: Number(grandTotal) || 0,
    notes: '',
    telegram: telegram ? { ok: Boolean(telegram.ok), reason: telegram.reason || null } : null,
    snapshot,
    statusHistory: [{ status: 'new', at: new Date().toISOString(), by: 'customer' }],
  };
}

/** Fields safe to show the customer on /track. Shipment + photos live only here. */
export function trackingDocFrom(order, fs) {
  return {
    orderNumber: order.orderNumber,
    orderId: order.id || null,
    customerName: String(order.customer?.name || '').split(' ')[0] || '',
    mobileLast4: String(order.customer?.mobile || '').replace(/\D/g, '').slice(-4),
    status: order.status || 'new',
    statusHistory: order.statusHistory || [],
    itemCount: order.itemCount || 0,
    grandTotal: order.grandTotal || 0,
    placedAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : (order.statusHistory?.[0]?.at || new Date().toISOString()),
    updatedAt: fs.serverTimestamp(),
  };
}
