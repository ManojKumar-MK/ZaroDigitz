import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LuShoppingCart, LuTruck, LuFileCheck2 } from 'react-icons/lu';
import { useCart } from '../context/CartContext';
import { getOfferPrice, PLACEHOLDER_IMAGE } from '../data/products';
import { qtyRules } from '../utils/pricing';
import { productPath } from '../seo/catalog';
import { safeUrl } from '../seo/site';
import { flyToCart } from '../utils/flyToCart';

// Categories to feature, in order (one priced design from each; real photos first).
const FEATURED = ['Foil & Metallic Cards', 'Hindu Wedding Cards', 'Premium Box Invitations', 'Muslim Wedding Cards', 'Christian Wedding Cards', 'Scroll Invitations'];
const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const pctOff = (p) => { const o = getOfferPrice(p); return p.mrp && o != null && o < p.mrp ? Math.round((1 - o / p.mrp) * 100) : 0; };

function pick(products) {
  const ok = (p) => p.active !== false && getOfferPrice(p) != null;
  const hasPhoto = (p) => (p.image && p.image !== PLACEHOLDER_IMAGE ? 1 : 0);
  const out = [];
  FEATURED.forEach((c) => {
    if (out.length >= 3) return;
    const p = products.filter((x) => x.category === c && ok(x)).sort((a, b) => hasPhoto(b) - hasPhoto(a) || getOfferPrice(b) - getOfferPrice(a))[0];
    if (p) out.push(p);
  });
  return out;
}

function MiniCard({ p, className, float }) {
  return (
    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5 + float, repeat: Infinity, ease: 'easeInOut', delay: float }} className={`absolute ${className}`}>
      <Link to={productPath(p)} className="flex items-center gap-3 bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/40 p-2.5 pr-4 w-60 hover:scale-[1.03] transition-transform">
        <img src={safeUrl(p.image)} alt="" width="56" height="56" loading="lazy" decoding="async" className="w-14 h-14 rounded-xl object-cover bg-gray-100" />
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-dark truncate">{p.name}</span>
          <span className="block text-sm font-black text-primary">{money(getOfferPrice(p))}<span className="text-[11px] font-medium text-gray-400"> /card</span>{pctOff(p) > 0 && <span className="ml-1.5 text-[11px] font-semibold text-emerald-600">{pctOff(p)}% off</span>}</span>
        </span>
      </Link>
    </motion.div>
  );
}

/** Right side of the home hero on wide screens: featured designs with their price per card. */
export default function HeroShowcase({ products }) {
  const { addItem } = useCart();
  const [main, a, b] = useMemo(() => pick(products), [products]);
  const maxOff = useMemo(() => Math.max(0, ...products.filter((p) => p.active !== false).map(pctOff)), [products]);
  if (!main) return null;
  const offer = getOfferPrice(main);
  const off = pctOff(main);

  return (
    <div className="relative h-[540px]" aria-label="Featured products">
      <div className="absolute inset-8 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />

      <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 w-[300px] bg-white rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
        <Link to={productPath(main)} className="block relative h-60 bg-orange-50">
          <img src={safeUrl(main.image)} alt={main.name} width="300" height="208" decoding="async" fetchpriority="low" className="w-full h-full object-cover" />
          <span className="absolute bottom-3 left-3 bg-dark/80 text-secondary text-[11px] font-semibold px-2.5 py-1 rounded-full">{main.category}</span>
          {off > 0 && <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">{off}% off</span>}
        </Link>
        <div className="p-4">
          <Link to={productPath(main)} className="block font-display font-bold text-dark leading-snug line-clamp-2 hover:text-primary">{main.name}</Link>
          <div className="flex items-end justify-between gap-3 mt-3">
            <div>
              <div className="text-2xl font-black text-dark leading-none">{money(offer)} <span className="text-xs font-medium text-gray-400">per card</span></div>
              <div className="text-xs text-gray-500 mt-1">Min {qtyRules(main).min}{main.mrp > offer ? <span className="line-through ml-2 text-gray-400">{money(main.mrp)}</span> : null}</div>
            </div>
            <button
              type="button"
              onClick={(e) => { addItem({ ...main, price: offer, quantity: qtyRules(main).min }); flyToCart(e.currentTarget.closest('.rounded-3xl')?.querySelector('img') || e.currentTarget); }}
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-orange-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
            >
              <LuShoppingCart size={16} aria-hidden="true" /> Add
            </button>
          </div>
        </div>
      </div>

      {a && <MiniCard p={a} className="right-0 top-0 rotate-3" float={0} />}
      {b && <MiniCard p={b} className="left-0 bottom-0 -rotate-3" float={1.5} />}

      {maxOff >= 10 && (
        <motion.div initial={{ scale: 0.8, rotate: -12 }} animate={{ scale: 1, rotate: -12 }} transition={{ type: 'spring', stiffness: 200 }} className="on-light absolute left-0 top-2 w-28 h-28 rounded-full bg-gradient-to-br from-secondary to-primary text-dark shadow-xl shadow-orange-500/40 flex flex-col items-center justify-center text-center leading-none">
          <span className="text-[11px] font-bold uppercase tracking-wide">Up to</span>
          <span className="font-display text-4xl font-black">{maxOff}%</span>
          <span className="text-xs font-black uppercase">off</span>
        </motion.div>
      )}

      <div className="absolute right-2 bottom-4 flex flex-col gap-2 items-end">
        <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-full"><LuFileCheck2 className="text-secondary" aria-hidden="true" /> Proof on WhatsApp first</span>
        <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-full"><LuTruck className="text-secondary" aria-hidden="true" /> Courier across India</span>
      </div>
    </div>
  );
}
