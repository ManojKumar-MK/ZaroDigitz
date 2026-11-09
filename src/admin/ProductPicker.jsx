import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeProduct, getOfferPrice } from '../data/products';
import ProductFields, { emptyProduct } from './ProductFields';
import { upsertProduct, saveProductImage } from '../firebase/catalog';
import { useToast } from './Toast';
import { Button, Field, Toggle, inputClass, inr } from './ui';

const FALLBACK = '/zaro-logo.png';

/** Small product photo with a logo fallback. */
export function Thumb({ src, alt = '', size = 'w-10 h-10' }) {
  return (
    <img
      src={src ? encodeURI(decodeURI(src)) : FALLBACK}
      alt={alt}
      loading="lazy"
      className={`${size} rounded-lg object-cover bg-zinc-100 border border-zinc-100 shrink-0`}
      onError={(e) => { if (!e.currentTarget.src.endsWith(FALLBACK)) e.currentTarget.src = FALLBACK; }}
    />
  );
}

/** code -> image, so order lines saved without an image still show one. */
export function useImageLookup(catalog) {
  return useMemo(() => new Map(catalog.map((p) => [p.code, p.image])), [catalog]);
}

function nextCode(catalog) {
  const used = new Set(catalog.map((p) => p.code));
  let n = catalog.length + 1;
  while (used.has(`ZD-${String(n).padStart(3, '0')}`)) n++;
  return `ZD-${String(n).padStart(3, '0')}`;
}

/**
 * Search the catalog (with photos) and add to the order, or add a custom line that is not
 * in the catalog, optionally saving it to the catalog too.
 * onAdd(product) receives a product object with a stable `id`.
 */
/**
 * "kolam x200", "kolam*200", "200x kolam", "200 * kolam" -> { term: 'kolam', qty: 200 }.
 * Plain numbers inside names ("10 cm", "240 shot") are left alone.
 */
export function parseQuery(raw) {
  const text = String(raw || '').trim();
  // trailing: needs a space before x ("kolam x200"), or a * ("kolam*200"); keeps names like "4X5" intact
  let m = text.match(/^(.*\S)(?:\s+[x×]|\s*\*)\s*(\d{1,4})$/i);
  if (m) return { term: m[1].trim(), qty: Math.max(1, Number(m[2])) };
  m = text.match(/^(\d{1,4})\s*[x×*]\s+(.+)$/i) || text.match(/^(\d{1,4})[x×*](\S.*)$/i);
  if (m) return { term: m[2].trim(), qty: Math.max(1, Number(m[1])) };
  return { term: text, qty: 1 };
}

export default function ProductPicker({ catalog, onAdd, onStepTop, topLine, autoFocus = false }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [custom, setCustom] = useState(null); // null = closed
  const [busy, setBusy] = useState(false);

  const [hl, setHl] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const parsed = parseQuery(q);
  // If the whole text is (part of) a real product name, it's a name, not a quantity.
  const whole = q.trim().toLowerCase();
  const literal = parsed.qty > 1 && whole && catalog.some((p) => String(p.name).toLowerCase().includes(whole));
  const { term, qty } = literal ? { term: q.trim(), qty: 1 } : parsed;

  const results = useMemo(() => {
    const s = term.toLowerCase();
    if (!s) return [];
    // "111", "zc111", "zc-111" -> exact code first
    const codeMatch = s.match(/^(?:zc-?)?(\d{1,4})$/);
    const exact = codeMatch ? catalog.find((p) => String(p.code).toLowerCase() === `zc-${codeMatch[1].padStart(3, '0')}`) : null;
    const words = s.split(/\s+/).filter(Boolean);
    const hits = catalog.filter((p) => {
      const hay = [p.name, p.code, p.tamil, p.category].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    // names that start with the search come first
    hits.sort((a, b) => Number(!a.name.toLowerCase().startsWith(s)) - Number(!b.name.toLowerCase().startsWith(s)));
    const list = exact ? [exact, ...hits.filter((p) => p.code !== exact.code)] : hits;
    return list.slice(0, 12);
  }, [term, catalog]);

  // keep the highlighted result visible
  useEffect(() => { listRef.current?.querySelector(`[data-idx="${hl}"]`)?.scrollIntoView({ block: 'nearest' }); }, [hl]);

  // "/" (or Ctrl/Cmd+K) jumps to the search box from anywhere on the page
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); inputRef.current?.focus(); inputRef.current?.select(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pick = (p, n = qty) => { onAdd({ ...p, id: p.id ?? p.code }, n); setQ(''); setHl(0); inputRef.current?.focus(); };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); setHl((h) => Math.min(results.length - 1, h + 1)); return; }
    if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setHl((h) => Math.max(0, h - 1)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results[hl]) pick(results[hl]);
      else if (term) openCustom();
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setQ(''); return; }
    // With an empty box, + / - change the quantity of the line added last.
    if (!q && onStepTop && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_')) { e.preventDefault(); onStepTop(e.key === '-' || e.key === '_' ? -1 : 1); }
  };

  const openCustom = () => { setCustom({ ...emptyProduct(nextCode(catalog)), name: term, quantity: qty, saveToCatalog: false }); setQ(''); };

  const addCustom = async () => {
    const name = custom.name.trim();
    const quantity = Math.max(1, parseInt(custom.quantity, 10) || 1);
    const mrp = custom.mrp === '' ? null : Number(custom.mrp);
    const offerPrice = custom.offerPrice === '' ? null : Number(custom.offerPrice);
    if (!name) { toast('Enter a product name', 'warning'); return; }
    if (mrp == null && offerPrice == null) { toast('Enter an MRP or an offer price', 'warning'); return; }
    const product = normalizeProduct({ ...custom, name, mrp, offerPrice, sortOrder: Number(custom.sortOrder) || 9999 });
    const price = getOfferPrice(product) ?? offerPrice ?? mrp;
    setBusy(true);
    try {
      let code = null;
      let savedImage = null;
      if (custom.saveToCatalog) {
        code = String(custom.code || '').trim() || nextCode(catalog);
        if (catalog.some((p) => p.code === code)) throw new Error(`Code ${code} already exists`);
        const uploaded = custom._imageData ? await saveProductImage(code, custom._imageData) : null;
        await upsertProduct(code, { code, name, tamil: custom.tamil, category: custom.category, brand: custom.brand, per: custom.per, unit: custom.unit, mrp, offerPrice, image: uploaded || custom.image, active: custom.active !== false, sortOrder: Number(custom.sortOrder) || 9999, description: custom.description });
        savedImage = uploaded;
        toast(`${name} saved to the catalog as ${code}`);
      }
      const id = code || `custom-${Date.now()}`;
      const line = { id, code, name, tamil: custom.tamil, category: custom.category, brand: custom.brand, per: custom.per, unit: custom.unit, price, mrp: mrp ?? price, image: savedImage || custom.image || custom._imageData || (code ? product.image : ''), description: custom.description, custom: !code };
      onAdd(line, quantity);
      setCustom(null);
      setQ('');
    } catch (e) {
      toast(e.message || 'Could not add the product', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            className={inputClass}
            placeholder="Type a product or code, Enter to add  (kolam x200 adds 5)"
            value={q}
            autoFocus={autoFocus}
            onChange={(e) => { setQ(e.target.value); setHl(0); }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={Boolean(q.trim())}
            aria-controls="product-picker-list"
            aria-activedescendant={results[hl] ? `pp-${results[hl].code}` : undefined}
            aria-label="Add product"
          />
          {q.trim() && (
            <ul ref={listRef} id="product-picker-list" role="listbox" className="absolute z-20 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-xl max-h-96 overflow-y-auto">
              {qty > 1 && results.length > 0 && <li className="px-3 py-1.5 text-xs text-zinc-500 border-b border-zinc-100">Adds <strong className="text-zinc-900">{qty}</strong> of the highlighted product</li>}
              {results.map((p, i) => (
                <li key={p.code} id={`pp-${p.code}`} role="option" aria-selected={i === hl} data-idx={i}>
                  <button type="button" tabIndex={-1} onMouseEnter={() => setHl(i)} onClick={() => pick(p)} className={`w-full text-left px-3 py-2 flex items-center gap-3 ${i === hl ? 'bg-orange-50' : 'hover:bg-orange-50'}`}>
                    <Thumb src={p.image} alt={p.name} size="w-12 h-12" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-zinc-900 truncate">{p.name}</span>
                      <span className="block text-xs text-zinc-400 truncate">{p.code} · {p.category}{p.tamil ? ` · ${p.tamil}` : ''}</span>
                    </span>
                    <span className="font-bold text-emerald-600 whitespace-nowrap">{p.price == null ? '—' : inr(p.price)}</span>
                    {i === hl && <kbd className="hidden sm:inline text-[10px] text-zinc-500 bg-white ring-1 ring-zinc-200 rounded px-1.5 py-0.5">Enter</kbd>}
                  </button>
                </li>
              ))}
              <li className="border-t border-zinc-100">
                <button type="button" tabIndex={-1} onClick={openCustom} className="w-full text-left px-4 py-2.5 text-sm text-primary font-semibold hover:bg-orange-50">
                  + Add “{term}” as a custom item{!results.length ? ' (Enter)' : ''}
                </button>
              </li>
            </ul>
          )}
        </div>
        <Button variant="secondary" onClick={openCustom}>+ Custom item</Button>
      </div>
      <p className="hidden sm:flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-zinc-500">
        <span><kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> choose</span>
        <span><kbd className="kbd">Enter</kbd> add</span>
        <span><kbd className="kbd">kolam x200</kbd> add 200</span>
        <span><kbd className="kbd">111</kbd> product code</span>
        {topLine && <span><kbd className="kbd">+</kbd> <kbd className="kbd">−</kbd> change {topLine.name.length > 18 ? `${topLine.name.slice(0, 18)}…` : topLine.name} (box empty)</span>}
        <span><kbd className="kbd">/</kbd> jump here</span>
        <span><kbd className="kbd">Esc</kbd> clear</span>
      </p>

      {custom && (
        <div className="mt-3 rounded-xl ring-1 ring-orange-200 bg-orange-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="text-sm font-semibold text-zinc-900">Custom item</div>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <Toggle tone="orange" size="sm" checked={custom.saveToCatalog} onChange={(v) => setCustom({ ...custom, saveToCatalog: v })} label="Also save to the catalog" />
              Also save to the catalog
            </label>
          </div>
          <ProductFields f={custom} setF={setCustom} showCatalogFields={custom.saveToCatalog} autoFocusName />
          <div className="flex flex-wrap items-end justify-between gap-3 mt-4 pt-4 border-t border-orange-100">
            <div className="w-32"><Field label="Quantity"><input type="number" min="1" className={inputClass} value={custom.quantity} onChange={(e) => setCustom({ ...custom, quantity: e.target.value })} /></Field></div>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={busy} onClick={() => setCustom(null)}>Cancel</Button>
              <Button disabled={busy} onClick={addCustom}>{busy ? 'Adding…' : custom.saveToCatalog ? 'Save & add to order' : 'Add to order'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
