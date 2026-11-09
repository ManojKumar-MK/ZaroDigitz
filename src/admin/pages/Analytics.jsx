import { useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { useAdminData } from '../AdminData';
import {
  totals, byStatus, inRange, daysAgo, startOfDay, revenueByDay, revenueByMonth, ordersByWeekday, ordersByHour,
  byRegion, newVsReturning, paymentBreakdown, fulfilment, productTable, byCategory, customers, cancellationStats,
} from '../analytics';
import { Card, Stat, Button, inputClass, inr, fmtDate, fmtDateTime, downloadCsv } from '../ui';
import { STATUS_LABELS } from '../../firebase/orders';
import { FiDownload } from 'react-icons/fi';

const PRESETS = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '1 year'], [0, 'All time']];
const STATUS_COLORS = { new: '#3b82f6', confirmed: '#6366f1', packed: '#f59e0b', shipped: '#a855f7', delivered: '#10b981', cancelled: '#ef4444' };
const PAY_COLORS = { unpaid: '#9ca3af', advance: '#f59e0b', paid: '#10b981', refunded: '#ef4444' };
const ORANGE = '#7A1F2B', GOLD = '#C9A032';
const compact = (v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : v);
const pct = (cur, before) => (before === 0 ? (cur ? '+100%' : '0%') : `${cur >= before ? '+' : ''}${Math.round(((cur - before) / before) * 100)}%`);
const hours = (h) => (h == null ? '—' : h < 48 ? `${Math.round(h)} h` : `${(h / 24).toFixed(1)} days`);

export default function Analytics() {
  const { orders: allOrders, ordersLoading } = useAdminData();
  const orders = useMemo(() => allOrders.filter((o) => !o.test), [allOrders]);
  const [preset, setPreset] = useState(30);
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [tab, setTab] = useState('overview');

  // Resolve the window: custom dates win over presets; 0 = all time.
  const { from, to, label, prevFrom, prevTo } = useMemo(() => {
    if (custom.from || custom.to) {
      const f = custom.from ? startOfDay(new Date(custom.from)) : null;
      const t = custom.to ? new Date(new Date(custom.to).setHours(24, 0, 0, 0)) : null;
      const span = f && t ? t - f : null;
      return { from: f, to: t, label: `${custom.from || '…'} → ${custom.to || 'today'}`, prevFrom: span ? new Date(f - span) : null, prevTo: f };
    }
    if (preset === 0) return { from: null, to: null, label: 'all time', prevFrom: null, prevTo: null };
    return { from: daysAgo(preset - 1), to: null, label: `last ${preset} days`, prevFrom: daysAgo(preset * 2 - 1), prevTo: daysAgo(preset - 1) };
  }, [preset, custom]);

  const scoped = useMemo(() => inRange(orders, from, to), [orders, from, to]);
  const prev = useMemo(() => (prevFrom ? inRange(orders, prevFrom, prevTo) : []), [orders, prevFrom, prevTo]);
  const t = totals(scoped), p = totals(prev);
  const hasPrev = prev.length > 0 || Boolean(prevFrom);

  const dayCount = from ? Math.min(Math.max(1, Math.round(((to || new Date()) - from) / 864e5)), 120) : 90;
  const daily = useMemo(() => revenueByDay(scoped, dayCount), [scoped, dayCount]);
  const monthly = useMemo(() => revenueByMonth(orders, 12), [orders]);
  const weekday = useMemo(() => ordersByWeekday(scoped), [scoped]);
  const hourly = useMemo(() => ordersByHour(scoped), [scoped]);
  const states = useMemo(() => byRegion(scoped, 'state', 10), [scoped]);
  const cities = useMemo(() => byRegion(scoped, 'city', 12), [scoped]);
  const repeat = useMemo(() => newVsReturning(scoped, orders), [scoped, orders]);
  const pay = useMemo(() => paymentBreakdown(scoped), [scoped]);
  const ful = useMemo(() => fulfilment(scoped), [scoped]);
  const products = useMemo(() => productTable(scoped), [scoped]);
  const cats = useMemo(() => byCategory(scoped, 12), [scoped]);
  const topCustomers = useMemo(() => customers(scoped).slice(0, 15), [scoped]);
  const cancel = useMemo(() => cancellationStats(scoped), [scoped]);
  const statusData = Object.entries(byStatus(scoped)).map(([k, v]) => ({ name: STATUS_LABELS[k] || k, key: k, value: v }));

  const exportOrders = () => downloadCsv(`digitz-orders-${label.replace(/\W+/g, '-')}.csv`, scoped, [
    { label: 'Order', key: 'orderNumber' }, { label: 'Date', get: (o) => fmtDateTime(o.createdAt) }, { label: 'Status', key: 'status' }, { label: 'Payment', key: 'paymentStatus' },
    { label: 'Customer', get: (o) => o.customer?.name }, { label: 'Mobile', get: (o) => o.customer?.mobile }, { label: 'City', get: (o) => o.customer?.city }, { label: 'State', get: (o) => o.customer?.state },
    { label: 'Items', get: (o) => (o.items || []).map((i) => `${i.name} x${i.quantity}`).join('; ') }, { label: 'Subtotal', key: 'subtotal' }, { label: 'Charges', key: 'chargesTotal' }, { label: 'Total', key: 'grandTotal' }, { label: 'Source', key: 'source' },
  ]);
  const exportProducts = () => downloadCsv(`digitz-products-${label.replace(/\W+/g, '-')}.csv`, products, [
    { label: 'Code', key: 'code' }, { label: 'Product', key: 'name' }, { label: 'Category', key: 'category' }, { label: 'Qty', key: 'qty' }, { label: 'Orders', key: 'orders' }, { label: 'Revenue', key: 'revenue' }, { label: 'Avg price', key: 'avgPrice' }, { label: 'Share %', key: 'share' },
  ]);

  const TABS = [['overview', 'Overview'], ['products', 'Products'], ['customers', 'Customers'], ['operations', 'Operations']];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Analytics</h1>
          <p className="text-sm text-zinc-500">{ordersLoading ? 'Loading orders…' : `${scoped.length} orders in ${label}${hasPrev ? ', compared with the previous period' : ''}. Cancelled orders are excluded from revenue.`}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 bg-white border border-zinc-200 rounded-xl p-1">
            {PRESETS.map(([d, l]) => (
              <button key={d} type="button" onClick={() => { setPreset(d); setCustom({ from: '', to: '' }); }} className={`text-sm px-3 py-1.5 rounded-lg font-medium ${preset === d && !custom.from && !custom.to ? 'bg-primary text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>{l}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl p-1">
            <input type="date" className={`${inputClass} !py-1 !bg-white`} value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="From date" />
            <span className="text-zinc-400 text-sm">to</span>
            <input type="date" className={`${inputClass} !py-1 !bg-white`} value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="To date" />
          </div>
          <Button variant="secondary" icon={FiDownload} onClick={exportOrders} disabled={!scoped.length}>Export orders</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Revenue" value={inr(t.revenue)} sub={hasPrev ? `${pct(t.revenue, p.revenue)} vs previous` : `${t.orders} paid-for orders`} accent="text-emerald-600" />
        <Stat label="Orders" value={t.orders} sub={hasPrev ? `${pct(t.orders, p.orders)} vs previous · ${cancel.cancelled} cancelled` : `${cancel.cancelled} cancelled`} />
        <Stat label="Avg order value" value={inr(t.aov)} sub={hasPrev ? `${pct(t.aov, p.aov)} vs previous` : `${t.items} items`} />
        <Stat label="Customers" value={repeat.uniqueCustomers} sub={`${repeat.repeatRate}% of orders from repeat buyers`} />
      </div>

      <div className="flex gap-1 border-b border-zinc-200">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === k ? 'border-primary text-primary' : 'border-transparent text-zinc-500 hover:text-zinc-900'}`}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <Card title={`Revenue per day · ${label}`}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ORANGE} stopOpacity={0.5} /><stop offset="95%" stopColor={ORANGE} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} width={48} />
                  <Tooltip formatter={(v, n) => (n === 'revenue' ? inr(v) : v)} />
                  <Area type="monotone" dataKey="revenue" stroke={ORANGE} strokeWidth={2} fill="url(#rev)" />
                  <Line type="monotone" dataKey="orders" stroke={GOLD} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Monthly revenue and average order value · last 12 months">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="rev" tick={{ fontSize: 11 }} tickFormatter={compact} width={48} />
                  <YAxis yAxisId="aov" orientation="right" tick={{ fontSize: 11 }} tickFormatter={compact} width={48} />
                  <Tooltip formatter={(v, n) => (n === 'orders' ? v : inr(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="rev" dataKey="revenue" fill={ORANGE} radius={[6, 6, 0, 0]} />
                  <Line yAxisId="aov" type="monotone" dataKey="aov" stroke="#1A1A1A" strokeWidth={2} dot={{ r: 3 }} name="aov" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Orders by status">
              <div className="h-60">
                {statusData.length === 0 ? <p className="text-sm text-zinc-500">No orders in range.</p> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>{statusData.map((s) => <Cell key={s.key} fill={STATUS_COLORS[s.key] || '#999'} />)}</Pie>
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /><Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
            <Card title="Payment status">
              <div className="h-60">
                {pay.length === 0 ? <p className="text-sm text-zinc-500">No orders in range.</p> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pay} dataKey="amount" nameKey="key" innerRadius={50} outerRadius={80} paddingAngle={2}>{pay.map((s) => <Cell key={s.key} fill={PAY_COLORS[s.key] || '#999'} />)}</Pie>
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /><Tooltip formatter={(v) => inr(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-2">Outstanding: <strong>{inr(pay.filter((r) => r.key === 'unpaid' || r.key === 'advance').reduce((s, r) => s + r.amount, 0))}</strong> across {pay.filter((r) => r.key === 'unpaid' || r.key === 'advance').reduce((s, r) => s + r.orders, 0)} orders</p>
            </Card>
            <Card title="Revenue by category">
              <div className="h-60">
                {cats.length === 0 ? <p className="text-sm text-zinc-500">No sales in range.</p> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cats} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <XAxis type="number" hide /><YAxis type="category" dataKey="category" width={130} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => inr(v)} /><Bar dataKey="revenue" fill={ORANGE} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === 'products' && (
        <>
          <Card title={`Product performance · ${label}`} action={<Button variant="ghost" size="sm" icon={FiDownload} onClick={exportProducts} disabled={!products.length}>Export</Button>}>
            {products.length === 0 ? <p className="text-sm text-zinc-500">No sales in range.</p> : (
              <div className="overflow-x-auto -m-5">
                <table className="w-full text-sm min-w-[760px]">
                  <thead className="bg-zinc-50/60 text-left text-xs font-medium text-zinc-500">
                    <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Product</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3 text-right">Avg price</th><th className="px-4 py-3 text-right">Revenue</th><th className="px-4 py-3">Share</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {products.slice(0, 50).map((r, i) => (
                      <tr key={r.key} className="hover:bg-zinc-50">
                        <td className="px-4 py-2 text-zinc-400">{i + 1}</td>
                        <td className="px-4 py-2"><div className="font-medium text-zinc-900">{r.name}</div><div className="text-xs text-zinc-400">{r.code} · {r.category}</div></td>
                        <td className="px-4 py-2 text-right">{r.qty}</td>
                        <td className="px-4 py-2 text-right">{r.orders}</td>
                        <td className="px-4 py-2 text-right">{inr(r.avgPrice)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{inr(r.revenue)}</td>
                        <td className="px-4 py-2 w-40"><div className="flex items-center gap-2"><div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, r.share)}%` }} /></div><span className="text-xs text-zinc-500 w-10 text-right">{r.share}%</span></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title="Slow movers in this period (sold once or not at all)">
            <SlowMovers products={products} />
          </Card>
        </>
      )}

      {tab === 'customers' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Unique customers" value={repeat.uniqueCustomers} />
            <Stat label="New customers" value={repeat.fresh} sub={inr(repeat.freshRevenue)} />
            <Stat label="Repeat orders" value={repeat.returning} sub={inr(repeat.returningRevenue)} accent="text-emerald-600" />
            <Stat label="Repeat rate" value={`${repeat.repeatRate}%`} sub="share of orders from returning buyers" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Revenue by state">
              <div className="h-72">
                {states.length === 0 ? <p className="text-sm text-zinc-500">No orders in range.</p> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={states} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <XAxis type="number" hide /><YAxis type="category" dataKey="key" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, n) => (n === 'revenue' ? inr(v) : v)} /><Bar dataKey="revenue" fill={ORANGE} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
            <Card title="Top cities">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500"><tr><th className="pb-2">City</th><th className="pb-2 text-right">Customers</th><th className="pb-2 text-right">Orders</th><th className="pb-2 text-right">Revenue</th></tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {cities.map((r) => <tr key={r.key}><td className="py-2 font-medium text-zinc-900">{r.key}</td><td className="py-2 text-right">{r.customers}</td><td className="py-2 text-right">{r.orders}</td><td className="py-2 text-right font-semibold">{inr(r.revenue)}</td></tr>)}
                </tbody>
              </table>
            </Card>
          </div>
          <Card title="Top customers" action={<Button variant="ghost" size="sm" icon={FiDownload} onClick={() => downloadCsv('digitz-top-customers.csv', topCustomers, [{ label: 'Name', key: 'name' }, { label: 'Mobile', key: 'mobile' }, { label: 'City', key: 'city' }, { label: 'Orders', key: 'orders' }, { label: 'Spent', key: 'spent' }, { label: 'Last order', get: (c) => fmtDate(c.lastOrder) }])}>Export</Button>}>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500"><tr><th className="pb-2">Customer</th><th className="pb-2">Location</th><th className="pb-2 text-right">Orders</th><th className="pb-2 text-right">Spent</th><th className="pb-2 text-right">Last order</th></tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {topCustomers.map((c) => <tr key={c.key}><td className="py-2"><div className="font-medium text-zinc-900">{c.name}</div><div className="text-xs text-zinc-400">{c.mobile}</div></td><td className="py-2 text-zinc-600">{c.city}{c.state ? `, ${c.state}` : ''}</td><td className="py-2 text-right">{c.orders}</td><td className="py-2 text-right font-semibold">{inr(c.spent)}</td><td className="py-2 text-right text-zinc-500">{fmtDate(c.lastOrder)}</td></tr>)}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'operations' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Open orders" value={ful.openCount} sub={`${inr(ful.openValue)} waiting · ${ful.openOver48h} older than 48 h`} accent={ful.openOver48h ? 'text-amber-600' : 'text-zinc-900'} />
            <Stat label="Median time to deliver" value={hours(ful.medianHours)} sub={`${ful.deliveredCount} delivered orders measured`} />
            <Stat label="Average time to deliver" value={hours(ful.avgHours)} />
            <Stat label="Cancellation rate" value={`${cancel.rate}%`} sub={`${cancel.cancelled} orders · ${inr(cancel.lostValue)} lost`} accent={cancel.rate > 10 ? 'text-red-600' : 'text-zinc-900'} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Orders by weekday">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekday}><CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} /><Tooltip formatter={(v, n) => (n === 'revenue' ? inr(v) : v)} /><Bar dataKey="orders" fill={ORANGE} radius={[6, 6, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Orders by hour of day">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourly}><CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} /><Tooltip /><Line type="monotone" dataKey="orders" stroke={ORANGE} strokeWidth={2} dot={false} /></LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-zinc-500 mt-2">Use this to plan when someone should be ready to confirm orders on the phone.</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function SlowMovers({ products }) {
  const slow = products.filter((p) => p.orders <= 1).slice(-20).reverse();
  if (!products.length) return <p className="text-sm text-zinc-500">No sales in range.</p>;
  if (!slow.length) return <p className="text-sm text-zinc-500">Every sold product moved more than once. Nice.</p>;
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 text-sm divide-y md:divide-y-0 divide-zinc-100">
      {slow.map((p) => <li key={p.key} className="py-1.5 flex justify-between gap-3"><span className="text-zinc-900">{p.name}</span><span className="text-zinc-400">{p.qty} sold · {inr(p.revenue)}</span></li>)}
    </ul>
  );
}
