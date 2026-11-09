import { useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import { useAdminData } from './AdminData';
import { saveSettings } from '../firebase/catalog';
import { PRESETS, DEFAULT_BRAND, applyBrand, normaliseBrand } from '../theme/brand';
import { useToast } from './Toast';
import { Button, Card, Field } from './ui';

/**
 * Admin → Settings → Brand colours: one palette for the website, this admin and the printed
 * invoice. Choosing a colour previews it live; Save makes it the shop's colours everywhere.
 */
export default function BrandColorsCard() {
  const toast = useToast();
  const { settings } = useAdminData();
  const saved = normaliseBrand(settings?.theme || {});
  const [brand, setBrand] = useState(saved);
  const [busy, setBusy] = useState(false);
  const dirty = brand.primary !== saved.primary || brand.accent !== saved.accent || brand.night !== saved.night;

  const pick = (next) => { setBrand(next); applyBrand(next, { remember: false }); };
  const save = async () => {
    setBusy(true);
    try { await saveSettings({ theme: brand }); applyBrand(brand); toast('Brand colours saved. The website, admin and invoices now use them.'); }
    catch (e) { toast(e.message || 'Could not save', 'error'); }
    finally { setBusy(false); }
  };
  const reset = () => pick(saved);

  return (
    <Card title="Brand colours">
      <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">One palette for the website, this admin panel and printed invoices. Pick a ready-made palette or set your own; the preview updates as you choose.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {PRESETS.map((p) => {
          const on = p.primary === brand.primary && p.accent === brand.accent && p.night === brand.night;
          return (
            <button key={p.id} type="button" onClick={() => pick({ primary: p.primary, accent: p.accent, night: p.night })} className={`text-left rounded-xl overflow-hidden ring-2 transition ${on ? 'ring-zinc-900 dark:ring-white' : 'ring-transparent hover:ring-zinc-300'}`} aria-pressed={on}>
              <div className="flex h-14">
                <span className="flex-[3]" style={{ background: p.primary }} />
                <span className="flex-[2]" style={{ background: p.accent }} />
                <span className="flex-1" style={{ background: p.night }} />
              </div>
              <div className="px-3 py-2 bg-white dark:bg-zinc-900 text-sm font-medium flex items-center justify-between gap-2">{p.label}{on && <FiCheck aria-hidden="true" />}</div>
            </button>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        {[['primary', 'Main colour', 'Buttons, prices, headings'], ['accent', 'Accent', 'Gold details, highlights, sketches'], ['night', 'Dark background', 'Footer, admin sidebar, dark sections']].map(([key, label, hint]) => (
          <Field key={key} label={label} hint={hint}>
            <div className="flex items-center gap-3">
              <input type="color" value={brand[key]} onChange={(e) => pick({ ...brand, [key]: e.target.value })} className="h-10 w-14 rounded-lg cursor-pointer" aria-label={label} />
              <input value={brand[key]} onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && setBrand({ ...brand, [key]: e.target.value })} onBlur={() => pick(normaliseBrand(brand))} className="h-10 w-28 rounded-lg ring-1 ring-zinc-300 dark:ring-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm font-mono uppercase" aria-label={`${label} hex`} />
            </div>
          </Field>
        ))}
      </div>

      {/* A strip of the real components in the chosen colours */}
      <div className="mt-6 rounded-xl overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800">
        <div className="p-5 flex flex-wrap items-center gap-4" style={{ background: brand.night }}>
          <span className="font-display font-bold text-lg" style={{ color: brand.accent }}>ZARO Digitz</span>
          <span className="inline-flex items-center h-10 px-5 text-white text-sm font-semibold" style={{ background: brand.primary }}>Get a quote</span>
          <span className="inline-flex items-center h-10 px-5 text-sm font-bold" style={{ background: brand.accent, color: '#211114' }}>Choose a design</span>
          <span className="text-sm" style={{ color: '#FBF5EC' }}>Footer and sidebar text</span>
        </div>
        <div className="p-5 bg-[#FBF5EC] flex flex-wrap items-baseline gap-4">
          <span className="font-display font-bold text-2xl" style={{ color: brand.primary }}>₹24 per card</span>
          <span className="text-sm text-[#211114]">Invoice header and table use the main colour and accent.</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <Button disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save brand colours'}</Button>
        {dirty && <Button variant="ghost" onClick={reset}>Undo changes</Button>}
        <Button variant="ghost" onClick={() => pick(normaliseBrand(DEFAULT_BRAND))}>Use Maroon &amp; Gold</Button>
      </div>
    </Card>
  );
}
