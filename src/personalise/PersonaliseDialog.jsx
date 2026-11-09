import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LuX, LuLanguages, LuShare2, LuShoppingBag, LuImagePlus } from 'react-icons/lu';
import TemplateCanvas from './TemplateCanvas';
import { WORDING, displayText, renderPreview, savePersonalisation, toTamil } from './templates';
import { compressImage } from '../utils/image';

const DRAFT = (code) => `digitz-personalise-${code}`;
const readDraft = (code) => { try { return JSON.parse(localStorage.getItem(DRAFT(code)) || '{}'); } catch { return {}; } };

const input = 'w-full h-12 px-4 bg-paper2 text-ink text-base placeholder:text-ink/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * The customer's editor: the design on one side, the form on the other. Typing updates the
 * design live; photos can be zoomed and moved inside their frame. "Add to cart" stores the
 * details, photos and a rendered preview with the order.
 */
export default function PersonaliseDialog({ product, template, quantity, onAdd, onClose }) {
  const [values, setValues] = useState(() => readDraft(product.code));
  const [photos, setPhotos] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { try { localStorage.setItem(DRAFT(product.code), JSON.stringify(values)); } catch { /* storage full or blocked */ } }, [values, product.code]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const set = (id, v) => { setValues((cur) => ({ ...cur, [id]: v })); setError(''); };
  const setPhoto = (id, patch) => setPhotos((cur) => ({ ...cur, [id]: { zoom: 1, x: 0, y: 0, ...cur[id], ...patch } }));

  const onPhoto = async (id, file) => {
    if (!file) return;
    setBusy('Preparing your photo…');
    try {
      const src = await compressImage(file, { maxDimension: 1400, quality: 0.85, maxBytes: 450 * 1024, format: 'image/jpeg' });
      setPhoto(id, { src, zoom: 1, x: 0, y: 0 });
    } catch (e) {
      setError(e.message || 'Could not read that photo.');
    } finally {
      setBusy('');
    }
  };

  const tamil = async (f) => {
    setBusy('Writing in Tamil…');
    const t = await toTamil(values[f.id] || f.sample || '');
    set(f.id, t);
    setBusy('');
  };

  const textFields = template.fields.filter((f) => f.type !== 'photo');
  const photoFields = template.fields.filter((f) => f.type === 'photo');

  const share = async () => {
    setBusy('Making the preview…');
    try {
      const url = await renderPreview(template, values, photos, 1200);
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `${product.code}-preview.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: product.name, text: `My ${product.name} from Zaro Digitz` });
      else { const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); }
    } catch { /* share cancelled */ } finally { setBusy(''); }
  };

  const add = async () => {
    const missing = textFields.filter((f) => f.type !== 'date' && !String(values[f.id] || '').trim()).map((f) => f.label);
    if (missing.length) { setError(`Please fill in: ${missing.join(', ')}.`); return; }
    setBusy('Saving your design…');
    try {
      const preview = await renderPreview(template, values, photos, 1000);
      const summary = textFields.map((f) => ({ label: f.label, value: displayText(f, values) }));
      const photoList = Object.fromEntries(photoFields.filter((f) => photos[f.id]?.src).map((f) => [f.label || f.id, photos[f.id].src]));
      const token = await savePersonalisation({ code: product.code, name: product.name, values: Object.fromEntries(summary.map((s) => [s.label, s.value])), photos: photoList, preview });
      onAdd({ token, summary, preview, quantity });
      try { localStorage.removeItem(DRAFT(product.code)); } catch { /* ignore */ }
    } catch (e) {
      setError(e.message || 'Could not save right now. Please try again or send your details on WhatsApp.');
    } finally {
      setBusy('');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-night/70 flex" role="dialog" aria-modal="true" aria-label={`Personalise ${product.name}`}>
      <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} className="m-auto w-full h-full lg:h-[92vh] lg:max-w-6xl bg-paper text-ink flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 sm:px-8 h-16 bg-paper2 shrink-0">
          <h2 className="font-display font-bold text-lg sm:text-xl truncate">Personalise · {product.name}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-paper3"><LuX size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto lg:overflow-hidden grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="bg-paper3 p-5 sm:p-8 flex items-start lg:items-center justify-center lg:overflow-y-auto">
            <motion.div initial={{ rotate: -2, y: 16, opacity: 0 }} animate={{ rotate: 0, y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-[460px]">
              <TemplateCanvas template={template} values={values} photos={photos} />
            </motion.div>
          </div>

          <div className="p-5 sm:p-8 space-y-6 lg:overflow-y-auto">
            {textFields.map((f) => (
              <div key={f.id}>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <label htmlFor={`pf-${f.id}`} className="font-semibold">{f.label}</label>
                  {f.type === 'text' && (
                    <button type="button" onClick={() => tamil(f)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"><LuLanguages size={16} aria-hidden="true" /> தமிழ்</button>
                  )}
                </div>
                {f.type === 'date' && <input id={`pf-${f.id}`} type="date" className={input} value={values[f.id] || ''} onChange={(e) => set(f.id, e.target.value)} />}
                {f.type === 'text' && f.lines > 1 && (
                  <>
                    <textarea id={`pf-${f.id}`} rows={3} maxLength={f.max * 4} className={`${input} h-auto py-3`} value={values[f.id] || ''} placeholder={f.sample} onChange={(e) => set(f.id, e.target.value)} />
                    <select className={`${input} mt-2 text-sm`} value="" onChange={(e) => e.target.value && set(f.id, e.target.value)} aria-label={`Wording ideas for ${f.label}`}>
                      <option value="">Wording ideas…</option>
                      {WORDING.map((w) => <option key={w} value={w}>{w.length > 70 ? `${w.slice(0, 70)}…` : w}</option>)}
                    </select>
                  </>
                )}
                {f.type === 'text' && f.lines <= 1 && <input id={`pf-${f.id}`} className={input} maxLength={f.max} value={values[f.id] || ''} placeholder={f.sample} onChange={(e) => set(f.id, e.target.value)} />}
              </div>
            ))}

            {photoFields.map((f) => {
              const p = photos[f.id];
              return (
                <div key={f.id} className="bg-paper2 p-4">
                  <p className="font-semibold mb-3">{f.label || 'Photo'}</p>
                  <label className="inline-flex items-center gap-2 h-12 px-5 bg-primary text-white font-semibold cursor-pointer hover:bg-[#5A1420] transition-colors">
                    <LuImagePlus size={18} aria-hidden="true" /> {p?.src ? 'Change photo' : 'Add a photo'}
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => { onPhoto(f.id, e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  {p?.src && (
                    <div className="grid gap-3 mt-4 text-sm">
                      <label className="grid gap-1">Zoom<input type="range" min="1" max="3" step="0.02" value={p.zoom} onChange={(e) => setPhoto(f.id, { zoom: Number(e.target.value) })} /></label>
                      <label className="grid gap-1">Left / right<input type="range" min="-0.5" max="0.5" step="0.01" value={p.x} onChange={(e) => setPhoto(f.id, { x: Number(e.target.value) })} /></label>
                      <label className="grid gap-1">Up / down<input type="range" min="-0.5" max="0.5" step="0.01" value={p.y} onChange={(e) => setPhoto(f.id, { y: Number(e.target.value) })} /></label>
                    </div>
                  )}
                </div>
              );
            })}

            <p className="text-sm">This is a preview. Our designer sets your final card and sends a proof on WhatsApp before printing.</p>
            {error && <p className="font-medium text-red-700 dark:text-red-300" role="alert">{error}</p>}
          </div>
        </div>

        <div className="shrink-0 px-5 sm:px-8 py-4 bg-paper2 flex flex-wrap items-center justify-end gap-3">
          {busy && <span className="mr-auto text-sm" aria-live="polite">{busy}</span>}
          <button type="button" onClick={share} disabled={Boolean(busy)} className="inline-flex items-center gap-2 h-12 px-5 bg-paper3 font-semibold disabled:opacity-60"><LuShare2 size={18} aria-hidden="true" /> Share preview</button>
          <button type="button" onClick={add} disabled={Boolean(busy)} className="inline-flex items-center gap-2 h-12 px-6 bg-primary text-white font-bold hover:bg-[#5A1420] transition-colors disabled:opacity-60"><LuShoppingBag size={18} aria-hidden="true" /> Add {quantity} to cart</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
