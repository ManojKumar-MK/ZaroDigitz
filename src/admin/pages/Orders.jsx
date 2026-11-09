import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch, FiDownload, FiPlus, FiShoppingBag } from 'react-icons/fi';
import { useAdminData } from '../AdminData';
import { useToast } from '../Toast';
import { ORDER_STATUSES, PAYMENT_STATUSES, STATUS_LABELS, setOrderTestFlag } from '../../firebase/orders';
import { rawProducts, normalizeProduct } from '../../data/products';
import { readOrderDraft } from '../OrderEditor';
import { Thumb } from '../ProductPicker';
import { orderDate, inRange, daysAgo } from '../analytics';
import { Badge, Button, Card, Empty, PageHeader, Tabs, Toggle, inputClass, inr, fmtDateTime, downloadCsv } from '../ui';

const RANGES = [['all', 'All time'], ['0', 'Today'], ['6', 'Last 7 days'], ['29', 'Last 30 days'], ['89', 'Last 90 days']];
const IMAGE_BY_CODE = new Map(rawProducts.map((p) => { const n = normalizeProduct(p); return [n.code, n.image]; }));

export default function Orders() {
  const { orders, ordersLoading } = useAdminData();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const payment = params.get('payment') || 'all';
  const range = params.get('range') || 'all';
  const q = params.get('q') || '';
  const customer = params.get('customer') || '';
  // Open on "New" (orders to confirm); links that filter by customer, payment or search show every status.
  const status = params.get('status') || (customer || q || payment !== 'all' ? 'all' : 'new');
  const showTest = params.get('test') === '1';

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (key === 'status') next.set(key, value || 'all'); // 'all' must be explicit: no value means "New"
    else if (!value || value === 'all') next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };

  // Everything except the status filter, so the tab counts match what you'd see.
  const base = useMemo(() => {
    let list = orders;
    if (range !== 'all') list = inRange(list, daysAgo(Number(range)));
    if (payment !== 'all') list = list.filter((o) => (o.paymentStatus || 'unpaid') === payment);
    if (customer) list = list.filter((o) => o.customerKey === customer);
    if (!showTest) list = list.filter((o) => !o.test);
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((o) => [o.orderNumber, o.invoiceNumber, o.customer?.name, o.customer?.mobile, o.customer?.city, o.customer?.email].some((v) => String(v || '').toLowerCase().includes(s)));
    }
    return [...list].sort((a, b) => orderDate(b) - orderDate(a));
  }, [orders, range, payment, customer, q, showTest]);

  const filtered = status === 'all' ? base : base.filter((o) => o.status === status);
  const total = filtered.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.grandTotal || 0), 0);
  const tabs = [...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], count: base.filter((o) => o.status === s).length })), { value: 'all', label: 'All', count: base.length }];
  const testCount = orders.filter((o) => o.test).length;

  const toggleTest = async (o, value) => {
    try { await setOrderTestFlag(o, value); toast(value ? `${o.orderNumber} marked as test` : `${o.orderNumber} is a real order again`); }
    catch (e) { toast(e.message || 'Could not update', 'error'); }
  };

  const exportCsv = () => downloadCsv(`digitz-orders-${new Date().toISOString().slice(0, 10)}.csv`, filtered, [
    { label: 'Order', key: 'orderNumber' }, { label: 'Date', get: (o) => fmtDateTime(o.createdAt) }, { label: 'Status', key: 'status' }, { label: 'Payment', key: 'paymentStatus' },
    { label: 'Customer', get: (o) => o.customer?.name }, { label: 'Mobile', get: (o) => o.customer?.mobile }, { label: 'Email', get: (o) => o.customer?.email },
    { label: 'Address', get: (o) => o.customer?.address }, { label: 'City', get: (o) => o.customer?.city }, { label: 'District', get: (o) => o.customer?.district }, { label: 'State', get: (o) => o.customer?.state }, { label: 'Pincode', get: (o) => o.customer?.pincode },
    { label: 'Items', get: (o) => (o.items || []).map((i) => `${i.name} x${i.quantity}`).join('; ') }, { label: 'Item count', key: 'itemCount' }, { label: 'Total', key: 'grandTotal' }, { label: 'Notes', key: 'notes' }, { label: 'Source', key: 'source' }, { label: 'Test', get: (o) => (o.test ? 'yes' : '') },
  ]);

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${filtered.length} orders · ${inr(total)} excluding cancelled`}
        actions={<>
          <Button variant="secondary" icon={FiDownload} onClick={exportCsv} disabled={!filtered.length}>Export</Button>
          <Button icon={FiPlus} onClick={() => navigate('/admin/orders/new')}>New order</Button>
        </>}
      />

      <Card bodyClassName="">
        <div className="px-4 pt-1">
          <Tabs items={tabs} value={status} onChange={(v) => set('status', v)} />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-zinc-100">
          <div className="relative flex-1 min-w-[220px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
            <input className={`${inputClass} pl-9`} placeholder="Search order, customer, mobile or city" value={q} onChange={(e) => set('q', e.target.value)} />
          </div>
          <select className={`${inputClass} sm:!w-44`} value={payment} onChange={(e) => set('payment', e.target.value)} aria-label="Payment">
            <option value="all">Any payment</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className={`${inputClass} sm:!w-44`} value={range} onChange={(e) => set('range', e.target.value)} aria-label="Date range">
            {RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-zinc-600 ml-1">
            <Toggle size="sm" checked={showTest} onChange={(v) => set('test', v ? '1' : '')} label="Show test orders" />
            Test orders{testCount ? ` (${testCount})` : ''}
          </label>
          {customer && <Button variant="ghost" size="sm" onClick={() => set('customer', '')}>Clear customer filter</Button>}
        </div>

        {ordersLoading ? <p className="p-6 text-sm text-zinc-500">Loading orders…</p> : filtered.length === 0 ? (
          <Empty icon={FiShoppingBag} title="No orders here" action={<Button variant="secondary" icon={FiPlus} onClick={() => navigate('/admin/orders/new')}>New order</Button>}>
            {q || payment !== 'all' || range !== 'all' ? 'Try clearing the search or filters.' : 'Website and counter orders will appear here.'}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead className="text-left text-xs font-medium text-zinc-500 bg-zinc-50/60">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Items</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total</th>
                  <th className="px-4 py-2.5 font-medium">Payment</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-center">Test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((o) => {
                  const items = o.items || [];
                  const draft = readOrderDraft(o.id);
                  return (
                    <tr key={o.id} onClick={() => navigate(`/admin/orders/${o.id}`)} className={`cursor-pointer hover:bg-zinc-50 ${o.test ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-zinc-900">{o.orderNumber}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{fmtDateTime(o.createdAt)}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {o.source && o.source !== 'website' && <span className="text-[11px] text-zinc-500 bg-zinc-100 rounded px-1.5">{o.source}</span>}
                          {o.edited && <span className="text-[11px] text-zinc-500 bg-zinc-100 rounded px-1.5">edited</span>}
                          {draft && <span className="text-[11px] text-blue-700 bg-blue-50 rounded px-1.5">unsaved edit</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-zinc-900">{o.customer?.name || '—'}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{o.customer?.mobile}{o.customer?.city ? ` · ${o.customer.city}` : ''}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {items.slice(0, 3).map((it, i) => <span key={i} className="ring-2 ring-white rounded-lg"><Thumb src={IMAGE_BY_CODE.get(it.code)} alt={it.name} size="w-8 h-8" /></span>)}
                          </div>
                          <div className="min-w-0 max-w-[220px]">
                            <div className="text-xs text-zinc-700 truncate" title={items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}>{items.slice(0, 2).map((i) => i.name).join(', ')}{items.length > 2 ? ` +${items.length - 2}` : ''}</div>
                            <div className="text-xs text-zinc-500">{o.itemCount} items</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-right font-medium tabular-nums text-zinc-900">{inr(o.grandTotal)}</td>
                      <td className="px-4 py-3 align-top"><Badge value={o.paymentStatus || 'unpaid'} /></td>
                      <td className="px-4 py-3 align-top"><Badge value={o.status} /></td>
                      <td className="px-4 py-3 align-top text-center" onClick={(e) => e.stopPropagation()}>
                        <Toggle size="sm" checked={o.test === true} onChange={(v) => toggleTest(o, v)} label={o.test ? 'Unmark test order' : 'Mark as test order'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {!showTest && testCount > 0 && <p className="text-xs text-zinc-500 mt-3">{testCount} test {testCount === 1 ? 'order is' : 'orders are'} hidden. Turn on “Test orders” to see {testCount === 1 ? 'it' : 'them'}.</p>}
    </div>
  );
}
