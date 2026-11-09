// Parsers that turn historical data into Firestore order / customer documents.
// Supported inputs:
//   1. CSV or JSON array of orders (one row per order)
//   2. Telegram Desktop chat export (result.json) of the Zaro order bot chat
//   3. CSV or JSON array of customers (name, mobile, city…)
import { buildOrderDocument, ORDER_STATUSES } from '../firebase/orders.js';
import { rawProducts, normalizeProduct } from '../data/products.js';

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((v) => v.trim() !== ''));
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase().replace(/^\uFEFF/, '').replace(/[^a-z0-9]+/g, '_'));
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

const catalog = () => rawProducts.map(normalizeProduct);
const byName = () => new Map(catalog().map((p) => [p.name.toLowerCase().replace(/\s+/g, ' '), p]));
const num = (v) => Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;
const pick = (r, ...keys) => { for (const k of keys) { if (r[k] != null && String(r[k]).trim() !== '') return String(r[k]).trim(); } return ''; };

function itemFromName(name, quantity, amount, lookup) {
  const clean = name.trim().replace(/\s+/g, ' ');
  const known = lookup.get(clean.toLowerCase());
  const qty = Number(quantity) || 1;
  const price = amount != null ? Math.round(amount / qty) : known?.price ?? 0;
  return { id: known?.id ?? null, code: known?.code ?? null, name: known?.name || clean, category: known?.category ?? null, brand: known?.brand ?? null, price, mrp: known?.mrp ?? null, quantity: qty };
}

function finishOrder(snapshot, { created, status, payment, notes, invoice, orderNumber, source }) {
  const doc = buildOrderDocument(snapshot, { invoiceNumber: invoice || null, orderNumber: orderNumber || undefined });
  const st = String(status || 'delivered').toLowerCase();
  return {
    ...doc,
    status: ORDER_STATUSES.includes(st) ? st : 'delivered',
    paymentStatus: String(payment || 'paid').toLowerCase(),
    notes: notes || '',
    source,
    imported: true,
    createdAt: created,
    updatedAt: created,
    statusHistory: [{ status: 'new', at: created.toISOString(), by: 'import' }],
  };
}

/** CSV / JSON array of orders -> { orders, errors } */
export function parseOrderImport(text) {
  const trimmed = text.trim();
  const rows = trimmed.startsWith('[') ? JSON.parse(trimmed) : parseCsv(trimmed);
  const lookup = byName();
  const errors = [];
  const orders = [];
  rows.forEach((r, idx) => {
    const dateRaw = pick(r, 'date', 'created_at', 'createdat', 'order_date');
    const created = dateRaw ? new Date(dateRaw) : new Date();
    if (Number.isNaN(created.getTime())) { errors.push(`Row ${idx + 1}: bad date "${dateRaw}"`); return; }
    let cart = [];
    const itemsRaw = pick(r, 'items', 'products');
    if (itemsRaw.startsWith('[')) {
      try { cart = JSON.parse(itemsRaw); } catch { errors.push(`Row ${idx + 1}: items JSON invalid`); }
    } else if (itemsRaw) {
      cart = itemsRaw.split(/;|\|/).map((part) => {
        const m = part.trim().match(/^(.*?)(?:\s*[x×]\s*(\d+))?$/i);
        return itemFromName(m?.[1] || part, m?.[2] || 1, null, lookup);
      }).filter((i) => i.name);
    }
    const total = num(pick(r, 'total', 'grand_total', 'amount', 'grandtotal')) || cart.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);
    if (!cart.length) cart = [{ id: null, code: null, name: 'Imported order', category: null, brand: null, price: total, mrp: null, quantity: 1 }];
    const snapshot = {
      form: { fullName: pick(r, 'name', 'customer', 'customer_name'), mobile: pick(r, 'mobile', 'phone'), altMobile: pick(r, 'alt_mobile', 'altmobile'), email: pick(r, 'email'), address: pick(r, 'address'), city: pick(r, 'city'), district: pick(r, 'district'), state: pick(r, 'state'), country: pick(r, 'country') || 'India', pincode: pick(r, 'pincode', 'pin') },
      cart, totalAmount: total, delivery: 0, grandTotal: total,
    };
    orders.push(finishOrder(snapshot, { created, status: pick(r, 'status'), payment: pick(r, 'payment', 'payment_status'), notes: pick(r, 'notes', 'note'), invoice: pick(r, 'invoice', 'invoice_number'), orderNumber: pick(r, 'order_number', 'ordernumber', 'order_id'), source: 'import' }));
  });
  return { orders, errors };
}

/**
 * Telegram Desktop export (Settings → Advanced → Export chat history → JSON) of the
 * chat where the order bot posts. Parses every "🎆 New Order" message.
 */
export function parseTelegramExport(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const messages = Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : [];
  const lookup = byName();
  const errors = [];
  const orders = [];
  const seen = new Set();
  const textOf = (m) => Array.isArray(m.text) ? m.text.map((t) => (typeof t === 'string' ? t : t.text || '')).join('') : String(m.text || '');

  messages.forEach((m, idx) => {
    const text = textOf(m);
    if (!/New Order/i.test(text) || !/Customer:/i.test(text)) return;
    const created = new Date(m.date || (m.date_unixtime ? Number(m.date_unixtime) * 1000 : Date.now()));
    if (Number.isNaN(created.getTime())) { errors.push(`Message ${m.id ?? idx}: bad date`); return; }
    const line = (label) => (text.match(new RegExp(`^${label}:\\s*(.+)$`, 'im')) || [])[1]?.trim() || '';
    const [mobile, altMobile = ''] = line('Mobile').split('/').map((v) => v.trim());
    const addressRaw = line('Address');
    // "address, city, district, state, country - pincode"
    const pin = (addressRaw.match(/-\s*(\d{6})\s*$/) || [])[1] || '';
    const parts = addressRaw.replace(/-\s*\d{6}\s*$/, '').split(',').map((v) => v.trim()).filter(Boolean);
    const [country = 'India', state = '', district = '', city = ''] = parts.slice().reverse();
    const address = parts.slice(0, Math.max(0, parts.length - 4)).join(', ') || parts[0] || '';

    const cart = [];
    text.split('\n').forEach((l) => {
      const mi = l.match(/^\s*[•\-*]\s*(.+?)\s+[x×]\s*(\d+)\s*(?:[—–-]\s*₹?\s*([\d,]+(?:\.\d+)?))?\s*$/i);
      if (mi) cart.push(itemFromName(mi[1], mi[2], mi[3] != null ? num(mi[3]) : null, lookup));
    });
    const subtotal = num(line('Subtotal')) || cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const total = num(line('Total')) || subtotal;
    const charges = total > subtotal ? [{ id: 'imported-charges', label: 'Additional charges', type: 'fixed', value: total - subtotal, amount: total - subtotal }] : [];
    if (!cart.length) { errors.push(`Message ${m.id ?? idx}: no items found`); return; }
    const key = `${created.toISOString().slice(0, 16)}|${mobile}|${total}`;
    if (seen.has(key)) return; // same order posted to two chats
    seen.add(key);
    const snapshot = {
      form: { fullName: line('Customer'), mobile, altMobile, email: line('Email'), address, city, district, state, country, pincode: pin },
      cart, totalAmount: subtotal, charges, chargesTotal: total - subtotal, delivery: 0, grandTotal: total,
    };
    orders.push(finishOrder(snapshot, { created, status: 'delivered', payment: 'paid', notes: `Imported from Telegram message ${m.id ?? ''}`.trim(), invoice: (text.match(/Invoice:\s*(\S+)/i) || [])[1] || null, source: 'telegram-import' }));
  });
  return { orders, errors, scanned: messages.length };
}

/** Detects the file type and dispatches. */
export function parseAnyOrderFile(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    const json = JSON.parse(trimmed);
    if (Array.isArray(json.messages)) return { kind: 'telegram', ...parseTelegramExport(json) };
    if (Array.isArray(json.orders)) return { kind: 'json', ...parseOrderImport(JSON.stringify(json.orders)) };
    throw new Error('Unrecognised JSON: expected a Telegram export ({ messages: [...] }) or an array of orders');
  }
  return { kind: trimmed.startsWith('[') ? 'json' : 'csv', ...parseOrderImport(trimmed) };
}

/** CSV / JSON array of customers -> [{ name, mobile, email, city, district, state, pincode, address, notes }] */
export function parseCustomersImport(text) {
  const trimmed = text.trim();
  const rows = trimmed.startsWith('[') ? JSON.parse(trimmed) : parseCsv(trimmed);
  const customers = [];
  const errors = [];
  rows.forEach((r, idx) => {
    const mobile = pick(r, 'mobile', 'phone', 'whatsapp').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    const name = pick(r, 'name', 'customer', 'customer_name');
    if (!mobile && !name) { errors.push(`Row ${idx + 1}: no name or mobile`); return; }
    customers.push({
      key: mobile || name.toLowerCase().replace(/\s+/g, '-'),
      name, mobile, email: pick(r, 'email'), city: pick(r, 'city'), district: pick(r, 'district'), state: pick(r, 'state'),
      pincode: pick(r, 'pincode', 'pin'), address: pick(r, 'address'), notes: pick(r, 'notes', 'note'),
      tags: pick(r, 'tags').split(/[;|]/).map((t) => t.trim()).filter(Boolean),
      source: 'import',
    });
  });
  return { customers, errors };
}

export const ORDER_CSV_TEMPLATE = [
  'date,name,mobile,email,address,city,district,state,pincode,items,total,status,payment,notes,order_number',
  '2025-10-28,Arun Kumar,9876543210,,12 Main Road,Madurai,Madurai,Tamil Nadu,625001,"Ivory Lotus Foil Invite x300",7200,delivered,paid,Wedding Nov 2026,',
  '2025-11-01,Priya Lakshmi,9123456780,priya@example.com,5 Temple Street,Sivakasi,Virudhunagar,Tamil Nadu,626189,"WIN WHEEL MAX x3",1200,delivered,paid,,',
].join('\n');

export const CUSTOMER_CSV_TEMPLATE = [
  'name,mobile,email,city,district,state,pincode,address,notes,tags',
  'Arun Kumar,9876543210,,Madurai,Madurai,Tamil Nadu,625001,12 Main Road,Wedding order,wedding',
].join('\n');
