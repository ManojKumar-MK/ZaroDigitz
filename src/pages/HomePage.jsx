import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import Seo from '../components/Seo';
import LiveCard from '../components/LiveCard';
import GoogleReviews from '../components/GoogleReviews';
import ProductCard from '../components/ProductCard';
import { LIVE_MODES, liveValues } from '../components/liveModes';
import { faqSchema, getFaqs, categoryPath, productPath } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { getCatalogProducts } from '../data/products';
import { googleBusinessLinks, BUSINESS } from '../seo/site';

/*
 * The page reads as a few sentences, each with its evidence beside it. The first one is the
 * whole business: your name, on a calendar, for all of 2027. The calendar is pictured, not said.
 */

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const unitOf = (p) => String(p?.per || 'piece').replace(/^1\s+/, '');
const WRAP = 'max-w-[1440px] mx-auto px-4 sm:px-7 xl:px-10';
const DISPLAY = 'font-display font-extrabold tracking-[-0.05em] leading-[0.9]';
const HEAD = 'font-display font-extrabold tracking-[-0.04em] leading-[0.95] text-[clamp(30px,3vw,46px)]';

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 } }),
};
const Rise = ({ i = 0, className, children, as = 'div', ...rest }) => {
  const M = motion[as];
  return <M variants={rise} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} className={className} {...rest}>{children}</M>;
};

/** A photograph that opens like a shutter the first time it is seen. */
function Shutter({ src, alt = '', className = '', imgClass = '', eager = false }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={`block overflow-hidden ${className}`}
      initial={reduce ? false : { clipPath: 'inset(0 100% 0 0)' }}
      whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
      viewport={{ once: true }}
      transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
    >
      <motion.img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        initial={reduce ? false : { scale: 1.12 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full h-full object-cover ${imgClass}`}
      />
    </motion.span>
  );
}

const YEARLY = {
  'ZD-013': 'Desk calendar',
  'ZD-028': 'Wall calendar',
  'ZD-021': 'Executive diary',
  'ZD-029': 'Pocket diary',
  'ZD-030': 'Gift set',
};

const PRINTING = [
  ['Visiting Cards & Stationery', 'Visiting cards'],
  ['Letterheads & Envelopes', 'Letterheads'],
  ['Bill Books & Receipt Books', 'Bill books'],
  ['Flyers & Brochures', 'Flyers and brochures'],
  ['Labels & Stickers', 'Stickers and labels'],
  ['ID Cards', 'ID cards'],
  ['Certificates', 'Certificates'],
  ['Synthetic & Texture Board Prints', 'Synthetic and texture board'],
];

const INVITES = [
  ['Hindu Wedding Cards', 'Hindu wedding cards'],
  ['Muslim Wedding Cards', 'Muslim wedding cards'],
  ['Christian Wedding Cards', 'Christian wedding cards'],
  ['Birthday Invitations', 'Birthday and function cards'],
];

const STAIRS = [
  ['First, you send the file.', 'Your design, logo or text on WhatsApp, with the size, paper and quantity. No design yet? We make one for you.'],
  ['Then we send a proof.', 'The job laid out on the sheet, on your phone, usually the same day. Changes are free.'],
  ['You reply OK.', 'Pay by UPI or at the counter, and the job goes on the press that day.'],
  ['It is ready in a week.', 'Printed, bound and counted. Collect it from the studio or we courier it anywhere in India.'],
];

/* ───────────── First screen: the shop's own line, “Digital [ink] Color Prints” ───────────── */
function Hero({ settings }) {
  return (
    <section className={`${WRAP} min-h-[calc(100svh-72px)] flex flex-col justify-center py-14`}>
      <h1 className={`${DISPLAY} text-[clamp(52px,9.4vw,160px)] text-ink`}>
        <span className="sr-only">Zaro Digitz, Digital Color Prints, Sivakasi</span>
        <span aria-hidden="true" className="block">
          <span className="flex flex-wrap sm:flex-nowrap items-center gap-x-[0.18em] gap-y-[0.12em]">
            <span className="whitespace-nowrap">Digital</span>
            <Shutter eager src="/photos/ink-trays.webp" className="basis-full sm:basis-auto sm:flex-1 h-[1.3em] sm:h-[0.78em] rounded-[14px] min-w-0" imgClass="object-[50%_55%]" />
          </span>
          <span className="block whitespace-nowrap mt-[0.04em]">Color Prints</span>
        </span>
      </h1>
      <div className="grid lg:grid-cols-12 gap-8 items-end mt-12 lg:mt-16">
        <Rise i={2} as="p" className="lg:col-span-6 text-[clamp(20px,1.6vw,26px)] leading-snug max-w-[38ch]">
          Visiting cards, calendars, diaries, flyers, bill books, stickers and invitations, printed in our Sivakasi studio on any media up to 13 × 19 in and 350 gsm.
        </Rise>
        <Rise i={3} className="lg:col-span-6 flex flex-wrap gap-2 lg:justify-end">
          <a href={shopWhatsAppLink('Hi Zaro Digitz! I would like a price for printing.', settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="h-14 px-7 inline-flex items-center gap-2 bg-primary text-white text-[17px] font-semibold transition-colors hover:bg-primary-dark active:scale-[0.98]"><FaWhatsapp size={20} aria-hidden="true" /> Get a price</a>
          <Link to="/cards" className="h-14 px-7 inline-flex items-center bg-paper2 text-[17px] font-semibold transition-colors hover:bg-paper3 active:scale-[0.98]">See what we print</Link>
        </Rise>
      </div>
    </section>
  );
}

/* ───────────── Calendars and diaries: the object in front of the words ───────────── */
function Yearly({ products }) {
  const list = Object.keys(YEARLY).map((c) => products.find((p) => p.code === c)).filter(Boolean);
  return (
    <section className={`${WRAP} pt-24 lg:pt-36 grid lg:grid-cols-12 gap-10 lg:gap-8 items-start`}>
      <div className={`lg:col-span-6 ${DISPLAY} text-[clamp(38px,4.8vw,76px)] leading-[0.95]`}>
        <Rise as="p" className="text-ink/60" aria-hidden="true">Desk and wall</Rise>
        <Rise as="h2" i={1} className="text-ink">calendars,</Rise>
        <Rise as="p" i={2} className="text-ink/60" aria-hidden="true">diaries and</Rise>
        <Rise as="p" i={3} className="text-ink/60" aria-hidden="true">gift sets for 2027</Rise>
      </div>
      <div className="lg:col-start-8 lg:col-span-5">
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 0 }}
          whileInView={{ opacity: 1, y: 0, rotate: 3 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="aspect-[4/3]"
        >
          <img src="/photos/orange-diary.webp" alt="A hardbound diary on a desk" loading="lazy" className="w-full h-full object-cover" />
        </motion.div>
        <Rise as="p" className="mt-10 text-[clamp(18px,1.3vw,20px)] leading-relaxed">Something your customers use every day of the year, with your shop name, phone and address on it. Order by mid-December and they are in hand before 1 January.</Rise>
        <Rise as="ul" i={1} className="mt-4 text-[clamp(18px,1.3vw,20px)]">
          {list.map((p) => (
            <li key={p.code}>
              <Link to={productPath(p)} className="group flex items-baseline justify-between gap-6 py-2.5">
                <span className="font-semibold group-hover:text-primary transition-colors">{YEARLY[p.code]}</span>
                <span className="tabular-nums whitespace-nowrap">{money(p.price)} <span className="text-ink/70">/ {unitOf(p)}</span> <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span></span>
              </Link>
            </li>
          ))}
        </Rise>
      </div>
    </section>
  );
}

/* ───────────── Try it: your words on the thing we print ───────────── */
function TryIt({ heroModes, mode, setMode, live, setLive, proofHref }) {
  return (
    <section className={`${WRAP} pt-24 lg:pt-36 grid lg:grid-cols-12 gap-12 lg:gap-8 items-center`}>
      <form className="lg:col-span-6" onSubmit={(e) => { e.preventDefault(); window.open(proofHref, '_blank', 'noopener'); }}>
        <Rise as="h2" className={HEAD}>Try your details on a design</Rise>
        <Rise i={1} as="p" className="text-xl leading-relaxed mt-6 max-w-[40ch]">Every piece is printed with your name, logo and details. Type them in for a rough look; we send a proper proof on WhatsApp.</Rise>
        {heroModes.length > 1 && (
          <Rise i={2} className="flex flex-wrap gap-x-6 gap-y-2 mt-10" role="tablist" aria-label="What to preview">
            {heroModes.map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setLive({}); }} className={`text-xl font-semibold pb-1 transition-colors ${mode === m ? 'text-ink' : 'text-ink/60 hover:text-ink'}`}>
                {LIVE_MODES[m].label}
                {mode === m && <motion.span layoutId="try-tab" className="block h-[3px] bg-ink mt-1" />}
              </button>
            ))}
          </Rise>
        )}
        <div className="grid sm:grid-cols-2 gap-2 mt-6">
          {LIVE_MODES[mode].fields.map((f) => (
            <label key={f.key} className="block">
              <span className="sr-only">{f.label}</span>
              <input type={f.type || 'text'} maxLength={f.max} placeholder={f.label} value={live[f.key] || ''} onChange={(e) => setLive({ ...live, [f.key]: e.target.value })} className="w-full h-14 px-4 bg-paper2 text-[17px] placeholder:text-ink/60 focus:outline-none focus:bg-paper3 focus-visible:ring-2 focus-visible:ring-ink" />
            </label>
          ))}
        </div>
        <button type="submit" className="mt-2 h-14 px-7 inline-flex items-center gap-2 bg-primary text-white text-[17px] font-semibold transition-colors hover:bg-primary-dark active:scale-[0.98]"><FaWhatsapp size={20} aria-hidden="true" /> Send me this as a proof</button>
      </form>
      <Rise i={1} className="lg:col-start-8 lg:col-span-5 bg-paper2 aspect-square flex items-center justify-center p-10">
        <LiveCard mode={mode} values={live} className="max-w-[380px]" />
      </Rise>
    </section>
  );
}

/* ───────────── Prices: the statement, the table pushed right ───────────── */
function Prices({ products, showFacts, showInvites }) {
  const byCat = useMemo(() => {
    const m = {};
    products.forEach((p) => { (m[p.category] ??= []).push(p); });
    return m;
  }, [products]);
  const from = (cat) => {
    const ps = byCat[cat] || [];
    if (!ps.length) return 'ask us';
    const low = ps.reduce((a, b) => (b.price < a.price ? b : a));
    return `${ps.length > 1 ? 'from ' : ''}${money(low.price)} / ${unitOf(low)}`;
  };
  const yearly = Object.keys(YEARLY).map((c) => products.find((p) => p.code === c)).filter(Boolean);
  const groups = [
    yearly.map((p) => ({ kind: 'New Year', name: YEARLY[p.code], price: `${money(p.price)} / ${unitOf(p)}`, to: productPath(p) })),
    PRINTING.map(([c, n]) => ({ kind: 'Business', name: n, price: from(c), to: categoryPath(c) })),
    ...(showInvites ? [INVITES.map(([c, n]) => ({ kind: 'Cards', name: n, price: from(c), to: categoryPath(c) }))] : []),
  ];
  return (
    <section className={`${WRAP} pt-24 lg:pt-36`}>
      <Rise as="h2" className={`${HEAD} max-w-[18ch] lg:indent-[3vw]`}>Prices per piece, printing included</Rise>
      <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 mt-16 lg:mt-24">
        <div className="lg:col-span-5 flex flex-col justify-end gap-12 order-last lg:order-none">
          {showFacts && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-8">
              {[['13 × 19 in', 'largest sheet'], ['350 gsm', 'thickest board'], ['1 day', 'to your proof'], ['7 days', 'to print']].map(([n, l], i) => (
                <Rise key={l} i={i}>
                  <dt className="font-display font-extrabold tracking-[-0.03em] text-[clamp(26px,2.2vw,34px)] tabular-nums">{n}</dt>
                  <dd className="text-lg mt-1">{l}</dd>
                </Rise>
              ))}
            </dl>
          )}
          <Rise className="w-[70%] lg:w-[78%] aspect-[4/5]"><img src="/photos/colour-loupe.webp" alt="Checking colour on a printed chart with a loupe" loading="lazy" className="w-full h-full object-cover" /></Rise>
        </div>
        <div className="lg:col-start-8 lg:col-span-5">
          {groups.map((rows, gi) => (
            <ul key={gi} className={gi ? 'mt-11' : ''}>
              {rows.map((r, i) => (
                <Rise as="li" key={r.name} i={Math.min(i, 4)}>
                  <Link to={r.to} className="group grid grid-cols-[1fr_auto] sm:grid-cols-[6.5rem_1fr_auto] gap-x-4 items-baseline py-[11px] text-[17px]">
                    <span className="hidden sm:block text-ink/70">{r.kind}</span>
                    <span className="font-semibold group-hover:text-primary transition-colors">{r.name}</span>
                    <span className="tabular-nums text-right whitespace-nowrap">{r.price}</span>
                  </Link>
                </Rise>
              ))}
            </ul>
          ))}
          <p className="mt-11 text-[17px] max-w-[42ch]">For a few hundred pieces or more, send the quantity on WhatsApp and we quote a better rate.</p>
        </div>
      </div>
    </section>
  );
}

/* ───────────── How an order goes: lines that step across ───────────── */
function Stairs() {
  return (
    <section className={`${WRAP} pt-24 lg:pt-36`}>
      <ol className="space-y-14">
        {STAIRS.map(([line, text], i) => {
          const Tag = i === 0 ? 'h2' : 'p';
          return (
            <Rise as="li" key={line} i={i} style={{ '--i': i }} className="pl-[calc(var(--i)*6vw)] lg:pl-[calc(var(--i)*16.66%)]">
              <Tag className={`font-display font-extrabold tracking-[-0.03em] leading-[1.05] text-[clamp(24px,2.4vw,36px)] ${i === STAIRS.length - 1 ? 'text-primary' : ''}`}>{line}</Tag>
              <p className="text-[17px] leading-relaxed mt-3 max-w-[34ch]">{text}</p>
            </Rise>
          );
        })}
      </ol>
    </section>
  );
}

/* ───────────── The shop: prints dropped on the headline ───────────── */
function Shop() {
  const [front, setFront] = useState(null);
  const print = (k, extra) => ({
    onMouseEnter: () => setFront(k), onFocus: () => setFront(k), tabIndex: 0,
    className: `absolute bg-paper p-2 transition-transform duration-200 outline-none focus-visible:ring-4 focus-visible:ring-ink ${front === k ? 'z-30 !rotate-0' : 'z-20'} ${extra}`,
  });
  return (
    <section className="relative bg-paper3 min-h-[70svh] lg:min-h-[86svh] overflow-hidden flex items-center justify-center" onMouseLeave={() => setFront(null)}>
      <h2 className={`${DISPLAY} text-center text-[clamp(56px,7vw,112px)] leading-[0.9] relative z-10`}>Every<br />media</h2>
      <div {...print('a', 'w-[34vw] lg:w-[18vw] aspect-[3/4] -rotate-[8deg] -left-[3vw] lg:left-[6vw] top-[3%] lg:top-[8%]')}><img src="/photos/large-printer.webp" alt="A wide-format printer printing a banner" loading="lazy" className="w-full h-full object-cover" /></div>
      <div {...print('b', 'w-[34vw] lg:w-[18vw] aspect-[3/4] rotate-[6deg] -right-[3vw] lg:right-[8vw] bottom-[24%] lg:bottom-auto lg:top-[30%]')}><img src="/photos/spiral-binding.jpg" alt="Wire binding on a calendar" loading="lazy" className="w-full h-full object-cover" /></div>
      <div {...print('c', 'hidden lg:block w-[14vw] aspect-[3/4] rotate-[3deg] left-[40vw] -bottom-[8%]')}><img src="/photos/ink-trays.webp" alt="Cyan, magenta and yellow ink on a press" loading="lazy" className="w-full h-full object-cover" /></div>
      <p className="absolute left-4 sm:left-7 xl:left-10 bottom-6 right-4 lg:right-auto z-30 text-[17px] max-w-[52ch]">Visiting cards, stickers, invitations, flyers, synthetic, bill books, brochures, letterheads, texture board, branding, ID cards and certificates, on any media up to 13 × 19 in and 350 gsm.</p>
    </section>
  );
}

/* ───────────── Designs ready to order ───────────── */
function Designs({ tabs }) {
  const [pick, setPick] = useState(tabs[0]?.key);
  const tab = tabs.find((t) => t.key === pick) || tabs[0];
  if (!tab) return null;
  return (
    <section className={`${WRAP} pt-24 lg:pt-36`}>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
        <Rise as="h2" className={HEAD}>Ready to order</Rise>
        {tabs.length > 1 && (
          <Rise i={1} className="flex flex-wrap gap-x-6 gap-y-2" role="tablist" aria-label="Kinds of design">
            {tabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={t.key === tab.key} onClick={() => setPick(t.key)} className={`text-xl font-semibold pb-1 transition-colors ${t.key === tab.key ? 'text-ink' : 'text-ink/60 hover:text-ink'}`}>
                {t.label}
                {t.key === tab.key && <motion.span layoutId="design-tab" className="block h-[3px] bg-ink mt-1" />}
              </button>
            ))}
          </Rise>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-10 sm:gap-x-5 mt-12">
          {tab.items.slice(0, 8).map((p) => <ProductCard key={p.code} product={p} />)}
        </motion.div>
      </AnimatePresence>
      <Link to="/cards" className="mt-12 inline-flex items-center gap-2 text-xl font-semibold underline underline-offset-[6px] decoration-2 hover:text-primary">All {tab.total} designs <span aria-hidden="true">→</span></Link>
    </section>
  );
}

/* ───────────── Questions: large on the left, answers beside ───────────── */
function Questions({ faqs }) {
  return (
    <section id="faq" className={`${WRAP} scroll-mt-28 pt-24 lg:pt-36`}>
      <Rise as="h2" className={HEAD}>Questions people ask</Rise>
      <dl className="mt-12 lg:mt-16 space-y-10 lg:space-y-12">
        {faqs.slice(0, 7).map((f, i) => (
          <Rise key={f.q} i={Math.min(i, 3)} className="grid lg:grid-cols-12 gap-x-8 gap-y-3">
            <dt className="lg:col-span-6 font-display font-semibold text-[clamp(20px,1.7vw,26px)] leading-[1.2] tracking-[-0.02em]">{f.q}</dt>
            <dd className="lg:col-start-8 lg:col-span-5 text-lg leading-[1.55] max-w-[42ch] lg:pt-2">{f.a}</dd>
          </Rise>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Visit: the phone number as the headline ───────────── */
function Visit({ settings }) {
  const links = googleBusinessLinks(settings);
  const [now] = useState(() => new Date());
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(now).map((x) => [x.type, x.value]));
  const [fromH, toH] = parts.weekday === 'Sun' ? [10, 20] : [9, 22];
  const hour = Number(parts.hour) % 24;
  const open = hour >= fromH && hour < toH;
  return (
    <section className="mt-24 lg:mt-36 bg-ink text-paper flex flex-col">
      <div className={`${WRAP} w-full flex-1 flex flex-col py-16 lg:py-24`}>
        <div className="grid lg:grid-cols-12 gap-8">
          <Rise as="h2" className="lg:col-span-6 text-[clamp(20px,1.6vw,24px)] leading-snug max-w-[30ch] font-semibold">Send your logo and the quantity. We reply with a price, usually the same day.</Rise>
        </div>
        <a href={shopWhatsAppLink('Hi Zaro Digitz! I would like a price for printing.', settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp 97877 02336" className={`font-display font-extrabold tracking-[-0.04em] leading-none mt-12 block text-[clamp(38px,4.4vw,68px)] whitespace-nowrap tabular-nums transition-colors hover:text-[rgb(var(--accent-light-rgb))]`}>
          97877 02336
        </a>
        <p className="mt-4 text-lg inline-flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${open ? 'bg-emerald-400' : 'bg-red-300'}`} aria-hidden="true" />
          {open ? `Open now, until ${toH - 12} pm` : `Closed now, opens at ${fromH} am`}
        </p>
        <div className="mt-10 grid sm:grid-cols-2 gap-6 text-[17px]">
          <p>{BUSINESS.address.streetAddress}, Sivakasi {BUSINESS.address.postalCode}<br />Monday to Saturday 9 am to 10 pm, Sunday 10 am to 8 pm</p>
          <p className="flex flex-wrap gap-x-6 gap-y-2 sm:justify-end sm:self-end font-semibold">
            <a className="underline underline-offset-4 hover:text-[rgb(var(--accent-light-rgb))]" href={shopWhatsAppLink('Hi Zaro Digitz!', settings.whatsappNumber)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a className="underline underline-offset-4 hover:text-[rgb(var(--accent-light-rgb))]" href="tel:+919787702336">Call</a>
            <a className="underline underline-offset-4 hover:text-[rgb(var(--accent-light-rgb))]" href={links.directions} target="_blank" rel="noopener noreferrer">Directions</a>
          </p>
        </div>
      </div>
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

  // Admin → Settings → Home page: which sections and preview tabs are shown (all on by default).
  const show = (key) => settings.homeSections?.[key] !== false;
  const heroModes = ['calendar', 'diary', 'wedding'].filter((m) => settings.heroTabs?.[m] !== false);
  const mode = heroModes.includes(modePick) ? modePick : (heroModes[0] || 'calendar');
  const proofHref = shopWhatsAppLink(`Hi Zaro Digitz! ${LIVE_MODES[mode].proof(liveValues(mode, live))}`, settings.whatsappNumber);

  const designTabs = useMemo(() => {
    const isCard = (p) => /wedding|invitation|scroll|acrylic|foil|box invitation/i.test(p.category);
    const make = (key, label, items) => ({ key, label, items, total: items.length });
    return [
      show('favourites') && make('favourites', 'Calendars first', [...priced].sort((a, b) => Number(/diar|calendar/i.test(b.category)) - Number(/diar|calendar/i.test(a.category)))),
      show('printing') && make('printing', 'Printing', priced.filter((p) => !isCard(p))),
      show('budget') && make('budget', 'Wedding cards', priced.filter(isCard).sort((a, b) => a.price - b.price)),
    ].filter(Boolean);
  }, [priced, settings.homeSections]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-paper text-ink">
      <Seo path="/" jsonLd={faqSchema(getFaqs(settings))} />
      <Hero settings={settings} />
      {show('benefits') && <Shop />}
      {show('services') && <Prices products={priced} showFacts={show('numbers')} showInvites={show('traditions')} />}
      {show('newyear') && <Yearly products={priced} />}
      {show('timeline') && <Stairs />}
      {designTabs.length > 0 && <Designs tabs={designTabs} />}
      {heroModes.length > 0 && <TryIt heroModes={heroModes} mode={mode} setMode={setMode} live={live} setLive={setLive} proofHref={proofHref} />}
      {show('reviews') && <div className="pt-24 lg:pt-36"><GoogleReviews /></div>}
      {show('faq') && <Questions faqs={getFaqs(settings)} />}
      {show('visit') ? <Visit settings={settings} /> : <div className="pb-32" />}
    </div>
  );
}
