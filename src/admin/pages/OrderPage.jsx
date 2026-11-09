import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiPrinter, FiDownload, FiExternalLink, FiLink, FiPhone, FiXCircle, FiTrash2, FiCamera, FiCheck, FiTruck, FiUser, FiMapPin, FiChevronRight, FiStar } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useAdminData } from '../AdminData';
import { useToast } from '../Toast';
import { PAYMENT_STATUSES, STATUS_LABELS, STATUS_DESCRIPTIONS, MAX_TRACKING_PHOTOS, setOrderTestFlag, setOrderStatus, updateOrder, deleteOrder, addTimelineNote, saveShipment, addTrackingPhoto, removeTrackingPhoto, subscribeTracking, trackingIdFor } from '../../firebase/orders';
import { downloadInvoicePDF } from '../../utils/generateInvoicePDF';
import { compressImage } from '../../utils/image';
import { runtimeUrl, googleBusinessLinks } from '../../seo/site';
import { rawProducts, normalizeProduct } from '../../data/products';
import { readOrderDraft } from '../OrderEditor';
import { Thumb } from '../ProductPicker';
import { printInvoice, FLOW } from '../orderActions';
import { Badge, Button, Card, Field, Menu, Toggle, inputClass, inr, fmtDate, fmtDateTime } from '../ui';

const IMAGE_BY_CODE = new Map(rawProducts.map((p) => { const n = normalizeProduct(p); return [n.code, n.image]; }));
const capital = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

export default function OrderPage() {
  const { id } = useParams();
  const { orders, ordersLoading } = useAdminData();
  const order = orders.find((o) => o.id === id);
  if (ordersLoading) return <p className="text-sm text-zinc-500">Loading order…</p>;
  if (!order) return (
    <div className="text-sm text-zinc-500">This order doesn't exist or was deleted. <Link to="/admin/orders" className="text-primary font-medium hover:underline">Back to orders</Link></div>
  );
  return <OrderView key={order.id} order={order} />;
}

function OrderView({ order }) {
  const { settings } = useAdminData();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(order.notes || '');
  const [note, setNote] = useState('');
  const [tracking, setTracking] = useState(null);
  const [shipment, setShipment] = useState(null);
  const [photoLabel, setPhotoLabel] = useState('LR copy');
  const fileRef = useRef();
  const c = order.customer || {};
  const trackingId = order.trackingId || trackingIdFor(order.orderNumber, c.mobile);
  const trackUrl = runtimeUrl(`/track?order=${encodeURIComponent(order.orderNumber)}&mobile=${encodeURIComponent(c.mobile || '')}`);
  const waTo = c.mobile ? (c.mobile.length === 10 ? `91${c.mobile}` : c.mobile) : null;
  const hasDraft = Boolean(readOrderDraft(order.id));

  useEffect(() => {
    let unsub = () => {};
    subscribeTracking(trackingId, (doc) => { setTracking(doc); setShipment((prev) => prev ?? (doc?.shipment || null)); }).then((u) => { unsub = u; }).catch(() => {});
    return () => unsub();
  }, [trackingId]);

  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && order.snapshot) { e.preventDefault(); printInvoice(order); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order]);

  const run = async (fn, okMessage) => {
    setBusy(true);
    try { await fn(); if (okMessage) toast(okMessage); }
    catch (e) { toast(e.message || 'Update failed', 'error'); }
    finally { setBusy(false); }
  };

  const cancelled = order.status === 'cancelled';
  const stepIndex = FLOW.indexOf(order.status);
  const next = cancelled || stepIndex === FLOW.length - 1 ? null : FLOW[stepIndex + 1];
  const stepAt = (st) => [...(order.statusHistory || [])].reverse().find((h) => h.status === st)?.at;
  const ship = shipment || { lrNumber: '', transport: '', transportContact: '', vehicle: '', bookedAt: '', expectedBy: '', notes: '' };
  const photos = tracking?.photos || [];
  const items = order.items || [];
  const reviewMessage = `Hi ${c.name}, thank you for ordering from Zaro Digitz! If you liked your cards, could you leave us a quick Google review? It really helps other families find us: ${googleBusinessLinks(settings).review}`;
  const statusMessage = `Hi ${c.name}, update on your Zaro Digitz order ${order.orderNumber}: ${STATUS_LABELS[order.status]}. ${STATUS_DESCRIPTIONS[order.status] || ''}${ship.lrNumber ? ` LR no. ${ship.lrNumber}${ship.transport ? ` via ${ship.transport}` : ''}.` : ''} Track it here: ${trackUrl}`;

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await run(async () => {
      const dataUrl = await compressImage(file);
      await addTrackingPhoto(order, { dataUrl, label: photoLabel || 'Photo' });
      if (fileRef.current) fileRef.current.value = '';
    }, `${photoLabel || 'Photo'} attached`);
  };

  const copy = (text, what) => { navigator.clipboard?.writeText(text); toast(`${what} copied`); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"><FiArrowLeft size={14} /> Orders</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{order.orderNumber}</h1>
              <Badge value={order.status} />
              <Badge value={order.paymentStatus || 'unpaid'} label={capital(order.paymentStatus || 'unpaid')} />
              {order.test && <Badge value="test" label="Test order" />}
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              Placed {fmtDateTime(order.createdAt)} · {capital(order.source || 'website')} · {items.length} products · {order.itemCount} pcs
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="total-block rounded-xl bg-zinc-900 text-white px-4 py-1.5 text-right">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400">Order total</div>
              <div className="text-2xl font-bold tabular-nums leading-tight">{inr(order.grandTotal)}</div>
            </div>
            <Button variant="secondary" icon={FiEdit2} disabled={busy || cancelled} onClick={() => navigate(`/admin/orders/${order.id}/edit`)}>Edit</Button>
            {order.snapshot && <Button variant="secondary" icon={FiPrinter} onClick={() => printInvoice(order)} title="Print invoice (Ctrl+P)">Print</Button>}
            {order.status === 'delivered' && waTo && <a href={`https://wa.me/${waTo}?text=${encodeURIComponent(reviewMessage)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"><FiStar size={15} /> Ask for review</a>}
            {next && <Button icon={FiCheck} disabled={busy} onClick={() => run(() => setOrderStatus(order, next), `Marked ${STATUS_LABELS[next]}`)}>Mark {STATUS_LABELS[next].toLowerCase()}</Button>}
            <Menu items={[
              order.snapshot && { label: 'Download invoice PDF', icon: FiDownload, onClick: () => downloadInvoicePDF(order.snapshot, order.invoiceNumber || order.orderNumber) },
              order.invoiceUrl && { label: 'Open invoice link', icon: FiExternalLink, href: order.invoiceUrl },
              { label: 'Copy tracking link', icon: FiLink, onClick: () => copy(trackUrl, 'Tracking link') },
              { label: 'Open tracking page', icon: FiExternalLink, href: trackUrl },
              waTo && { label: 'Send status on WhatsApp', icon: FaWhatsapp, href: `https://wa.me/${waTo}?text=${encodeURIComponent(statusMessage)}` },
              waTo && { label: 'Ask for a Google review', icon: FiStar, href: `https://wa.me/${waTo}?text=${encodeURIComponent(reviewMessage)}` },
              !cancelled && order.status !== 'delivered' && { label: 'Cancel order', icon: FiXCircle, danger: true, onClick: () => { if (window.confirm(`Cancel order ${order.orderNumber}?`)) run(() => setOrderStatus(order, 'cancelled'), 'Order cancelled'); } },
              { label: 'Delete order', icon: FiTrash2, danger: true, onClick: () => { if (window.confirm(`Delete order ${order.orderNumber}? This cannot be undone.`)) run(async () => { await deleteOrder(order.id); navigate('/admin/orders'); }, 'Order deleted'); } },
            ]} />
          </div>
        </div>
      </div>

      {hasDraft && (
        <div className="rounded-xl bg-blue-50 ring-1 ring-blue-200 text-blue-900 text-sm px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <span>You have unsaved edits to this order on this device.</span>
          <Link to={`/admin/orders/${order.id}/edit`} className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline">Resume editing <FiChevronRight size={14} /></Link>
        </div>
      )}

      {/* Progress */}
      <Card bodyClassName="px-5 py-5">
        {cancelled ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center"><FiXCircle size={18} /></span><div><div className="text-sm font-medium text-zinc-900">Cancelled</div><div className="text-xs text-zinc-500">{fmtDateTime(stepAt('cancelled'))}</div></div></div>
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => setOrderStatus(order, 'new', { note: 'Reopened' }), 'Order reopened')}>Reopen order</Button>
          </div>
        ) : (
          <ol className="grid grid-cols-5">
            {FLOW.map((st, i) => {
              const done = i <= stepIndex;
              const current = st === order.status;
              return (
                <li key={st} className="relative flex flex-col items-center text-center">
                  {i > 0 && <span className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${i <= stepIndex ? 'bg-primary' : 'bg-zinc-200'}`} aria-hidden="true" />}
                  <button
                    type="button"
                    disabled={busy || current}
                    onClick={() => run(() => setOrderStatus(order, st), `Status set to ${STATUS_LABELS[st]}`)}
                    title={current ? 'Current status' : `Set status to ${STATUS_LABELS[st]}`}
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${done ? 'bg-primary text-white' : 'bg-white text-zinc-400 ring-1 ring-zinc-300 hover:ring-primary hover:text-primary'} ${current ? 'ring-4 ring-orange-100' : ''}`}
                  >
                    {done && !current ? <FiCheck size={15} /> : i + 1}
                  </button>
                  <span className={`mt-2 text-xs font-medium ${current ? 'text-zinc-900' : done ? 'text-zinc-700' : 'text-zinc-400'}`}>{STATUS_LABELS[st]}</span>
                  <span className="text-[11px] text-zinc-400 h-4">{done ? fmtDate(stepAt(st)) : ''}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Items" action={<span className="text-sm text-zinc-500">{items.length} {items.length === 1 ? 'product' : 'products'} · {order.itemCount} pcs</span>} bodyClassName="">
            <ul className="divide-y divide-zinc-100">
              {items.map((it, i) => (
                <li key={`${it.code || it.name}-${i}`} className="flex items-center gap-3 px-5 py-3">
                  <Thumb src={IMAGE_BY_CODE.get(it.code)} alt={it.name} size="w-11 h-11" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 sm:truncate">{it.name}{it.custom && <span className="ml-1.5 text-[11px] text-zinc-500 bg-zinc-100 rounded px-1.5 align-middle">custom</span>}</div>
                    <div className="text-xs text-zinc-500 truncate">{[it.code, it.category].filter(Boolean).join(' · ')}</div>
                    <div className="sm:hidden text-xs text-zinc-500 tabular-nums mt-0.5">{it.quantity} × {inr(it.price)}</div>
                  </div>
                  <div className="hidden sm:block text-sm text-zinc-500 tabular-nums whitespace-nowrap">{it.quantity} × {inr(it.price)}</div>
                  <div className="sm:w-24 text-right text-sm font-medium text-zinc-900 tabular-nums">{inr(it.lineTotal ?? it.price * it.quantity)}</div>
                </li>
              ))}
            </ul>
            <dl className="border-t border-zinc-100 px-5 py-4 text-sm space-y-1.5">
              <div className="flex justify-between"><dt className="text-zinc-500">Subtotal</dt><dd className="tabular-nums">{inr(order.subtotal)}</dd></div>
              {(order.charges || []).map((ch) => <div key={ch.id || ch.label} className="flex justify-between"><dt className="text-zinc-500">{ch.label}</dt><dd className="tabular-nums">{ch.amount < 0 ? `− ${inr(-ch.amount)}` : inr(ch.amount)}</dd></div>)}
              {order.delivery > 0 && <div className="flex justify-between"><dt className="text-zinc-500">Delivery</dt><dd className="tabular-nums">{inr(order.delivery)}</dd></div>}
              <div className="flex justify-between pt-2 mt-1 border-t border-zinc-100 text-base font-semibold text-zinc-900"><dt>Total</dt><dd className="tabular-nums">{inr(order.grandTotal)}</dd></div>
            </dl>
          </Card>

          <Card title="Shipment" action={<span className="text-xs text-zinc-500">Visible to the customer</span>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="LR number"><input className={inputClass} value={ship.lrNumber} onChange={(e) => setShipment({ ...ship, lrNumber: e.target.value })} placeholder="48213" /></Field>
              <Field label="Transport"><input className={inputClass} value={ship.transport} onChange={(e) => setShipment({ ...ship, transport: e.target.value })} placeholder="KPN / VRL / ABT" /></Field>
              <Field label="Transport phone"><input className={inputClass} value={ship.transportContact} onChange={(e) => setShipment({ ...ship, transportContact: e.target.value })} /></Field>
              <Field label="Vehicle / bus no."><input className={inputClass} value={ship.vehicle} onChange={(e) => setShipment({ ...ship, vehicle: e.target.value })} /></Field>
              <Field label="Booked on"><input type="date" className={inputClass} value={ship.bookedAt} onChange={(e) => setShipment({ ...ship, bookedAt: e.target.value })} /></Field>
              <Field label="Expected by"><input type="date" className={inputClass} value={ship.expectedBy} onChange={(e) => setShipment({ ...ship, expectedBy: e.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Note for the customer"><input className={inputClass} value={ship.notes} onChange={(e) => setShipment({ ...ship, notes: e.target.value })} placeholder="Collect from the transport office with ID proof" /></Field></div>
            </div>

            <div className="mt-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-zinc-700 mr-1">Photos</span>
                <select className={`${inputClass} w-auto`} value={photoLabel} onChange={(e) => setPhotoLabel(e.target.value)} aria-label="Photo type">
                  {['LR copy', 'Packed parcel', 'Loaded in vehicle', 'Delivery proof', 'Other'].map((l) => <option key={l}>{l}</option>)}
                </select>
                <label className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium ring-1 ring-inset ring-zinc-300 shadow-sm ${photos.length >= MAX_TRACKING_PHOTOS || busy ? 'text-zinc-400 cursor-not-allowed' : 'bg-white hover:bg-zinc-50 text-zinc-800 cursor-pointer'}`}>
                  <FiCamera size={15} /> Add
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" disabled={photos.length >= MAX_TRACKING_PHOTOS || busy} onChange={onPhoto} />
                </label>
                <span className="text-xs text-zinc-400">{photos.length} of {MAX_TRACKING_PHOTOS}</span>
              </div>
              {photos.length > 0 && (
                <ul className="grid grid-cols-3 gap-3 mt-3">
                  {photos.map((ph) => (
                    <li key={ph.id} className="relative group">
                      <a href={ph.dataUrl} target="_blank" rel="noopener noreferrer"><img src={ph.dataUrl} alt={ph.label} className="w-full h-28 object-cover rounded-lg ring-1 ring-zinc-200" /></a>
                      <div className="text-xs text-zinc-500 mt-1 truncate">{ph.label}</div>
                      <button type="button" aria-label="Remove photo" onClick={() => { if (window.confirm('Remove this photo?')) run(() => removeTrackingPhoto(order, ph.id), 'Photo removed'); }} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 text-zinc-700 shadow opacity-0 group-hover:opacity-100 flex items-center justify-center"><FiTrash2 size={13} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end mt-5">
              <Button icon={FiTruck} disabled={busy} onClick={() => run(async () => { await saveShipment(order, ship); if (ship.lrNumber && order.status !== 'shipped' && order.status !== 'delivered' && window.confirm('Also mark the order as shipped?')) await setOrderStatus(order, 'shipped', { note: `LR ${ship.lrNumber}${ship.transport ? ` via ${ship.transport}` : ''}` }); }, 'Shipment saved')}>Save shipment</Button>
            </div>
          </Card>

          <Card title="Activity">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (note.trim()) run(async () => { await addTimelineNote(order, note.trim()); setNote(''); }, 'Note added'); }}>
              <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an update for the customer, e.g. Payment received" />
              <Button type="submit" variant="secondary" disabled={busy || !note.trim()}>Add</Button>
            </form>
            <ol className="mt-5 space-y-4">
              {[...(order.statusHistory || [])].reverse().map((h, i, arr) => (
                <li key={i} className="relative flex gap-3">
                  {i < arr.length - 1 && <span className="absolute left-[5px] top-4 bottom-[-18px] w-px bg-zinc-200" aria-hidden="true" />}
                  <span className={`mt-1.5 w-[11px] h-[11px] rounded-full ring-4 ring-white shrink-0 ${h.status === 'cancelled' ? 'bg-red-500' : h.status === 'delivered' ? 'bg-emerald-500' : i === 0 ? 'bg-primary' : 'bg-zinc-300'}`} />
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-900"><span className="font-medium">{h.note ? 'Note' : STATUS_LABELS[h.status] || h.status}</span>{h.note && <span className="text-zinc-500"> · {STATUS_LABELS[h.status]}</span>}</div>
                    {h.note && <p className="text-sm text-zinc-700 mt-0.5">{h.note}</p>}
                    <div className="text-xs text-zinc-400 mt-0.5">{fmtDateTime(h.at)} · {h.by}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card title="Customer" action={c.mobile && <div className="flex -mr-2">{waTo && <a href={`https://wa.me/${waTo}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#25D366] hover:bg-green-50"><FaWhatsapp size={19} /></a>}<a href={`tel:${c.mobile}`} aria-label="Call" title="Call" className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-600 hover:bg-zinc-100"><FiPhone size={17} /></a></div>}>
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center shrink-0"><FiUser size={16} /></span>
              <div className="min-w-0 text-sm">
                <div className="font-medium text-zinc-900">{c.name || '—'}</div>
                <div className="text-zinc-600 tabular-nums">{c.mobile}{c.altMobile ? ` · ${c.altMobile}` : ''}</div>
                {c.email && <div className="text-zinc-500 truncate">{c.email}</div>}
              </div>
            </div>
            {(c.address || c.city) && (
              <div className="flex items-start gap-3 mt-4 text-sm text-zinc-600">
                <span className="w-9 flex justify-center text-zinc-400 pt-0.5 shrink-0"><FiMapPin size={15} /></span>
                <div>{c.address && <div>{c.address}</div>}<div>{[c.city, c.district].filter(Boolean).join(', ')}</div><div>{[c.state, c.pincode].filter(Boolean).join(' – ')}</div></div>
              </div>
            )}
            {order.customerKey && <Link to={`/admin/orders?customer=${encodeURIComponent(order.customerKey)}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">All orders from this customer <FiChevronRight size={14} /></Link>}
          </Card>

          <Card title="Payment">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-zinc-100">
              {PAYMENT_STATUSES.map((p) => {
                const active = (order.paymentStatus || 'unpaid') === p;
                return <button key={p} type="button" disabled={busy || active} onClick={() => run(() => updateOrder(order.id, { paymentStatus: p }), `Payment: ${capital(p)}`)} className={`h-8 rounded-md text-sm font-medium transition-colors ${active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}>{capital(p)}</button>;
              })}
            </div>
            <div className="flex items-baseline justify-between mt-4"><span className="text-sm text-zinc-500">Order total</span><span className="text-xl font-bold tabular-nums text-zinc-900">{inr(order.grandTotal)}</span></div>
          </Card>

          <Card title="Details">
            <dl className="text-sm space-y-2.5">
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Invoice</dt><dd className="text-zinc-900">{order.invoiceNumber || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Source</dt><dd className="text-zinc-900">{capital(order.source || 'website')}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Telegram</dt><dd className={order.telegram?.ok ? 'text-emerald-600' : 'text-zinc-500'}>{order.telegram == null ? '—' : order.telegram.ok ? 'Sent' : order.telegram.reason === 'pending' ? 'Sending…' : 'Failed'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Tracking</dt><dd><button type="button" onClick={() => copy(trackUrl, 'Tracking link')} className="inline-flex items-center gap-1 text-primary font-medium hover:underline"><FiLink size={13} /> Copy link</button></dd></div>
            </dl>
          </Card>

          <Card title="Internal notes">
            <textarea className={`${inputClass} h-auto min-h-[88px] py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only visible to admins" />
            <div className="flex justify-end mt-2"><Button size="sm" variant="secondary" disabled={busy || notes === (order.notes || '')} onClick={() => run(() => updateOrder(order.id, { notes }), 'Notes saved')}>Save</Button></div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-zinc-900">Test order</div>
                <div className="text-xs text-zinc-500 mt-0.5">Hidden from the dashboard, analytics and customer totals.</div>
              </div>
              <Toggle checked={order.test === true} disabled={busy} onChange={(v) => run(() => setOrderTestFlag(order, v), v ? 'Marked as test order' : 'Marked as real order')} label="Test order" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
