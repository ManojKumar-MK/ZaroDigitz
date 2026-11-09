import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiUpload, FiPlus, FiSearch, FiPackage, FiLayers } from 'react-icons/fi';
import CategoryManager from '../CategoryManager';
import { useAdminData } from '../AdminData';
import { useToast } from '../Toast';
import { rawProducts, categories, getOfferPrice, normalizeProduct } from '../../data/products';
import { upsertProduct, seedProductsFromStatic } from '../../firebase/catalog';
import { mergeForAdmin, productSales, SOURCE_LABEL } from '../catalogAdmin';
import { Thumb } from '../ProductPicker';
import { Button, Card, Empty, PageHeader, Tabs, Toggle, inputClass, inr } from '../ui';

const allCats = () => categories.filter((c) => c !== 'All'); // includes categories added in the admin

export default function Products() {
  const { products, productsLoading, orders } = useAdminData();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const cat = params.get('cat') || 'All';
  const view = params.get('view') || 'all';
  const [busy, setBusy] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const set = (k, v) => { const n = new URLSearchParams(params); if (!v || v === 'all' || v === 'All') n.delete(k); else n.set(k, v); setParams(n, { replace: true }); };

  const all = useMemo(() => mergeForAdmin(products).map((p) => ({ ...p, image: normalizeProduct(p).image })), [products]);
  const sales30 = useMemo(() => productSales(orders, { sinceDays: 30 }), [orders]);
  const base = useMemo(() => {
    let l = all;
    if (cat !== 'All') l = l.filter((p) => p.category === cat);
    if (q) { const s = q.toLowerCase(); l = l.filter((p) => [p.name, p.code, p.tamil, p.brand].some((v) => String(v || '').toLowerCase().includes(s))); }
    return l;
  }, [all, q, cat]);
  const counts = { all: base.length, visible: base.filter((p) => p.active !== false).length, hidden: base.filter((p) => p.active === false).length, edited: base.filter((p) => p._source !== 'static').length };
  const list = view === 'visible' ? base.filter((p) => p.active !== false) : view === 'hidden' ? base.filter((p) => p.active === false) : view === 'edited' ? base.filter((p) => p._source !== 'static') : base;

  const quick = async (p, patch, ok) => {
    try { await upsertProduct(p.code, { ...p, ...patch }); toast(ok || `${p.name} saved`); }
    catch (e) { toast(e.message || 'Could not save', 'error'); }
  };
  const importAll = async () => {
    setBusy(true);
    try { const r = await seedProductsFromStatic(); toast(`Imported ${r.written} products`); }
    catch (e) { toast(e.message || 'Import failed', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${all.length} products · ${all.filter((p) => p.active === false).length} hidden from the website`}
        actions={<>
          {products.length < rawProducts.length && <Button variant="secondary" icon={FiUpload} disabled={busy} onClick={() => { if (window.confirm('Copy the built-in price list into Firebase so every product can be edited? Existing changes are kept.')) importAll(); }}>Import price list</Button>}
          <Button variant="secondary" icon={FiLayers} onClick={() => setCatsOpen(true)}>Categories</Button>
          <Button icon={FiPlus} onClick={() => navigate('/admin/products/new')}>Add product</Button>
        </>}
      />

      {products.length === 0 && !productsLoading && (
        <div className="mb-4 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-amber-900 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3">
          <span>Prices still come from the built-in list. Import it once to edit products here.</span>
          <Button size="sm" icon={FiUpload} disabled={busy} onClick={importAll}>Import now</Button>
        </div>
      )}

      <Card bodyClassName="">
        <div className="px-4 pt-1">
          <Tabs value={view} onChange={(v) => set('view', v)} items={[{ value: 'all', label: 'All', count: counts.all }, { value: 'visible', label: 'On website', count: counts.visible }, { value: 'hidden', label: 'Hidden', count: counts.hidden }, { value: 'edited', label: 'Edited or added', count: counts.edited }]} />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-zinc-100">
          <div className="relative flex-1 min-w-[220px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
            <input className={`${inputClass} pl-9`} placeholder="Search name, code, Tamil or brand" value={q} onChange={(e) => set('q', e.target.value)} />
          </div>
          <select className={`${inputClass} sm:!w-64`} value={cat} onChange={(e) => set('cat', e.target.value)} aria-label="Category">
            <option value="All">All categories</option>
            {allCats().map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {list.length === 0 ? <Empty icon={FiPackage} title="No products match">Try another search or category.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="text-left text-xs font-medium text-zinc-500 bg-zinc-50/60">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Product</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium text-right">MRP</th>
                  <th className="px-4 py-2.5 font-medium text-right">Offer</th>
                  <th className="px-4 py-2.5 font-medium text-right">Sells at</th>
                  <th className="px-4 py-2.5 font-medium text-right">Sold · 30 days</th>
                  <th className="px-4 py-2.5 font-medium text-center">On website</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {list.map((p) => {
                  const price = getOfferPrice(p);
                  const s = sales30.get(p.code);
                  const stop = (e) => e.stopPropagation();
                  return (
                    <tr key={p.code} onClick={() => navigate(`/admin/products/${encodeURIComponent(p.code)}`)} className={`cursor-pointer hover:bg-zinc-50 ${p.active === false ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Thumb src={p.image} alt={p.name} size="w-10 h-10" />
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-900 truncate max-w-[280px]">{p.name}</div>
                            <div className="text-xs text-zinc-500">{p.code} · {p.per}{p._source !== 'static' && <span className="ml-1.5 text-[11px] text-emerald-700 bg-emerald-50 rounded px-1.5">{SOURCE_LABEL[p._source]}</span>}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-600 max-w-[180px] truncate">{p.category}</td>
                      <td className="px-4 py-2.5 text-right" onClick={stop}><input type="number" aria-label={`MRP of ${p.name}`} className="w-20 h-8 text-right rounded-md border border-zinc-200 bg-white px-2 text-sm" defaultValue={p.mrp ?? ''} key={`mrp-${p.code}-${p.mrp}`} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== (p.mrp ?? null)) quick(p, { mrp: v }, `${p.name}: MRP ${v == null ? 'cleared' : inr(v)}`); }} /></td>
                      <td className="px-4 py-2.5 text-right" onClick={stop}><input type="number" aria-label={`Offer price of ${p.name}`} className="w-20 h-8 text-right rounded-md border border-zinc-200 bg-white px-2 text-sm" defaultValue={p.offerPrice ?? ''} placeholder="auto" key={`off-${p.code}-${p.offerPrice}`} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== (p.offerPrice ?? null)) quick(p, { offerPrice: v }, `${p.name}: offer ${v == null ? 'auto' : inr(v)}`); }} /></td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-zinc-900">{price == null ? '—' : inr(price)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{s ? <span className="text-zinc-900">{s.qty}<span className="text-zinc-500 text-xs"> · {inr(s.revenue)}</span></span> : <span className="text-zinc-400">—</span>}</td>
                      <td className="px-4 py-2.5 text-center" onClick={stop}><Toggle tone="green" size="sm" checked={p.active !== false} onChange={(v) => quick(p, { active: v }, `${p.name} ${v ? 'is on the website' : 'hidden from the website'}`)} label={p.active === false ? 'Show on website' : 'Hide from website'} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <CategoryManager open={catsOpen} onClose={() => setCatsOpen(false)} />
    </div>
  );
}
