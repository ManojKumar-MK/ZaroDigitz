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
      <section className="hero-bg py-14">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Breadcrumbs items={crumbs} light />
            <h1 className="font-display font-black text-4xl sm:text-5xl text-white mt-4">
              <span className="gradient-text">{meta ? meta.h1 : 'All Card Designs'}</span>
            </h1>
            {meta?.tamil && <p className="text-secondary text-lg mt-1" lang="ta">{meta.tamil}</p>}
            <p className="text-orange-50/80 mt-4 max-w-2xl mx-auto leading-relaxed">
              {meta ? meta.intro : 'Wedding and function invitations, calendars, return gifts and printing. Every design shows its price per card; bigger orders cost less per card.'}
            </p>
            <p className="text-secondary/90 text-sm mt-3">{categoryItems.length} {categoryItems.length === 1 ? 'design' : 'designs'}</p>
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8">
        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 -mx-4 px-4">
          {categories.map((c) => {
            const active = (c === 'All' && !routeCategory) || c === routeCategory;
            return (
              <button
                key={c}
                type="button"
                onClick={() => navigate(c === 'All' ? '/cards' : categoryPath(c))}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium  transition-colors ${active ? 'bg-primary text-white ' : 'bg-paper2 text-gray-700   hover:text-primary'}`}
              >
                {c === 'All' ? 'All designs' : c}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mt-6 mb-6">
          <div className="relative md:w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => update(() => setSearch(e.target.value))}
              placeholder="Search designs or codes"
              aria-label="Search designs"
              className="w-full pl-9 pr-9 py-2.5 bg-paper2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {search && <button type="button" aria-label="Clear search" onClick={() => update(() => setSearch(''))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"><FiX /></button>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Up to ₹
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={maxPrice}
                onChange={(e) => update(() => setMaxPrice(e.target.value))}
                placeholder={highestPrice ? String(highestPrice) : 'any'}
                aria-label="Highest price per card"
                className="w-24 px-3 py-2 bg-paper2"
              />
              per card
            </label>
            <select value={sortBy} onChange={(e) => update(() => setSortBy(e.target.value))} aria-label="Sort designs" className="px-3 py-2 bg-paper2 text-sm">
              {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
        </div>

        {/* Grid */}
        {shown.length ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {shown.map((product, i) => (
              <motion.div key={product.id ?? product.code} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            <LuSearchX size={40} className="mx-auto mb-3 text-gray-300" aria-hidden="true" />
            <p>No designs match. Try another search or price.</p>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <nav className="flex flex-wrap justify-center gap-2 mt-10" aria-label="Pages">
            <button type="button" disabled={current === 1} onClick={() => goTo(current - 1)} className="px-3 py-2 bg-paper2 disabled:opacity-40">Previous</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" aria-current={n === current ? 'page' : undefined} onClick={() => goTo(n)} className={`w-10 py-2   ${n === current ? 'bg-primary text-white ' : 'bg-paper2  '}`}>{n}</button>
            ))}
            <button type="button" disabled={current === pages} onClick={() => goTo(current + 1)} className="px-3 py-2 bg-paper2 disabled:opacity-40">Next</button>
          </nav>
        )}
      </section>

      <QuickEnquiry subject={routeCategory || 'invitation cards'} title="Can't find the right design?" />
    </div>
  );
}
