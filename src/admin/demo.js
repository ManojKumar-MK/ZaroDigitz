// Developer helpers: sample orders (flagged demo: true so they can be removed) and
// bulk import of historical orders from CSV / JSON exports.
import { getFirebase } from '../firebase/client';
import { buildOrderDocument } from '../firebase/orders';
import { rawProducts, normalizeProduct } from '../data/products';

const NAMES = ['Arun Kumar', 'Priya Lakshmi', 'Suresh Babu', 'Kavitha R', 'Mohammed Imran', 'Deepa Raj', 'Vignesh S', 'Anitha M', 'Rajesh Kannan', 'Meena Devi', 'Karthik V', 'Sowmya N'];
const CITIES = [['Sivakasi', 'Virudhunagar', 'Tamil Nadu', '626189'], ['Madurai', 'Madurai', 'Tamil Nadu', '625001'], ['Chennai', 'Chennai', 'Tamil Nadu', '600001'], ['Coimbatore', 'Coimbatore', 'Tamil Nadu', '641001'], ['Bengaluru', 'Bengaluru Urban', 'Karnataka', '560001'], ['Hyderabad', 'Hyderabad', 'Telangana', '500001'], ['Trichy', 'Tiruchirappalli', 'Tamil Nadu', '620001']];

function rand(n) { return Math.floor(Math.random() * n); }
function pick(arr) { return arr[rand(arr.length)]; }

export function makeDemoOrder(daysBack) {
  const catalog = rawProducts.map(normalizeProduct).filter((p) => p.price != null);
  const count = 2 + rand(6);
  const cart = Array.from({ length: count }, () => {
    const p = pick(catalog);
    return { ...p, quantity: 1 + rand(5) };
  });
  const totalAmount = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const [city, district, state, pincode] = pick(CITIES);
  const name = pick(NAMES);
  const mobile = `9${String(100000000 + rand(899999999))}`;
  const snapshot = {
    form: { fullName: name, mobile, altMobile: '', email: `${name.split(' ')[0].toLowerCase()}@example.com`, address: `${1 + rand(200)}, Main Road`, city, district, state, country: 'India', pincode },
    cart,
    totalAmount,
    delivery: 0,
    grandTotal: totalAmount,
  };
  const created = new Date();
  created.setDate(created.getDate() - daysBack);
  created.setHours(9 + rand(12), rand(60), 0, 0);
  const statusPool = daysBack > 7 ? ['delivered', 'delivered', 'delivered', 'shipped', 'cancelled'] : daysBack > 2 ? ['confirmed', 'packed', 'shipped', 'delivered'] : ['new', 'new', 'confirmed'];
  const status = pick(statusPool);
  const doc = buildOrderDocument(snapshot, { invoiceNumber: `${created.getFullYear()}#D${rand(900) + 100}`, orderNumber: undefined });
  return {
    ...doc,
    status,
    paymentStatus: status === 'delivered' ? 'paid' : status === 'cancelled' ? 'unpaid' : pick(['unpaid', 'advance', 'paid']),
    demo: true,
    source: 'demo',
    createdAt: created,
    updatedAt: created,
    statusHistory: [{ status: 'new', at: created.toISOString(), by: 'demo' }, ...(status !== 'new' ? [{ status, at: new Date(created.getTime() + 3600e3).toISOString(), by: 'demo' }] : [])],
  };
}

export async function loadDemoOrders(count = 40) {
  const { db, fs } = await getFirebase();
  const batch = fs.writeBatch(db);
  for (let i = 0; i < count; i++) {
    const daysBack = Math.floor(Math.pow(Math.random(), 1.6) * 60); // skew towards recent days
    const order = makeDemoOrder(daysBack);
    batch.set(fs.doc(fs.collection(db, 'orders')), { ...order, createdAt: fs.Timestamp.fromDate(order.createdAt), updatedAt: fs.Timestamp.fromDate(order.updatedAt) });
  }
  await batch.commit();
  return count;
}

export async function removeDemoOrders() {
  const { db, fs } = await getFirebase();
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'orders'), fs.where('demo', '==', true)));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = fs.writeBatch(db);
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.docs.length;
}

/* ---------------- import of historical orders ---------------- */
export { parseOrderImport, parseTelegramExport, parseAnyOrderFile, parseCustomersImport } from './importers';

export async function importOrders(orders) {
  const { db, fs } = await getFirebase();
  for (let i = 0; i < orders.length; i += 400) {
    const batch = fs.writeBatch(db);
    orders.slice(i, i + 400).forEach((o) => {
      batch.set(fs.doc(fs.collection(db, 'orders')), { ...o, createdAt: fs.Timestamp.fromDate(o.createdAt), updatedAt: fs.Timestamp.fromDate(o.updatedAt) });
    });
    await batch.commit();
  }
  return orders.length;
}

/** Customers imported from a list (no orders yet). Keyed by mobile so re-imports update instead of duplicating. */
export async function importCustomers(customers) {
  const { db, fs } = await getFirebase();
  for (let i = 0; i < customers.length; i += 400) {
    const batch = fs.writeBatch(db);
    customers.slice(i, i + 400).forEach((c) => {
      batch.set(fs.doc(db, 'customers', c.key), { ...c, updatedAt: fs.serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  }
  return customers.length;
}

export async function removeImportedOrders() {
  const { db, fs } = await getFirebase();
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'orders'), fs.where('imported', '==', true)));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = fs.writeBatch(db);
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.docs.length;
}
