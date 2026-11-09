import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LuHeart } from 'react-icons/lu';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import { getCatalogProducts } from '../data/products';
import { useSaved } from '../utils/favourites';

/** Designs the shopper hearted, side by side to compare. Kept in this browser. */
export default function SavedPage() {
  const saved = useSaved();
  const items = useMemo(() => getCatalogProducts().filter((p) => saved.includes(p.code)), [saved]);
  return (
    <div className="bg-paper text-ink">
      <Seo title="Saved designs" path="/saved" noindex />
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-16 lg:py-20">
        <h1 className="font-display font-bold tracking-tight text-[clamp(32px,3.6vw,52px)] leading-tight">Saved designs</h1>
        <p className="text-lg mt-3 max-w-[52ch]">{items.length ? 'Your favourites, side by side. Tap the heart again to remove one.' : 'Tap the heart on any design to save it here and compare later.'}</p>
        {items.length ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-10">
            {items.map((p, i) => (
              <motion.div key={p.code} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}><ProductCard product={p} /></motion.div>
            ))}
          </div>
        ) : (
          <div className="mt-10 bg-paper2 p-10 text-center">
            <LuHeart size={40} className="mx-auto text-brand" aria-hidden="true" />
            <Link to="/cards" className="inline-flex items-center h-12 px-6 mt-5 bg-primary text-white font-semibold hover:bg-primary-dark transition-colors">Browse designs</Link>
          </div>
        )}
      </section>
    </div>
  );
}
