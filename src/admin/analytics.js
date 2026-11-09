// Pure metric helpers over the orders array. No Firebase here, so it is easy to test.
import { toDate } from '../firebase/client.js';

export const isTest = (o) => o.test === true;
export const countable = (o) => o.status !== 'cancelled' && !isTest(o);
export const orderDate = (o) => toDate(o.createdAt) || new Date(0);

export function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function daysAgo(n) { const d = startOfDay(); d.setDate(d.getDate() - n); return d; }

export function inRange(orders, from, to) {
  return orders.filter((o) => { const d = orderDate(o); return (!from || d >= from) && (!to || d < to); });
}

export function totals(orders) {
  const live = orders.filter(countable);
  const revenue = live.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);
  const items = live.reduce((s, o) => s + (Number(o.itemCount) || 0), 0);
  return { revenue, orders: live.length, items, aov: live.length ? Math.round(revenue / live.length) : 0, cancelled: orders.length - live.length };
}

export function byStatus(orders) {
  return orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
}

/** [{ day: 'YYYY-MM-DD', label: '20 Oct', revenue, orders }] for the last `days` days. */
export function revenueByDay(orders, days = 30) {
  const map = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    map.set(d.toISOString().slice(0, 10), { day: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), revenue: 0, orders: 0 });
  }
  orders.filter(countable).forEach((o) => {
    const key = startOfDay(orderDate(o)).toISOString().slice(0, 10);
    const row = map.get(key);
    if (row) { row.revenue += Number(o.grandTotal) || 0; row.orders += 1; }
  });
  return [...map.values()];
}

export function topProducts(orders, limit = 10) {
  const map = new Map();
  orders.filter(countable).forEach((o) => (o.items || []).forEach((it) => {
    const key = it.code || it.name;
    const row = map.get(key) || { key, name: it.name, category: it.category, qty: 0, revenue: 0 };
    row.qty += Number(it.quantity) || 0;
    row.revenue += Number(it.lineTotal ?? (it.price * it.quantity)) || 0;
    map.set(key, row);
  }));
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function byCategory(orders, limit = 12) {
  const map = new Map();
  orders.filter(countable).forEach((o) => (o.items || []).forEach((it) => {
    const key = it.category || 'Other';
    const row = map.get(key) || { category: key, qty: 0, revenue: 0 };
    row.qty += Number(it.quantity) || 0;
    row.revenue += Number(it.lineTotal ?? (it.price * it.quantity)) || 0;
    map.set(key, row);
  }));
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function customers(orders) {
  const map = new Map();
  orders.forEach((o) => {
    const key = o.customerKey || o.customer?.mobile || o.customer?.email || o.id;
    const row = map.get(key) || { key, name: o.customer?.name || '—', mobile: o.customer?.mobile || '', email: o.customer?.email || '', city: o.customer?.city || '', state: o.customer?.state || '', orders: 0, spent: 0, lastOrder: null, cancelled: 0 };
    row.orders += 1;
    if (countable(o)) row.spent += Number(o.grandTotal) || 0; else row.cancelled += 1;
    const d = orderDate(o);
    if (!row.lastOrder || d > row.lastOrder) { row.lastOrder = d; row.name = o.customer?.name || row.name; row.city = o.customer?.city || row.city; }
    map.set(key, row);
  });
  return [...map.values()].sort((a, b) => b.spent - a.spent);
}

/* ───────────── extended analytics ───────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Last `months` calendar months: [{ key, label, revenue, orders, aov }] */
export function revenueByMonth(orders, months = 12) {
  const map = new Map();
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, { key, label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, revenue: 0, orders: 0, aov: 0 });
  }
  orders.filter(countable).forEach((o) => {
    const d = orderDate(o);
    const row = map.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    if (row) { row.revenue += Number(o.grandTotal) || 0; row.orders += 1; }
  });
  return [...map.values()].map((r) => ({ ...r, aov: r.orders ? Math.round(r.revenue / r.orders) : 0 }));
}

export function ordersByWeekday(orders) {
  const rows = WEEKDAYS.map((label) => ({ label, orders: 0, revenue: 0 }));
  orders.filter(countable).forEach((o) => { const r = rows[orderDate(o).getDay()]; r.orders += 1; r.revenue += Number(o.grandTotal) || 0; });
  return rows;
}

export function ordersByHour(orders) {
  const rows = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${String(h).padStart(2, '0')}:00`, orders: 0 }));
  orders.filter(countable).forEach((o) => { rows[orderDate(o).getHours()].orders += 1; });
  return rows;
}

/** Orders and revenue by state and by city. */
export function byRegion(orders, field = 'state', limit = 12) {
  const map = new Map();
  orders.filter(countable).forEach((o) => {
    const key = (o.customer?.[field] || 'Unknown').trim() || 'Unknown';
    const row = map.get(key) || { key, orders: 0, revenue: 0, customers: new Set() };
    row.orders += 1; row.revenue += Number(o.grandTotal) || 0; row.customers.add(o.customerKey || o.customer?.mobile);
    map.set(key, row);
  });
  return [...map.values()].map((r) => ({ ...r, customers: r.customers.size })).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

/** How many orders in `orders` came from customers who had ordered before (looking at `allOrders`). */
export function newVsReturning(orders, allOrders) {
  const firstOrderAt = new Map();
  allOrders.forEach((o) => {
    const k = o.customerKey || o.customer?.mobile; if (!k) return;
    const d = orderDate(o);
    if (!firstOrderAt.has(k) || d < firstOrderAt.get(k)) firstOrderAt.set(k, d);
  });
  let fresh = 0, returning = 0, returningRevenue = 0, freshRevenue = 0;
  orders.filter(countable).forEach((o) => {
    const k = o.customerKey || o.customer?.mobile;
    const isReturning = k && firstOrderAt.get(k) < orderDate(o);
    if (isReturning) { returning += 1; returningRevenue += Number(o.grandTotal) || 0; } else { fresh += 1; freshRevenue += Number(o.grandTotal) || 0; }
  });
  const uniq = new Set(orders.filter(countable).map((o) => o.customerKey || o.customer?.mobile)).size;
  return { fresh, returning, freshRevenue, returningRevenue, uniqueCustomers: uniq, repeatRate: fresh + returning ? Math.round((returning / (fresh + returning)) * 100) : 0 };
}

export function paymentBreakdown(orders) {
  const rows = {};
  orders.forEach((o) => { const k = o.paymentStatus || 'unpaid'; rows[k] = rows[k] || { key: k, orders: 0, amount: 0 }; rows[k].orders += 1; rows[k].amount += Number(o.grandTotal) || 0; });
  return Object.values(rows);
}

/** Time from 'new' to delivered/shipped in hours, plus ageing of still-open orders. */
export function fulfilment(orders) {
  const hoursBetween = (a, b) => Math.max(0, (toDate(b) - toDate(a)) / 36e5);
  const durations = [];
  let openCount = 0, openOver48h = 0, openValue = 0;
  orders.forEach((o) => {
    const hist = o.statusHistory || [];
    const started = hist.find((h) => h.status === 'new')?.at || o.createdAt;
    const done = hist.find((h) => h.status === 'delivered')?.at;
    if (done && started) durations.push(hoursBetween(started, done));
    if (['new', 'confirmed', 'packed'].includes(o.status)) {
      openCount += 1; openValue += Number(o.grandTotal) || 0;
      if (hoursBetween(o.createdAt, new Date()) > 48) openOver48h += 1;
    }
  });
  durations.sort((a, b) => a - b);
  const median = durations.length ? durations[Math.floor(durations.length / 2)] : null;
  const avg = durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : null;
  return { deliveredCount: durations.length, medianHours: median, avgHours: avg, openCount, openOver48h, openValue };
}

/** Product table: qty, revenue, number of orders, avg selling price, share of revenue. */
export function productTable(orders) {
  const map = new Map();
  let total = 0;
  orders.filter(countable).forEach((o) => (o.items || []).forEach((it) => {
    const key = it.code || it.name;
    const row = map.get(key) || { key, code: it.code, name: it.name, category: it.category, qty: 0, revenue: 0, orders: 0 };
    const rev = Number(it.lineTotal ?? it.price * it.quantity) || 0;
    row.qty += Number(it.quantity) || 0; row.revenue += rev; row.orders += 1; total += rev;
    map.set(key, row);
  }));
  return [...map.values()].map((r) => ({ ...r, avgPrice: r.qty ? Math.round(r.revenue / r.qty) : 0, share: total ? Math.round((r.revenue / total) * 1000) / 10 : 0 })).sort((a, b) => b.revenue - a.revenue);
}

export function cancellationStats(orders) {
  const cancelled = orders.filter((o) => o.status === 'cancelled');
  return { cancelled: cancelled.length, rate: orders.length ? Math.round((cancelled.length / orders.length) * 100) : 0, lostValue: cancelled.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0) };
}
