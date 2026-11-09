import { Link, useNavigate } from 'react-router-dom';
import { FiTrendingUp, FiCalendar, FiShoppingBag, FiAlertCircle, FiClock, FiCreditCard, FiMessageSquare, FiChevronRight, FiPlus } from 'react-icons/fi';
import { useAdminData } from '../AdminData';
import { totals, byStatus, inRange, daysAgo, topProducts, orderDate } from '../analytics';
import { rawProducts, normalizeProduct } from '../../data/products';
import { Thumb } from '../ProductPicker';
import { Badge, Button, Card, Stat, Empty, PageHeader, inr, fmtDateTime } from '../ui';
import { ORDER_STATUSES, STATUS_LABELS } from '../../firebase/orders';

const IMAGE_BY_CODE = new Map(rawProducts.map((p) => { const n = normalizeProduct(p); return [n.code, n.image]; }));
const hoursSince = (o) => (Date.now() - orderDate(o).getTime()) / 36e5;

export default function Dashboard() {
  const navigate = useNavigate();
  const { orders: allOrders, ordersLoading, enquiries } = useAdminData();
  const orders = allOrders.filter((o) => !o.test);
  const today = totals(inRange(orders, daysAgo(0)));
  const week = totals(inRange(orders, daysAgo(6)));
  const month = totals(inRange(orders, daysAgo(29)));
  const statuses = byStatus(orders);
  const recent = [...orders].sort((a, b) => orderDate(b) - orderDate(a)).slice(0, 8);
  const top = topProducts(inRange(orders, daysAgo(29)), 5);
  const openEnq = enquiries.filter((e) => e.status !== 'resolved').length;

  const live = orders.filter((o) => o.status !== 'cancelled');
  const attention = [
    { label: 'New orders: send the proof', count: statuses.new || 0, icon: FiAlertCircle, to: '/admin/orders?status=new', tone: 'text-sky-600 bg-sky-50' },
    { label: 'In progress for over 48 hours', count: live.filter((o) => ['new', 'confirmed', 'packed'].includes(o.status) && hoursSince(o) > 48).length, icon: FiClock, to: '/admin/orders?status=confirmed', tone: 'text-amber-600 bg-amber-50' },
    { label: 'Unpaid or advance only', count: live.filter((o) => ['unpaid', 'advance', undefined].includes(o.paymentStatus)).length, icon: FiCreditCard, to: '/admin/orders?payment=unpaid', tone: 'text-zinc-600 bg-zinc-100' },
    { label: 'Open enquiries', count: openEnq, icon: FiMessageSquare, to: '/admin/enquiries', tone: 'text-violet-600 bg-violet-50' },
  ];
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();

  return (
    <div className="space-y-6">
      <PageHeader
        title={greeting}
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={<Button icon={FiPlus} onClick={() => navigate('/admin/orders/new')}>New order</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Today" icon={FiCalendar} value={inr(today.revenue)} sub={`${today.orders} ${today.orders === 1 ? 'order' : 'orders'}`} />
        <Stat label="Last 7 days" icon={FiTrendingUp} value={inr(week.revenue)} sub={`${week.orders} orders · avg ${inr(week.aov)}`} />
        <Stat label="Last 30 days" icon={FiTrendingUp} value={inr(month.revenue)} sub={`${month.orders} orders · ${month.items} items`} />
        <Stat label="Open orders" icon={FiShoppingBag} value={(statuses.new || 0) + (statuses.confirmed || 0) + (statuses.packed || 0)} sub={`${statuses.shipped || 0} in transit`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card title="Needs attention" bodyClassName="p-2">
          <ul>
            {attention.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.label}>
                  <Link to={a.to} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.tone}`}><Icon size={16} /></span>
                    <span className="flex-1 text-sm text-zinc-700">{a.label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${a.count ? 'text-zinc-900' : 'text-zinc-400'}`}>{a.count}</span>
                    <FiChevronRight size={15} className="text-zinc-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-zinc-100 mt-1 px-3 pt-3 pb-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {ORDER_STATUSES.map((s) => (
              <Link key={s} to={`/admin/orders?status=${s}`} className="text-xs text-zinc-500 hover:text-zinc-900">{STATUS_LABELS[s]} <span className="font-medium text-zinc-900 tabular-nums">{statuses[s] || 0}</span></Link>
            ))}
          </div>
        </Card>

        <Card title="Recent orders" className="lg:col-span-2" bodyClassName="" action={<Link to="/admin/orders?status=all" className="text-sm font-medium text-primary hover:underline">View all</Link>}>
          {ordersLoading ? <p className="p-5 text-sm text-zinc-500">Loading…</p> : recent.length === 0 ? (
            <Empty icon={FiShoppingBag} title="No orders yet">Website orders appear here the moment they are placed.</Empty>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-900 truncate">{o.customer?.name || '—'}</div>
                      <div className="text-xs text-zinc-500 truncate">{o.orderNumber} · {fmtDateTime(o.createdAt)}{o.customer?.city ? ` · ${o.customer.city}` : ''}</div>
                    </div>
                    <span className="hidden sm:block text-xs text-zinc-500 tabular-nums">{o.itemCount} items</span>
                    <span className="w-24 text-right text-sm font-medium text-zinc-900 tabular-nums">{inr(o.grandTotal)}</span>
                    <span className="w-24 flex justify-end"><Badge value={o.status} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Best sellers · last 30 days" bodyClassName="" action={<Link to="/admin/analytics" className="text-sm font-medium text-primary hover:underline">Analytics</Link>}>
        {top.length === 0 ? <p className="p-5 text-sm text-zinc-500">No sales in the last 30 days.</p> : (
          <ul className="divide-y divide-zinc-100">
            {top.map((p, i) => (
              <li key={p.key} className="flex items-center gap-3 px-5 py-3">
                <span className="w-5 text-xs text-zinc-400 tabular-nums">{i + 1}</span>
                <Thumb src={IMAGE_BY_CODE.get(p.key)} alt={p.name} size="w-9 h-9" />
                <div className="flex-1 min-w-0"><div className="text-sm font-medium text-zinc-900 truncate">{p.name}</div><div className="text-xs text-zinc-500 truncate">{p.category}</div></div>
                <span className="text-xs text-zinc-500 tabular-nums">{p.qty} sold</span>
                <span className="w-24 text-right text-sm font-medium tabular-nums">{inr(p.revenue)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
