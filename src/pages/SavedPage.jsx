import { useMemo } from 'react';
import { useLang } from '../i18n/context';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LuHeart } from 'react-icons/lu';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import { getCatalogProducts } from '../data/products';
import { useSaved } from '../utils/favourites';

/** Designs the shopper hearted, side by side to compare. Kept in this browser. */
export default function SavedPage() {
  const { t } = useLang();
  const saved = useSaved();
  const items = useMemo(() => getCatalogProducts().filter((p) => saved.includes(p.code)), [saved]);
  const suggest = useMemo(() => getCatalogProducts().filter((p) => /diar|calendar/i.test(p.category)).slice(0, 4), []);
  return (
    <div className="bg-paper text-ink">
      <Seo title={t('Saved designs')} path="/saved" noindex />
      <section className="max-w-[1440px] mx-auto px-4 sm:px-7 xl:px-10 pt-10 pb-24 lg:pb-32">
        <h1 className="font-display font-extrabold tracking-[-0.05em] leading-[0.9] text-[clamp(40px,5vw,72px)]">{t('Saved designs')}</h1>
        <p className="text-xl mt-4 max-w-[52ch]">{items.length ? t('Your favourites, side by side. Tap the heart again to remove one.') : t('Tap the heart on any design to save it here and compare later.')}</p>
        {items.length ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-8 sm:gap-x-5 mt-12">
            {items.map((p, i) => (
              <motion.div key={p.code} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}><ProductCard product={p} /></motion.div>
            ))}
          </div>
        ) : (
          <div className="mt-12">
            <LuHeart size={40} className="text-primary" aria-hidden="true" />
            <h2 className="font-display font-bold text-[clamp(26px,2.6vw,36px)] mt-8">{t('Start with this year’s calendars and diaries')}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-8 sm:gap-x-5 mt-8">
              {suggest.map((p) => <ProductCard key={p.code} product={p} />)}
            </div>
            <Link to="/cards" className="inline-flex items-center h-14 px-7 mt-6 bg-primary text-white text-[17px] font-bold hover:bg-primary-dark transition-colors">{t('Browse designs')}</Link>
          </div>
        )}
      </section>
    </div>
  );
}
