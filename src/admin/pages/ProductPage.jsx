import TemplateEditor from '../TemplateEditor';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiExternalLink, FiRotateCcw, FiTrash2, FiCopy, FiShoppingBag } from 'react-icons/fi';
import { useAdminData } from '../AdminData';
import { useToast } from '../Toast';
import { rawProducts, normalizeProduct, getOfferPrice } from '../../data/products';
import { upsertProduct, deleteProductDoc, saveProductImage } from '../../firebase/catalog';
import { mergeForAdmin, productSales, SOURCE_LABEL } from '../catalogAdmin';
import ProductFields, { emptyProduct } from '../ProductFields';
import { Thumb } from '../ProductPicker';
import { orderDate } from '../analytics';
import { productPath, productMeta } from '../../seo/catalog';
import { fullTitle } from '../../seo/pages';
import { SeoFields, GooglePreview } from '../SeoEditor';
import { Badge, Button, Card, Menu, inr, fmtDateTime } from '../ui';

const EDITABLE = ['code', 'name', 'tamil', 'category', 'brand', 'per', 'unit', 'mrp', 'offerPrice', 'image', 'active', 'sortOrder', 'description', 'seoTitle', 'seoDescription'];
/** Form state from a product, with every editable field set to its real current value. */
const toForm = (p) => ({
  ...Object.fromEntries(EDITABLE.map((k) => [k, p[k] ?? ''])),
  mrp: p.mrp ?? '', offerPrice: p.offerPrice ?? '',
  active: p.active !== false,
  sortOrder: p.sortOrder ?? p.sno ?? 9999,
});
/** Compare editable fields as text so "140" and 140 count as unchanged. */
const clean = (f) => EDITABLE.map((k) => (k === 'active' ? String(f[k] !== false) : String(f[k] ?? ''))).join('\u0001') + (f._imageData ? '\u0001new-photo' : '');

function nextCode(all) {
  const used = new Set(all.map((p) => p.code));
  let n = rawProducts.length + 1;
  while (used.has(`ZD-${String(n).padStart(3, '0')}`)) n++;
  return `ZD-${String(n).padStart(3, '0')}`;
}

export default function ProductPage() {
  const { code } = useParams();
  const { products, productsLoading } = useAdminData();
  const all = useMemo(() => mergeForAdmin(products), [products]);
  const isNew = code === undefined || code === 'new';
  const product = isNew ? null : all.find((p) => p.code === decodeURIComponent(code));
  // Wait for the live catalog so a new product gets a free code and existing ones their saved values.
  if (productsLoading) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (!isNew && !product) return <div className="text-sm text-zinc-500">Product not found. <Link to="/admin/products" className="text-primary font-medium hover:underline">Back to products</Link></div>;
  return <ProductEditor key={product?.code || 'new'} product={product} all={all} />;
}

function ProductEditor({ product, all }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { orders } = useAdminData();
  const isNew = !product;
  const initial = useMemo(() => (product ? toForm(product) : emptyProduct(nextCode(all))), [product, all]);
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = clean(f) !== clean(initial);

  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const save = async () => {
    if (!String(f.name || '').trim()) { toast('Name is required', 'warning'); return; }
    const codeVal = String(f.code || '').trim();
    if (!codeVal) { toast('Code is required', 'warning'); return; }
    if (isNew && all.some((p) => p.code === codeVal)) { toast(`Code ${codeVal} already exists`, 'warning'); return; }
    setBusy(true);
    try {
      const image = f._imageData ? await saveProductImage(codeVal, f._imageData) : f.image;
      await upsertProduct(codeVal, { ...Object.fromEntries(EDITABLE.map((k) => [k, f[k]])), image, code: codeVal, name: f.name.trim(), mrp: f.mrp === '' ? null : Number(f.mrp), offerPrice: f.offerPrice === '' ? null : Number(f.offerPrice), active: f.active !== false, sortOrder: f.sortOrder === '' || f.sortOrder == null ? 9999 : Number(f.sortOrder) });
      toast(isNew ? `${f.name} added` : 'Product saved');
      if (f._imageData) setF((cur) => ({ ...cur, _imageData: undefined, image }));
      if (isNew) navigate(`/admin/products/${encodeURIComponent(codeVal)}`, { replace: true });
    } catch (e) { toast(e.message || 'Save failed', 'error'); } finally { setBusy(false); }
  };

  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty && !busy) save(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const remove = async () => {
    const reset = product._source === 'synced';
    if (!window.confirm(reset ? 'Undo all edits and go back to the built-in sample values?' : `Delete ${product.name}? It disappears from the website.`)) return;
    setBusy(true);
    try { await deleteProductDoc(product.code); toast(reset ? 'Back to built-in values' : 'Product deleted'); if (!reset) navigate('/admin/products'); }
    catch (e) { toast(e.message || 'Failed', 'error'); } finally { setBusy(false); }
  };

  const preview = normalizeProduct({ ...f, mrp: f.mrp === '' ? null : Number(f.mrp), offerPrice: f.offerPrice === '' ? null : Number(f.offerPrice) });
  const price = getOfferPrice(preview);
  const autoMeta = productMeta({ ...preview, seoTitle: '', seoDescription: '' });
  const pct = preview.mrp && price != null && price < preview.mrp ? Math.round((1 - price / preview.mrp) * 100) : 0;

  const salesAll = useMemo(() => (product ? productSales(orders).get(product.code) : null), [orders, product]);
  const sales30 = useMemo(() => (product ? productSales(orders, { sinceDays: 30 }).get(product.code) : null), [orders, product]);
  const recent = useMemo(() => (product ? orders.filter((o) => !o.test && (o.items || []).some((it) => it.code === product.code)).sort((a, b) => orderDate(b) - orderDate(a)).slice(0, 6) : []), [orders, product]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky top-14 lg:top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-zinc-50/95 backdrop-blur border-b border-zinc-200">
        <Link to="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"><FiArrowLeft size={14} /> Products</Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Thumb src={preview.image} alt="" size="w-10 h-10" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-zinc-900 truncate">{isNew ? (f.name || 'New product') : f.name || product.name}</h1>
                {!isNew && <Badge value={f.active === false ? 'cancelled' : 'delivered'} label={f.active === false ? 'Hidden' : 'On website'} />}
                {!isNew && product._source !== 'static' && <span className="text-[11px] text-zinc-500 bg-zinc-100 rounded px-1.5">{SOURCE_LABEL[product._source]}</span>}
              </div>
              <div className="text-xs text-zinc-500">{f.code} · {f.category}{dirty ? ' · unsaved changes' : ''}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && f.active !== false && <a href={productPath(product)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium bg-white hover:bg-zinc-50 text-zinc-800 ring-1 ring-inset ring-zinc-300 shadow-sm"><FiExternalLink size={15} /> View</a>}
            {dirty && !isNew && <Button variant="ghost" icon={FiRotateCcw} disabled={busy} onClick={() => setF(initial)}>Discard</Button>}
            <Button icon={FiSave} disabled={busy || (!dirty && !isNew)} onClick={save} title="Save (Ctrl+S)">{busy ? 'Saving…' : isNew ? 'Add product' : 'Save'}</Button>
            {!isNew && <Menu items={[
              { label: 'Duplicate as new product', icon: FiCopy, onClick: () => { navigate('/admin/products/new'); setTimeout(() => window.dispatchEvent(new CustomEvent('digitz-duplicate-product', { detail: f })), 0); } },
              product._source === 'synced' && { label: 'Undo edits (back to built-in)', icon: FiRotateCcw, onClick: remove },
              product._source === 'firebase' && { label: 'Delete product', icon: FiTrash2, danger: true, onClick: remove },
            ]} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <Card title="Details">
            <DuplicateListener onDuplicate={(src) => isNew && setF({ ...src, code: nextCode(all), name: `${src.name} (copy)`, active: true })} />
            <ProductFields f={f} setF={setF} codeEditable={isNew} previewImage={preview.image} />
          </Card>
          <Card title="Search appearance" className="mt-6" action={<Link to="/admin/seo?tab=pages&kind=product" className="text-sm font-medium text-primary hover:underline">SEO</Link>}>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <SeoFields value={{ title: f.seoTitle || '', description: f.seoDescription || '' }} onChange={(v) => setF((cur) => ({ ...cur, seoTitle: v.title, seoDescription: v.description }))} auto={autoMeta} />
              <div><div className="text-xs font-medium text-zinc-500 mb-1.5">In Google</div><GooglePreview path={productPath({ code: f.code || 'new', name: f.name })} title={fullTitle(String(f.seoTitle || '').trim() || autoMeta.title)} description={String(f.seoDescription || '').trim() || autoMeta.description} /></div>
            </div>
          </Card>
          {!isNew && <div id="personalise" className="mt-6 scroll-mt-6"><TemplateEditor code={product.code} /></div>}
        </div>

        <div className="space-y-6 lg:sticky lg:top-28">
          <Card title="Preview">
            <div className="rounded-xl ring-1 ring-zinc-200 overflow-hidden">
              <div className="relative h-44 bg-zinc-100">
                <img src={preview.image || '/zaro-logo.png'} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/zaro-logo.png'; }} />
                <span className="absolute top-2 left-2 bg-primary text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">{f.category}</span>
                {pct > 0 && <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">{pct}% off</span>}
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold text-zinc-900 leading-snug">{f.name || 'Product name'}</div>
                {f.tamil && <div className="text-xs text-zinc-500" lang="ta">{f.tamil}</div>}
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-lg font-bold text-zinc-900 tabular-nums">{price == null ? '—' : inr(price)}</span>
                  {pct > 0 && <span className="text-xs text-zinc-400 line-through tabular-nums">{inr(preview.mrp)}</span>}
                  <span className="text-xs text-zinc-500">/ {f.per || f.unit}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">How it appears in the design grid and product page.</p>
          </Card>

          {!isNew && (
            <Card title="Sales">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-zinc-500 text-xs">Last 30 days</div><div className="font-semibold tabular-nums">{sales30?.qty || 0} sold</div><div className="text-xs text-zinc-500 tabular-nums">{inr(sales30?.revenue || 0)}</div></div>
                <div><div className="text-zinc-500 text-xs">All time</div><div className="font-semibold tabular-nums">{salesAll?.qty || 0} sold</div><div className="text-xs text-zinc-500 tabular-nums">{salesAll?.orders || 0} orders · {inr(salesAll?.revenue || 0)}</div></div>
              </div>
              {recent.length > 0 ? (
                <ul className="mt-4 -mx-5 -mb-5 border-t border-zinc-100 divide-y divide-zinc-100">
                  {recent.map((o) => {
                    const line = (o.items || []).find((it) => it.code === product.code);
                    return (
                      <li key={o.id}><Link to={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50 text-sm">
                        <span className="flex-1 min-w-0"><span className="block font-medium text-zinc-900 truncate">{o.customer?.name}</span><span className="block text-xs text-zinc-500">{o.orderNumber} · {fmtDateTime(o.createdAt)}</span></span>
                        <span className="text-xs text-zinc-500 tabular-nums">×{line?.quantity}</span>
                      </Link></li>
                    );
                  })}
                </ul>
              ) : <p className="mt-3 text-xs text-zinc-500 flex items-center gap-1.5"><FiShoppingBag size={13} /> No orders yet.</p>}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function DuplicateListener({ onDuplicate }) {
  useEffect(() => {
    const h = (e) => onDuplicate(e.detail);
    window.addEventListener('digitz-duplicate-product', h);
    return () => window.removeEventListener('digitz-duplicate-product', h);
  }, [onDuplicate]);
  return null;
}
