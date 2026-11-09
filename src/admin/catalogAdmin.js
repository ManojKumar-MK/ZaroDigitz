import { rawProducts } from '../data/products';

/** Admin view merges the built-in price list with Firestore products (hidden ones included). */
export function mergeForAdmin(firestoreProducts) {
  const byCode = new Map(rawProducts.map((p) => [p.code, { ...p, _source: 'static' }]));
  firestoreProducts.forEach((d) => {
    const code = d.code || d.id;
    const base = byCode.get(code);
    byCode.set(code, { ...(base || { id: null, sno: 9999, image: '' }), ...d, code, _source: base ? 'synced' : 'firebase' });
  });
  return [...byCode.values()].sort((a, b) => (a.sortOrder ?? a.sno ?? 0) - (b.sortOrder ?? b.sno ?? 0));
}

export const SOURCE_LABEL = { static: 'Built-in', synced: 'Edited', firebase: 'Added' };

/** Sales of one product (or all, keyed by code) from orders, excluding test and cancelled. */
export function productSales(orders, { sinceDays } = {}) {
  const since = sinceDays ? Date.now() - sinceDays * 864e5 : 0;
  const map = new Map();
  orders.forEach((o) => {
    if (o.test || o.status === 'cancelled') return;
    const t = o.createdAt?.toDate ? o.createdAt.toDate().getTime() : new Date(o.createdAt || 0).getTime();
    if (since && t < since) return;
    (o.items || []).forEach((it) => {
      if (!it.code) return;
      const row = map.get(it.code) || { qty: 0, revenue: 0, orders: 0, last: 0 };
      row.qty += Number(it.quantity) || 0;
      row.revenue += Number(it.lineTotal ?? it.price * it.quantity) || 0;
      row.orders += 1;
      row.last = Math.max(row.last, t);
      map.set(it.code, row);
    });
  });
  return map;
}
