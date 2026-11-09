import { useEffect, useMemo, useState } from 'react';
import { LuWandSparkles } from 'react-icons/lu';
import PersonaliseDialog from '../personalise/PersonaliseDialog';
import { loadTemplate } from '../personalise/templates';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiShoppingCart, FiArrowLeft, FiMinus, FiPlus, FiX, FiChevronDown } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { LuFileCheck2, LuMessageCircle, LuPrinter } from 'react-icons/lu';
import Seo from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductCard from '../components/ProductCard';
import NotFoundPage from './NotFoundPage';
import QuickEnquiry from '../components/QuickEnquiry';
import { useCart } from '../context/CartContext';
import { getCatalogProducts, getOfferPrice, hasDiscount, PLACEHOLDER_IMAGE } from '../data/products';
import { categoryPath, findProductBySlug, productMeta, productPath, productSlug } from '../seo/catalog';
import { absoluteUrl, breadcrumbSchema, SITE_URL, safeUrl } from '../seo/site';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { flyToCart } from '../utils/flyToCart';
import { clampQty, priceForQty, qtyRules, tierRows } from '../utils/pricing';

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function InfoSection({ title, children, open: startOpen = false }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div className="bg-paper2 mb-1.5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center justify-between py-4 px-5 text-left font-display font-bold text-dark hover:bg-paper3 transition-colors">
        {title}
        <FiChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 text-base text-dark leading-relaxed space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductPage() {
  const { code } = useParams();
  const [catalog, setCatalog] = useState(() => getCatalogProducts());
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [qty, setQty] = useState(null);
  const [added, setAdded] = useState(false);
  const [template, setTemplate] = useState(null); // personalisation layout, when the design has one
  const [personalising, setPersonalising] = useState(false);
  const { addItem } = useCart();
  const { settings } = useShopSettings();

  useEffect(() => {
    const sync = () => setCatalog(getCatalogProducts());
    window.addEventListener('digitz-catalog-updated', sync);
    return () => window.removeEventListener('digitz-catalog-updated', sync);
  }, []);

  const product = useMemo(() => findProductBySlug(catalog, code), [catalog, code]);
  useEffect(() => {
    let gone = false;
    if (product?.code) loadTemplate(product.code).then((t) => { if (!gone) setTemplate(t); });
    return () => { gone = true; };
  }, [product?.code]);

  const related = useMemo(
    () => (product ? catalog.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4) : []),
    [catalog, product]
  );

  if (!product) return <NotFoundPage />;
  // Old code-only links and renamed products go to the current address.
  if (String(code).toLowerCase() !== productSlug(product)) return <Navigate to={productPath(product)} replace />;

  const offer = getOfferPrice(product);
  const discounted = hasDiscount(product);
  const meta = productMeta(product);
  const { min, step } = qtyRules(product);
  const quantity = qty ?? min;
  const unitPrice = offer == null ? null : priceForQty({ ...product, price: offer }, quantity);
  const tiers = tierRows({ ...product, price: offer });
  const unit = String(product.per || 'card').replace(/^1\s+/, '');
  const images = [...new Set([product.image, ...(product.images || [])].filter(Boolean))];
  if (!images.length) images.push(PLACEHOLDER_IMAGE);
  const image = images[Math.min(active, images.length - 1)];
  const specs = [
    ['Material', product.material],
    ['Size', product.size],
    ['Orientation', product.orientation],
    ['Style', product.style],
    ['Minimum order', `${min} ${min === 1 ? unit : `${unit}s`}`],
    ['Design code', product.code],
  ].filter(([, v]) => v && v !== '-');
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'All Designs', path: '/cards' },
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
    brand: { '@type': 'Brand', name: product.brand || 'Zaro Digitz' },
    image: images.map((src) => absoluteUrl(safeUrl(src))),
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
            eligibleQuantity: { '@type': 'QuantitativeValue', minValue: min },
            url: absoluteUrl(productPath(product)),
            seller: { '@id': `${SITE_URL}/#business` },
          },
        }
      : {}),
  };

  const addPersonalised = ({ token, summary, preview, quantity: qty }) => {
    addItem({ ...product, id: `${product.id}-${token || summary.map((x) => x.value).join('|')}`, price: offer, basePrice: offer, quantity: qty, image: preview || product.image, personalisation: { token, summary } });
    setPersonalising(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleAdd = (e) => {
    if (offer == null) return;
    addItem({ ...product, price: offer, basePrice: offer, quantity });
    flyToCart(document.querySelector('[data-product-image]') || e?.currentTarget);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const whatsappHref = shopWhatsAppLink(`Hi Zaro Digitz! I like the design ${product.name} (${product.code}). I need about ${quantity} ${unit}s. Can you share details?\n${absoluteUrl(productPath(product))}`, settings.whatsappNumber);

  const stepper = (
    <div className="inline-flex items-center bg-paper2">
      <button type="button" aria-label="Fewer" disabled={quantity <= min} onClick={() => setQty(clampQty(product, quantity - step))} className="w-11 h-11 flex items-center justify-center text-gray-600 disabled:opacity-30"><FiMinus /></button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        step={step}
        value={quantity}
        aria-label="Quantity"
        onChange={(e) => setQty(Number(e.target.value) || min)}
        onBlur={() => setQty(clampQty(product, quantity))}
        className="w-20 text-center font-bold text-dark bg-transparent focus:outline-none"
      />
      <button type="button" aria-label="More" onClick={() => setQty(clampQty(product, quantity + step))} className="w-11 h-11 flex items-center justify-center text-gray-600"><FiPlus /></button>
    </div>
  );

  return (
    <div className="bg-paper pb-24 lg:pb-0">
      <Seo
        title={meta.title}
        description={meta.description}
        path={productPath(product)}
        image={product.image || PLACEHOLDER_IMAGE}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 bg-paper p-5 sm:p-8">
          {/* Gallery */}
          <div>
            <button type="button" onClick={() => setZoom(true)} aria-label="Open larger image" className="w-full bg-orange-50/60   flex items-center justify-center p-4 min-h-[320px] cursor-zoom-in">
              <motion.img
                key={image}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                data-product-image
                src={safeUrl(image)}
                alt={`${product.name} - ${product.category} by Zaro Digitz`}
                className="max-h-[460px] w-full object-contain"
                onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
              />
            </button>
            {images.length > 1 && (
              <div className="flex gap-3 mt-3 overflow-x-auto scrollbar-none">
                {images.map((src, i) => (
                  <button key={src} type="button" onClick={() => setActive(i)} aria-label={`Image ${i + 1} of ${images.length}`} className={`shrink-0 w-20 h-20  border-2 overflow-hidden ${i === active ? '' : ''}`}>
                    <img src={safeUrl(src)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            <p className="text-center text-xs text-gray-400 mt-2">{Math.min(active, images.length - 1) + 1} / {images.length}</p>
          </div>

          {/* Details */}
          <div>
            <Link to={categoryPath(product.category)} className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full hover:bg-primary/20 transition-colors">
              {product.category}
            </Link>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-dark mt-3 leading-tight">{product.name}</h1>
            {product.tamil && <p className="text-gray-500 mt-1 text-lg" lang="ta">{product.tamil}</p>}

            <div className="mt-5 flex items-end gap-3">
              {offer == null ? (
                <span className="text-lg text-gray-500">Price on request</span>
              ) : (
                <>
                  <span className="text-4xl font-black text-primary">{money(unitPrice)}</span>
                  <span className="text-sm text-gray-400 mb-1">per {unit}</span>
                  {discounted && unitPrice === offer && <span className="text-sm text-gray-400 line-through mb-1">{money(product.mrp)}</span>}
                </>
              )}
            </div>
            {offer != null && <p className="text-xs text-gray-500 mt-1">Prices include printing of your names and wording. Courier extra.</p>}

            {tiers.length > 0 && (
              <div className="mt-5 bg-amber-50/60 p-4">
                <div className="text-sm font-bold text-dark mb-2">Bulk price per {unit}</div>
                <table className="w-full text-sm">
                  <tbody>
                    {tiers.map((t) => {
                      const on = unitPrice === t.price && quantity >= Number(t.range.split(/[–+]/)[0]);
                      return (
                        <tr key={t.range} className={on ? 'font-bold text-primary' : 'text-gray-700'}>
                          <td className="py-1">{t.range} {unit}s</td>
                          <td className="py-1 text-right">{money(t.price)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-xs text-gray-500 mt-2">The lower price applies automatically in your cart.</p>
              </div>
            )}

            {offer != null && (
              <div className="mt-6">
                <div className="text-sm text-gray-600 mb-2">Quantity <span className="text-gray-400">(min {min}{step > 1 ? `, in steps of ${step}` : ''})</span></div>
                <div className="flex flex-wrap items-center gap-4">
                  {stepper}
                  <div className="text-sm text-gray-600">Total <span className="font-bold text-dark text-lg">{money(unitPrice * quantity)}</span></div>
                </div>
              </div>
            )}

            {template && offer != null && (
              <motion.button
                type="button"
                onClick={() => setPersonalising(true)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="mt-6 w-full flex items-center justify-between gap-4 p-5 bg-secondary text-[#211114] text-left"
              >
                <span>
                  <span className="block font-display font-bold text-xl">Personalise this design</span>
                  <span className="block">Add your names, date and photos and see them on the card now.</span>
                </span>
                <LuWandSparkles size={30} aria-hidden="true" className="shrink-0" />
              </motion.button>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAdd}
                disabled={offer == null}
                className="inline-flex items-center gap-2 bg-primary hover:bg-orange-800 disabled:opacity-50 text-white font-bold px-6 py-3 transition-colors"
              >
                <FiShoppingCart /> {added ? 'Added to cart' : 'Add to cart'}
              </button>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 transition-colors">
                <FaWhatsapp /> Ask about this design
              </a>
            </div>

            {specs.length > 0 && (
              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {specs.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-gray-400">{k}</dt>
                    <dd className="font-medium text-dark">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-8">
              <InfoSection title="Description" open>
                <p>{product.description || meta.longDescription}</p>
              </InfoSection>
              <InfoSection title="Printing">
                <p>{product.printingNote || 'Your names, dates, venue and wording are printed on the card. Extra inserts, envelopes printing or special finishes can be added; ask us for the price.'}</p>
              </InfoSection>
              <InfoSection title="Design & approval">
                <p>After you order, we contact you on WhatsApp to collect the details and send a digital proof. You can ask for changes to the text, colours or layout. We print only after you approve.</p>
              </InfoSection>
              <InfoSection title="Delivery">
                <p>Most orders are printed within 5 to 7 working days after approval. We courier across India; charges are shown at checkout. You can also collect from our shop in Sivakasi.</p>
              </InfoSection>
            </div>
          </div>
        </div>

        {/* How it comes to life */}
        <section className="mt-10 grid sm:grid-cols-3 gap-4">
          {[
            { icon: LuMessageCircle, title: 'We reach out on WhatsApp', desc: 'for your names, dates and wording.' },
            { icon: LuFileCheck2, title: 'You approve the proof', desc: 'changes are free until it is right.' },
            { icon: LuPrinter, title: 'We print and dispatch', desc: 'packed carefully and couriered to you.' },
          ].map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex gap-3 items-start bg-paper2 p-4">
              <div className="w-10 h-10 shrink-0 bg-primary text-secondary flex items-center justify-center"><s.icon aria-hidden="true" /></div>
              <div><div className="font-bold text-dark text-sm">{s.title}</div><div className="text-xs text-gray-500">{s.desc}</div></div>
            </motion.div>
          ))}
        </section>


        {related.length > 0 && (
          <section className="mt-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-black text-2xl sm:text-3xl text-dark">
                More <span className="gradient-text">{product.category}</span>
              </h2>
              <Link to={categoryPath(product.category)} className="text-sm text-primary hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>

      <div className="mt-16">
        <QuickEnquiry subject={product.name} title="Questions about this design?" />
      </div>

      {/* Sticky add-to-cart bar on phones: it floats over the page, so it may cast a shadow. taste-skill-ignore */}
      {offer != null && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-paper px-4 py-3 flex items-center gap-3 " data-floating="taste-skill-ignore">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-gray-500 truncate">{product.name}</div>
            <div className="font-bold text-primary">{money(unitPrice)} <span className="text-xs text-gray-400 font-normal">× {quantity}</span></div>
          </div>
          <button type="button" onClick={handleAdd} className="inline-flex items-center gap-2 bg-primary text-white font-bold px-5 py-3 ">
            <FiShoppingCart /> {added ? 'Added' : 'Add'}
          </button>
        </div>
      )}

      <AnimatePresence>
        {personalising && template && <PersonaliseDialog product={product} template={template} quantity={quantity} onAdd={addPersonalised} onClose={() => setPersonalising(false)} />}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {zoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4" onClick={() => setZoom(false)} role="dialog" aria-label="Image preview">
            <button type="button" aria-label="Close" className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setZoom(false)}><FiX size={28} /></button>
            <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} src={safeUrl(image)} alt={product.name} className="max-h-[90vh] max-w-full object-contain " onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
