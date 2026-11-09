import { useEffect, useRef, useState } from 'react';
import { FiUpload, FiTrash2, FiSave, FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi';
import { compressImage } from '../utils/image';
import { psdToTemplate } from './psdImport';
import TemplateCanvas from '../personalise/TemplateCanvas';
import { FONTS, loadTemplate, saveTemplate, deleteTemplate, newField, pagesOf } from '../personalise/templates';
import { useToast } from './Toast';
import { Button, Card, Field, inputClass } from './ui';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// One click adds a ready box: label and sample text already filled in.
const QUICK = [
  { label: "Bride's name", type: 'text', sample: 'Priya', font: 'greatvibes', size: 7 },
  { label: "Groom's name", type: 'text', sample: 'Arjun', font: 'greatvibes', size: 7 },
  { label: 'Event date', type: 'date', font: 'poppins', size: 3.2 },
  { label: 'Venue', type: 'text', sample: 'Sri Mahal, Sivakasi', font: 'playfair', size: 3.6, lines: 3 },
  { label: 'Company name', type: 'text', sample: 'Sri Murugan Traders', font: 'playfair', size: 5, bold: true },
  { label: 'Phone', type: 'text', sample: '98765 43210', font: 'poppins', size: 3 },
  { label: 'Message', type: 'text', sample: 'With the blessings of our elders…', font: 'playfair', size: 3.2, lines: 3, max: 160 },
  { label: 'Photo', type: 'photo' },
  { label: 'QR code (venue)', type: 'qr' },
];
const SIZES = [['Small', 3], ['Medium', 5], ['Large', 7.5]];
const STYLES = [['Elegant', 'playfair'], ['Script', 'greatvibes'], ['Simple', 'poppins'], ['Tamil', 'muktamalar']];
const SWATCHES = ['#7A1F2B', '#C9A032', '#211114', '#FFFFFF', '#1F3C88'];

const chip = (on) => `h-9 px-3 rounded-lg text-sm font-medium ring-1 transition ${on ? 'bg-zinc-900 text-white ring-zinc-900 dark:bg-white dark:text-zinc-900' : 'ring-zinc-300 dark:ring-zinc-700 hover:ring-zinc-500'}`;

/**
 * Admin → a design → Personalise, in three steps: upload the design exported from Photoshop
 * (name, date and photo layers hidden), add the boxes customers fill in, save.
 */
export default function TemplateEditor({ code }) {
  const toast = useToast();
  // The design's pages (Front, Inside, Envelope…); each has its own image and boxes.
  const [doc, setDoc] = useState(null); // { pages: [{ name, image, fields }] }
  const [pageIdx, setPageIdx] = useState(0);
  const template = doc?.pages[Math.min(pageIdx, doc.pages.length - 1)] || null;
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState('');
  const [dirty, setDirty] = useState(false);
  const stage = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    let gone = false;
    loadTemplate(code).then((t) => { if (!gone) setDoc(t ? { pages: pagesOf(t) } : null); });
    return () => { gone = true; };
  }, [code]);

  const update = (fn) => {
    setDoc((d) => {
      if (!d) { const first = fn(undefined); return { pages: [{ name: 'Front', ...first }] }; }
      return { ...d, pages: d.pages.map((pg, i) => (i === Math.min(pageIdx, d.pages.length - 1) ? { ...pg, ...fn(pg) } : pg)) };
    });
    setDirty(true);
  };
  const addPage = (name) => {
    setDoc((d) => ({ ...d, pages: [...d.pages, { name, image: null, fields: [] }] }));
    setPageIdx(doc.pages.length);
    setSelected(null);
  };
  const removePage = () => {
    if (pageIdx === 0 || !window.confirm(`Remove the ${template.name} page?`)) return;
    setDoc((d) => ({ ...d, pages: d.pages.filter((_, i) => i !== pageIdx) }));
    setPageIdx(0); setSelected(null); setDirty(true);
  };
  const field = template?.fields.find((f) => f.id === selected);
  const setField = (patch) => update((t) => ({ ...t, fields: t.fields.map((f) => (f.id === selected ? { ...f, ...patch } : f)) }));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(/\.psd$/i.test(file.name) ? 'Reading the Photoshop layers…' : 'Preparing the design…');
    try {
      if (/\.psd$/i.test(file.name)) {
        // Text layers become boxes; everything else becomes the background.
        const t = await psdToTemplate(file);
        update(() => ({ image: t.image, fields: t.fields }));
        toast(`Imported ${t.fields.length} boxes from the PSD.${t.notes.length ? ` ${t.notes[0]}` : ''}`);
      } else {
        const image = await compressImage(file, { maxDimension: 1600, quality: 0.86, maxBytes: 900 * 1024, format: 'image/jpeg' });
        update((t) => ({ image, fields: t?.fields || [] }));
      }
    } catch (err) {
      toast(err.message || 'Could not read that image', 'error');
    } finally {
      setBusy('');
    }
  };

  // Drag a box to move it; drag its corner to resize.
  const onPointerDownField = (e, f) => {
    const rect = stage.current.getBoundingClientRect();
    drag.current = { id: f.id, startX: e.clientX, startY: e.clientY, x: f.x, y: f.y, w: f.w, h: f.h, rect, resize: e.target.dataset.handle === 'resize' };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.rect.width;
    const dy = (e.clientY - d.startY) / d.rect.height;
    update((t) => ({
      ...t,
      fields: t.fields.map((f) => {
        if (f.id !== d.id) return f;
        if (d.resize) return { ...f, w: clamp(d.w + dx, 0.04, 1 - f.x), h: clamp(d.h + dy, 0.02, 1 - f.y) };
        return { ...f, x: clamp(d.x + dx, 0, 1 - f.w), y: clamp(d.y + dy, 0, 1 - f.h) };
      }),
    }));
  };
  const onPointerUp = () => { drag.current = null; };

  const addQuick = (q) => {
    const f = { ...newField(q.type), ...q, ...(q.lines > 1 ? { h: 0.14 } : {}) };
    update((t) => ({ ...t, fields: [...t.fields, f] }));
    setSelected(f.id);
  };
  const remove = () => { update((t) => ({ ...t, fields: t.fields.filter((f) => f.id !== selected) })); setSelected(null); };
  const save = async () => {
    setBusy('Saving…');
    try { const pages = doc.pages.filter((pg) => pg.image); await saveTemplate(code, { pages, image: pages[0].image, fields: pages[0].fields }); setDirty(false); toast('Saved. Customers can personalise this design now.'); }
    catch (err) { toast(err.message || 'Could not save', 'error'); }
    finally { setBusy(''); }
  };
  const removeAll = async () => {
    if (!window.confirm('Turn off personalisation for this design?')) return;
    await deleteTemplate(code).catch(() => null);
    setDoc(null); setPageIdx(0); setSelected(null); setDirty(false);
    toast('Personalisation turned off');
  };

  const step = (n, title, done) => (
    <p className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
      <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${done ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'}`}>{done ? '✓' : n}</span>{title}
    </p>
  );

  return (
    <Card title="Personalise (customers add their names, date and photos)">
      {doc && (
        <div className="flex flex-wrap items-center gap-2 mb-5" role="tablist" aria-label="Pages">
          {doc.pages.map((pg, i) => (
            <button key={`${pg.name}-${i}`} type="button" role="tab" aria-selected={i === pageIdx} onClick={() => { setPageIdx(i); setSelected(null); }} className={chip(i === pageIdx)}>{pg.name}{!pg.image ? ' · add design' : ''}</button>
          ))}
          {['Inside', 'Envelope', 'Back'].filter((n) => !doc.pages.some((pg) => pg.name === n)).map((n) => (
            <button key={n} type="button" onClick={() => addPage(n)} className="h-9 px-3 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 ring-1 ring-dashed ring-zinc-300 hover:ring-zinc-500">+ {n}</button>
          ))}
          {pageIdx > 0 && <button type="button" onClick={removePage} className="ml-auto text-sm text-red-700 dark:text-red-400 hover:underline">Remove this page</button>}
        </div>
      )}
      {!template?.image ? (
        <div className="space-y-3">
          {step(1, doc ? `Upload the ${template?.name || 'page'} design` : 'Upload the design')}
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Upload the <strong>PSD</strong>: text layers become boxes automatically (name a layer “photo” for a photo frame). Or upload a JPG, PNG or SVG with the name and date layers hidden.</p>
          <label className="inline-flex items-center gap-2 h-11 px-5 rounded-lg text-sm font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 cursor-pointer">
            <FiUpload /> {busy || 'Upload PSD, JPG, PNG or SVG'}
            <input type="file" accept="image/*,.psd" className="hidden" onChange={onFile} />
          </label>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
          <div>
            <div ref={stage} className="relative max-w-[560px] touch-none" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
              <TemplateCanvas template={template} editing selected={selected} onSelect={setSelected} onPointerDownField={onPointerDownField} />
              {field && (
                <span
                  data-handle="resize"
                  className="absolute w-5 h-5 rounded-full bg-emerald-600 ring-2 ring-white cursor-nwse-resize -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${(field.x + field.w) * 100}%`, top: `${(field.y + field.h) * 100}%` }}
                  onPointerDown={(e) => onPointerDownField(e, field)}
                  title="Drag to resize"
                />
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-3">Drag a box to place it. Drag the green dot to resize. <label className="text-zinc-700 dark:text-zinc-300 underline cursor-pointer">Replace the JPG<input type="file" accept="image/*,.psd" className="hidden" onChange={onFile} /></label></p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              {step(2, 'Add what customers fill in', template.fields.length > 0)}
              <div className="flex flex-wrap gap-2">
                {QUICK.map((q) => <button key={q.label} type="button" onClick={() => addQuick(q)} className={chip(false)}>+ {q.label}</button>)}
              </div>
            </div>

            {field ? (
              <div className="space-y-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-4">
                <Field label="Box name"><input className={inputClass} value={field.label} onChange={(e) => setField({ label: e.target.value })} /></Field>
                {field.type === 'text' && <Field label="Sample text"><input className={inputClass} value={field.sample} onChange={(e) => setField({ sample: e.target.value })} /></Field>}

                {field.type === 'qr' && (
                  <>
                    <Field label="Sample address or map link"><input className={inputClass} value={field.sample} onChange={(e) => setField({ sample: e.target.value })} /></Field>
                    <div><span className="block text-[13px] font-medium mb-1.5">Colour</span><div className="flex gap-2">{SWATCHES.filter((c) => c !== '#FFFFFF').map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setField({ color: c })} className={`w-8 h-8 rounded-full ring-2 ${field.color?.toUpperCase() === c ? 'ring-zinc-900 dark:ring-white' : 'ring-zinc-300'}`} style={{ background: c }} />)}</div></div>
                    <p className="text-xs text-zinc-500">Customers paste a Google Maps link or type the venue; the QR code opens directions. Keep the box square and on a light area.</p>
                  </>
                )}
                {field.type === 'qr' ? null : field.type !== 'photo' ? (
                  <>
                    <div><span className="block text-[13px] font-medium mb-1.5">Size</span><div className="flex gap-2">{SIZES.map(([l, v]) => <button key={l} type="button" onClick={() => setField({ size: v })} className={chip(Math.abs(field.size - v) < 0.6)}>{l}</button>)}</div></div>
                    <div><span className="block text-[13px] font-medium mb-1.5">Style</span><div className="flex flex-wrap gap-2">{STYLES.map(([l, v]) => <button key={l} type="button" onClick={() => setField({ font: v })} className={chip(field.font === v)} style={{ fontFamily: FONTS.find((f) => f.id === v)?.family }}>{l}</button>)}</div></div>
                    <div className="flex items-end justify-between gap-4">
                      <div><span className="block text-[13px] font-medium mb-1.5">Colour</span><div className="flex gap-2">{SWATCHES.map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setField({ color: c })} className={`w-8 h-8 rounded-full ring-2 ${field.color?.toUpperCase() === c ? 'ring-zinc-900 dark:ring-white' : 'ring-zinc-300'}`} style={{ background: c }} />)}</div></div>
                      <div className="flex gap-1">{[['left', FiAlignLeft], ['center', FiAlignCenter], ['right', FiAlignRight]].map(([a, Icon]) => <button key={a} type="button" aria-label={`Align ${a}`} onClick={() => setField({ align: a })} className={`w-9 h-9 rounded-lg flex items-center justify-center ring-1 ${field.align === a ? 'bg-zinc-900 text-white ring-zinc-900 dark:bg-white dark:text-zinc-900' : 'ring-zinc-300 dark:ring-zinc-700'}`}><Icon /></button>)}</div>
                    </div>
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium text-zinc-600 dark:text-zinc-300">More options</summary>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <Field label="Exact size"><input type="number" step="0.1" min="1" className={inputClass} value={field.size} onChange={(e) => setField({ size: Number(e.target.value) || 1 })} /></Field>
                        <Field label="Any colour"><input type="color" className="h-9 w-full rounded-lg" value={field.color} onChange={(e) => setField({ color: e.target.value })} /></Field>
                        <Field label="Bold"><select className={inputClass} value={field.bold ? '1' : ''} onChange={(e) => setField({ bold: Boolean(e.target.value) })}><option value="">No</option><option value="1">Yes</option></select></Field>
                        <Field label="Language"><select className={inputClass} value={field.lang} onChange={(e) => setField({ lang: e.target.value })}><option value="en">English</option><option value="ta">Tamil</option><option value="both">Both</option></select></Field>
                        {field.type === 'text' && <Field label="Max letters"><input type="number" min="1" className={inputClass} value={field.max} onChange={(e) => setField({ max: Number(e.target.value) || 1 })} /></Field>}
                        {field.type === 'text' && <Field label="Lines"><select className={inputClass} value={field.lines} onChange={(e) => setField({ lines: Number(e.target.value) })}><option value={1}>One line</option><option value={3}>Paragraph</option></select></Field>}
                      </div>
                    </details>
                  </>
                ) : (
                  <div><span className="block text-[13px] font-medium mb-1.5">Frame</span><div className="flex gap-2">{[['circle', 'Circle'], ['rect', 'Rectangle']].map(([v, l]) => <button key={v} type="button" onClick={() => setField({ shape: v })} className={chip(field.shape === v)}>{l}</button>)}</div></div>
                )}
                <button type="button" onClick={remove} className="inline-flex items-center gap-2 text-sm text-red-700 dark:text-red-400 hover:underline"><FiTrash2 /> Delete this box</button>
              </div>
            ) : (
              template.fields.length > 0 && <p className="text-sm text-zinc-500">Click a box on the design to change it.</p>
            )}

            <div className="space-y-3">
              {step(3, 'Save', !dirty && template.fields.length > 0)}
              <div className="flex flex-wrap gap-2">
                <Button icon={FiSave} disabled={!dirty || Boolean(busy) || !template.fields.length} onClick={save}>{busy || (dirty ? 'Save' : 'Saved')}</Button>
                <Button variant="ghost" onClick={removeAll}>Turn off</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
