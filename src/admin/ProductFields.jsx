import { useEffect, useMemo, useRef, useState } from 'react';
import { FiUpload, FiTrash2, FiLink } from 'react-icons/fi';
import { compressImage } from '../utils/image';
import { rawProducts, categories, categoryTamil, DISCOUNT_PERCENT } from '../data/products';
import { useAdminData } from './AdminData';
import { Button, Field, Toggle, inputClass } from './ui';
import { buildDictionary, tamilFromEnglish, defaultDescription } from './productAuto';
import { NewCategoryForm } from './CategoryManager';

export const PRODUCT_CATEGORIES = categories.filter((c) => c !== 'All'); // built-in only, for defaults
/** Every category, including ones added in Admin (read at render time). */
export const allCategories = () => categories.filter((c) => c !== 'All');

/** Units already used in the catalog, most used first. */
function unitsFrom(list) {
  const counts = {};
  list.forEach((p) => { const u = String(p.unit || '').trim().toLowerCase(); if (u) counts[u] = (counts[u] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([u]) => u);
}
const STATIC_UNITS = unitsFrom(rawProducts);
const DEFAULT_UNIT = STATIC_UNITS[0] || 'pkt';

/** New products start at 80% off MRP (Sivakasi wholesale rate); change it per product. */
export const DEFAULT_NEW_DISCOUNT = 80;

export const emptyProduct = (code = '') => ({
  code, name: '', tamil: '', category: PRODUCT_CATEGORIES[0], brand: 'Zaro', per: `1 ${DEFAULT_UNIT.toUpperCase()}`, unit: DEFAULT_UNIT,
  mrp: '', offerPrice: '', image: '', active: true, sortOrder: 9999, description: '', discountPct: DEFAULT_NEW_DISCOUNT,
});

const REVERSE_KEY = 'digitz-price-from-offer';
const readReverse = () => { try { return localStorage.getItem(REVERSE_KEY) === '1'; } catch { return false; } };
const mrpFrom = (offer, pct) => (Number(pct) >= 100 ? '' : String(Math.round(Number(offer) / (1 - Number(pct) / 100))));

const round1 = (n) => Math.round(n * 10) / 10;
const offerFrom = (mrp, pct) => Math.round(Number(mrp) * (1 - Number(pct) / 100));

/**
 * The full product field set, shared by Products → Add/Edit product and the custom
 * item form on New order / Edit order.
 * - Offer price = MRP − Discount % of MRP (either side can be typed; the other follows).
 * - Unit is a selector of the units already in the catalog, with "Add new unit…".
 */
export default function ProductFields({ f, setF, codeEditable = true, showCatalogFields = true, previewImage, autoFocusName = false }) {
  const { products, settings } = useAdminData();
  const units = useMemo(() => {
    const merged = unitsFrom([...rawProducts, ...products]);
    const current = String(f.unit || '').trim().toLowerCase();
    return current && !merged.includes(current) ? [...merged, current] : merged;
  }, [products, f.unit]);
  const [addingUnit, setAddingUnit] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [showLink, setShowLink] = useState(Boolean(f.image && /^https?:/.test(f.image)));
  const [imgBusy, setImgBusy] = useState('');
  const fileRef = useRef(null);
  // Price direction: normal = MRP − discount → offer; reverse = offer + discount → MRP.
  const [reverse, setReverse] = useState(readReverse);
  const toggleReverse = (v) => { setReverse(v); try { localStorage.setItem(REVERSE_KEY, v ? '1' : '0'); } catch { /* private mode */ } };

  // Tamil name and description fill themselves from the English name until you edit them.
  const dict = useMemo(() => buildDictionary(products), [products]);
  // `_autoTamil` / `_autoDesc` remember what was filled in automatically (never saved).
  const [tamilBusy, setTamilBusy] = useState(false);
  const tamilIsAuto = !f.tamil || f.tamil === f._autoTamil;
  const descIsAuto = !f.description || f.description === f._autoDesc;
  useEffect(() => {
    if (!tamilIsAuto || !String(f.name || '').trim()) return undefined;
    let gone = false;
    const t = setTimeout(() => {
      setTamilBusy(true);
      tamilFromEnglish(f.name, dict).then((ta) => {
        if (gone) return;
        setF((cur) => (cur && (!cur.tamil || cur.tamil === cur._autoTamil) ? { ...cur, tamil: ta, _autoTamil: ta } : cur));
      }).finally(() => { if (!gone) setTamilBusy(false); });
    }, 500);
    return () => { gone = true; clearTimeout(t); };
  }, [f.name, dict]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!descIsAuto) return;
    const d = defaultDescription(f);
    if (d && d !== f.description) setF((cur) => (cur && (!cur.description || cur.description === cur._autoDesc) ? { ...cur, description: d, _autoDesc: d } : cur));
  }, [f.name, f.category, f.per, f.brand]); // eslint-disable-line react-hooks/exhaustive-deps

  // The chosen photo stays in the form as `_imageData` until the product is saved.
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgBusy('Compressing…');
    try {
      const dataUrl = await compressImage(file, { maxDimension: 1200, quality: 0.8, maxBytes: 280 * 1024, format: 'image/webp' });
      setF({ ...f, _imageData: dataUrl });
      setImgBusy(`Ready · ${Math.round((dataUrl.length * 0.75) / 1024)} KB · saved with the product`);
    } catch (err) {
      setImgBusy(err.message || 'Could not read that image');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const storeDiscount = settings?.discountPercent ?? DISCOUNT_PERCENT ?? 0;
  const derivedPct = f.mrp !== '' && f.mrp != null && f.offerPrice !== '' && f.offerPrice != null && Number(f.mrp) > 0
    ? round1((1 - Number(f.offerPrice) / Number(f.mrp)) * 100) : null;
  const pct = f.discountPct ?? derivedPct ?? storeDiscount;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const onMrp = (e) => {
    const mrp = e.target.value;
    if (reverse) { // MRP typed while working from the offer price: the discount follows
      const next = { ...f, mrp };
      if (mrp !== '' && Number(mrp) > 0 && f.offerPrice !== '') next.discountPct = round1((1 - Number(f.offerPrice) / Number(mrp)) * 100);
      setF(next);
      return;
    }
    setF({ ...f, mrp, discountPct: pct, offerPrice: mrp === '' ? f.offerPrice : String(offerFrom(mrp, pct)) });
  };
  const onPct = (e) => {
    const v = e.target.value;
    if (reverse) { setF({ ...f, discountPct: v, mrp: f.offerPrice === '' || v === '' ? f.mrp : mrpFrom(f.offerPrice, v) }); return; }
    setF({ ...f, discountPct: v, offerPrice: f.mrp === '' || v === '' ? f.offerPrice : String(offerFrom(f.mrp, v)) });
  };
  const onOffer = (e) => {
    const offerPrice = e.target.value;
    if (reverse) { setF({ ...f, offerPrice, discountPct: pct, mrp: offerPrice === '' ? f.mrp : mrpFrom(offerPrice, pct) }); return; }
    const next = { ...f, offerPrice };
    if (offerPrice !== '' && Number(f.mrp) > 0) next.discountPct = round1((1 - Number(offerPrice) / Number(f.mrp)) * 100);
    setF(next);
  };
  // Per follows the unit while it still looks like "<n> <UNIT>".
  const onUnit = (value) => {
    const unit = String(value || '').trim().toLowerCase();
    const m = String(f.per || '').match(/^(\d+(?:\.\d+)?)\s*\S*$/);
    const per = !f.per || m ? `${m ? m[1] : 1} ${unit.toUpperCase()}` : f.per;
    setF({ ...f, unit, per });
  };

  // The logo is only a placeholder, not a product photo.
  const img = [f._imageData, f.image, previewImage].find((u) => u && !String(u).endsWith('/zaro-logo.png'));
  return (
    <div className="space-y-4">
      {showCatalogFields && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code"><input className={inputClass} value={f.code} onChange={set('code')} disabled={!codeEditable} /></Field>
          <Field label="Sort order"><input type="number" className={inputClass} value={f.sortOrder} onChange={set('sortOrder')} /></Field>
        </div>
      )}
      <Field label="Name *"><input className={inputClass} value={f.name} onChange={set('name')} autoFocus={autoFocusName} /></Field>
      <Field label="Tamil name" hint={tamilBusy ? 'Writing the Tamil name…' : tamilIsAuto && f.tamil ? 'Filled from the English name. Edit it if needed.' : undefined}><input className={inputClass} value={f.tamil || ''} onChange={set('tamil')} lang="ta" placeholder="Fills in from the English name" /></Field>
      <Field label="Category" hint={categoryTamil[f.category]}>
        <select className={inputClass} value={f.category} onChange={(e) => { if (e.target.value === '__newcat') setAddingCategory(true); else setF({ ...f, category: e.target.value }); }}>
          {[...allCategories(), ...(allCategories().includes(f.category) ? [] : [f.category])].map((c) => <option key={c}>{c}</option>)}
          <option value="__newcat">+ Add new category…</option>
        </select>
      </Field>
      {addingCategory && (
        <div className="rounded-xl ring-1 ring-primary/30 bg-orange-50/40 p-4 -mt-1">
          <div className="flex items-center justify-between mb-2"><span className="text-sm font-semibold text-zinc-900">New category</span><button type="button" className="text-xs text-zinc-500 hover:text-zinc-900" onClick={() => setAddingCategory(false)}>Cancel</button></div>
          <NewCategoryForm compact onAdded={(cat) => { setAddingCategory(false); setF((cur) => ({ ...cur, category: cat.name })); }} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <Field label="Brand"><input className={inputClass} value={f.brand || ''} onChange={set('brand')} /></Field>
        <Field label="Unit">
          {addingUnit ? (
            <div className="flex gap-1.5">
              <input className={inputClass} autoFocus placeholder="e.g. roll" value={f.unit || ''} onChange={(e) => onUnit(e.target.value)} onBlur={() => { if (!f.unit) onUnit(DEFAULT_UNIT); setAddingUnit(false); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setAddingUnit(false); } }} />
            </div>
          ) : (
            <select className={inputClass} value={String(f.unit || DEFAULT_UNIT).toLowerCase()} onChange={(e) => { if (e.target.value === '__new') { setAddingUnit(true); onUnit(''); } else onUnit(e.target.value); }}>
              {units.map((u) => <option key={u} value={u}>{u}</option>)}
              <option value="__new">+ Add new unit…</option>
            </select>
          )}
        </Field>
        <Field label="Per"><input className={inputClass} value={f.per || ''} onChange={set('per')} placeholder={`1 ${String(f.unit || DEFAULT_UNIT).toUpperCase()}`} /></Field>
      </div>
      <label className="flex items-center gap-2.5 text-sm text-zinc-700">
        <Toggle size="sm" tone="orange" checked={reverse} onChange={toggleReverse} label="Work out MRP from the offer price" />
        Work out MRP from the offer price
      </label>
      <div className="grid grid-cols-3 gap-3">
        {reverse ? (
          <>
            <Field label="Offer price (₹)"><input type="number" min="0" className={inputClass} value={f.offerPrice ?? ''} onChange={onOffer} /></Field>
            <Field label="Discount %"><input type="number" min="0" max="99" step="0.5" className={inputClass} value={pct ?? ''} onChange={onPct} /></Field>
            <Field label="MRP (₹)"><input type="number" min="0" className={inputClass} value={f.mrp ?? ''} onChange={onMrp} /></Field>
          </>
        ) : (
          <>
            <Field label="MRP (₹)"><input type="number" min="0" className={inputClass} value={f.mrp ?? ''} onChange={onMrp} /></Field>
            <Field label="Discount %"><input type="number" min="0" max="100" step="0.5" className={inputClass} value={pct ?? ''} onChange={onPct} /></Field>
            <Field label="Offer price (₹)"><input type="number" min="0" className={inputClass} value={f.offerPrice ?? ''} onChange={onOffer} /></Field>
          </>
        )}
      </div>
      <p className="text-xs text-zinc-500 -mt-2">
        {reverse
          ? (f.offerPrice !== '' && f.offerPrice != null ? `₹${Number(f.offerPrice).toLocaleString('en-IN')} ÷ (1 − ${pct || 0}%) = MRP ₹${Number(f.mrp || mrpFrom(f.offerPrice, pct || 0) || 0).toLocaleString('en-IN')}` : 'Enter the offer price; MRP = offer price ÷ (1 − discount).')
          : (f.mrp !== '' && f.mrp != null ? `₹${Number(f.mrp).toLocaleString('en-IN')} − ${pct || 0}% = ₹${Number(f.offerPrice || offerFrom(f.mrp, pct || 0)).toLocaleString('en-IN')}` : `Enter MRP; the offer price is MRP minus the discount (new products start at ${DEFAULT_NEW_DISCOUNT}%).`)}
      </p>
      <div>
        <span className="block text-[13px] font-medium text-zinc-700 mb-1.5">Photo</span>
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-28 h-28 rounded-lg bg-zinc-50 ring-1 ring-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
            {img ? <img src={img} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.opacity = '0.2'; }} /> : <span className="text-xs text-zinc-400">No photo</span>}
          </div>
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium bg-white hover:bg-zinc-50 text-zinc-800 ring-1 ring-inset ring-zinc-300 shadow-sm cursor-pointer">
                <FiUpload size={15} /> {img ? 'Change photo' : 'Upload photo'}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              </label>
              {(f._imageData || f.image) && <Button variant="ghost" icon={FiTrash2} onClick={() => { setF({ ...f, _imageData: undefined, image: '' }); setImgBusy(''); }}>Remove</Button>}
              <Button variant="ghost" icon={FiLink} onClick={() => setShowLink((v) => !v)}>{showLink ? 'Hide link' : 'Use a link'}</Button>
            </div>
            <p className="text-xs text-zinc-500">{imgBusy || 'JPG, PNG or a phone photo. It is resized and compressed automatically. Leave empty to use the built-in photo matching the name.'}</p>
            {showLink && <input className={inputClass} value={f._imageData ? '' : f.image || ''} disabled={Boolean(f._imageData)} onChange={set('image')} placeholder="https://… (optional)" />}
          </div>
        </div>
      </div>
      <Field label="Description (shown on the product page)" hint={descIsAuto && f.description ? 'Written from the name, category and pack. Edit it to make it your own.' : undefined}><textarea className={`${inputClass} h-auto min-h-[80px] py-2`} value={f.description || ''} onChange={set('description')} /></Field>
      {showCatalogFields && (
        <label className="flex items-center gap-3 text-sm text-zinc-700">
          <Toggle tone="green" checked={f.active !== false} onChange={(v) => setF({ ...f, active: v })} label="Visible on the website" />
          Visible on the website
        </label>
      )}
    </div>
  );
}
