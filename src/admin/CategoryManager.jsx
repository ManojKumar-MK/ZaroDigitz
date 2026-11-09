import { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiTrash2, FiExternalLink } from 'react-icons/fi';
import { useAdminData } from './AdminData';
import { useToast } from './Toast';
import { saveCustomCategories } from '../firebase/catalog';
import { categoryTamil } from '../data/products';
import { SHOP_CATEGORIES, categoryBlurb, categoryPath, slugify, isCustomCategory } from '../seo/catalog';
import { mergeForAdmin } from './catalogAdmin';
import { buildDictionary, tamilFromEnglish } from './productAuto';
import { Button, Drawer, Field, inputClass } from './ui';

export const defaultCategoryBlurb = (name) => `${String(name || '').trim()} from Sivakasi at wholesale prices, delivered across India.`;

/** Validate a new category name against every existing one. Returns an error message or ''. */
export function categoryNameError(name) {
  const n = String(name || '').trim();
  if (!n) return 'Enter a category name';
  if (n.length > 60) return 'Keep the name under 60 characters';
  if (!slugify(n)) return 'Use letters or numbers in the name';
  if (SHOP_CATEGORIES.some((c) => c.toLowerCase() === n.toLowerCase() || slugify(c) === slugify(n))) return 'That category already exists';
  return '';
}

/** Add one category to settings.customCategories. */
export async function addCategory(settings, cat) {
  const list = Array.isArray(settings?.customCategories) ? settings.customCategories : [];
  await saveCustomCategories([...list, cat]);
}

/** Small form: name, Tamil name (fills itself), description (fills itself). */
export function NewCategoryForm({ onAdded, compact = false }) {
  const { settings, products } = useAdminData();
  const toast = useToast();
  const dict = useMemo(() => buildDictionary(products), [products]);
  const [c, setC] = useState({ name: '', tamil: '', blurb: '', _autoTamil: '', _autoBlurb: '' });
  const [busy, setBusy] = useState(false);
  const err = c.name ? categoryNameError(c.name) : '';
  useEffect(() => {
    if (!c.name.trim()) return undefined;
    const t = setTimeout(() => {
      tamilFromEnglish(c.name, dict).then((ta) => setC((cur) => (!cur.tamil || cur.tamil === cur._autoTamil ? { ...cur, tamil: ta, _autoTamil: ta } : cur)));
      setC((cur) => (!cur.blurb || cur.blurb === cur._autoBlurb ? { ...cur, blurb: defaultCategoryBlurb(cur.name), _autoBlurb: defaultCategoryBlurb(cur.name) } : cur));
    }, 400);
    return () => clearTimeout(t);
  }, [c.name, dict]);
  const save = async () => {
    const e = categoryNameError(c.name);
    if (e) { toast(e, 'warning'); return; }
    setBusy(true);
    try {
      const cat = { name: c.name.trim(), tamil: c.tamil.trim(), blurb: c.blurb.trim() || defaultCategoryBlurb(c.name) };
      await addCategory(settings, cat);
      toast(`Category “${cat.name}” added`);
      setC({ name: '', tamil: '', blurb: '', _autoTamil: '', _autoBlurb: '' });
      onAdded?.(cat);
    } catch (e2) { toast(e2.message || 'Could not add', 'error'); } finally { setBusy(false); }
  };
  return (
    <div className={compact ? 'space-y-3' : 'space-y-3 rounded-xl ring-1 ring-zinc-200 bg-white p-4'}>
      {!compact && <h3 className="text-sm font-semibold text-zinc-900">Add a category</h3>}
      <Field label="Category name" hint={err || undefined}><input className={inputClass} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="e.g. Kids Special" autoFocus={compact} /></Field>
      <Field label="Tamil name"><input className={inputClass} lang="ta" value={c.tamil} onChange={(e) => setC({ ...c, tamil: e.target.value })} placeholder="Fills in from the name" /></Field>
      <Field label="Short description" hint="Shown on the category page and in Google."><textarea className={`${inputClass} h-auto min-h-[64px] py-2`} value={c.blurb} onChange={(e) => setC({ ...c, blurb: e.target.value })} /></Field>
      <div className="flex justify-end"><Button icon={FiPlus} disabled={busy || Boolean(err) || !c.name.trim()} onClick={save}>{busy ? 'Adding…' : 'Add category'}</Button></div>
    </div>
  );
}

/** Products → Categories: every category with its product count; added ones can be edited or removed. */
export default function CategoryManager({ open, onClose }) {
  const { settings, products } = useAdminData();
  const toast = useToast();
  const counts = useMemo(() => {
    const m = {};
    mergeForAdmin(products).forEach((p) => { m[p.category] = (m[p.category] || 0) + 1; });
    return m;
  }, [products]);
  const custom = Array.isArray(settings?.customCategories) ? settings.customCategories : [];
  const update = async (name, patch) => {
    try { await saveCustomCategories(custom.map((c) => (c.name === name ? { ...c, ...patch } : c))); toast('Category saved'); } catch (e) { toast(e.message || 'Could not save', 'error'); }
  };
  const remove = async (name) => {
    if (counts[name]) { toast(`Move its ${counts[name]} products to another category first`, 'warning'); return; }
    if (!window.confirm(`Remove the category “${name}”?`)) return;
    try { await saveCustomCategories(custom.filter((c) => c.name !== name)); toast('Category removed'); } catch (e) { toast(e.message || 'Could not remove', 'error'); }
  };
  return (
    <Drawer open={open} onClose={onClose} title="Categories" wide>
      <div className="space-y-5">
        <NewCategoryForm />
        <div className="rounded-xl ring-1 ring-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-zinc-500 bg-zinc-50/60"><tr><th className="px-4 py-2 font-medium">Category</th><th className="px-3 py-2 font-medium text-right">Products</th><th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2" /></tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {SHOP_CATEGORIES.map((name) => {
                const mine = isCustomCategory(name);
                const c = custom.find((x) => x.name === name);
                return (
                  <tr key={name} className="align-top">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-zinc-900">{name}</div>
                      {mine ? (
                        <div className="mt-1.5 space-y-1.5">
                          <input className={`${inputClass} !h-8`} lang="ta" defaultValue={c?.tamil || ''} placeholder="Tamil name" onBlur={(e) => e.target.value !== (c?.tamil || '') && update(name, { tamil: e.target.value })} aria-label={`Tamil name of ${name}`} />
                          <input className={`${inputClass} !h-8`} defaultValue={c?.blurb || ''} placeholder="Short description" onBlur={(e) => e.target.value !== (c?.blurb || '') && update(name, { blurb: e.target.value })} aria-label={`Description of ${name}`} />
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500" lang="ta">{categoryTamil[name]}<span className="block truncate max-w-[420px]" lang="en" title={categoryBlurb(name)}>{categoryBlurb(name)}</span></div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{counts[name] || 0}</td>
                    <td className="px-3 py-2.5"><span className={`text-[11px] rounded px-1.5 ${mine ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-500 bg-zinc-100'}`}>{mine ? 'Added' : 'Built-in'}</span></td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <a href={categoryPath(name)} target="_blank" rel="noopener noreferrer" className="inline-flex text-zinc-400 hover:text-zinc-700 p-1" aria-label={`Open ${name} page`}><FiExternalLink size={14} /></a>
                      {mine && <button type="button" onClick={() => remove(name)} className="inline-flex text-zinc-400 hover:text-red-600 p-1" aria-label={`Remove ${name}`}><FiTrash2 size={14} /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Drawer>
  );
}
