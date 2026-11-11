import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LuX, LuLanguages, LuShare2, LuShoppingBag, LuImagePlus, LuUndo2, LuMinus, LuPlus } from 'react-icons/lu';
import TemplateCanvas from './TemplateCanvas';
import { SceneView, CameraView } from './TryOn';
import { modeFor } from '../components/liveModes';
import { WORDING, displayText, renderPreview, savePersonalisation, toTamil, pagesOf, makeQr, qrTarget } from './templates';
import { compressImage } from '../utils/image';
import { getOfferPrice } from '../data/products';
import { useLang } from '../i18n/context';

const DRAFT = (code) => `digitz-personalise-${code}`;
const readDraft = (code) => { try { return JSON.parse(localStorage.getItem(DRAFT(code)) || '{}'); } catch { return {}; } };
const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const input = 'w-full h-12 px-4 bg-paper2 text-ink text-[17px] placeholder:text-ink/55 focus:outline-none focus:bg-paper3 focus-visible:ring-2 focus-visible:ring-ink';

/**
 * The customer's editor. The design sits on one side (pinned at the top on a phone, so every
 * keystroke is visible) and the details on the other. Tap a box on the design to jump to its
 * field; the field being typed is outlined on the design. Photos are dragged inside their frame
 * and zoomed with the wheel or the slider. "Add to cart" stores the details, photos and a
 * rendered preview with the order.
 */
export default function PersonaliseDialog({ product, template, quantity, onAdd, onClose }) {
  const { t, pname } = useLang();
  const [values, setValues] = useState(() => readDraft(product.code));
  const [photos, setPhotos] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [active, setActive] = useState(null); // field being edited, outlined on the design
  const [undo, setUndo] = useState({}); // field id → text before it was written in Tamil
  const [qty, setQty] = useState(Math.max(1, Number(quantity) || 1));
  const formRef = useRef(null);
  const closeRef = useRef(null);

  // Pages: Front, Inside, Envelope… (one-page templates have just Front)
  const pages = pagesOf(template);
  const [pageIdx, setPageIdx] = useState(0);
  const page = pages[Math.min(pageIdx, pages.length - 1)];
  const allFields = pages.flatMap((pg) => pg.fields.map((f) => ({ ...f, page: pg.name })));
  const textFields = allFields.filter((f) => f.type !== 'photo');
  const photoFields = allFields.filter((f) => f.type === 'photo');
  const multi = pages.length > 1;
  const required = (f) => f.type === 'text' && f.page === pages[0]?.name;
  const filled = (f) => (f.type === 'photo' ? Boolean(photos[f.id]?.src) : Boolean(String(values[f.id] || '').trim()));
  const doneCount = allFields.filter(filled).length;

  // QR boxes: a code made from the venue link or address, redrawn as the customer types
  const [qrs, setQrs] = useState({});
  useEffect(() => {
    let gone = false;
    const qrFields = allFields.filter((f) => f.type === 'qr');
    if (!qrFields.length) return undefined;
    const timer = setTimeout(async () => {
      const pairs = await Promise.all(qrFields.map(async (f) => [f.id, { src: await makeQr(qrTarget(values[f.id] || f.sample), f.color).catch(() => null) }]));
      if (!gone) setQrs(Object.fromEntries(pairs));
    }, 250);
    return () => { gone = true; clearTimeout(timer); };
  }, [values, template]); // eslint-disable-line react-hooks/exhaustive-deps
  const art = { ...photos, ...qrs }; // photos and QR codes, both drawn into their boxes

  // Design (live editor) | scene (in a room, tilts) | camera (over the customer's own space)
  const [view, setView] = useState('design');
  const [shot, setShot] = useState(null);
  const kind = modeFor(product.category);
  const show = async (v) => {
    setView(v);
    if (v === 'design') return;
    setBusy(t('Making your preview…'));
    try { setShot(await renderPreview(pages[0], values, art, 900)); } finally { setBusy(''); }
  };

  useEffect(() => { try { localStorage.setItem(DRAFT(product.code), JSON.stringify(values)); } catch { /* storage full or blocked */ } }, [values, product.code]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const back = document.activeElement;
    // Start in the first field, so the customer can type straight away.
    setTimeout(() => (formRef.current?.querySelector('input, textarea') || closeRef.current)?.focus(), 60);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; back?.focus?.(); };
  }, [onClose]);

  const set = (id, v) => { setValues((cur) => ({ ...cur, [id]: v })); setError(''); };
  const setPhoto = (id, patch) => setPhotos((cur) => ({ ...cur, [id]: { zoom: 1, x: 0, y: 0, ...cur[id], ...patch } }));
  const zoomPhoto = (id, by) => setPhotos((cur) => ({ ...cur, [id]: { ...cur[id], zoom: Math.max(1, Math.min(3, (cur[id]?.zoom || 1) + by)) } }));

  /** Show a field: its page on the design, and the cursor in its box. */
  const goTo = (id) => {
    const f = allFields.find((x) => x.id === id);
    if (!f) return;
    setActive(id);
    setView('design');
    const at = pages.findIndex((pg) => pg.name === f.page);
    if (at >= 0) setPageIdx(at);
    const el = document.getElementById(`pf-${id}`) || document.getElementById(`pp-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el && el.tagName !== 'DIV') el.focus({ preventScroll: true });
  };

  const onPhoto = async (id, file) => {
    if (!file) return;
    setBusy(t('Preparing your photo…'));
    try {
      const src = await compressImage(file, { maxDimension: 1400, quality: 0.85, maxBytes: 450 * 1024, format: 'image/jpeg' });
      setPhoto(id, { src, zoom: 1, x: 0, y: 0 });
      setActive(id);
    } catch (e) {
      setError(e.message || t('Could not read that photo.'));
    } finally {
      setBusy('');
    }
  };

  const tamil = async (f) => {
    const before = values[f.id] || '';
    setBusy(t('Writing in Tamil…'));
    try {
      const out = await toTamil(before || f.sample || '');
      if (out !== before) { setUndo((u) => ({ ...u, [f.id]: before })); set(f.id, out); }
    } finally { setBusy(''); }
  };
  const undoTamil = (f) => { set(f.id, undo[f.id]); setUndo((u) => { const next = { ...u }; delete next[f.id]; return next; }); };

  const clearAll = () => {
    if (!window.confirm(t('Clear everything you have typed on this design?'))) return;
    setValues({}); setPhotos({}); setUndo({}); setError('');
  };

  const label = (f) => (multi ? `${f.page}: ${f.label}` : f.label);
  const L = (text) => t(text || ''); // labels and page names that come from the template
  const unit = getOfferPrice(product);

  const share = async () => {
    setBusy(t('Making the preview…'));
    try {
      const url = await renderPreview(page, values, art, 1200);
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `${product.code}-preview.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: product.name, text: `My ${product.name} from Zaro Digitz` });
      else { const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); }
    } catch { /* share cancelled */ } finally { setBusy(''); }
  };

  const add = async () => {
    const missing = textFields.filter((f) => required(f) && !String(values[f.id] || '').trim());
    if (missing.length) {
      setError(t('Please fill in: {list}.', { list: missing.map((f) => L(f.label)).join(', ') }));
      goTo(missing[0].id);
      return;
    }
    setBusy(t('Saving your design…'));
    try {
      const rendered = await Promise.all(pages.map(async (pg) => [pg.name, await renderPreview(pg, values, art, 1000)]));
      const previews = Object.fromEntries(rendered);
      const preview = rendered[0][1];
      const summary = textFields.map((f) => ({ label: label(f), value: f.type === 'qr' ? qrTarget(values[f.id] || f.sample) : displayText(f, values) }));
      const photoList = Object.fromEntries(photoFields.filter((f) => photos[f.id]?.src).map((f) => [f.label || f.id, photos[f.id].src]));
      const token = await savePersonalisation({ code: product.code, name: product.name, values: Object.fromEntries(summary.map((s) => [s.label, s.value])), photos: photoList, preview, previews: multi ? previews : undefined });
      onAdd({ token, summary, preview, quantity: qty });
      try { localStorage.removeItem(DRAFT(product.code)); } catch { /* ignore */ }
    } catch (e) {
      setError(e.message || t('Could not save right now. Please try again or send your details on WhatsApp.'));
    } finally {
      setBusy('');
    }
  };

  const views = [['design', t('Design')], ['scene', kind === 'calendar' || kind === 'diary' ? t('On your desk') : t('On the table')], ['camera', t('In your space')]];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-night/70 flex" role="dialog" aria-modal="true" aria-label={t('Personalise {name}', { name: pname(product) })}>
      <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="m-auto w-full h-full lg:h-[92vh] lg:max-w-6xl bg-paper text-ink flex flex-col">
        {/* Title bar */}
        <div className="flex items-center gap-4 px-4 sm:px-7 h-16 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-extrabold tracking-[-0.03em] text-lg sm:text-xl truncate">{pname(product)}</h2>
            <p className="text-[14px] text-ink/75 truncate">{t('{done} of {total} details added · saved on this device', { done: doneCount, total: allFields.length })}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('Close')} className="w-11 h-11 flex items-center justify-center hover:bg-paper2 transition-colors"><LuX size={22} /></button>
        </div>
        <div className="h-1 bg-paper2 shrink-0" aria-hidden="true"><motion.div className="h-full bg-ink origin-left" animate={{ scaleX: allFields.length ? doneCount / allFields.length : 0 }} transition={{ duration: 0.4 }} /></div>

        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* The design: pinned at the top on a phone */}
          <div className="sticky top-0 z-10 lg:static bg-paper2 px-4 sm:px-7 pt-2 pb-3 lg:p-8 flex flex-col items-center lg:justify-start lg:overflow-y-auto">
            <div className="w-full max-w-[560px]">
              <div role="tablist" aria-label={t('How to see it')} className="flex gap-x-5 mb-2 lg:mb-3">
                {views.map(([v, l]) => (
                  <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => show(v)} className={`pb-1 text-[15px] sm:text-[16px] font-semibold transition-colors ${view === v ? 'text-ink' : 'text-ink/60 hover:text-ink'}`}>
                    {l}
                    {view === v && <motion.span layoutId="pz-view" className="block h-[3px] bg-ink mt-1" />}
                  </button>
                ))}
              </div>
              {view === 'design' && multi && (
                <div className="flex gap-1 mb-2 lg:mb-3" role="tablist" aria-label={t('Pages')}>
                  {pages.map((pg, n) => <button key={pg.name} type="button" role="tab" aria-selected={n === pageIdx} onClick={() => setPageIdx(n)} className={`h-8 lg:h-9 px-3 text-[14px] font-semibold transition-colors ${n === pageIdx ? 'bg-ink text-paper' : 'bg-paper hover:bg-paper3'}`}>{L(pg.name)}</button>)}
                </div>
              )}
              {view === 'design' && (
                <AnimatePresence mode="wait">
                  <motion.div key={page.name} initial={{ opacity: 0, rotateY: -10 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: 10 }} transition={{ duration: 0.3 }} style={{ transformPerspective: 1200 }} className="mx-auto w-[min(100%,22svh)] sm:w-[min(100%,30svh)] lg:w-full">
                    <TemplateCanvas
                      template={page}
                      values={values}
                      photos={art}
                      active={active}
                      onFieldTap={goTo}
                      onPhotoMove={(id, pos) => setPhoto(id, pos)}
                      onPhotoZoom={zoomPhoto}
                    />
                  </motion.div>
                </AnimatePresence>
              )}
              {view === 'design' && <p className="hidden lg:block text-[14px] text-ink/75 mt-3 text-center">{t('Tap any text on the design to change it. Drag a photo to move it.')}</p>}
              {view === 'scene' && shot && <SceneView src={shot} kind={kind} />}
              {view === 'camera' && shot && <CameraView src={shot} name={product.code} />}
            </div>
          </div>

          {/* The details */}
          <div ref={formRef} className="px-4 sm:px-7 py-6 lg:p-8 space-y-7 lg:overflow-y-auto">
            {textFields.map((f, n) => {
              const val = values[f.id] || '';
              const max = f.lines > 1 ? (f.max || 60) * 4 : f.max;
              return (
                <div key={f.id} onFocusCapture={() => goTo(f.id)}>
                  {multi && f.page !== textFields[n - 1]?.page && (
                    <h3 className="font-display font-extrabold tracking-[-0.03em] text-[22px] mb-4 pt-2">{L(f.page)}</h3>
                  )}
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <label htmlFor={`pf-${f.id}`} className="font-semibold text-[17px]">
                      {L(f.label)}{required(f) && <span className="text-primary" aria-hidden="true"> *</span>}
                      {required(f) && <span className="sr-only"> ({t('required')})</span>}
                    </label>
                    <span className="flex items-center gap-3 shrink-0">
                      {max && f.type === 'text' && <span className={`text-[14px] tabular-nums ${val.length >= max ? 'text-primary font-semibold' : 'text-ink/70'}`} aria-live="polite">{val.length}/{max}</span>}
                      {f.type === 'text' && undo[f.id] !== undefined && (
                        <button type="button" onClick={() => undoTamil(f)} className="inline-flex items-center gap-1 text-[14px] font-semibold hover:text-primary"><LuUndo2 size={15} aria-hidden="true" /> {t('Undo')}</button>
                      )}
                      {f.type === 'text' && (
                        <button type="button" onClick={() => tamil(f)} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary hover:underline underline-offset-4 disabled:opacity-50" aria-label={t('Write {label} in Tamil', { label: L(f.label) })}><LuLanguages size={16} aria-hidden="true" /> தமிழ்</button>
                      )}
                    </span>
                  </div>
                  {f.type === 'qr' && (
                    <>
                      <input id={`pf-${f.id}`} className={input} value={val} placeholder={t('Paste a Google Maps link, or type the venue address')} onChange={(e) => set(f.id, e.target.value)} aria-describedby={`pf-${f.id}-hint`} />
                      <p id={`pf-${f.id}-hint`} className="text-[15px] mt-1.5">{t('Guests scan the code on the card to get directions.')}</p>
                    </>
                  )}
                  {f.type === 'date' && <input id={`pf-${f.id}`} type="date" className={input} value={val} onChange={(e) => set(f.id, e.target.value)} />}
                  {f.type === 'text' && f.lines > 1 && (
                    <>
                      <textarea id={`pf-${f.id}`} rows={3} maxLength={max} className={`${input} h-auto py-3`} value={val} placeholder={f.sample} onChange={(e) => set(f.id, e.target.value)} />
                      <select className={`${input} mt-2 text-[15px]`} value="" onChange={(e) => e.target.value && set(f.id, e.target.value)} aria-label={t('Wording ideas for {label}', { label: L(f.label) })}>
                        <option value="">{t('Wording ideas…')}</option>
                        {WORDING.map((w) => <option key={w} value={w}>{w.length > 70 ? `${w.slice(0, 70)}…` : w}</option>)}
                      </select>
                    </>
                  )}
                  {f.type === 'text' && f.lines <= 1 && <input id={`pf-${f.id}`} className={input} maxLength={max} value={val} placeholder={f.sample} onChange={(e) => set(f.id, e.target.value)} />}
                </div>
              );
            })}

            {photoFields.map((f) => {
              const p = photos[f.id];
              return (
                <div key={f.id} id={`pp-${f.id}`} className="bg-paper2 p-4 sm:p-5" onFocusCapture={() => setActive(f.id)}>
                  <p className="font-semibold text-[17px] mb-3">{L(f.label || 'Photo')}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 h-12 px-5 bg-ink text-paper font-semibold cursor-pointer hover:bg-night transition-colors focus-within:ring-2 focus-within:ring-primary">
                      <LuImagePlus size={18} aria-hidden="true" /> {p?.src ? t('Change photo') : t('Add a photo')}
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => { onPhoto(f.id, e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    {p?.src && <button type="button" onClick={() => setPhoto(f.id, { zoom: 1, x: 0, y: 0 })} className="text-[15px] font-semibold underline underline-offset-4">{t('Reset position')}</button>}
                  </div>
                  {p?.src && (
                    <>
                      <label className="grid gap-1 mt-4 text-[15px]">{t('Zoom')}<input type="range" min="1" max="3" step="0.02" value={p.zoom} onChange={(e) => setPhoto(f.id, { zoom: Number(e.target.value) })} /></label>
                      <p className="text-[14px] text-ink/75 mt-2">{t('Drag the photo on the design to move it.')}</p>
                    </>
                  )}
                </div>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-[15px] max-w-[46ch]">{t('This is a preview. Our designer sets your final design and sends a proof on WhatsApp before printing.')}</p>
              {doneCount > 0 && <button type="button" onClick={clearAll} className="text-[15px] font-semibold underline underline-offset-4 hover:text-primary">{t('Clear all')}</button>}
            </div>
            {error && <p className="font-semibold text-primary" role="alert">{error}</p>}
          </div>
        </div>

        {/* Quantity, total and the actions */}
        <div className="shrink-0 px-4 sm:px-7 py-3 sm:py-4 bg-paper2 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center bg-paper" role="group" aria-label={t('Quantity')}>
            <button type="button" aria-label={t('Fewer')} disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-11 flex items-center justify-center hover:text-primary disabled:opacity-30"><LuMinus /></button>
            <input type="number" inputMode="numeric" min="1" value={qty} aria-label={t('Quantity')} onChange={(e) => setQty(Math.max(1, Math.round(Number(e.target.value) || 1)))} className="w-16 h-11 text-center font-bold tabular-nums bg-transparent focus:outline-none" />
            <button type="button" aria-label={t('More')} onClick={() => setQty((q) => q + 1)} className="w-11 h-11 flex items-center justify-center hover:text-primary"><LuPlus /></button>
          </div>
          {unit != null && <p className="text-[15px] tabular-nums">{money(unit)} × {qty} = <strong className="text-lg">{money(unit * qty)}</strong></p>}
          <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
            {busy && <span className="hidden sm:inline text-[15px]" aria-live="polite">{busy}</span>}
            <button type="button" onClick={share} disabled={Boolean(busy)} aria-label={t('Share preview')} className="inline-flex items-center gap-2 h-12 px-4 sm:px-5 bg-paper font-semibold hover:bg-paper3 transition-colors disabled:opacity-60"><LuShare2 size={18} aria-hidden="true" /> <span className="hidden sm:inline">{t('Share preview')}</span></button>
            <button type="button" onClick={add} disabled={Boolean(busy)} className="flex-1 sm:flex-none justify-center inline-flex items-center gap-2 h-12 px-5 sm:px-6 bg-primary text-white font-bold hover:bg-primary-dark transition-colors active:scale-[0.98] disabled:opacity-60"><LuShoppingBag size={18} aria-hidden="true" /> {t('Add to cart')}</button>
          </div>
          {busy && <span className="sm:hidden w-full text-[14px]" aria-live="polite">{busy}</span>}
        </div>
      </motion.div>
    </motion.div>
  );
}
