import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { FiShoppingCart, FiArrowLeft } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import Seo from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductCard from '../components/ProductCard';
import NotFoundPage from './NotFoundPage';
import QuickEnquiry from '../components/QuickEnquiry';
import { useCart } from '../context/CartContext';
import { categoryTamil, getCatalogProducts, getOfferPrice, hasDiscount } from '../data/products';
import { categoryPath, findProductBySlug, productMeta, productPath, productSlug } from '../seo/catalog';
import { absoluteUrl, breadcrumbSchema, SITE_URL, safeUrl } from '../seo/site';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { flyToCart } from '../utils/flyToCart';

const FALLBACK = '/zaro-logo.png';
const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

export default function ProductPage() {
  const { code } = useParams();
  const [catalog, setCatalog] = useState(() => getCatalogProducts());
  const [imgSrc, setImgSrc] = useState(null);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const { settings } = useShopSettings();

  useEffect(() => {
    const sync = () => setCatalog(getCatalogProducts());
    window.addEventListener('digitz-catalog-updated', sync);
    return () => window.removeEventListener('digitz-catalog-updated', sync);
  }, []);

  const product = useMemo(
    () => findProductBySlug(catalog, code),
    [catalog, code]
  );

  const related = useMemo(
    () => (product ? catalog.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4) : []),
    [catalog, product]
  );

  if (!product) return <NotFoundPage />;
  // Old code-only links (/product/zc-003) and renamed products go to the current address.
  if (String(code).toLowerCase() !== productSlug(product)) return <Navigate to={productPath(product)} replace />;

  const offer = getOfferPrice(product);
  const discounted = hasDiscount(product);
  const meta = productMeta(product);
  const image = imgSrc || product.image || FALLBACK;
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Price List', path: '/cards' },
    { name: product.category, path: categoryPath(product.category) },
    { name: product.name, path: productPath(product) },
  ];

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.code,
    category: product.category,
    description: meta.longDescription,
    brand: { '@type': 'Brand', name: product.brand || 'Zaro' },
    image: absoluteUrl(safeUrl(product.image || FALLBACK)),
    url: absoluteUrl(productPath(product)),
    ...(offer != null
      ? {
          offers: {
            '@type': 'Offer',
            price: offer,
            priceCurrency: 'INR',
            priceValidUntil: `${new Date().getFullYear()}-12-31`,
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
            url: absoluteUrl(productPath(product)),
            seller: { '@id': `${SITE_URL}/#business` },
          },
        }
      : {}),
  };

  const handleAdd = (e) => {
    if (offer == null) return;
    addItem({ ...product, price: offer, quantity: 1 });
    flyToCart(document.querySelector('[data-product-image]') || e?.currentTarget);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const whatsappHref = shopWhatsAppLink(`Hi Zaro Digitz! I want to order ${product.name} (${product.code})${offer != null ? ` at ₹${offer}` : ''}. Please confirm availability.\n${absoluteUrl(productPath(product))}`, settings.whatsappNumber);

  return (
    <div className="bg-bg">
      <Seo
        title={meta.title}
        description={meta.description}
        path={productPath(product)}
        image={product.image || FALLBACK}
        type="product"
        jsonLd={[breadcrumbSchema(crumbs), productSchema]}
      />

      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Breadcrumbs items={crumbs} />
          <Link to={categoryPath(product.category)} className="hidden sm:inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <FiArrowLeft size={14} /> Back to {product.category}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-8">
          <div className="rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center p-4 min-h-[280px]">
            <img
              data-product-image
              src={safeUrl(image)}
              alt={`${product.name} - ${product.category} by Zaro Digitz`}
              className="max-h-[420px] w-full object-contain"
              onError={() => imgSrc !== FALLBACK && setImgSrc(FALLBACK)}
            />
          </div>

          <div>
            <Link to={categoryPath(product.category)} className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full hover:bg-primary/20 transition-colors">
              {product.category}
            </Link>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-dark mt-3 leading-tight">{product.name}</h1>
            {product.tamil && <p className="text-gray-500 mt-1 text-lg" lang="ta">{product.tamil}</p>}
            <p className="text-xs text-gray-400 font-mono mt-2">Code {product.code} · Brand {product.brand} · Sold per {product.per}</p>

            <div className="mt-6 flex items-end gap-3">
              {offer == null ? (
                <span className="text-lg text-gray-500">Rate on request</span>
              ) : (
                <>
                  <span className="text-4xl font-black text-emerald-600">{money(offer)}</span>
                  <span className="text-sm text-gray-400 mb-1">/ {product.unit}</span>
                  {discounted && (
                    <span className="text-sm text-red-500 line-through mb-1">MRP {money(product.mrp)}</span>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAdd}
                disabled={offer == null}
                className="inline-flex items-center gap-2 bg-primary hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-2xl transition-colors"
              >
                <FiShoppingCart /> {added ? 'Added to cart' : 'Add to cart'}
              </button>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-2xl transition-colors"
              >
                <FaWhatsapp /> Ask on WhatsApp
              </a>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-6">
              <h2 className="font-display font-bold text-lg text-dark mb-2">About this cracker</h2>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{meta.longDescription}</p>
              {categoryTamil[product.category] && (
                <p className="text-gray-500 text-sm mt-3">
                  Category in Tamil: <span lang="ta">{categoryTamil[product.category]}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <QuickEnquiry subject={product.name} />
        </div>

        {related.length > 0 && (
          <section className="mt-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-black text-2xl sm:text-3xl text-dark">
                More <span className="gradient-text">{product.category}</span>
              </h2>
              <Link to={categoryPath(product.category)} className="text-sm text-primary hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
