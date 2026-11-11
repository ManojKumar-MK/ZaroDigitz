import { useEffect, useMemo, useState } from 'react';
import { LuWandSparkles } from 'react-icons/lu';
import PersonaliseDialog from '../personalise/PersonaliseDialog';
import { loadTemplate } from '../personalise/templates';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiShoppingCart, FiMinus, FiPlus, FiX, FiChevronDown } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
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
import { clampQty, priceForQty, qtyRules, optionGroups } from '../utils/pricing';

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function InfoSection({ title, children, open: startOpen = false }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div className="bg-paper2 mb-1.5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center justify-between min-h-[60px] px-5 text-left font-display font-semibold text-lg hover:bg-paper3 transition-colors">
        {title}
        <FiChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 text-[17px] leading-relaxed space-y-2">{children}</div>
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
  const [picks, setPicks] = useState({}); // option group name -> chosen index
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
  // Configure & price: one choice per option group; each choice can add to the price per piece.
  const groups = optionGroups(product);
  const chosen = groups.map((g) => g.choices[Math.min(picks[g.name] ?? 0, g.choices.length - 1)]);
  const optionsAdd = chosen.reduce((sum, c) => sum + (Number(c.add) || 0), 0);
  const optionsPicked = Object.fromEntries(groups.map((g, i) => [g.name, chosen[i].label]));
  const unitPrice = offer == null ? null : priceForQty({ ...product, price: offer, optionsAdd }, quantity);
  const unit = String(product.per || 'card').replace(/^1\s+/, '');
  const images = [...new Set([product.image, ...(product.images || [])].filter(Boolean))];
  if (!images.length) images.push(PLACEHOLDER_IMAGE);
  const image = images[Math.min(active, images.length - 1)];
  const specs = [
    ['Material', product.material],
    ['Size', product.size],
    ['Orientation', product.orientation],
    ['Style', product.style],
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
    const key = groups.length ? `::${Object.values(optionsPicked).join('|')}` : '';
    addItem({ ...product, id: `${product.id}${key}`, price: offer, basePrice: offer, optionsAdd, options: groups.length ? optionsPicked : undefined, quantity });
    flyToCart(document.querySelector('[data-product-image]') || e?.currentTarget);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const whatsappHref = shopWhatsAppLink(`Hi Zaro Digitz! I like the design ${product.name} (${product.code}). I need about ${quantity} ${unit}s. Can you share details?\n${absoluteUrl(productPath(product))}`, settings.whatsappNumber);

  const stepper = (
    <div className="inline-flex items-center bg-paper2">
      <button type="button" aria-label="Fewer" disabled={quantity <= min} onClick={() => setQty(clampQty(product, quantity - step))} className="w-12 h-12 flex items-center justify-center hover:text-primary disabled:opacity-30"><FiMinus /></button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        step={step}
        value={quantity}
        aria-label="Quantity"
        onChange={(e) => setQty(Number(e.target.value) || min)}
        onBlur={() => setQty(clampQty(product, quantity))}
        className="w-20 h-12 text-center text-lg font-bold bg-transparent focus:outline-none"
      />
      <button type="button" aria-label="More" onClick={() => setQty(clampQty(product, quantity + step))} className="w-12 h-12 flex items-center justify-center hover:text-primary"><FiPlus /></button>
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

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 xl:px-12 pt-6 pb-24 lg:pb-32">
        <Breadcrumbs items={crumbs} />

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 mt-6">
          {/* Gallery: the piece, large, held in place while the details scroll */}
          <div className="lg:col-span-7">
            <div className="lg:sticky lg:top-28">
              <button type="button" onClick={() => setZoom(true)} aria-label="Open larger image" className="block w-full aspect-square bg-paper2 overflow-hidden cursor-zoom-in">
                <motion.img
                  key={image}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  data-product-image
                  src={safeUrl(image)}
                  alt={`${product.name} - ${product.category} by Zaro Digitz`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                />
              </button>
              {images.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-none">
                  {images.map((src, i) => (
                    <button key={src} type="button" onClick={() => setActive(i)} aria-label={`Image ${i + 1} of ${images.length}`} aria-pressed={i === active} className={`shrink-0 w-24 h-24 overflow-hidden transition-opacity ${i === active ? 'ring-4 ring-primary ring-inset' : 'opacity-80 hover:opacity-100'}`}>
                      <img src={safeUrl(src)} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-5">
            <h1 className="font-display font-bold tracking-[-0.03em] leading-[1.02] text-[clamp(34px,3.6vw,56px)]">{product.name}</h1>
            <p className="text-xl mt-3">{product.category}, printed with your name in our Sivakasi studio.</p>
            {product.tamil && <p className="mt-2 text-xl" lang="ta">{product.tamil}</p>}

            <div className="mt-8 flex items-baseline flex-wrap gap-x-3 tabular-nums">
              {offer == null ? (
                <span className="text-xl">Price on request: ask us on WhatsApp</span>
              ) : (
                <>
                  <span className="font-display font-bold text-[48px] leading-none text-primary">{money(unitPrice)}</span>
                  <span className="text-lg">per {unit}</span>
                  {discounted && unitPrice === offer && <span className="text-lg line-through text-ink/70">{money(product.mrp)}</span>}
                </>
              )}
            </div>
            {offer != null && <p className="text-[17px] mt-3">Printing of your name and wording is included. Courier is extra.</p>}

            {offer != null && groups.length > 0 && (
              <div className="mt-10 space-y-6">
                <h2 className="font-display font-bold text-[22px]">Choose paper and finish</h2>
                {groups.map((g) => (
                  <div key={g.name}>
                    <p className="text-[17px] font-semibold mb-2">{g.name}</p>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={g.name}>
                      {g.choices.map((c, ci) => {
                        const on = (picks[g.name] ?? 0) === ci;
                        return (
                          <button key={c.label} type="button" role="radio" aria-checked={on} onClick={() => setPicks({ ...picks, [g.name]: ci })} className={`min-h-[48px] px-4 py-2 text-[17px] font-medium text-left transition-colors ${on ? 'bg-ink text-paper' : 'bg-paper2 hover:bg-paper3'}`}>
                            {c.label}{Number(c.add) ? <span className={on ? 'text-paper/85' : 'text-primary'}> {Number(c.add) > 0 ? '+' : '−'}₹{Math.abs(Number(c.add))}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {offer != null && (
              <div className="mt-10">
                <p className="text-[17px] font-semibold mb-2">How many</p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  {stepper}
                  <p className="text-lg tabular-nums">Total <span className="font-bold text-[22px]">{money(unitPrice * quantity)}</span></p>
                </div>
                <p className="text-[15px] mt-2">For a few hundred pieces or more, we quote a better rate on WhatsApp.</p>
              </div>
            )}

            {template && offer != null && (
              <motion.button type="button" onClick={() => setPersonalising(true)} whileTap={{ scale: 0.98 }} className="mt-8 w-full flex items-center justify-between gap-4 p-6 bg-secondary text-[#211114] text-left transition-colors hover:bg-[rgb(var(--accent-light-rgb))]">
                <span>
                  <span className="block font-display font-bold text-xl">Put your names on this design</span>
                  <span className="block text-[17px] mt-1">Add names, date and photos and see the card now.</span>
                </span>
                <LuWandSparkles size={30} aria-hidden="true" className="shrink-0" />
              </motion.button>
            )}

            <div className="mt-4 grid sm:grid-cols-2 gap-2">
              <button type="button" onClick={handleAdd} disabled={offer == null} className="h-16 inline-flex items-center justify-center gap-2 bg-primary text-white text-[17px] font-bold transition-colors hover:bg-primary-dark active:scale-[0.99] disabled:opacity-50">
                <FiShoppingCart aria-hidden="true" /> {added ? 'Added to cart' : 'Add to cart'}
              </button>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="h-16 inline-flex items-center justify-center gap-2 bg-ink text-paper text-[17px] font-semibold transition-colors hover:bg-night">
                <FaWhatsapp size={20} aria-hidden="true" /> Ask about this design
              </a>
            </div>

            {specs.length > 0 && (
              <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 text-[17px]">
                {specs.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-ink/75">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-10">
              <InfoSection title="About this design" open>
                <p>{product.description || meta.longDescription}</p>
              </InfoSection>
              <InfoSection title="Printing">
                <p>{product.printingNote || 'Your name, details and wording are printed on every piece. Extra inserts, envelope printing or special finishes can be added; ask us for the price.'}</p>
              </InfoSection>
              <InfoSection title="Proof and approval">
                <p>After you order, we message you on WhatsApp for your details and send a digital proof. Changes to text, colours or layout are free. We print only after you approve.</p>
              </InfoSection>
              <InfoSection title="Delivery">
                <p>Most orders are printed within 5 to 7 working days after approval. We courier across India, or you can collect from our studio in Sivakasi.</p>
              </InfoSection>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24 lg:mt-40">
            <div className="flex items-end justify-between gap-6">
              <h2 className="font-display font-bold tracking-[-0.03em] leading-[1.02] text-[clamp(28px,3vw,44px)]">More {product.category.toLowerCase()}</h2>
              <Link to={categoryPath(product.category)} className="text-lg font-semibold text-primary underline underline-offset-4 shrink-0">See all</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-8 sm:gap-x-5 mt-10">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>

      <QuickEnquiry subject={product.name} title="Questions about this design?" />

      {/* Add-to-cart bar on phones */}
      {offer != null && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-paper2 px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] truncate">{product.name}</p>
            <p className="font-bold text-lg text-primary tabular-nums">{money(unitPrice)} <span className="text-[15px] text-ink font-normal">× {quantity}</span></p>
          </div>
          <button type="button" onClick={handleAdd} className="h-12 inline-flex items-center gap-2 bg-primary text-white font-bold px-5">
            <FiShoppingCart aria-hidden="true" /> {added ? 'Added' : 'Add'}
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
