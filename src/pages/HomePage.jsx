import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { FiArrowRight, FiChevronLeft, FiChevronRight, FiPhone } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import ProductCard from '../components/ProductCard';
import HeroShowcase from '../components/HeroShowcase';
import Seo from '../components/Seo';
import CategoryGrid from '../components/CategoryGrid';
import FaqSection from '../components/FaqSection';
import { faqSchema, getFaqs, categoryPath } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { getCatalogProducts } from '../data/products';
import {
  LuBadgeCheck, LuBadgeIndianRupee, LuFileCheck2, LuHeart, LuLanguages, LuMessageCircle, LuPalette,
  LuPrinter, LuSparkles, LuStamp, LuTruck,
} from 'react-icons/lu';

// Animated counter
function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef();
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// Soft floating hearts and sparkles behind the hero
function FloatingPetals() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {[...Array(7)].map((_, idx) => {
        const Icon = idx % 2 === 0 ? LuHeart : LuSparkles;
        return (
          <motion.div
            key={idx}
            className="absolute"
            style={{ left: `${8 + idx * 13}%`, top: `${12 + (idx % 3) * 28}%` }}
            animate={{ y: [0, -18, 0], opacity: [0.25, 0.8, 0.25], rotate: [0, 8, 0] }}
            transition={{ duration: 3 + idx * 0.5, repeat: Infinity, delay: idx * 0.35 }}
          >
            <Icon size={16 + idx * 4} className={idx % 2 === 0 ? 'text-secondary' : 'text-orange-200'} style={{ filter: 'blur(0.4px)' }} />
          </motion.div>
        );
      })}
    </div>
  );
}

/** Horizontal product carousel with arrows and a "1 / 8" counter. */
function ProductRail({ eyebrow, title, items, viewAll }) {
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  if (!items.length) return null;
  const scroll = (dir) => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector('[data-rail-item]');
    el.scrollBy({ left: dir * ((card?.offsetWidth || 280) + 24), behavior: 'smooth' });
  };
  const onScroll = () => {
    const el = ref.current;
    const card = el?.querySelector('[data-rail-item]');
    if (card) setIndex(Math.round(el.scrollLeft / (card.offsetWidth + 24)));
  };
  return (
    <section className="py-16 bg-bg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-primary font-bold text-sm uppercase tracking-widest">{eyebrow}</span>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-dark mt-1">{title}</h2>
          </motion.div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 tabular-nums">{Math.min(index + 1, items.length)} / {items.length}</span>
            <button type="button" aria-label="Previous" onClick={() => scroll(-1)} className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:border-primary hover:text-primary flex items-center justify-center transition-colors"><FiChevronLeft /></button>
            <button type="button" aria-label="Next" onClick={() => scroll(1)} className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:border-primary hover:text-primary flex items-center justify-center transition-colors"><FiChevronRight /></button>
            {viewAll && <Link to={viewAll} className="hidden sm:inline-flex items-center gap-1.5 text-primary font-semibold hover:underline ml-2">View all <FiArrowRight /></Link>}
          </div>
        </div>
        <div ref={ref} onScroll={onScroll} className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-none">
          {items.map((product, i) => (
            <motion.div
              key={product.id ?? product.code}
              data-rail-item
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i, 4) * 0.06 }}
              className="snap-start shrink-0 w-[75%] sm:w-[45%] lg:w-[23%]"
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TRADITIONS = [
  { name: 'Hindu Wedding Cards', note: 'Ganesha, kalash & kolam' },
  { name: 'Muslim Wedding Cards', note: 'Nikah & walima' },
  { name: 'Christian Wedding Cards', note: 'Church weddings' },
  { name: 'Scroll Invitations', note: 'Royal scrolls' },
  { name: 'Acrylic Invitations', note: 'Clear & modern' },
  { name: 'Foil & Metallic Cards', note: 'Gold that shines' },
  { name: 'Premium Box Invitations', note: 'Keepsake boxes' },
  { name: 'Budget Wedding Cards', note: 'Big guest lists' },
];

const BENEFITS = ['Free digital proof on WhatsApp', 'Tamil, English or both', 'Foil, emboss & laser-cut finishes', 'Courier across India', 'Printed in Sivakasi', 'Bulk prices from 100 cards'];

export default function HomePage() {
  const { settings } = useShopSettings();
  const [catalogProducts, setCatalogProducts] = useState(() => getCatalogProducts());

  useEffect(() => {
    const syncProducts = () => setCatalogProducts(getCatalogProducts());
    syncProducts();
    window.addEventListener('digitz-catalog-updated', syncProducts);
    return () => window.removeEventListener('digitz-catalog-updated', syncProducts);
  }, []);

  const priced = useMemo(() => catalogProducts.filter((p) => p.price != null), [catalogProducts]);
  // Favourites: newest designs first (highest sort order / id), up to 10.
  const favourites = useMemo(() => [...priced].sort((a, b) => (b.sortOrder ?? b.id ?? 0) - (a.sortOrder ?? a.id ?? 0)).slice(0, 10), [priced]);
  // Budget picks: the lowest per-card prices among wedding and function cards.
  const budget = useMemo(() => priced.filter((p) => /card|invitation/i.test(p.category)).sort((a, b) => a.price - b.price).slice(0, 10), [priced]);

  const whyUs = [
    { icon: LuPalette, title: 'Personalised for you', desc: 'Names, dates, venue, photos and family details set exactly the way you want.' },
    { icon: LuFileCheck2, title: 'Proof before print', desc: 'We send a digital proof on WhatsApp. Nothing is printed until you approve it.' },
    { icon: LuStamp, title: 'Rich finishes', desc: 'Gold and silver foil, embossing, laser cuts, ribbons and premium boards.' },
    { icon: LuLanguages, title: 'Any language', desc: 'Tamil, English or both, and other languages on request.' },
    { icon: LuBadgeIndianRupee, title: 'Clear bulk prices', desc: 'The price per card is shown on every design, and it drops as the quantity grows.' },
    { icon: LuTruck, title: 'Delivered to you', desc: 'Courier across India, or collect from our shop in Sivakasi.' },
  ];

  const steps = [
    { icon: LuHeart, title: 'Choose a design', desc: 'Pick a card and the number of cards, and place your order online.' },
    { icon: LuMessageCircle, title: 'Share your details', desc: 'We message you on WhatsApp for the names, dates, venue and wording, and send a proof.' },
    { icon: LuPrinter, title: 'Approve & we print', desc: 'Ask for changes until it is right. Once you approve, we print, pack and dispatch.' },
  ];

  return (
    <div>
      <Seo path="/" jsonLd={faqSchema(getFaqs(settings))} />

      {/* HERO */}
      <section className="hero-bg min-h-[80vh] flex items-center relative overflow-hidden">
        <FloatingPetals />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-300/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 relative z-10 xl:grid xl:grid-cols-[minmax(0,1fr)_460px] xl:gap-10 xl:items-center">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-secondary text-sm px-4 py-2 rounded-full mb-6"
            >
              <LuSparkles />
              <span>Zaro Digitz · Wedding Cards &amp; Printing · Sivakasi</span>
            </motion.div>

            <motion.h1 initial={false} className="font-display text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 text-shadow">
              Invitations as{' '}
              <span className="gradient-text">Beautiful</span>
              <br />as Your Day
            </motion.h1>

            <motion.p initial={false} className="text-orange-50/90 text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl">
              Wedding and function cards designed with your names and wording, approved by you on WhatsApp, and printed with care in Sivakasi.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Link to="/cards" className="on-light inline-flex items-center gap-2 bg-secondary hover:bg-amber-400 text-dark font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:shadow-2xl hover:shadow-amber-500/30 hover:scale-105">
                Browse Designs <FiArrowRight />
              </Link>
              <a href={shopWhatsAppLink('Hi Zaro Digitz! I am looking for wedding cards. Can you help me choose a design?', settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/30 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all">
                <FaWhatsapp /> Talk to Us
              </a>
            </motion.div>
          </div>
          <div className="hidden xl:block">
            <HeroShowcase products={catalogProducts} />
          </div>
        </div>
      </section>

      {/* BENEFITS MARQUEE */}
      <section className="bg-dark text-secondary py-3 overflow-hidden" aria-label="Why order from us">
        <div className="marquee-wrapper">
          <span className="marquee-text text-sm font-medium tracking-wide">
            {[...BENEFITS, ...BENEFITS].map((b, i) => (
              <span key={i} className="inline-flex items-center gap-2 mx-6"><LuBadgeCheck aria-hidden="true" /> {b}</span>
            ))}
          </span>
        </div>
      </section>

      <ProductRail eyebrow="Customer favourites" title="Designs people love" items={favourites} viewAll="/cards" />

      {/* BROWSE BY TRADITION */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">Browse</span>
            <h2 className="font-display font-black text-4xl sm:text-5xl text-dark mt-2">
              By Tradition &amp; <span className="gradient-text">Style</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TRADITIONS.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} whileHover={{ y: -6 }}>
                <Link to={categoryPath(t.name)} className="block h-full rounded-2xl p-5 bg-gradient-to-br from-orange-50 to-amber-50 border border-amber-100 hover:border-primary/30 hover:shadow-xl transition-all group">
                  <div className="w-10 h-10 rounded-full bg-primary text-secondary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><LuHeart aria-hidden="true" /></div>
                  <div className="font-display font-bold text-dark leading-tight">{t.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{t.note}</div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 bg-gradient-to-br from-dark to-orange-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { num: catalogProducts.length, suffix: '+', label: 'Card designs', icon: LuPalette },
              { num: 18, suffix: '', label: 'Occasions & categories', icon: LuSparkles },
              { num: 100, suffix: '', label: 'Cards minimum order', icon: LuBadgeIndianRupee },
              { num: 7, suffix: ' days', label: 'Typical printing time', icon: LuPrinter },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <stat.icon size={30} className="mx-auto mb-3 text-secondary" aria-hidden="true" />
                <div className="font-display font-black text-4xl sm:text-5xl gradient-text">
                  <Counter target={stat.num} suffix={stat.suffix} />
                </div>
                <div className="text-orange-100/70 mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">Why Zaro Digitz</span>
            <h2 className="font-display font-black text-4xl sm:text-5xl text-dark mt-2">
              Made with <span className="gradient-text">Care</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyUs.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -5 }}
                className="p-6 rounded-2xl border-2 border-transparent hover:border-primary/20 bg-bg hover:bg-white hover:shadow-xl transition-all duration-300 group"
              >
                <div className="w-12 h-12 mb-4 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-secondary transition-colors"><item.icon size={24} aria-hidden="true" /></div>
                <h3 className="font-display font-bold text-xl text-dark mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ProductRail eyebrow="Budget friendly" title="Beautiful cards, gentle prices" items={budget} viewAll={categoryPath('Budget Wedding Cards')} />

      {/* HOW IT WORKS */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">How it works</span>
            <h2 className="font-display font-black text-4xl sm:text-5xl text-dark mt-2">How Your Card <span className="gradient-text">Comes to Life</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 relative">
            {steps.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="relative text-center p-8 rounded-3xl bg-bg">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-secondary text-dark font-black flex items-center justify-center shadow">{i + 1}</div>
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-secondary flex items-center justify-center"><s.icon size={30} aria-hidden="true" /></div>
                <h3 className="font-display font-bold text-xl text-dark mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ALL CATEGORIES */}
      <section className="py-20 bg-bg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">Every occasion</span>
            <h2 className="font-display font-black text-4xl sm:text-5xl text-dark mt-2">
              Cards &amp; Printing for <span className="gradient-text">Every Function</span>
            </h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Weddings, birthdays, house warmings, baby showers and more, plus calendars, return gifts and business printing.</p>
          </div>
          <CategoryGrid products={catalogProducts} />
        </div>
      </section>

      <FaqSection />

      {/* CTA BANNER */}
      <section className="py-16 bg-gradient-to-r from-primary via-orange-600 to-amber-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display font-black text-4xl sm:text-5xl text-white mb-4 text-shadow">Let&apos;s Make Your Invitation Together</h2>
            <p className="text-white/90 text-lg mb-8">Tell us your event date and the style you like. We will suggest designs and share prices on WhatsApp.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/cards" className="inline-flex items-center gap-2 bg-white text-primary font-black px-8 py-4 rounded-2xl text-lg hover:scale-105 transition-transform shadow-xl">
                Browse Designs <FiArrowRight />
              </Link>
              <a href={shopWhatsAppLink('Hi Zaro Digitz! I would like to order invitation cards. My event date is:', settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-colors">
                <FaWhatsapp /> WhatsApp Us
              </a>
              <a href="tel:+917010935230" className="inline-flex items-center gap-2 bg-dark hover:bg-black text-white font-bold px-8 py-4 rounded-2xl text-lg transition-colors">
                <FiPhone /> Call Now
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
