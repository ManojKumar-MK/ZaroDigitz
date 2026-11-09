import { getFirebase, isFirebaseEnabled } from './client.js';
import { trackingIdFor, generateOrderNumber, buildOrderDocument, trackingDocFrom } from './orderDoc.js';

export { trackingIdFor, generateOrderNumber, buildOrderDocument };

export const ORDER_STATUSES = ['new', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
export const PAYMENT_STATUSES = ['unpaid', 'advance', 'paid', 'refunded'];

/** Customer-facing wording for each step of the timeline. */
export const STATUS_DESCRIPTIONS = {
  new: 'Order received. We will message you on WhatsApp for the names and wording.',
  confirmed: 'Design proof shared on WhatsApp. Printing starts after you approve it.',
  packed: 'Your cards are printed, packed and ready to dispatch.',
  shipped: 'Handed over to the courier. Tracking details below.',
  delivered: 'Delivered. Wishing you a wonderful celebration!',
  cancelled: 'This order was cancelled.',
};

export const STATUS_LABELS = {
  new: 'New',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};


/** Persist an order. Never throws: returns { ok, id, orderNumber } or { ok: false, reason }. */
export async function saveOrder(snapshot, meta = {}) {
  if (!isFirebaseEnabled) return { ok: false, reason: 'firebase-disabled' };
  try {
    const { db, fs } = await getFirebase();
    const data = buildOrderDocument(snapshot, meta);
    const body = { ...data, createdAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp() };
    // With a known order number the document id is the order number, so a retry writes the
    // same order instead of creating a second one.
    const ref = meta.orderNumber ? fs.doc(db, 'orders', data.orderNumber) : fs.doc(fs.collection(db, 'orders'));
    await fs.setDoc(ref, body);
    // Public mirror used by /track (no customer address or phone inside).
    try {
      await fs.setDoc(fs.doc(db, 'tracking', data.trackingId), trackingDocFrom({ id: ref.id, ...data }, fs));
    } catch (error) {
      console.warn('Tracking record could not be created:', error);
    }
    return { ok: true, id: ref.id, orderNumber: data.orderNumber, trackingId: data.trackingId };
  } catch (error) {
    console.warn('Order could not be saved:', error);
    return { ok: false, reason: error?.message || 'save-error', code: error?.code || 'unknown' };
  }
}

/** Store the Telegram delivery result on an order after the fact (rules allow only this field). */
export async function recordTelegramResult(orderId, result) {
  if (!isFirebaseEnabled || !orderId) return;
  try {
    const { db, fs } = await getFirebase();
    await fs.updateDoc(fs.doc(db, 'orders', orderId), {
      telegram: result ? { ok: Boolean(result.ok), reason: result.reason || null } : null,
      updatedAt: fs.serverTimestamp(),
    });
  } catch (error) {
    console.warn('Could not record Telegram result:', error);
  }
}

/** Live list of orders (newest first). Returns an unsubscribe function. */
export async function subscribeOrders(onChange, { max = 500 } = {}) {
  const { db, fs } = await getFirebase();
  const q = fs.query(fs.collection(db, 'orders'), fs.orderBy('createdAt', 'desc'), fs.limit(max));
  return fs.onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function updateOrder(id, patch) {
  const { db, fs } = await getFirebase();
  await fs.updateDoc(fs.doc(db, 'orders', id), { ...patch, updatedAt: fs.serverTimestamp() });
}


/** Ensure the public tracking doc exists for an order (older/imported orders may lack one). */
export async function ensureTracking(order) {
  const { db, fs } = await getFirebase();
  const trackingId = order.trackingId || trackingIdFor(order.orderNumber, order.customer?.mobile);
  const ref = fs.doc(db, 'tracking', trackingId);
  const snap = await fs.getDoc(ref);
  if (!snap.exists()) await fs.setDoc(ref, trackingDocFrom(order, fs));
  if (!order.trackingId && order.id) await fs.updateDoc(fs.doc(db, 'orders', order.id), { trackingId });
  return trackingId;
}

/**
 * Change status; writes the order (source of truth) and the public tracking mirror.
 * `order` is the full order object from the admin list.
 */
export async function setOrderStatus(order, status, { by = 'admin', note = '' } = {}) {
  const { db, fs } = await getFirebase();
  const entry = { status, at: new Date().toISOString(), by, ...(note ? { note } : {}) };
  const history = [...(order.statusHistory || []), entry];
  await fs.updateDoc(fs.doc(db, 'orders', order.id), { status, updatedAt: fs.serverTimestamp(), statusHistory: history });
  const trackingId = await ensureTracking({ ...order, status, statusHistory: history });
  await fs.updateDoc(fs.doc(db, 'tracking', trackingId), { status, statusHistory: history, updatedAt: fs.serverTimestamp() });
}

/** Add a note to the timeline without changing the status. */
export async function addTimelineNote(order, note, by = 'admin') {
  const { db, fs } = await getFirebase();
  const entry = { status: order.status, at: new Date().toISOString(), by, note };
  const history = [...(order.statusHistory || []), entry];
  await fs.updateDoc(fs.doc(db, 'orders', order.id), { statusHistory: history, updatedAt: fs.serverTimestamp() });
  const trackingId = await ensureTracking({ ...order, statusHistory: history });
  await fs.updateDoc(fs.doc(db, 'tracking', trackingId), { statusHistory: history, updatedAt: fs.serverTimestamp() });
}

/** LR / transport details, shown to the customer. */
export async function saveShipment(order, shipment) {
  const { db, fs } = await getFirebase();
  const trackingId = await ensureTracking(order);
  const clean = {
    lrNumber: String(shipment.lrNumber || '').trim(),
    transport: String(shipment.transport || '').trim(),
    transportContact: String(shipment.transportContact || '').trim(),
    vehicle: String(shipment.vehicle || '').trim(),
    bookedAt: shipment.bookedAt || '',
    expectedBy: shipment.expectedBy || '',
    notes: String(shipment.notes || '').trim(),
  };
  await fs.updateDoc(fs.doc(db, 'tracking', trackingId), { shipment: clean, updatedAt: fs.serverTimestamp() });
  await fs.updateDoc(fs.doc(db, 'orders', order.id), { shipment: clean, updatedAt: fs.serverTimestamp() });
}

export const MAX_TRACKING_PHOTOS = 3;

/** Attach a compressed photo (data URL) such as the LR copy or the packed parcel. */
export async function addTrackingPhoto(order, { dataUrl, label }) {
  const { db, fs } = await getFirebase();
  const trackingId = await ensureTracking(order);
  const ref = fs.doc(db, 'tracking', trackingId);
  const current = (await fs.getDoc(ref)).data()?.photos || [];
  if (current.length >= MAX_TRACKING_PHOTOS) throw new Error(`Maximum ${MAX_TRACKING_PHOTOS} photos per order`);
  const photo = { id: `p${Date.now()}`, label: String(label || 'Photo').trim(), dataUrl, at: new Date().toISOString() };
  await fs.updateDoc(ref, { photos: [...current, photo], updatedAt: fs.serverTimestamp() });
  return photo;
}

export async function removeTrackingPhoto(order, photoId) {
  const { db, fs } = await getFirebase();
  const trackingId = await ensureTracking(order);
  const ref = fs.doc(db, 'tracking', trackingId);
  const current = (await fs.getDoc(ref)).data()?.photos || [];
  await fs.updateDoc(ref, { photos: current.filter((p) => p.id !== photoId), updatedAt: fs.serverTimestamp() });
}

/** Admin: live view of one tracking doc (shipment + photos). cb(doc | null). */
export async function subscribeTracking(trackingId, cb) {
  const { db, fs } = await getFirebase();
  return fs.onSnapshot(fs.doc(db, 'tracking', trackingId), (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null));
}

/** Customer lookup for /track. Returns the doc or null. */
export async function getTracking(orderNumber, mobile) {
  if (!isFirebaseEnabled) return null;
  const { db, fs } = await getFirebase();
  const snap = await fs.getDoc(fs.doc(db, 'tracking', trackingIdFor(orderNumber, mobile)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function deleteOrder(id) {
  const { db, fs } = await getFirebase();
  await fs.deleteDoc(fs.doc(db, 'orders', id));
}

/** Contact-form enquiries. Never throws. */
export async function saveEnquiry(enquiry) {
  if (!isFirebaseEnabled) return { ok: false, reason: 'firebase-disabled' };
  try {
    const { db, fs } = await getFirebase();
    const ref = await fs.addDoc(fs.collection(db, 'enquiries'), {
      name: enquiry.name || '',
      mobile: String(enquiry.mobile || '').replace(/\D/g, ''),
      email: enquiry.email || '',
      message: enquiry.message || '',
      status: 'open',
      createdAt: fs.serverTimestamp(),
    });
    return { ok: true, id: ref.id };
  } catch (error) {
    console.warn('Enquiry could not be saved to Firebase:', error);
    return { ok: false, reason: error?.message || 'firebase-error' };
  }
}

export async function subscribeEnquiries(onChange, { max = 300 } = {}) {
  const { db, fs } = await getFirebase();
  const q = fs.query(fs.collection(db, 'enquiries'), fs.orderBy('createdAt', 'desc'), fs.limit(max));
  return fs.onSnapshot(q, (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function updateEnquiry(id, patch) {
  const { db, fs } = await getFirebase();
  await fs.updateDoc(fs.doc(db, 'enquiries', id), patch);
}

/** Imported customer list (customers without website orders yet). */
export async function subscribeCustomers(onChange, { max = 2000 } = {}) {
  const { db, fs } = await getFirebase();
  const q = fs.query(fs.collection(db, 'customers'), fs.limit(max));
  return fs.onSnapshot(q, (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function deleteCustomerDoc(id) {
  const { db, fs } = await getFirebase();
  await fs.deleteDoc(fs.doc(db, 'customers', id));
}

/* ---------------- shareable invoice links ----------------
 * invoices/{token} holds a copy of the order snapshot under an unguessable id so the
 * invoice can be opened from a WhatsApp/Telegram message without signing in.
 */
export function generateInvoiceToken() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint8Array(24))
    : Array.from({ length: 24 }, () => Math.floor(Math.random() * 256));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/** Never throws. Returns { ok, token } or { ok: false, reason }. */
export async function saveInvoiceShare(token, { snapshot, invoiceNumber, orderNumber }) {
  if (!isFirebaseEnabled) return { ok: false, reason: 'firebase-disabled' };
  try {
    const { db, fs } = await getFirebase();
    await fs.setDoc(fs.doc(db, 'invoices', token), {
      orderNumber: orderNumber || null,
      invoiceNumber: invoiceNumber || null,
      snapshot,
      createdAt: fs.serverTimestamp(),
    });
    return { ok: true, token };
  } catch (error) {
    console.warn('Invoice link could not be saved:', error);
    return { ok: false, reason: error?.message || 'firebase-error' };
  }
}

export async function getInvoiceShare(token) {
  const { db, fs } = await getFirebase();
  const snap = await fs.getDoc(fs.doc(db, 'invoices', token));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Admin-created order (counter sale, phone / WhatsApp order). Writes the order, its
 * public tracking record and an invoice share link. Returns { id, orderNumber, trackingId, invoiceToken }.
 */
export async function createAdminOrder(snapshot, { invoiceNumber, status = 'confirmed', paymentStatus = 'unpaid', source = 'counter', notes = '', by = 'admin' } = {}) {
  const { db, fs } = await getFirebase();
  const data = buildOrderDocument(snapshot, { invoiceNumber });
  const now = new Date().toISOString();
  const history = [{ status: 'new', at: now, by }, ...(status !== 'new' ? [{ status, at: now, by }] : [])];
  const invoiceToken = generateInvoiceToken();
  const order = {
    ...data,
    status,
    paymentStatus,
    source,
    notes,
    invoiceUrl: snapshot.invoiceUrl || null,
    statusHistory: history,
    createdAt: fs.serverTimestamp(),
    updatedAt: fs.serverTimestamp(),
  };
  const ref = await fs.addDoc(fs.collection(db, 'orders'), order);
  await fs.setDoc(fs.doc(db, 'tracking', data.trackingId), { ...trackingDocFrom({ id: ref.id, ...order, createdAt: new Date() }, fs), status, statusHistory: history });
  await fs.setDoc(fs.doc(db, 'invoices', invoiceToken), { orderNumber: data.orderNumber, invoiceNumber: invoiceNumber || null, snapshot, createdAt: fs.serverTimestamp() });
  return { id: ref.id, orderNumber: data.orderNumber, trackingId: data.trackingId, invoiceToken };
}

/** Mark/unmark an order as a test so it is hidden from analytics and dashboards. */
export async function setOrderTestFlag(order, isTest) {
  const { db, fs } = await getFirebase();
  await fs.updateDoc(fs.doc(db, 'orders', order.id), { test: Boolean(isTest), updatedAt: fs.serverTimestamp() });
}

/**
 * Danger zone: delete every order, tracking record and invoice copy.
 * Used to clear test data before going live. Returns counts.
 */
export async function deleteAllOrderData() {
  const { db, fs } = await getFirebase();
  const counts = {};
  for (const name of ['orders', 'tracking', 'invoices']) {
    const snap = await fs.getDocs(fs.collection(db, name));
    counts[name] = snap.size;
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = fs.writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  return counts;
}

/**
 * Admin edit of an existing order: items, customer, charges. Recomputes totals,
 * refreshes the invoice snapshot (so the PDF/invoice link reflect the change), the
 * public tracking record and appends a timeline note.
 * `edit` = { form, cart: [{ id, code, name, category, brand, price, mrp, quantity, tamil?, per?, unit? }], charges: [{ id, label, type, value, amount }], note? }
 */
export async function updateOrderContents(order, edit, { by = 'admin' } = {}) {
  const { db, fs } = await getFirebase();
  const cart = (edit.cart || []).filter((i) => Number(i.quantity) > 0);
  if (!cart.length) throw new Error('An order needs at least one item');
  const subtotal = cart.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  const charges = (edit.charges || []).map((c) => ({ id: c.id || c.label, label: c.label, type: c.type || 'fixed', value: Number(c.value) || 0, amount: Math.round(Number(c.amount) || 0) }));
  const chargesTotal = charges.reduce((s, c) => s + c.amount, 0);
  const grandTotal = Math.max(0, subtotal + chargesTotal);
  const form = { ...(order.snapshot?.form || {}), ...edit.form, mobile: String(edit.form?.mobile ?? order.customer?.mobile ?? '').replace(/\D/g, '') };
  const snapshot = { ...(order.snapshot || {}), form, cart, totalAmount: subtotal, charges, chargesTotal, note: order.snapshot?.note || '', delivery: 0, grandTotal, invoiceUrl: order.invoiceUrl || null };
  const rebuilt = buildOrderDocument(snapshot, { invoiceNumber: order.invoiceNumber, orderNumber: order.orderNumber });
  const entry = { status: order.status, at: new Date().toISOString(), by, note: edit.note || `Order edited: ${cart.length} items, total ₹${grandTotal.toLocaleString('en-IN')}` };
  const history = [...(order.statusHistory || []), entry];
  const trackingId = rebuilt.trackingId; // changes if the mobile number changed

  await fs.updateDoc(fs.doc(db, 'orders', order.id), {
    customer: rebuilt.customer, customerKey: rebuilt.customerKey, items: rebuilt.items, itemCount: rebuilt.itemCount,
    subtotal, charges, chargesTotal, grandTotal, snapshot, trackingId, statusHistory: history, edited: true, updatedAt: fs.serverTimestamp(),
  });

  // Tracking mirror (move it if the mobile changed so /track keeps working with the new number)
  const trackRef = fs.doc(db, 'tracking', trackingId);
  const oldTrackId = order.trackingId || trackingIdFor(order.orderNumber, order.customer?.mobile);
  const oldSnap = oldTrackId ? await fs.getDoc(fs.doc(db, 'tracking', oldTrackId)) : null;
  const carry = oldSnap?.exists() ? { shipment: oldSnap.data().shipment || null, photos: oldSnap.data().photos || [] } : {};
  await fs.setDoc(trackRef, {
    ...trackingDocFrom({ id: order.id, ...order, ...rebuilt, status: order.status, statusHistory: history, createdAt: order.createdAt }, fs),
    ...(carry.shipment ? { shipment: carry.shipment } : {}),
    ...(carry.photos?.length ? { photos: carry.photos } : {}),
    placedAt: oldSnap?.exists() ? oldSnap.data().placedAt : new Date().toISOString(),
  }, { merge: true });
  if (oldTrackId && oldTrackId !== trackingId && oldSnap?.exists()) await fs.deleteDoc(fs.doc(db, 'tracking', oldTrackId));

  // Invoice share copy
  const token = String(order.invoiceUrl || '').match(/\/invoice\/([a-z0-9]+)/i)?.[1];
  if (token) await fs.setDoc(fs.doc(db, 'invoices', token), { snapshot, invoiceNumber: order.invoiceNumber || null, orderNumber: order.orderNumber, updatedAt: fs.serverTimestamp() }, { merge: true });

  return { subtotal, chargesTotal, grandTotal, trackingId };
}
