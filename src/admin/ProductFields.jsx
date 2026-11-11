import { useEffect, useMemo, useRef, useState } from 'react';
import { FiUpload, FiTrash2, FiLink } from 'react-icons/fi';
import { compressImage } from '../utils/image';
import { applyWatermark, DEFAULT_WATERMARK } from '../utils/watermark';
import { rawProducts, categories, categoryTamil, DISCOUNT_PERCENT } from '../data/products';
import { useAdminData } from './AdminData';
import { Button, Field, Toggle, inputClass } from './ui';
import { defaultDescription } from './productAuto';
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
const DEFAULT_UNIT = STATIC_UNITS[0] || 'card';

/** New designs start with no discount: the offer price is the price per card. */
export const DEFAULT_NEW_DISCOUNT = 0;

export const emptyProduct = (code = '') => ({
  code, name: '', tamil: '', category: PRODUCT_CATEGORIES[0], brand: 'Zaro Digitz', per: `1 ${DEFAULT_UNIT}`, unit: DEFAULT_UNIT,
  mrp: '', offerPrice: '', image: '', active: true, sortOrder: 9999, description: '', discountPct: DEFAULT_NEW_DISCOUNT,
  minQty: 1, qtyStep: 1, tiers: [], material: '', size: '', orientation: 'Portrait', style: 'Single card', printingNote: '', images: [],
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

  // The description fills itself from the name and category until you edit it.
  // `_autoDesc` remembers what was filled in automatically (never saved).
  const descIsAuto = !f.description || f.description === f._autoDesc;
  useEffect(() => {
    if (!descIsAuto) return;
    const d = defaultDescription(f);
    if (d && d !== f.description) setF((cur) => (cur && (!cur.description || cur.description === cur._autoDesc) ? { ...cur, description: d, _autoDesc: d } : cur));
  }, [f.name, f.category, f.per, f.brand]); // eslint-disable-line react-hooks/exhaustive-deps

  // The chosen photo stays in the form as `_imageData` until the product is saved.
  // Watermark: on by default (Admin → Settings → Photo watermark); can be skipped per photo.
  const wmSettings = { ...DEFAULT_WATERMARK, ...(settings?.watermark || {}) };
  const [watermark, setWatermark] = useState(wmSettings.enabled !== false);
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgBusy('Compressing…');
    try {
      let dataUrl = await compressImage(file, { maxDimension: 1200, quality: 0.8, maxBytes: 280 * 1024, format: 'image/webp' });
      if (watermark) dataUrl = await applyWatermark(dataUrl, wmSettings);
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

  // The placeholder is not a product photo.
  const img = [f._imageData, f.image, previewImage].find((u) => u && !String(u).endsWith('/zaro-logo.png') && !String(u).endsWith('/card-placeholder.svg'));
  return (
    <div className="space-y-4">
      {showCatalogFields && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code"><input className={inputClass} value={f.code} onChange={set('code')} disabled={!codeEditable} /></Field>
          <Field label="Sort order"><input type="number" className={inputClass} value={f.sortOrder} onChange={set('sortOrder')} /></Field>
        </div>
      )}
      <Field label="Name *"><input className={inputClass} value={f.name} onChange={set('name')} autoFocus={autoFocusName} /></Field>
      <Field label="Tamil name (optional)"><input className={inputClass} value={f.tamil || ''} onChange={set('tamil')} lang="ta" /></Field>
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
          : (f.mrp !== '' && f.mrp != null ? `₹${Number(f.mrp).toLocaleString('en-IN')} − ${pct || 0}% = ₹${Number(f.offerPrice || offerFrom(f.mrp, pct || 0)).toLocaleString('en-IN')}` : `Enter the price per card as MRP and leave the discount at 0, or set a discount to show a struck-out price.`)}
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
            <p className="text-xs text-zinc-500">{imgBusy || 'JPG, PNG or a phone photo. It is resized and compressed automatically. Leave empty to show a placeholder card.'}</p>
            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300"><input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} /> Add the Zaro Digitz watermark to this photo</label>
            {showLink && <input className={inputClass} value={f._imageData ? '' : f.image || ''} disabled={Boolean(f._imageData)} onChange={set('image')} placeholder="https://… (optional)" />}
          </div>
        </div>
      </div>
      {showCatalogFields && <CardFields f={f} setF={setF} />}
      <Field label="Description (shown on the product page)" hint={descIsAuto && f.description ? 'Written from the name and category. Edit it to make it your own.' : undefined}><textarea className={`${inputClass} h-auto min-h-[80px] py-2`} value={f.description || ''} onChange={set('description')} /></Field>
      {showCatalogFields && (
        <label className="flex items-center gap-3 text-sm text-zinc-700">
          <Toggle tone="green" checked={f.active !== false} onChange={(v) => setF({ ...f, active: v })} label="Visible on the website" />
          Visible on the website
        </label>
      )}
    </div>
  );
}

/** Design details: specs, a printing note and extra photos (by link). */
function CardFields({ f, setF }) {
  const images = Array.isArray(f.images) ? f.images : [];
  const txt = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="rounded-xl ring-1 ring-zinc-200 p-4 space-y-4">
      <div className="text-sm font-semibold text-zinc-900">Card details</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Material"><input className={inputClass} value={f.material || ''} onChange={txt('material')} placeholder="Art board, 300 gsm" /></Field>
        <Field label="Size"><input className={inputClass} value={f.size || ''} onChange={txt('size')} placeholder="5 x 7 in" /></Field>
        <Field label="Orientation">
          <select className={inputClass} value={f.orientation || ''} onChange={txt('orientation')}>
            {['', 'Portrait', 'Landscape', 'Square'].map((o) => <option key={o} value={o}>{o || '—'}</option>)}
          </select>
        </Field>
        <Field label="Style"><input className={inputClass} value={f.style || ''} onChange={txt('style')} placeholder="Single card / Gatefold / Box set" /></Field>
      </div>
      <OptionsEditor f={f} setF={setF} />
      <Field label="Printing note (optional)"><input className={inputClass} value={f.printingNote || ''} onChange={txt('printingNote')} placeholder="Printing on one side included. Envelope printing ₹2 extra." /></Field>
      <Field label="More photos (links, one per line)" hint="Shown in the product gallery after the main photo.">
        <textarea className={`${inputClass} h-auto min-h-[64px] py-2`} value={images.join('\n')} onChange={(e) => setF({ ...f, images: e.target.value.split('\n').map((u) => u.trim()).filter(Boolean) })} placeholder="https://…" />
      </Field>
    </div>
  );
}

/**
 * Configure & price: option groups the customer picks on the product page (Paper, Printed side,
 * Finish…). Each choice can add to the price per piece. A switch shows or hides them on the site.
 */
function OptionsEditor({ f, setF }) {
  const groups = Array.isArray(f.options) ? f.options : [];
  const setGroups = (next) => setF({ ...f, options: next });
  const setGroup = (gi, patch) => setGroups(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const setChoice = (gi, ci, patch) => setGroup(gi, { choices: groups[gi].choices.map((c, j) => (j === ci ? { ...c, ...patch } : c)) });
  return (
    <div className="rounded-lg ring-1 ring-zinc-200 dark:ring-zinc-700 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Options (Configure &amp; price)</span>
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <Toggle size="sm" tone="green" checked={f.showOptions !== false} onChange={(v) => setF({ ...f, showOptions: v })} label="Show options on the website" />
          Show on website
        </label>
      </div>
      {groups.map((g, gi) => (
        <div key={gi} className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3 space-y-2">
          <div className="flex gap-2">
            <input className={inputClass} value={g.name} onChange={(e) => setGroup(gi, { name: e.target.value })} placeholder="Option name, e.g. Paper" aria-label="Option name" />
            <Button variant="ghost" icon={FiTrash2} onClick={() => setGroups(groups.filter((_, i) => i !== gi))} aria-label="Remove option" />
          </div>
          {g.choices.map((c, ci) => (
            <div key={ci} className="flex items-center gap-2 text-sm">
              <input className={inputClass} value={c.label} onChange={(e) => setChoice(gi, ci, { label: e.target.value })} placeholder={ci === 0 ? 'First choice is the default' : 'Choice'} aria-label="Choice" />
              <span className="text-zinc-500 whitespace-nowrap">+₹</span>
              <input type="number" min="0" step="0.05" className={`${inputClass} w-24`} value={c.add ?? 0} onChange={(e) => setChoice(gi, ci, { add: Number(e.target.value) || 0 })} aria-label="Extra price per piece" />
              <Button variant="ghost" icon={FiTrash2} onClick={() => setGroup(gi, { choices: g.choices.filter((_, j) => j !== ci) })} aria-label="Remove choice" />
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setGroup(gi, { choices: [...g.choices, { label: '', add: 0 }] })}>+ Add choice</Button>
        </div>
      ))}
      <Button size="sm" variant="secondary" onClick={() => setGroups([...groups, { name: '', choices: [{ label: '', add: 0 }, { label: '', add: 0 }] }])}>+ Add option</Button>
      <p className="text-xs text-zinc-500">The first choice is selected by default. Extra price is per piece and is added to the design's price.</p>
    </div>
  );
}
