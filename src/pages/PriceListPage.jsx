import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSearch, FiX } from 'react-icons/fi';
import { LuSearchX } from 'react-icons/lu';
import { categories, getCatalogProducts, getOfferPrice } from '../data/products';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import Breadcrumbs from '../components/Breadcrumbs';
import QuickEnquiry from '../components/QuickEnquiry';
import NotFoundPage from './NotFoundPage';
import { staticPage, staticDescription } from '../seo/pages';
import { absoluteUrl, breadcrumbSchema, safeUrl } from '../seo/site';
import { CATEGORY_BY_SLUG, categoryMeta, categoryPath, productPath } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';

const SCHEMA_PRODUCT_LIMIT = 100; // keep the JSON-LD payload reasonable
const PAGE_SIZE = 24;

const SORTS = [
  ['featured', 'Featured'],
  ['newest', 'Newest first'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['name-asc', 'Name: A to Z'],
];

/** Card designs: all of them at /cards, one category at /cards/<slug>. */
export default function PriceListPage() {
  const [catalogProducts, setCatalogProducts] = useState(() => getCatalogProducts());
  const { slug } = useParams();
  const navigate = useNavigate();
  // Re-render when shop settings arrive: they can add categories (Admin → Products → Categories).
  const { live } = useShopSettings();
  const routeCategory = slug ? CATEGORY_BY_SLUG[slug] || null : null;
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const syncProducts = () => setCatalogProducts(getCatalogProducts());
    syncProducts();
    window.addEventListener('digitz-catalog-updated', syncProducts);
    return () => window.removeEventListener('digitz-catalog-updated', syncProducts);
  }, []);

  const categoryItems = useMemo(
    () => (routeCategory ? catalogProducts.filter((p) => p.category === routeCategory) : catalogProducts),
    [catalogProducts, routeCategory]
  );
  const highestPrice = useMemo(() => Math.max(0, ...categoryItems.map((p) => getOfferPrice(p) || 0)), [categoryItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cap = Number(maxPrice) || Infinity;
    let list = categoryItems.filter((p) => {
      const price = getOfferPrice(p);
      const matchSearch = !q || [p.name, p.code, p.category, p.tamil || ''].some((v) => String(v).toLowerCase().includes(q));
      return matchSearch && (price == null || price <= cap);
    });
    const priceOf = (p) => getOfferPrice(p) ?? Infinity;
    if (sortBy === 'price-asc') list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
    else if (sortBy === 'price-desc') list = [...list].sort((a, b) => priceOf(b) - priceOf(a));
    else if (sortBy === 'name-asc') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'newest') list = [...list].sort((a, b) => (b.sortOrder ?? b.id ?? 0) - (a.sortOrder ?? a.id ?? 0));
    return list;
  }, [categoryItems, search, sortBy, maxPrice]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const update = (fn) => { fn(); setPage(1); };
  const goTo = (n) => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const meta = routeCategory ? categoryMeta(routeCategory, categoryItems) : null;
  const pagePath = routeCategory ? categoryPath(routeCategory) : '/cards';
  const allPage = staticPage('/cards');
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'All Designs', path: '/cards' },
    ...(routeCategory ? [{ name: routeCategory, path: pagePath }] : []),
  ];

  const listSchema = useMemo(() => {
    const items = categoryItems.filter((product) => product.price != null).slice(0, SCHEMA_PRODUCT_LIMIT);
    return [
      breadcrumbSchema(crumbs),
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: routeCategory ? `${routeCategory} - Zaro Digitz` : 'Zaro Digitz Card Designs',
        url: absoluteUrl(pagePath),
        numberOfItems: categoryItems.length,
        itemListElement: items.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Product',
            name: product.name,
            sku: product.code,
            category: product.category,
            brand: { '@type': 'Brand', name: product.brand },
            ...(product.image ? { image: absoluteUrl(safeUrl(product.image)) } : {}),
            offers: {
              '@type': 'Offer',
              price: product.price,
              priceCurrency: 'INR',
              availability: 'https://schema.org/InStock',
              url: absoluteUrl(productPath(product)),
            },
          },
        })),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryItems, routeCategory, pagePath]);

  // Only categories that have designs, this season's calendars and diaries first.
  const withDesigns = new Set(catalogProducts.map((p) => p.category));
  const shownCategories = ['All', ...categories.filter((c) => c !== 'All' && (withDesigns.has(c) || c === routeCategory)).sort((a, b) => Number(/diar|calendar/i.test(b)) - Number(/diar|calendar/i.test(a)))];

  if (slug && !routeCategory) return live ? <NotFoundPage /> : <div className="min-h-[60vh]" aria-busy="true" />; // a new category may still be loading

  return (
    <div>
      <Seo
        title={meta ? meta.title : allPage.title}
        description={meta ? meta.description : staticDescription(allPage, catalogProducts.length)}
        path={pagePath}
        jsonLd={listSchema}
      />

      {/* Header */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 xl:px-12 pt-6 pb-10">
        <Breadcrumbs items={crumbs} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid lg:grid-cols-12 gap-6 items-end mt-8">
          <h1 className="lg:col-span-7 font-display font-bold tracking-[-0.04em] leading-[0.98] text-primary text-[clamp(40px,5.2vw,80px)]">{meta ? meta.h1 : 'Everything we print'}</h1>
          <div className="lg:col-span-5">
            {meta?.tamil && <p className="text-xl" lang="ta">{meta.tamil}</p>}
            <p className="text-xl leading-relaxed mt-2">{meta ? meta.intro : 'Calendars, diaries, business printing and invitations. Every design shows its price per piece, with printing included.'}</p>
          </div>
        </motion.div>
      </section>

      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 xl:px-12 pb-24 lg:pb-32">
        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {shownCategories.map((c) => {
            const active = (c === 'All' && !routeCategory) || c === routeCategory;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => navigate(c === 'All' ? '/cards' : categoryPath(c))}
                className={`h-11 px-4 text-[15px] font-medium transition-colors ${active ? 'bg-ink text-paper' : 'bg-paper2 hover:bg-paper3'}`}
              >
                {c === 'All' ? 'All designs' : c}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mt-6 mb-6">
          <div className="relative md:w-80">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => update(() => setSearch(e.target.value))}
              placeholder="Search designs or codes"
              aria-label="Search designs"
              className="w-full h-12 pl-11 pr-10 bg-paper2 text-[17px] placeholder:text-ink/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {search && <button type="button" aria-label="Clear search" onClick={() => update(() => setSearch(''))} className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-primary"><FiX /></button>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[17px]">
              Up to ₹
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={maxPrice}
                onChange={(e) => update(() => setMaxPrice(e.target.value))}
                placeholder={highestPrice ? String(highestPrice) : 'any'}
                aria-label="Highest price per piece"
                className="w-24 h-12 px-3 bg-paper2"
              />
              per piece
            </label>
            <select value={sortBy} onChange={(e) => update(() => setSortBy(e.target.value))} aria-label="Sort designs" className="h-12 px-3 bg-paper2 text-[17px]">
              {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
        </div>

        {/* Results and active filters */}
        <div className="flex flex-wrap items-center gap-2 mb-5 text-[15px]" aria-live="polite">
          <span className="font-semibold mr-2">{filtered.length} {filtered.length === 1 ? 'design' : 'designs'}</span>
          {routeCategory && <button type="button" onClick={() => navigate('/cards')} className="inline-flex items-center gap-2 h-9 px-3 bg-paper2 hover:bg-paper3">{routeCategory} <span aria-hidden="true">×</span><span className="sr-only">Remove filter</span></button>}
          {search.trim() && <button type="button" onClick={() => update(() => setSearch(''))} className="inline-flex items-center gap-2 h-9 px-3 bg-paper2 hover:bg-paper3">“{search.trim()}” <span aria-hidden="true">×</span><span className="sr-only">Remove search</span></button>}
          {maxPrice && <button type="button" onClick={() => update(() => setMaxPrice(''))} className="inline-flex items-center gap-2 h-9 px-3 bg-paper2 hover:bg-paper3">Up to ₹{maxPrice} <span aria-hidden="true">×</span><span className="sr-only">Remove price limit</span></button>}
          {(routeCategory || search.trim() || maxPrice) && <button type="button" onClick={() => { setSearch(''); setMaxPrice(''); setPage(1); if (routeCategory) navigate('/cards'); }} className="h-9 px-3 font-semibold text-brand underline underline-offset-4">Clear all</button>}
        </div>

        {/* Grid */}
        {shown.length ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-8 sm:gap-x-5">
            {shown.map((product, i) => (
              <motion.div key={product.id ?? product.code} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-20">
            <LuSearchX size={40} className="mb-3 text-primary" aria-hidden="true" />
            <p className="text-xl">No designs match. Try another search or price, or ask us on WhatsApp: we print to order.</p>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <nav className="flex flex-wrap justify-center gap-2 mt-10" aria-label="Pages">
            <button type="button" disabled={current === 1} onClick={() => goTo(current - 1)} className="h-12 px-4 bg-paper2 hover:bg-paper3 disabled:opacity-40">Previous</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" aria-current={n === current ? 'page' : undefined} onClick={() => goTo(n)} className={`w-12 h-12 ${n === current ? 'bg-ink text-paper' : 'bg-paper2 hover:bg-paper3'}`}>{n}</button>
            ))}
            <button type="button" disabled={current === pages} onClick={() => goTo(current + 1)} className="h-12 px-4 bg-paper2 hover:bg-paper3 disabled:opacity-40">Next</button>
          </nav>
        )}
      </section>

      <QuickEnquiry subject={routeCategory || 'invitation cards'} title="Need something not listed here?" />
    </div>
  );
}
