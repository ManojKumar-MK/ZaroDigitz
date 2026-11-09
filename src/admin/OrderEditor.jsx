import { useEffect, useMemo, useRef, useState } from 'react';
import { useAdminData } from './AdminData';
import { useToast } from './Toast';
import { rawProducts, normalizeProduct } from '../data/products';
import { computeCharges } from '../data/charges';
import { updateOrderContents } from '../firebase/orders';
import usePincodeAutofill, { pincodeHint } from './usePincodeAutofill';
import { INDIAN_STATES } from '../components/LocationFields';
import { Link } from 'react-router-dom';
import { Button, Card, Field, inputClass, inr } from './ui';
import ProductPicker, { Thumb, useImageLookup } from './ProductPicker';

function mergedCatalog(firestoreProducts) {
  const byCode = new Map(rawProducts.map((p) => [p.code, { ...p }]));
  firestoreProducts.forEach((d) => { const code = d.code || d.id; byCode.set(code, { ...(byCode.get(code) || { id: null, image: '' }), ...d, code }); });
  return [...byCode.values()].filter((p) => p.active !== false).map(normalizeProduct);
}

const draftKey = (id) => `digitz-order-draft-${id}`;
export function readOrderDraft(id) {
  try { return JSON.parse(localStorage.getItem(draftKey(id)) || 'null'); } catch { return null; }
}
export function clearOrderDraft(id) {
  try { localStorage.removeItem(draftKey(id)); } catch { /* ignore */ }
}

/** Inline editor for an existing order: lines, customer, charges and discount. Unsaved edits persist as a local draft. */
export default function OrderEditor({ order, onDone, onCancel }) {
  const { products, settings } = useAdminData();
  const toast = useToast();
  const catalog = useMemo(() => mergedCatalog(products), [products]);
  const imageOf = useImageLookup(catalog);
  const [draft] = useState(() => readOrderDraft(order.id));
  const [cart, setCart] = useState(() => draft?.cart || (order.items || []).map((i, idx) => ({ ...i, id: i.id ?? i.code ?? `line-${idx}`, price: Number(i.price) || 0, quantity: Number(i.quantity) || 1 })));
  const [form, setForm] = useState(() => {
    if (draft?.form) return draft.form;
    const base = { fullName: '', mobile: '', altMobile: '', email: '', address: '', city: '', district: '', state: 'Tamil Nadu', country: 'India', pincode: '', ...(order.snapshot?.form || {}) };
    base.fullName = order.customer?.name || base.fullName || '';
    base.mobile = order.customer?.mobile || base.mobile || '';
    return base;
  });
  const [mode, setMode] = useState(draft?.mode || 'keep'); // keep = recompute the order's own charge lines; store = use current store charges; none
  const existingDiscount = (order.charges || []).find((c) => c.amount < 0);
  const [discount, setDiscount] = useState(draft?.discount ?? (existingDiscount ? String(-existingDiscount.amount) : ''));
  const [note, setNote] = useState(draft?.note || '');
  const [dirty, setDirty] = useState(Boolean(draft));
  const [savedAt, setSavedAt] = useState(draft?.savedAt || null);
  const initialJson = useRef(null); // what the editor opened with; only differences become a draft
  const [busy, setBusy] = useState(false);
  const pinStatus = usePincodeAutofill(form, setForm);

  // Autosave the draft (skip the very first render so opening an order doesn't create one).
  useEffect(() => {
    const current = JSON.stringify({ cart, form, mode, discount, note });
    if (initialJson.current === null) initialJson.current = draft ? null : current;
    const unchanged = initialJson.current !== null && current === initialJson.current;
    const at = new Date().toISOString();
    try {
      if (unchanged) localStorage.removeItem(draftKey(order.id));
      else localStorage.setItem(draftKey(order.id), JSON.stringify({ cart, form, mode, discount, note, savedAt: at, orderUpdatedAt: order.updatedAt?.seconds || null }));
    } catch { /* storage full or blocked */ }
    const t = setTimeout(() => { setDirty(!unchanged); if (!unchanged) setSavedAt(at); }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, form, mode, discount, note]);

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const discard = () => {
    if (!window.confirm('Discard your unsaved changes to this order?')) return;
    clearOrderDraft(order.id);
    setDirty(false);
    onCancel();
  };
  const changedSinceDraft = draft?.orderUpdatedAt && order.updatedAt?.seconds && order.updatedAt.seconds > draft.orderUpdatedAt;


  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const baseLines = useMemo(() => {
    if (mode === 'none') return [];
    if (mode === 'store') return computeCharges(subtotal, settings.charges).lines;
    // keep: recompute percent lines on the new subtotal, keep fixed ones, drop the old discount (edited separately)
    return (order.charges || []).filter((c) => c.amount >= 0).map((c) => ({ ...c, amount: c.type === 'percent' ? Math.round((subtotal * (Number(c.value) || 0)) / 100) : Math.round(Number(c.amount) || 0) }));
  }, [mode, subtotal, settings.charges, order.charges]);
  const discountAmt = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const lines = [...baseLines, ...(discountAmt ? [{ id: 'discount', label: 'Extra discount', type: 'fixed', value: discountAmt, amount: -discountAmt }] : [])];
  const grandTotal = subtotal + lines.reduce((s, l) => s + l.amount, 0);

  const [flash, setFlash] = useState({ id: null, n: 0 }); // replays the highlight on the touched line
  const bump = (id) => setFlash((f) => ({ id, n: f.n + 1 }));
  // New products go to the TOP of the list; adding an existing one moves it up and adds 1.
  const add = (p, qty = 1) => {
    if (p.price == null) { toast('This product has no price', 'warning'); return; }
    setCart((c) => {
      const existing = c.find((i) => i.id === p.id);
      if (existing) return [{ ...existing, quantity: existing.quantity + qty }, ...c.filter((i) => i.id !== p.id)];
      return [{ id: p.id, code: p.code, name: p.name, category: p.category, brand: p.brand, price: p.price, mrp: p.mrp, quantity: qty, tamil: p.tamil, per: p.per, unit: p.unit, image: p.image || '', ...(p.custom ? { custom: true } : {}) }, ...c];
    });
    bump(p.id);
  };
  const setQty = (id, qty) => setCart((c) => (qty <= 0 ? c.filter((i) => i.id !== id) : c.map((i) => (i.id === id ? { ...i, quantity: qty } : i))));
  const step = (id, delta) => { const line = cart.find((i) => i.id === id); if (!line) return; setQty(id, line.quantity + delta); if (line.quantity + delta > 0) bump(id); };
  const setPrice = (id, price) => setCart((c) => c.map((i) => (i.id === id ? { ...i, price: Math.max(0, Number(price) || 0) } : i)));

  const save = async () => {
    if (!cart.length) { toast('Keep at least one item, or cancel the order instead', 'warning'); return; }
    if (!form.fullName.trim()) { toast('Customer name is required', 'warning'); return; }
    if (!/^\d{10}$/.test(form.mobile.replace(/\D/g, ''))) { toast('Mobile must be 10 digits', 'warning'); return; }
    setBusy(true);
    try {
      const r = await updateOrderContents(order, { form, cart, charges: lines, note: note.trim() || undefined });
      clearOrderDraft(order.id);
      setDirty(false);
      toast(`Order ${order.orderNumber} updated · new total ${inr(r.grandTotal)}`);
      onDone();
    } catch (e) { toast(e.message || 'Could not save changes', 'error'); } finally { setBusy(false); }
  };

  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const diff = grandTotal - (Number(order.grandTotal) || 0);

  return (
    <div className="space-y-4">
      {/* Sticky summary + actions: always visible while adding products */}
      <div className="sticky top-14 lg:top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-zinc-50/95 backdrop-blur border-b border-zinc-200">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="mr-auto">
            <Link to={`/admin/orders/${order.id}`} className="text-xs text-zinc-500 hover:text-primary">← Back to order</Link>
            <div className="font-semibold text-xl text-zinc-900 leading-tight">Edit {order.orderNumber}</div>
          </div>
          <div className="text-sm text-zinc-500">{itemCount} items · {cart.length} lines</div>
          <div className="total-block rounded-xl bg-zinc-900 text-white px-4 py-2 text-right min-w-[180px]">
            <div className="text-[11px] uppercase tracking-wider text-zinc-400">New total</div>
            <div key={grandTotal} className="total-pop text-3xl font-bold tabular-nums leading-tight">{inr(grandTotal)}</div>
            <div className="text-[11px] text-zinc-400 tabular-nums">Was {inr(order.grandTotal)}{diff ? <span className={diff > 0 ? 'text-emerald-400' : 'text-red-400'}> · {diff > 0 ? '+' : '−'}{inr(Math.abs(diff))}</span> : ''}</div>
          </div>
          <div className="flex items-center gap-2">
            {dirty && <Button variant="danger" disabled={busy} onClick={discard}>Discard</Button>}
            <Button variant="secondary" disabled={busy} onClick={onCancel}>{dirty ? 'Close (keep draft)' : 'Cancel'}</Button>
            <Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </div>
        {dirty && savedAt && <div className="text-[11px] text-zinc-400 mt-1">Draft saved on this device {new Date(savedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>}
      </div>

      {draft && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-sm px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <span>Restored your unsaved changes from {new Date(draft.savedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}.{changedSinceDraft ? ' Note: the order was changed by someone else since then; check the items before saving.' : ''}</span>
          <button type="button" onClick={discard} className="text-blue-700 font-semibold hover:underline">Discard draft</button>
        </div>
      )}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">
        Editing order <strong>{order.orderNumber}</strong>. Saving recalculates the totals, refreshes the invoice PDF and link, updates the customer's tracking page and adds a note to the timeline.
      </div>

      <Card title="Items">
        <ProductPicker catalog={catalog} onAdd={add} onStepTop={(d) => cart[0] && step(cart[0].id, d)} topLine={cart[0]} autoFocus />
        <table className="w-full text-sm mt-3">
          <thead className="text-left text-xs text-zinc-500"><tr><th className="pb-2">Product</th><th className="pb-2 text-right">Price</th><th className="pb-2 text-center">Qty</th><th className="pb-2 text-right">Total</th><th /></tr></thead>
          <tbody className="divide-y divide-zinc-100">
            {cart.map((i) => (
              <tr key={flash.id === i.id ? `${i.id}-${flash.n}` : i.id} className={flash.id === i.id ? 'row-flash' : ''}>
                <td className="py-2"><div className="flex items-center gap-3"><Thumb src={i.image || imageOf.get(i.code)} alt={i.name} /><div><div className="font-medium text-zinc-900">{i.name}{i.custom && <span className="ml-1 text-[10px] bg-orange-100 text-primary px-1.5 rounded">custom</span>}</div><div className="text-xs text-zinc-400">{i.code || 'no code'}{i.mrp != null ? ` · MRP ${inr(i.mrp)}` : ''}</div></div></div></td>
                <td className="py-2 text-right"><input type="number" className="w-24 text-right border border-zinc-200 rounded-lg px-2 py-1" value={i.price} onChange={(e) => setPrice(i.id, e.target.value)} /></td>
                <td className="py-2 text-center"><div className="inline-flex items-center gap-1"><button type="button" onClick={() => step(i.id, -1)} className="w-7 h-7 rounded-md bg-zinc-100 hover:bg-zinc-200 font-bold">−</button><input type="number" className="w-14 text-center border border-zinc-200 rounded-lg py-1" value={i.quantity} onChange={(e) => setQty(i.id, parseInt(e.target.value, 10) || 0)} /><button type="button" onClick={() => step(i.id, 1)} className="w-7 h-7 rounded-md bg-zinc-100 hover:bg-zinc-200 font-bold">+</button></div></td>
                <td className="py-2 text-right font-semibold">{inr(i.price * i.quantity)}</td>
                <td className="py-2 text-right"><button type="button" onClick={() => setQty(i.id, 0)} className="text-red-500 hover:text-red-700" aria-label="Remove line">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Customer">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name *"><input className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          <Field label="Mobile *" hint="Changing it also changes the tracking link"><input className={inputClass} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
          <Field label="Alternative mobile"><input className={inputClass} value={form.altMobile || ''} onChange={(e) => setForm({ ...form, altMobile: e.target.value })} /></Field>
          <Field label="Email"><input className={inputClass} value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Address"><input className={inputClass} value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Pincode" hint={pincodeHint(pinStatus)}><input className={inputClass} value={form.pincode || ''} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></Field>
          <Field label="Town / City"><input className={inputClass} value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="District"><input className={inputClass} value={form.district || ''} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
          <Field label="State">{INDIAN_STATES.includes(form.state) || !form.state ? <select className={inputClass} value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })}><option value="">Select</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select> : <input className={inputClass} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />}</Field>
          <Field label="Country"><input className={inputClass} value={form.country || 'India'} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
        </div>
      </Card>

      <Card title="Charges & totals">
        <div className="space-y-2 text-sm">
          {[['keep', `Keep this order's charges (recalculated on the new subtotal)`], ['store', `Use the current store charges (${(settings.charges || []).map((c) => (c.type === 'percent' ? `${c.value}%` : inr(c.value))).join(', ') || 'none'})`], ['none', 'No charges']].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2"><input type="radio" name="charge-mode" checked={mode === v} onChange={() => setMode(v)} /> {l}</label>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="Extra discount (₹)"><input type="number" min="0" className={inputClass} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" /></Field>
          <Field label="Reason / note for the timeline"><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Customer added 2 more gift boxes on phone" /></Field>
        </div>
        <dl className="mt-4 pt-3 border-t border-zinc-100 text-sm space-y-1.5">
          <div className="flex justify-between"><dt className="text-zinc-500">Was</dt><dd className="text-zinc-500">{inr(order.grandTotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-500">Subtotal</dt><dd>{inr(subtotal)}</dd></div>
          {lines.map((l) => <div key={l.id} className="flex justify-between"><dt className="text-zinc-500">{l.label}</dt><dd>{l.amount < 0 ? `- ${inr(-l.amount)}` : inr(l.amount)}</dd></div>)}
          <div className="flex justify-between font-bold text-zinc-900 text-lg pt-2 border-t border-zinc-100"><dt>New total</dt><dd><span key={grandTotal} className="total-pop">{inr(grandTotal)}</span></dd></div>
        </dl>
      </Card>

    </div>
  );
}
