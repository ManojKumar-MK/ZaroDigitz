import { useEffect, useRef, useState } from 'react';
import { FiUpload, FiType, FiCalendar, FiImage, FiTrash2, FiSave } from 'react-icons/fi';
import { compressImage } from '../utils/image';
import TemplateCanvas from '../personalise/TemplateCanvas';
import { FONTS, loadTemplate, saveTemplate, deleteTemplate, newField } from '../personalise/templates';
import { useToast } from './Toast';
import { Button, Card, Field, inputClass } from './ui';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * Admin → Products → a design → Personalise. Upload the design exported from Photoshop (with
 * the name, date and photo layers hidden), then place boxes where the customer's details go.
 */
export default function TemplateEditor({ code }) {
  const toast = useToast();
  const [template, setTemplate] = useState(null); // { image, fields }
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState('');
  const [dirty, setDirty] = useState(false);
  const stage = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    let gone = false;
    loadTemplate(code).then((t) => { if (!gone) setTemplate(t); });
    return () => { gone = true; };
  }, [code]);

  const update = (fn) => { setTemplate((t) => fn(t)); setDirty(true); };
  const field = template?.fields.find((f) => f.id === selected);
  const setField = (patch) => update((t) => ({ ...t, fields: t.fields.map((f) => (f.id === selected ? { ...f, ...patch } : f)) }));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('Compressing the design…');
    try {
      const image = await compressImage(file, { maxDimension: 1600, quality: 0.86, maxBytes: 900 * 1024, format: 'image/jpeg' });
      update((t) => ({ image, fields: t?.fields || [] }));
    } catch (err) {
      toast(err.message || 'Could not read that image', 'error');
    } finally {
      setBusy('');
    }
  };

  // Move a box, or resize it from its bottom-right corner (the handle sets `resize`).
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

  const add = (type) => {
    const f = newField(type);
    update((t) => ({ ...t, fields: [...t.fields, f] }));
    setSelected(f.id);
  };
  const remove = () => { update((t) => ({ ...t, fields: t.fields.filter((f) => f.id !== selected) })); setSelected(null); };
  const save = async () => {
    setBusy('Saving…');
    try { await saveTemplate(code, { image: template.image, fields: template.fields }); setDirty(false); toast('Personalisation saved'); }
    catch (err) { toast(err.message || 'Could not save', 'error'); }
    finally { setBusy(''); }
  };
  const removeAll = async () => {
    if (!window.confirm('Remove personalisation from this design?')) return;
    await deleteTemplate(code).catch(() => null);
    setTemplate(null); setSelected(null); setDirty(false);
    toast('Personalisation removed');
  };

  return (
    <Card title="Personalise (customer fills in names, dates and photos)">
      {!template?.image ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">Export the design from Photoshop as a JPG with the name, date and photo layers hidden (about 1500 px wide). Upload it, then place boxes where the customer&apos;s details go.</p>
          <label className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium bg-zinc-900 text-white cursor-pointer">
            <FiUpload /> {busy || 'Upload design JPG'}
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Button size="sm" variant="secondary" icon={FiType} onClick={() => add('text')}>Text box</Button>
              <Button size="sm" variant="secondary" icon={FiCalendar} onClick={() => add('date')}>Date box</Button>
              <Button size="sm" variant="secondary" icon={FiImage} onClick={() => add('photo')}>Photo box</Button>
              <label className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium ring-1 ring-zinc-300 cursor-pointer"><FiUpload size={14} /> Replace JPG<input type="file" accept="image/*" className="hidden" onChange={onFile} /></label>
            </div>
            <div ref={stage} className="relative max-w-[640px] touch-none" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
              <TemplateCanvas template={template} editing selected={selected} onSelect={setSelected} onPointerDownField={onPointerDownField} />
              {field && (
                <span
                  data-handle="resize"
                  className="absolute w-4 h-4 bg-[#1F7A4D] cursor-nwse-resize -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${(field.x + field.w) * 100}%`, top: `${(field.y + field.h) * 100}%` }}
                  onPointerDown={(e) => onPointerDownField(e, field)}
                  title="Drag to resize"
                />
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-2">Drag a box to move it; drag its green corner to resize. Sample text shows until the customer types.</p>
          </div>

          <div className="space-y-3">
            {!field && <p className="text-sm text-zinc-600">Select a box to edit it, or add one.</p>}
            {field && (
              <>
                <Field label="Label (what the customer fills in)"><input className={inputClass} value={field.label} onChange={(e) => setField({ label: e.target.value })} placeholder="Bride's name" /></Field>
                {field.type !== 'photo' && (
                  <>
                    {field.type === 'text' && <Field label="Sample text"><input className={inputClass} value={field.sample} onChange={(e) => setField({ sample: e.target.value })} /></Field>}
                    <Field label="Font">
                      <select className={inputClass} value={field.font} onChange={(e) => setField({ font: e.target.value })}>{FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
                    </Field>
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Size"><input type="number" step="0.1" min="1" className={inputClass} value={field.size} onChange={(e) => setField({ size: Number(e.target.value) || 1 })} /></Field>
                      <Field label="Colour"><input type="color" className="h-10 w-full rounded-lg" value={field.color} onChange={(e) => setField({ color: e.target.value })} /></Field>
                      <Field label="Bold"><select className={inputClass} value={field.bold ? '1' : ''} onChange={(e) => setField({ bold: Boolean(e.target.value) })}><option value="">No</option><option value="1">Yes</option></select></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Align"><select className={inputClass} value={field.align} onChange={(e) => setField({ align: e.target.value })}><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select></Field>
                      <Field label="Language"><select className={inputClass} value={field.lang} onChange={(e) => setField({ lang: e.target.value })}><option value="en">English</option><option value="ta">Tamil</option><option value="both">Both</option></select></Field>
                    </div>
                    {field.type === 'text' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Max letters"><input type="number" min="1" className={inputClass} value={field.max} onChange={(e) => setField({ max: Number(e.target.value) || 1 })} /></Field>
                        <Field label="Lines"><select className={inputClass} value={field.lines} onChange={(e) => setField({ lines: Number(e.target.value) })}><option value={1}>One line</option><option value={3}>Paragraph</option></select></Field>
                      </div>
                    )}
                  </>
                )}
                {field.type === 'photo' && (
                  <Field label="Frame"><select className={inputClass} value={field.shape} onChange={(e) => setField({ shape: e.target.value })}><option value="circle">Circle</option><option value="rect">Rectangle</option></select></Field>
                )}
                <Button variant="ghost" icon={FiTrash2} onClick={remove}>Delete this box</Button>
              </>
            )}
            <div className="pt-3 flex flex-wrap gap-2">
              <Button icon={FiSave} disabled={!dirty || Boolean(busy)} onClick={save}>{busy || (dirty ? 'Save personalisation' : 'Saved')}</Button>
              <Button variant="ghost" onClick={removeAll}>Remove</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
