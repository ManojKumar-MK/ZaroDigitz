import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import Seo from '../components/Seo';
import LiveCard from '../components/LiveCard';
import GoogleReviews from '../components/GoogleReviews';
import ProductCard from '../components/ProductCard';
import { LIVE_MODES, liveValues } from '../components/liveModes';
import { faqSchema, getFaqs, categoryPath, productPath } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';
import { useCart } from '../context/CartContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { defaultOptions } from '../utils/pricing';
import { flyToCart } from '../utils/flyToCart';
import { getCatalogProducts } from '../data/products';
import { googleBusinessLinks, BUSINESS } from '../seo/site';

/*
 * The home page is a printed object: Sivakasi prints India's calendars, so the first screen is
 * this shop's own 2027 calendar with the visitor's name on it, and the rest of the page is more of
 * the same stationery (a rate card, the shop sign, a coupon to bring to the studio).
 */

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const unitOf = (p) => String(p?.per || 'piece').replace(/^1\s+/, '');

/** What the hero says for each tab (Calendar, Diary, Wedding card). */
const HERO = {
  calendar: {
    title: '2027 calendars with your name',
    text: 'Desk and wall calendars for shops, schools and companies, with your name and phone on every month. Printed here in Sivakasi.',
    cta: ['See calendars', 'Diaries & Calendars'],
  },
  diary: {
    title: '2027 diaries with your logo',
    text: 'Executive and pocket diaries with your company name on the cover, dated for 2027, and gift sets with a calendar and pen.',
    cta: ['See diaries', 'Diaries & Calendars'],
  },
  wedding: {
    title: 'Wedding cards with your names',
    text: 'Hindu, Muslim and Christian wedding cards in Tamil, English or both. You approve a proof on WhatsApp before we print.',
    cta: ['Choose a design', null],
  },
};

/** The season's five pieces, in the words a shop owner uses. */
const YEARLY = {
  'ZD-013': ['Desk calendar', 'Tent style and wire-bound: 12 months and a cover, with your shop name, phone and address on every month.'],
  'ZD-028': ['Wall calendar', 'Twelve sheets with a metal strip and hook, your name and logo on each sheet, so it hangs in your customer’s shop all year.'],
  'ZD-021': ['Executive diary', 'Dated 2027, a day to a page, with a padded cover and your name embossed in gold.'],
  'ZD-029': ['Pocket diary', 'A6 and dated, with your logo printed on the cover. It fits a shirt pocket.'],
  'ZD-030': ['Gift set', 'An executive diary, a desk calendar and a pen in one box, ready to hand over in the first week of January.'],
};

const PRINTING = [
  ['Visiting Cards & Stationery', 'Visiting cards', 'Matte, gloss or textured, up to 350 gsm'],
  ['Letterheads & Envelopes', 'Letterheads', 'On 100 gsm bond, with envelopes to match'],
  ['Bill Books & Receipt Books', 'Bill books', 'Duplicate or triplicate, numbered'],
  ['Flyers & Brochures', 'Flyers and brochures', 'A5 flyers to tri-fold A4 brochures'],
  ['Labels & Stickers', 'Stickers and labels', 'Round, square or cut to your shape'],
  ['ID Cards', 'ID cards', 'PVC with photo, lanyard on request'],
  ['Certificates', 'Certificates', 'On texture board'],
  ['Synthetic & Texture Board Prints', 'Synthetic and texture board', 'Waterproof, the full 13 × 19 in'],
  ['School & College Notebooks', 'Notebooks', 'Your school name on the cover'],
  ['Sweet & Cake Boxes', 'Sweet and cake boxes', 'With a window, printed in colour'],
];

const INVITATIONS = [
  ['Hindu Wedding Cards', 'Hindu wedding cards'],
  ['Muslim Wedding Cards', 'Muslim wedding cards'],
  ['Christian Wedding Cards', 'Christian wedding cards'],
  ['Scroll Invitations', 'Scroll invitations'],
  ['Acrylic Invitations', 'Acrylic invitations'],
  ['Premium Box Invitations', 'Box invitations'],
  ['Birthday Invitations', 'Birthday cards'],
  ['House Warming Invitations', 'House warming cards'],
];

/** Everything painted on the shop's sign board, in its order. */
const SIGN = [
  ['Visiting cards', 'Visiting Cards & Stationery'], ['Stickers', 'Labels & Stickers'], ['Invitations', 'Hindu Wedding Cards'],
  ['Flyers', 'Flyers & Brochures'], ['Synthetic', 'Synthetic & Texture Board Prints'], ['Bill books', 'Bill Books & Receipt Books'],
  ['Brochures', 'Flyers & Brochures'], ['Letterheads', 'Letterheads & Envelopes'], ['Texture board', 'Synthetic & Texture Board Prints'],
  ['Branding', 'Branding & Signage'], ['ID cards', 'ID Cards'], ['Certificates', 'Certificates'],
  ['Calendars', 'Diaries & Calendars'], ['Diaries', 'Diaries & Calendars'], ['Notebooks', 'School & College Notebooks'],
];

const STEPS = [
  { title: 'You send your name', text: 'WhatsApp your shop name, logo, phone and the quantity. A photo of last year’s calendar is enough.', img: '/products-art/zd-015.svg', gap: 'lg:h-24' },
  { title: 'A proof the same day', text: 'We set it on the design and send a proof to your phone. Changes are free until it is right.', img: '/templates/calendar-2027.svg', gap: 'lg:h-36' },
  { title: 'You reply OK', text: 'Approve on WhatsApp and pay by UPI or at the studio. Printing starts that day.', img: '/templates/diary-cover.svg', gap: 'lg:h-16' },
  { title: 'Printed on 13 × 19 sheets', text: 'Digital colour on paper and board up to 350 gsm, with offset for long runs.', img: '/products-art/zd-027.svg', gap: 'lg:h-32' },
  { title: 'Cut, bound and counted', text: 'Wire binding, lamination, foil and emboss as chosen. Every piece is checked and counted.', img: '/products-art/desk-calendar.svg', gap: 'lg:h-20' },
  { title: 'Collected or couriered', text: 'Pick up from our studio, or we courier anywhere in India in 2 to 5 days.', img: '/products-art/gift-set.svg', gap: 'lg:h-28' },
];

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 } }),
};
const Rise = ({ i = 0, className, children, as = 'div' }) => {
  const M = motion[as];
  return <M variants={rise} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className={className}>{children}</M>;
};

const H2 = 'font-display font-bold tracking-[-0.03em] leading-[1.02] text-[clamp(32px,3.6vw,52px)]';
const WRAP = 'max-w-[1440px] mx-auto px-4 sm:px-8 xl:px-12';

/** "Open now" from the shop hours, in India time: Mon–Sat 9–22, Sun 10–20. */
function OpenNow() {
  const [now] = useState(() => new Date());
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(now).map((x) => [x.type, x.value]));
  const sunday = parts.weekday === 'Sun';
  const hour = Number(parts.hour) % 24;
  const [from, to] = sunday ? [10, 20] : [9, 22];
  const open = hour >= from && hour < to;
  return (
    <p className="inline-flex items-center gap-3 text-lg font-semibold">
      <span className={`w-3 h-3 rounded-full ${open ? 'bg-emerald-400' : 'bg-red-300'}`} aria-hidden="true" />
      {open ? `Open now, until ${to > 12 ? to - 12 : to} pm` : `Closed now, opens at ${from} am`}
    </p>
  );
}

/* ───────────── The first screen: this year's calendar, with your name on it ───────────── */
function Hero({ heroModes, mode, setMode, live, setLive, proofHref }) {
  const h = HERO[mode];
  return (
    <section className="bg-primary-dark px-3 sm:px-6 xl:px-8 pt-3 sm:pt-6 pb-10 sm:pb-14">
      <div className="max-w-[1376px] mx-auto bg-paper text-ink">
        {/* the wire binding of a desk calendar: filled holes along the top edge */}
        <div className="flex justify-between px-6 sm:px-12 pt-4" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => <span key={i} className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-primary-dark ${i > 13 ? 'hidden sm:block' : ''}`} />)}
        </div>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 px-5 sm:px-12 pt-8 sm:pt-12 pb-8 sm:pb-12">
          <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); window.open(proofHref, '_blank', 'noopener'); }}>
            {heroModes.length > 1 && (
              <div role="tablist" aria-label="Choose what to make" className="flex flex-wrap gap-2">
                {heroModes.map((m) => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setLive({}); }} className={`h-11 px-5 text-[17px] font-semibold transition-colors ${mode === m ? 'bg-ink text-paper' : 'bg-paper2 hover:bg-paper3'}`}>{LIVE_MODES[m].label}</button>
                ))}
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div key={mode} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                <h1 className="font-display font-bold tracking-[-0.04em] leading-[0.98] text-primary text-[clamp(38px,5.6vw,84px)] mt-8 max-w-[15ch]">{h.title}</h1>
                <p className="text-xl leading-relaxed mt-6 max-w-[44ch]">{h.text}</p>
              </motion.div>
            </AnimatePresence>

            <p className="font-display font-semibold text-[22px] mt-10">{LIVE_MODES[mode].title}</p>
            <div className="grid sm:grid-cols-2 gap-2 mt-4">
              {LIVE_MODES[mode].fields.map((f) => (
                <label key={f.key} className="block">
                  <span className="sr-only">{f.label}</span>
                  <input type={f.type || 'text'} maxLength={f.max} placeholder={f.label} value={live[f.key] || ''} onChange={(e) => setLive({ ...live, [f.key]: e.target.value })} className="w-full h-14 px-4 bg-paper2 text-[17px] placeholder:text-ink/60 focus:outline-none focus:bg-paper3 focus-visible:ring-2 focus-visible:ring-primary" />
                </label>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              <Link to={h.cta[1] ? categoryPath(h.cta[1]) : '/cards'} className="h-16 inline-flex items-center justify-center bg-primary text-white text-[17px] font-bold transition-colors hover:bg-primary-dark active:scale-[0.99]">{h.cta[0]}</Link>
              <button type="submit" className="h-16 inline-flex items-center justify-center gap-2 bg-ink text-paper text-[17px] font-semibold transition-colors hover:bg-night active:scale-[0.99]"><FaWhatsapp size={20} aria-hidden="true" /> Send me this proof</button>
            </div>
          </form>

          <div className="bg-paper2 flex items-center justify-center p-8 sm:p-12 min-h-[420px]">
            <LiveCard mode={mode} values={live} className="max-w-[400px]" />
          </div>
        </div>

        {/* the foot of the calendar page: the months of the year */}
        <div className="bg-primary text-white px-5 sm:px-12 py-4 grid grid-cols-6 lg:grid-cols-12 gap-y-1 text-[15px] font-semibold" aria-hidden="true">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => <span key={m} className={i === 0 ? 'text-[rgb(var(--accent-light-rgb))]' : 'text-white/85'}>{m}<span className="hidden xl:inline"> 2027</span></span>)}
        </div>
      </div>
    </section>
  );
}

/* ───────────── New Year: one piece at a time, on a square plate ───────────── */
function YearlyShowcase({ products }) {
  const { addItem } = useCart();
  const list = products.filter((p) => YEARLY[p.code]).sort((a, b) => Object.keys(YEARLY).indexOf(a.code) - Object.keys(YEARLY).indexOf(b.code));
  const [at, setAt] = useState(0);
  if (!list.length) return null;
  const p = list[Math.min(at, list.length - 1)];
  const [label, note] = YEARLY[p.code];
  return (
    <section className={`${WRAP} py-24 lg:py-40`}>
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-stretch">
        <Rise className="bg-paper2 aspect-square overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img key={p.code} src={p.image} alt={`${p.name}, printed by Zaro Digitz`} width="800" height="800" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="w-full h-full object-cover" />
          </AnimatePresence>
        </Rise>
        <div className="flex flex-col justify-between gap-10">
          <div>
            <Rise as="h2" className={H2}>Calendars and diaries for 2027</Rise>
            <Rise i={1} as="p" className="text-xl leading-relaxed mt-5 max-w-[46ch]">Your name on something your customers use every day of the year. Order by mid-December and they reach your customers before 1 January.</Rise>
            <Rise i={2} className="flex flex-wrap gap-x-6 gap-y-3 mt-10" role="tablist" aria-label="Calendars and diaries">
              {list.map((x, n) => (
                <button key={x.code} type="button" role="tab" aria-selected={n === at} onClick={() => setAt(n)} className={`text-lg font-semibold pb-1 transition-colors ${n === at ? 'text-primary' : 'text-ink/70 hover:text-ink'}`}>
                  {YEARLY[x.code][0]}
                  {n === at && <motion.span layoutId="yearly-tab" className="block h-1 bg-primary mt-1" />}
                </button>
              ))}
            </Rise>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={p.code} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              <h3 className="font-display font-bold text-[clamp(28px,2.6vw,40px)] tracking-[-0.02em] leading-tight">{label}</h3>
              <p className="text-lg leading-relaxed mt-4 max-w-[44ch]">{note}</p>
              <p className="mt-6 tabular-nums"><span className="font-display font-bold text-[40px] text-primary">{money(p.price)}</span> <span className="text-lg">per {unitOf(p)}</span></p>
            </motion.div>
          </AnimatePresence>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={(e) => { addItem({ ...p, ...defaultOptions(p), quantity: 1 }); flyToCart(e.currentTarget); }} className="h-[72px] bg-primary text-white text-lg font-bold transition-colors hover:bg-primary-dark active:scale-[0.99]">Add to cart</button>
            <Link to={productPath(p)} className="h-[72px] px-3 inline-flex items-center justify-center text-center bg-paper2 text-lg font-semibold transition-colors hover:bg-paper3">Choose paper and size</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── The rate card: a printed sheet, beside the facts of the press ───────────── */
function RateCard({ products, showFacts, showInvites }) {
  const byCat = useMemo(() => {
    const m = {};
    products.forEach((p) => { (m[p.category] ??= []).push(p); });
    return m;
  }, [products]);
  const fromPrice = (cat) => {
    const ps = byCat[cat] || [];
    if (!ps.length) return null;
    const low = ps.reduce((a, b) => (b.price < a.price ? b : a));
    return `${ps.length > 1 ? 'from ' : ''}${money(low.price)} / ${unitOf(low)}`;
  };
  const yearly = Object.keys(YEARLY).map((c) => products.find((p) => p.code === c)).filter(Boolean);
  const groups = [
    { name: 'Calendars and diaries', rows: yearly.map((p) => ({ to: productPath(p), name: YEARLY[p.code][0], price: `${money(p.price)} / ${unitOf(p)}` })) },
    { name: 'Printing for your business', rows: PRINTING.map(([cat, name, note]) => ({ to: categoryPath(cat), name, note, price: fromPrice(cat) || 'Ask us' })) },
    ...(showInvites ? [{ name: 'Invitations', rows: INVITATIONS.map(([cat, name]) => ({ to: categoryPath(cat), name, price: fromPrice(cat) || 'Ask us' })) }] : []),
  ];
  return (
    <section className="bg-primary-dark text-white py-24 lg:py-40">
      <div className={`${WRAP} grid lg:grid-cols-12 gap-14 lg:gap-8`}>
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <Rise as="h2" className={H2}>Our rate card for 2027</Rise>
            <Rise i={1} as="p" className="text-xl leading-relaxed mt-5 max-w-[40ch] text-white/90">Prices are per piece, with printing included. For a few hundred pieces or more, send the quantity on WhatsApp and we quote a better rate.</Rise>
            {showFacts && (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-10 mt-14 max-w-md">
                {[['13 × 19 in', 'the largest sheet we print'], ['350 gsm', 'the thickest board'], ['1 day', 'to your proof on WhatsApp'], ['7 days', 'typical printing time']].map(([n, l], i) => (
                  <Rise key={l} i={i}>
                    <dt className="font-display font-bold text-[clamp(32px,3.2vw,48px)] leading-none tracking-[-0.03em] text-[rgb(var(--accent-light-rgb))] tabular-nums">{n}</dt>
                    <dd className="text-lg mt-2 text-white/90">{l}</dd>
                  </Rise>
                ))}
              </dl>
            )}
          </div>
        </div>

        <Rise i={1} className="lg:col-start-7 lg:col-span-6">
          <div className="sheet-scallop bg-paper text-ink px-6 sm:px-14 py-14 sm:py-16">
            <p className="text-center font-display font-bold text-[clamp(28px,2.6vw,40px)] tracking-[-0.02em]">ZARO Digitz</p>
            <p className="text-center text-[15px] mt-1">Digital Color Prints · {BUSINESS.address.streetAddress}, Sivakasi</p>
            {groups.map((g) => (
              <div key={g.name} className="mt-12">
                <h3 className="text-center font-display font-semibold text-[22px] text-primary">{g.name}</h3>
                <ul className="mt-5 space-y-4">
                  {g.rows.map((r) => (
                    <li key={r.name}>
                      <Link to={r.to} className="group grid grid-cols-[1fr_auto] gap-x-6 items-baseline">
                        <span className="text-[17px] font-medium group-hover:text-primary transition-colors">{r.name}</span>
                        <span className="text-[17px] tabular-nums text-right whitespace-nowrap">{r.price}</span>
                        {r.note && <span className="col-span-2 text-[15px] text-ink/75">{r.note}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-center text-[15px] mt-14">Monday to Saturday, 9 am to 10 pm<br />Sunday, 10 am to 8 pm</p>
          </div>
        </Rise>
      </div>
    </section>
  );
}

/* ───────────── Designs ready to order ───────────── */
function Designs({ tabs }) {
  const [pick, setPick] = useState(tabs[0]?.key);
  const tab = tabs.find((t) => t.key === pick) || tabs[0];
  if (!tab) return null;
  return (
    <section className={`${WRAP} py-24 lg:py-40`}>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <Rise as="h2" className={H2}>Designs ready to order</Rise>
        {tabs.length > 1 && (
          <Rise i={1} className="flex flex-wrap gap-2" role="tablist" aria-label="Kinds of design">
            {tabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={t.key === tab.key} onClick={() => setPick(t.key)} className={`h-11 px-5 text-[17px] font-semibold transition-colors ${t.key === tab.key ? 'bg-ink text-paper' : 'bg-paper2 hover:bg-paper3'}`}>{t.label}</button>
            ))}
          </Rise>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-8 sm:gap-x-5 mt-12">
          {tab.items.slice(0, 8).map((p) => <ProductCard key={p.code} product={p} />)}
        </motion.div>
      </AnimatePresence>
      <Link to="/cards" className="mt-12 inline-flex items-center h-14 px-7 bg-paper2 text-[17px] font-semibold transition-colors hover:bg-paper3">See all {tab.total} designs</Link>
    </section>
  );
}

/* ───────────── From your phone to the press: the order's moments, side by side ───────────── */
function Steps() {
  return (
    <section className="bg-paper2 py-24 lg:py-40">
      <div className={WRAP}>
        <Rise as="h2" className={H2}>From your phone to the press</Rise>
        <Rise i={1} as="p" className="text-xl leading-relaxed mt-5 max-w-[50ch]">Every order, a calendar or a box of visiting cards, goes the same way. You always see a proof first.</Rise>
        <ol className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-14 mt-16">
          {STEPS.map((s, i) => (
            <Rise as="li" key={s.title} i={i % 6} className="flex flex-col">
              <h3 className="font-display font-bold text-[22px] leading-snug">{s.title}</h3>
              <p className="text-[17px] leading-relaxed mt-3">{s.text}</p>
              <span className={`block h-6 ${s.gap}`} aria-hidden="true" />
              <div className="aspect-[4/5] bg-paper overflow-hidden mt-auto"><img src={s.img} alt="" width="280" height="350" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" /></div>
            </Rise>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────── The shop sign, set on a card ───────────── */
function ShopSign() {
  return (
    <section className="bg-secondary text-[#211114] pt-24 lg:pt-32 h-[720px] sm:h-[780px] overflow-hidden">
      <Rise className="w-[92%] sm:w-[72%] lg:w-[56%] max-w-[860px] mx-auto aspect-[5/7] bg-paper -rotate-1 px-7 sm:px-14 py-12 sm:py-16 text-center">
        <h2 className="font-display font-bold tracking-[-0.03em] leading-[1.05] text-[clamp(28px,3vw,44px)]">Everything on our shop sign</h2>
        <p className="text-lg mt-4 max-w-[40ch] mx-auto">All media up to 13 × 19 inches and 350 gsm, printed in our studio on Maruthu Pandiyar Mettu Street.</p>
        <ul className="mt-10 flex flex-wrap justify-center gap-x-3 gap-y-1 font-display text-[clamp(22px,2.2vw,32px)] leading-[1.5]">
          {SIGN.map(([label, cat], i) => (
            <li key={label}>
              <Link to={categoryPath(cat)} className="font-medium hover:text-primary underline-offset-4 hover:underline">{label}</Link>
              {i < SIGN.length - 1 && <span aria-hidden="true">{'\u00a0·'}</span>}
            </li>
          ))}
        </ul>
      </Rise>
    </section>
  );
}

/* ───────────── Questions, as reading text ───────────── */
function Questions({ faqs }) {
  return (
    <section id="faq" className={`${WRAP} scroll-mt-28 py-24 lg:py-40 grid lg:grid-cols-12 gap-10 lg:gap-8`}>
      <Rise as="h2" className={`${H2} lg:col-span-3`}>Before you order</Rise>
      <div className="lg:col-start-5 lg:col-span-8 lg:columns-2 lg:gap-14">
        {faqs.map((f, i) => (
          <Rise key={f.q} i={Math.min(i, 4)} as="p" className="text-[17px] leading-[1.6] mb-6 break-inside-avoid">
            <strong className="font-semibold">{f.q}</strong> {f.a}
          </Rise>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Visit: a coupon to fill in and send ───────────── */
function VisitCoupon({ settings }) {
  const [f, setF] = useState({ name: '', phone: '', need: '', qty: '' });
  const send = (e) => {
    e.preventDefault();
    const msg = `Hi Zaro Digitz! I am ${f.name || '…'}${f.phone ? ` (${f.phone})` : ''}. I need ${f.need || 'printing'}${f.qty ? `, about ${f.qty} pieces` : ''}. Please send me a price.`;
    window.open(shopWhatsAppLink(msg, settings.whatsappNumber), '_blank', 'noopener');
  };
  const input = 'w-full h-[54px] px-4 bg-white/15 text-white text-[17px] placeholder:text-white/75 focus:outline-none focus:bg-white/25 focus-visible:ring-2 focus-visible:ring-secondary';
  const links = googleBusinessLinks(settings);
  return (
    <section className={`${WRAP} py-24 lg:py-32`}>
      <Rise className="coupon bg-primary text-white grid lg:grid-cols-[46%_auto_1fr] max-w-[1200px] mx-auto">
        <div className="p-8 sm:p-12 flex flex-col justify-between gap-10">
          <div>
            <h2 className="font-display font-bold tracking-[-0.03em] leading-[1.02] text-[clamp(30px,3vw,44px)]">Visit our studio in Sivakasi</h2>
            <p className="text-lg mt-5">{BUSINESS.address.streetAddress}, Sivakasi, Tamil Nadu {BUSINESS.address.postalCode}</p>
            <p className="text-lg mt-1">Monday to Saturday 9 am to 10 pm, Sunday 10 am to 8 pm</p>
          </div>
          <div className="flex flex-col gap-5">
            <OpenNow />
            <p className="flex flex-wrap gap-x-6 gap-y-2 text-lg font-semibold">
              <a href={links.directions} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-[rgb(var(--accent-light-rgb))]">Directions</a>
              <a href="tel:+919787702336" className="underline underline-offset-4 hover:text-[rgb(var(--accent-light-rgb))]">Call +91 97877 02336</a>
            </p>
          </div>
        </div>
        <span className="coupon-perforation" aria-hidden="true" />
        <form onSubmit={send} className="p-8 sm:p-12 flex flex-col gap-2.5 justify-center">
          <p className="font-display font-semibold text-[22px] mb-3">Or ask for a price</p>
          {[['name', 'Your name'], ['phone', 'Phone number', 'tel'], ['need', 'What do you need? e.g. 500 desk calendars'], ['qty', 'How many pieces', 'number']].map(([k, label, type]) => (
            <label key={k} className="block">
              <span className="sr-only">{label}</span>
              <input type={type || 'text'} inputMode={type === 'number' ? 'numeric' : undefined} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={label} className={input} />
            </label>
          ))}
          <button type="submit" className="h-14 mt-1 inline-flex items-center justify-center gap-2 bg-night text-white text-[17px] font-bold transition-colors hover:bg-black active:scale-[0.99]"><FaWhatsapp size={20} aria-hidden="true" /> Send on WhatsApp</button>
        </form>
      </Rise>
    </section>
  );
}

export default function HomePage() {
  const { settings } = useShopSettings();
  const [catalogProducts, setCatalogProducts] = useState(() => getCatalogProducts());
  const [modePick, setMode] = useState('calendar');
  const [live, setLive] = useState({});

  useEffect(() => {
    const sync = () => setCatalogProducts(getCatalogProducts());
    sync();
    window.addEventListener('digitz-catalog-updated', sync);
    return () => window.removeEventListener('digitz-catalog-updated', sync);
  }, []);

  const priced = useMemo(() => catalogProducts.filter((p) => p.price != null), [catalogProducts]);

  // Admin → Settings → Home page: which sections and hero tabs are shown (all on by default).
  const show = (key) => settings.homeSections?.[key] !== false;
  const heroModes = ['calendar', 'diary', 'wedding'].filter((m) => settings.heroTabs?.[m] !== false);
  const mode = heroModes.includes(modePick) ? modePick : (heroModes[0] || 'calendar');
  const proofHref = shopWhatsAppLink(`Hi Zaro Digitz! ${LIVE_MODES[mode].proof(liveValues(mode, live))}`, settings.whatsappNumber);

  const designTabs = useMemo(() => {
    const isCard = (p) => /wedding|invitation|scroll|acrylic|foil|box invitation/i.test(p.category);
    const make = (key, label, items) => ({ key, label, items, total: items.length });
    return [
      show('favourites') && make('favourites', 'Calendars and diaries first', [...priced].sort((a, b) => Number(/diar|calendar/i.test(b.category)) - Number(/diar|calendar/i.test(a.category)))),
      show('printing') && make('printing', 'Printing', priced.filter((p) => !isCard(p))),
      show('budget') && make('budget', 'Wedding cards', priced.filter(isCard).sort((a, b) => a.price - b.price)),
    ].filter(Boolean);
  }, [priced, settings.homeSections]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-paper text-ink">
      <Seo path="/" jsonLd={faqSchema(getFaqs(settings))} />
      <Hero heroModes={heroModes} mode={mode} setMode={setMode} live={live} setLive={setLive} proofHref={proofHref} />
      {show('newyear') && <YearlyShowcase products={priced} />}
      {show('services') && <RateCard products={priced} showFacts={show('numbers')} showInvites={show('traditions')} />}
      {designTabs.length > 0 && <Designs tabs={designTabs} />}
      {show('timeline') && <Steps />}
      {show('benefits') && <ShopSign />}
      {show('reviews') && <GoogleReviews />}
      {show('faq') && <Questions faqs={getFaqs(settings)} />}
      {show('visit') && <VisitCoupon settings={settings} />}
    </div>
  );
}
