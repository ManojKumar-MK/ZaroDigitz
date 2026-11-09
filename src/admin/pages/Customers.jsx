import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminData } from '../AdminData';
import { customers } from '../analytics';
import { Button, Card, Empty, inputClass, inr, fmtDate, downloadCsv } from '../ui';
import { FiDownload, FiUserPlus } from 'react-icons/fi';
import AddCustomerDrawer from '../AddCustomerDrawer';

export default function Customers() {
  const { orders, ordersLoading, customers: imported } = useAdminData();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const list = useMemo(() => {
    const fromOrders = customers(orders.filter((o) => !o.test));
    const byKey = new Map(fromOrders.map((c) => [c.key, c]));
    // Imported customers (CSV) fill in gaps: contacts with no website order yet, or extra details.
    imported.forEach((c) => {
      const key = c.key || c.mobile || c.id;
      const existing = byKey.get(key);
      if (existing) {
        byKey.set(key, { ...existing, email: existing.email || c.email, city: existing.city || c.city, state: existing.state || c.state, notes: c.notes, tags: c.tags, imported: true });
      } else {
        byKey.set(key, { key, name: c.name || '—', mobile: c.mobile || '', email: c.email || '', city: c.city || '', state: c.state || '', orders: 0, spent: 0, lastOrder: null, cancelled: 0, notes: c.notes, tags: c.tags, imported: true, importedOnly: true, source: c.source });
      }
    });
    const all = [...byKey.values()].sort((a, b) => b.spent - a.spent || b.orders - a.orders || a.name.localeCompare(b.name));
    if (!q) return all;
    const s = q.toLowerCase();
    return all.filter((c) => [c.name, c.mobile, c.email, c.city, c.state, c.notes, ...(c.tags || [])].some((v) => String(v || '').toLowerCase().includes(s)));
  }, [orders, imported, q]);

  const exportCsv = () => downloadCsv('digitz-customers.csv', list, [
    { label: 'Name', key: 'name' }, { label: 'Mobile', key: 'mobile' }, { label: 'Email', key: 'email' }, { label: 'City', key: 'city' }, { label: 'State', key: 'state' },
    { label: 'Orders', key: 'orders' }, { label: 'Spent', key: 'spent' }, { label: 'Last order', get: (c) => fmtDate(c.lastOrder) },
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Customers</h1>
          <p className="text-sm text-zinc-500">{list.length} customers · from order history (grouped by mobile) plus {imported.length} imported contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={FiDownload} onClick={exportCsv} disabled={!list.length}>Export</Button>
          <Button icon={FiUserPlus} onClick={() => setAdding(true)}>Add customer</Button>
        </div>
      </div>
      <AddCustomerDrawer open={adding} onClose={() => setAdding(false)} existing={list} />
      <Card>
        <input className={inputClass} placeholder="Search name, mobile, city…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Card>
      <Card>
        {ordersLoading ? <p className="text-sm text-zinc-500">Loading orders…</p> : list.length === 0 ? <Empty title="No customers yet" /> : (
          <div className="overflow-x-auto -m-5">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-zinc-50/60 text-left text-xs font-medium text-zinc-500">
                <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Location</th><th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3 text-right">Spent</th><th className="px-4 py-3">Last order</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {list.map((c) => (
                  <tr key={c.key} className="hover:bg-zinc-50">
                    <td className="px-4 py-3"><div className="font-semibold text-zinc-900">{c.name}{c.importedOnly && <span className="ml-2 text-[10px] bg-zinc-100 text-zinc-500 px-1.5 rounded">{c.source === 'admin' ? 'added' : 'imported'}</span>}</div><div className="text-xs text-zinc-400">{c.mobile}{c.email ? ` · ${c.email}` : ''}{c.tags?.length ? ` · ${c.tags.join(', ')}` : ''}</div>{c.notes && <div className="text-xs text-zinc-500 mt-0.5">{c.notes}</div>}</td>
                    <td className="px-4 py-3 text-zinc-600">{c.city}{c.state ? `, ${c.state}` : ''}</td>
                    <td className="px-4 py-3 text-right">{c.orders}{c.cancelled ? <span className="text-xs text-red-500"> ({c.cancelled} cancelled)</span> : ''}</td>
                    <td className="px-4 py-3 text-right font-bold text-zinc-900">{inr(c.spent)}</td>
                    <td className="px-4 py-3 text-zinc-600">{fmtDate(c.lastOrder)}</td>
                    <td className="px-4 py-3 text-right"><Link to={`/admin/orders?customer=${encodeURIComponent(c.key)}`} className="text-primary text-xs hover:underline">Orders →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
