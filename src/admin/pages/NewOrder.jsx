import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../AdminData';
import { useToast } from '../Toast';
import { rawProducts, normalizeProduct, categoryTamil } from '../../data/products';
import { computeCharges, DEFAULT_CHARGES_NOTE } from '../../data/charges';
import { createAdminOrder, ORDER_STATUSES, PAYMENT_STATUSES, STATUS_LABELS } from '../../firebase/orders';
import { generateInvoicePDF } from '../../utils/generateInvoicePDF';
import { runtimeUrl } from '../../seo/site';
import usePincodeAutofill, { pincodeHint } from '../usePincodeAutofill';
import { INDIAN_STATES } from '../../components/LocationFields';
import { Button, Card, Field, inputClass, inr } from '../ui';
import ProductPicker, { Thumb, useImageLookup } from '../ProductPicker';
import { FiPrinter } from 'react-icons/fi';

const DRAFT_KEY = 'digitz-new-order-draft';
// No pre-filled town: the pincode lookup fills city, district and state.
const EMPTY_FORM = { fullName: '', mobile: '', altMobile: '', email: '', address: '', city: '', district: '', state: '', country: 'India', pincode: '' };
function readDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; } }

const SOURCES = [['counter', 'Counter sale (walk-in)'], ['phone', 'Phone order'], ['whatsapp', 'WhatsApp order']];

function mergedCatalog(firestoreProducts) {
  const byCode = new Map(rawProducts.map((p) => [p.code, { ...p }]));
  firestoreProducts.forEach((d) => { const code = d.code || d.id; byCode.set(code, { ...(byCode.get(code) || { id: null, image: '' }), ...d, code }); });
  return [...byCode.values()].filter((p) => p.active !== false).map(normalizeProduct);
}

async function printPdf(doc) {
  const url = URL.createObjectURL(doc.output('blob'));
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  frame.src = url;
  document.body.appendChild(frame);
  frame.onload = () => { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch { window.open(url, '_blank'); } setTimeout(() => { document.body.removeChild(frame); URL.revokeObjectURL(url); }, 60000); };
}

export default function NewOrder() {
  const { products, settings } = useAdminData();
  const toast = useToast();
  const navigate = useNavigate();
  const catalog = useMemo(() => mergedCatalog(products), [products]);
  const imageOf = useImageLookup(catalog);
  // A half-built bill survives navigation and reloads (cleared on save or "Clear").
  const [draft] = useState(readDraft);
  const [cart, setCart] = useState(draft?.cart || []); // { ...product, quantity, price }
  const [form, setForm] = useState(draft?.form || EMPTY_FORM);
  const [source, setSource] = useState(draft?.source || 'counter');
  const [status, setStatus] = useState(draft?.status || 'confirmed');
  const [paymentStatus, setPaymentStatus] = useState(draft?.paymentStatus || 'paid');
  const [applyCharges, setApplyCharges] = useState(draft?.applyCharges ?? true);
  const [discount, setDiscount] = useState(draft?.discount || '');
  const [notes, setNotes] = useState(draft?.notes || '');
  const [busy, setBusy] = useState(false);
  const pinStatus = usePincodeAutofill(form, setForm);

  const isEmpty = !cart.length && !form.fullName && !form.mobile && !discount && !notes;
  useEffect(() => {
    try {
      if (isEmpty) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ cart, form, source, status, paymentStatus, applyCharges, discount, notes, savedAt: new Date().toISOString() }));
    } catch { /* storage blocked */ }
  }, [cart, form, source, status, paymentStatus, applyCharges, discount, notes, isEmpty]);

  const clearAll = () => {
    if (!isEmpty && !window.confirm('Clear this bill and start again?')) return;
    setCart([]); setForm(EMPTY_FORM); setSource('counter'); setStatus('confirmed'); setPaymentStatus('paid'); setApplyCharges(true); setDiscount(''); setNotes('');
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };


  const [flash, setFlash] = useState({ id: null, n: 0 });
  const bump = (id) => setFlash((f) => ({ id, n: f.n + 1 }));
  const add = (p, qty = 1) => {
    if (p.price == null) { toast('This product has no price set', 'warning'); return; }
    setCart((c) => {
      const existing = c.find((i) => i.id === p.id);
      return existing ? [{ ...existing, quantity: existing.quantity + qty }, ...c.filter((i) => i.id !== p.id)] : [{ ...p, quantity: qty }, ...c];
    });
    bump(p.id);
  };
  const setQty = (id, qty) => setCart((c) => (qty <= 0 ? c.filter((i) => i.id !== id) : c.map((i) => (i.id === id ? { ...i, quantity: qty } : i))));
  const step = (id, delta) => { const line = cart.find((i) => i.id === id); if (!line) return; setQty(id, line.quantity + delta); if (line.quantity + delta > 0) bump(id); };
  const setPrice = (id, price) => setCart((c) => c.map((i) => (i.id === id ? { ...i, price: Math.max(0, Number(price) || 0) } : i)));

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const charges = applyCharges ? computeCharges(subtotal, settings.charges) : { lines: [], total: 0 };
  const discountAmt = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const lines = [...charges.lines, ...(discountAmt ? [{ id: 'discount', label: 'Extra discount', type: 'fixed', value: discountAmt, amount: -discountAmt }] : [])];
  const chargesTotal = lines.reduce((s, l) => s + l.amount, 0);
  const grandTotal = subtotal + chargesTotal;

  const save = async ({ print }) => {
    if (!cart.length) { toast('Add at least one product', 'warning'); return; }
    if (!form.fullName.trim()) { toast('Customer name is required', 'warning'); return; }
    if (!/^\d{10}$/.test(form.mobile.replace(/\D/g, ''))) { toast('Enter a 10-digit mobile number', 'warning'); return; }
    setBusy(true);
    try {
      const snapshot = { form: { ...form, mobile: form.mobile.replace(/\D/g, '') }, cart, totalAmount: subtotal, charges: lines, chargesTotal, note: settings.showNoteOnInvoice ? (settings.chargesNote || DEFAULT_CHARGES_NOTE) : '', delivery: 0, grandTotal };
      const { doc, invoiceNo } = await generateInvoicePDF(snapshot);
      const result = await createAdminOrder({ ...snapshot }, { invoiceNumber: invoiceNo, status, paymentStatus, source, notes });
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      toast(`Order ${result.orderNumber} saved · ${inr(grandTotal)}`);
      if (print) await printPdf(doc);
      navigate(`/admin/orders/${result.id}`);
    } catch (e) {
      toast(e.message || 'Could not save the order', 'error');
    } finally {
      setBusy(false);
    }
  };

  const itemCount = cart.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Sticky summary + actions, same as Edit order */}
      <div className="sticky top-14 lg:top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-zinc-50/95 backdrop-blur border-b border-zinc-200">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="mr-auto">
            <div className="text-xs text-zinc-500">Counter / phone / WhatsApp billing</div>
            <div className="font-semibold text-xl text-zinc-900 leading-tight">New order</div>
          </div>
          <div className="text-sm text-zinc-500">{itemCount} items · {cart.length} lines</div>
          <div className="total-block rounded-xl bg-zinc-900 text-white px-4 py-2 text-right min-w-[180px]">
            <div className="text-[11px] uppercase tracking-wider text-zinc-400">Total to collect</div>
            <div key={grandTotal} className="total-pop text-3xl font-bold tabular-nums leading-tight">{inr(grandTotal)}</div>
            <div className="text-[11px] text-zinc-400 tabular-nums">Subtotal {inr(subtotal)}{chargesTotal ? ` ${chargesTotal > 0 ? '+' : '−'} ${inr(Math.abs(chargesTotal))}` : ''}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" disabled={busy || isEmpty} onClick={clearAll}>Clear</Button>
            <Button variant="secondary" disabled={busy || !cart.length} onClick={() => save({ print: false })}>Save order</Button>
            <Button icon={FiPrinter} disabled={busy || !cart.length} onClick={() => save({ print: true })}>{busy ? 'Saving…' : 'Save & print'}</Button>
          </div>
        </div>
        {draft && !isEmpty && <div className="text-[11px] text-zinc-400 mt-1">Unsaved bill restored on this device</div>}
      </div>

      <Card title="Items">
        <ProductPicker catalog={catalog} onAdd={add} onStepTop={(d) => cart[0] && step(cart[0].id, d)} topLine={cart[0]} autoFocus />
            {cart.length === 0 ? <p className="text-sm text-zinc-500 mt-4">No items yet. Search above to add a product, or add a custom item.</p> : (
              <table className="w-full text-sm mt-4">
                <thead className="text-left text-xs text-zinc-500"><tr><th className="pb-2">Product</th><th className="pb-2 text-right">Price</th><th className="pb-2 text-center">Qty</th><th className="pb-2 text-right">Total</th><th /></tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {cart.map((i) => (
                    <tr key={flash.id === i.id ? `${i.id}-${flash.n}` : i.id} className={flash.id === i.id ? 'row-flash' : ''}>
                      <td className="py-2"><div className="flex items-center gap-3"><Thumb src={i.image || imageOf.get(i.code)} alt={i.name} /><div><div className="font-medium text-zinc-900">{i.name}{i.custom && <span className="ml-1 text-[10px] bg-orange-100 text-primary px-1.5 rounded">custom</span>}</div><div className="text-xs text-zinc-400">{i.code || 'no code'} · MRP {i.mrp != null ? inr(i.mrp) : '—'}</div></div></div></td>
                      <td className="py-2 text-right"><input type="number" className="w-24 text-right border border-zinc-200 rounded-lg px-2 py-1" value={i.price} onChange={(e) => setPrice(i.id, e.target.value)} /></td>
                      <td className="py-2 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button type="button" onClick={() => step(i.id, -1)} className="w-7 h-7 rounded-md bg-zinc-100 hover:bg-zinc-200 font-bold">−</button>
                          <input type="number" className="w-14 text-center border border-zinc-200 rounded-lg py-1" value={i.quantity} onChange={(e) => setQty(i.id, parseInt(e.target.value, 10) || 0)} />
                          <button type="button" onClick={() => step(i.id, 1)} className="w-7 h-7 rounded-md bg-zinc-100 hover:bg-zinc-200 font-bold">+</button>
                        </div>
                      </td>
                      <td className="py-2 text-right font-semibold">{inr(i.price * i.quantity)}</td>
                      <td className="py-2 text-right"><button type="button" onClick={() => setQty(i.id, 0)} className="text-red-500 hover:text-red-700" aria-label="Remove">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </Card>

      <Card title="Customer">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name *"><input className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
              <Field label="Mobile *"><input className={inputClass} inputMode="numeric" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="10 digits" /></Field>
              <Field label="Alternative mobile"><input className={inputClass} value={form.altMobile} onChange={(e) => setForm({ ...form, altMobile: e.target.value })} /></Field>
              <Field label="Email"><input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Address"><input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Optional for counter sales" /></Field>
              <Field label="Pincode" hint={pincodeHint(pinStatus)}><input className={inputClass} inputMode="numeric" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></Field>
              <Field label="Town / City"><input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
              <Field label="District"><input className={inputClass} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
              <Field label="State">
                <select className={inputClass} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}><option value="">Select state</option>{INDIAN_STATES.map((st) => <option key={st}>{st}</option>)}</select>
              </Field>
            </div>
      </Card>

      <Card title="Order & charges">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Order type"><select className={inputClass} value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Status"><select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>{ORDER_STATUSES.filter((st) => st !== 'cancelled').map((st) => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}</select></Field>
          <Field label="Payment"><select className={inputClass} value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>{PAYMENT_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}</select></Field>
        </div>
        <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={applyCharges} onChange={(e) => setApplyCharges(e.target.checked)} /> Apply store charges ({(settings.charges || []).map((c) => (c.type === 'percent' ? `${c.value}%` : inr(c.value))).join(', ') || 'none configured'})</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="Extra discount (₹)"><input type="number" min="0" className={inputClass} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" /></Field>
          <Field label="Internal note"><input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paid by UPI, picked up at counter…" /></Field>
        </div>
        <dl className="mt-4 pt-3 border-t border-zinc-100 text-sm space-y-1.5">
          <div className="flex justify-between"><dt className="text-zinc-500">Items</dt><dd>{itemCount}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-500">Subtotal</dt><dd>{inr(subtotal)}</dd></div>
          {lines.map((l) => <div key={l.id} className="flex justify-between"><dt className="text-zinc-500">{l.label}</dt><dd>{l.amount < 0 ? `- ${inr(-l.amount)}` : inr(l.amount)}</dd></div>)}
          <div className="flex justify-between font-bold text-zinc-900 text-lg pt-2 border-t border-zinc-100"><dt>Total</dt><dd><span key={grandTotal} className="total-pop">{inr(grandTotal)}</span></dd></div>
        </dl>
        <p className="text-[11px] text-zinc-400 mt-3">The order gets an ID, a tracking page ({runtimeUrl('/track')}) and an invoice link, exactly like website orders.</p>
      </Card>

      {cart.length > 0 && (
        <Card title="Tamil names (for the bill counter)">
          <ul className="text-sm space-y-1">{cart.map((i) => <li key={i.id} className="flex justify-between gap-3"><span lang="ta">{i.tamil || categoryTamil[i.category] || '—'}</span><span className="text-zinc-400">×{i.quantity}</span></li>)}</ul>
        </Card>
      )}
    </div>
  );
}
