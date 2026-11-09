import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import Seo from '../components/Seo';
import { faqSchema, getFaqs, categoryPath } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { getCatalogProducts } from '../data/products';

import ProductCard from '../components/ProductCard';

import { LuAward, LuCalendarDays, LuClock, LuContact, LuFileText, LuIdCard, LuLayers, LuMapPin, LuMegaphone, LuNavigation, LuNewspaper, LuNotebook, LuPackage, LuPhone, LuReceipt, LuSticker } from 'react-icons/lu';
import { PhoneProofSketch, PrinterSketch, InviteCardSketch, EnvelopeSketch, ScrollSketch, GiftBoxSketch, AcrylicSketch, CalendarSketch, ThoranamSketch, KolamSketch } from '../components/Sketches';
import { googleBusinessLinks, BUSINESS } from '../seo/site';

/* The things we make, drawn: the hero's stage cycles through them. */
const STAGE = [
  { Sketch: InviteCardSketch, caption: 'Folded cards with a kalash, foiled in gold' },
  { Sketch: EnvelopeSketch, caption: 'Envelopes closed with a wax seal' },
  { Sketch: ScrollSketch, caption: 'Royal scrolls with a silk tassel' },
  { Sketch: GiftBoxSketch, caption: 'Keepsake boxes tied with ribbon' },
  { Sketch: AcrylicSketch, caption: 'Clear acrylic with a mandala' },
];

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 } }),
};
const Rise = ({ i = 0, className, children, as = 'div' }) => {
  const M = motion[as];
  return <M variants={rise} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className={className}>{children}</M>;
};

const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/** Stripe of ink and paper bars, the card's only ornament (and the page's). */
function Stripe({ tall = 'h-12' }) {
  return (
    <div className={`flex ${tall} overflow-hidden`} aria-hidden="true">
      {Array.from({ length: 40 }, (_, i) => <span key={i} className={`shrink-0 w-7 ${i % 2 ? 'bg-[#FBF5EC]' : 'bg-primary'}`} />)}
    </div>
  );
}

/** The stage beside the card: one of our pieces draws itself, holds, then gives way to the next. */
function Stage({ className = '' }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return undefined;
    const t = setInterval(() => { if (document.visibilityState === 'visible') setI((n) => (n + 1) % STAGE.length); }, 5200);
    return () => clearInterval(t);
  }, [reduce]);
  const { Sketch, caption } = STAGE[i];
  return (
    <div className={`relative overflow-hidden bg-paper2 text-brand flex flex-col ${className}`}>
      <ThoranamSketch className="w-full h-auto shrink-0" count={10} />
      <div className="relative flex-1 min-h-[260px]">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.6 }} className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <Sketch className="w-full max-w-[340px] h-auto flex-1 min-h-0" />
            <p className="text-ink text-lg font-medium mt-3 text-center">{caption}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-2 pb-5" role="tablist" aria-label="Pieces we make">
        {STAGE.map((st, n) => (
          <button key={st.caption} type="button" role="tab" aria-selected={n === i} aria-label={st.caption} onClick={() => setI(n)} className={`h-2.5 transition-[width,background-color] ${n === i ? 'w-8 bg-primary' : 'w-2.5 bg-ink/30 hover:bg-ink/50'}`} />
        ))}
      </div>
    </div>
  );
}

/** A row of designs that scrolls sideways, with arrows and a "3 / 10" counter. */
function Rail({ items, id }) {
  const [at, setAt] = useState(0);
  const scroller = (el) => el && (el.onscroll = () => {
    const w = el.firstElementChild?.offsetWidth || 1;
    setAt(Math.min(items.length - 1, Math.round(el.scrollLeft / (w + 20))));
  });
  const move = (dir) => {
    const el = document.getElementById(id);
    const w = el?.firstElementChild?.offsetWidth || 280;
    el?.scrollBy({ left: dir * (w + 20), behavior: 'smooth' });
  };
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="tabular-nums text-lg" aria-live="polite">{at + 1} / {items.length}</span>
        <button type="button" aria-label="Previous designs" onClick={() => move(-1)} className="w-12 h-12 bg-paper2 hover:bg-paper3 text-xl transition-colors">←</button>
        <button type="button" aria-label="Next designs" onClick={() => move(1)} className="w-12 h-12 bg-paper2 hover:bg-paper3 text-xl transition-colors">→</button>
      </div>
      <div id={id} ref={scroller} className="col-span-full flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-none mt-10 pb-2">
        {items.map((p) => (
          <div key={p.code} className="snap-start shrink-0 w-[78%] sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-60px)/4)]"><ProductCard product={p} /></div>
        ))}
      </div>
    </>
  );
}

const SERVICES = [
  { name: 'Visiting Cards & Stationery', label: 'Visiting cards', icon: LuContact },
  { name: 'Labels & Stickers', label: 'Stickers', icon: LuSticker },
  { name: 'Flyers & Brochures', label: 'Flyers & brochures', icon: LuNewspaper },
  { name: 'Bill Books & Receipt Books', label: 'Bill books', icon: LuReceipt },
  { name: 'Letterheads & Envelopes', label: 'Letterheads', icon: LuFileText },
  { name: 'ID Cards', label: 'ID cards', icon: LuIdCard },
  { name: 'Certificates', label: 'Certificates', icon: LuAward },
  { name: 'Synthetic & Texture Board Prints', label: 'Synthetic & texture board', icon: LuLayers },
  { name: 'School & College Notebooks', label: 'Notebooks', icon: LuNotebook },
  { name: 'Diaries & Calendars', label: 'Diaries & calendars', icon: LuCalendarDays },
  { name: 'Sweet & Cake Boxes', label: 'Boxes & packaging', icon: LuPackage },
  { name: 'Branding & Signage', label: 'Branding', icon: LuMegaphone },
];

const TRADITIONS = [
  { name: 'Hindu Wedding Cards', note: 'Kalash, kolam and temple borders', Sketch: InviteCardSketch },
  { name: 'Muslim Wedding Cards', note: 'Nikah and walima', Sketch: EnvelopeSketch },
  { name: 'Christian Wedding Cards', note: 'Church weddings', Sketch: InviteCardSketch },
  { name: 'Scroll Invitations', note: 'Rolled, tied and boxed', Sketch: ScrollSketch },
  { name: 'Acrylic Invitations', note: 'Clear, frosted, foiled', Sketch: AcrylicSketch },
  { name: 'Premium Box Invitations', note: 'Keepsakes for close family', Sketch: GiftBoxSketch },
  { name: 'Diaries & Calendars', note: 'For shops and offices', Sketch: CalendarSketch },
  { name: 'House Warming Invitations', note: 'Griha pravesam', Sketch: KolamSketch },
];

const STEPS = [
  {
    Sketch: InviteCardSketch, when: 'Today', title: 'Pick a design or send yours',
    text: 'Choose a design on the site, or send your own artwork, logo or text on WhatsApp.',
    need: 'Quantity, your event or delivery date, and your details', get: 'A clear price before anything starts',
  },
  {
    Sketch: PhoneProofSketch, when: 'Within a day', title: 'Approve the proof on WhatsApp',
    text: 'We set your names, wording and photos, and send a digital proof to your phone.',
    need: 'A quick check of spelling, dates and colours', get: 'Free changes until it is exactly right',
  },
  {
    Sketch: PrinterSketch, when: '1 to 7 days', title: 'Printed in our studio',
    text: 'In-house digital colour printing on all media up to 13 × 19 in and 350 gsm, with offset for big runs.',
    need: 'Nothing: printing starts after you approve', get: 'Foil, emboss, lamination and cutting as chosen',
  },
  {
    Sketch: GiftBoxSketch, when: 'Same day pickup · 2 to 5 days by courier', title: 'Packed and delivered',
    text: 'Packed flat and checked, then collected from our Sivakasi studio or couriered anywhere in India.',
    need: 'Your delivery address, or a time to collect', get: 'Your order, counted and ready to use',
  },
];

/** "From your phone to the press": a gold line fills as the reader scrolls; each step lights up as it is reached. */
function Timeline() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] });
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <section className="bg-primary dark:bg-[#3A0E16] text-white py-24 lg:py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="max-w-3xl">
          <Rise as="h2" className="font-display font-bold tracking-tight text-[clamp(36px,4.2vw,64px)] leading-[1.02]">From your phone to the press</Rise>
          <Rise i={1} as="p" className="text-lg text-white/90 mt-5 max-w-[52ch]">Wedding cards, notebooks, flyers or ID cards, every order follows the same four steps. You always see a proof first.</Rise>
        </div>

        <ol ref={ref} className="relative mt-16 lg:mt-20">
          {/* the track, and the gold line that fills it */}
          <span className="absolute left-[27px] lg:left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 bg-white/15" aria-hidden="true" />
          <motion.span style={{ scaleY: fill }} className="absolute left-[27px] lg:left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 bg-secondary origin-top" aria-hidden="true" />

          {STEPS.map(({ Sketch, when, title, text, need, get }, n) => {
            const right = n % 2 === 1;
            return (
              <li key={title} className="relative grid lg:grid-cols-2 gap-6 lg:gap-16 pl-20 lg:pl-0 pb-16 last:pb-0">
                <Step n={n} progress={scrollYProgress} />
                <motion.div
                  initial={{ opacity: 0, x: right ? 40 : -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className={`${right ? 'lg:col-start-2' : 'lg:text-right'}`}
                >
                  <p className="text-secondary font-semibold">{when}</p>
                  <h3 className="font-display font-bold text-2xl sm:text-3xl mt-1">{title}</h3>
                  <p className="text-lg text-white/90 mt-3">{text}</p>
                  <dl className={`mt-5 grid gap-3 text-[15px] ${right ? '' : 'lg:justify-items-end'}`}>
                    <div className="bg-white/10 px-4 py-3 max-w-md"><dt className="font-semibold">We need</dt><dd className="text-white/85">{need}</dd></div>
                    <div className="bg-white/10 px-4 py-3 max-w-md"><dt className="font-semibold">You get</dt><dd className="text-white/85">{get}</dd></div>
                  </dl>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className={`hidden lg:flex items-start ${right ? 'lg:col-start-1 lg:row-start-1 justify-end' : 'justify-start'}`}
                >
                  <div className="w-48 h-48 bg-paper text-brand p-8"><Sketch className="w-full h-full" /></div>
                </motion.div>
              </li>
            );
          })}
        </ol>

      </div>
    </section>
  );
}

/** A step's dot on the line: fills gold once the scroll reaches it. */
function Step({ n, progress }) {
  const at = n / (STEPS.length - 1 || 1);
  const on = useTransform(progress, [Math.max(0, at - 0.08), at], [0, 1]);
  return (
    <span className="absolute left-[27px] lg:left-1/2 top-0 -translate-x-1/2 w-14 h-14 rounded-full bg-[#5A1420] flex items-center justify-center z-10" aria-hidden="true">
      <motion.span style={{ scale: on, opacity: on }} className="absolute inset-0 rounded-full bg-secondary" />
      <span className="relative font-display font-bold text-xl">{n + 1}</span>
    </span>
  );
}

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
      <span className={`w-3 h-3 rounded-full ${open ? 'bg-emerald-400' : 'bg-red-400'}`} aria-hidden="true" />
      {open ? `Open now · until ${to > 12 ? to - 12 : to} pm` : `Closed now · opens ${from} am`}
    </p>
  );
}

export default function HomePage() {
  const { settings } = useShopSettings();
  const [catalogProducts, setCatalogProducts] = useState(() => getCatalogProducts());
  // The live card: what the visitor types appears on the invitation as they type.
  const [card, setCard] = useState({ bride: '', groom: '', date: '', town: '' });

  useEffect(() => {
    const sync = () => setCatalogProducts(getCatalogProducts());
    sync();
    window.addEventListener('digitz-catalog-updated', sync);
    return () => window.removeEventListener('digitz-catalog-updated', sync);
  }, []);

  const priced = useMemo(() => catalogProducts.filter((p) => p.price != null), [catalogProducts]);
  const favourites = useMemo(() => [...priced].sort((a, b) => a.price - b.price).slice(0, 10), [priced]);
  const isCard = (p) => /wedding|invitation|scroll|acrylic|foil|box invitation/i.test(p.category);
  const printing = useMemo(() => priced.filter((p) => !isCard(p)).slice(0, 10), [priced]); // eslint-disable-line react-hooks/exhaustive-deps
  const budget = useMemo(() => priced.filter(isCard).sort((a, b) => a.price - b.price).slice(0, 10), [priced]); // eslint-disable-line react-hooks/exhaustive-deps

  const bride = card.bride.trim() || 'Priya';
  const groom = card.groom.trim() || 'Arjun';
  const when = fmtDate(card.date) || 'Sunday, 24 January 2027';
  const town = card.town.trim() || 'Sivakasi';
  const proofHref = shopWhatsAppLink(`Hi Zaro Digitz! Please send me a proof for our wedding card.\nNames: ${bride} & ${groom}\nDate: ${when}\nPlace: ${town}`, settings.whatsappNumber);


  const field = 'w-full bg-white/10 text-white placeholder-white/60 px-4 py-3 text-base focus:outline-none focus:bg-white/15 focus-visible:ring-2 focus-visible:ring-secondary';

  return (
    <div className="bg-paper text-ink">
      <Seo path="/" jsonLd={faqSchema(getFaqs(settings))} />

      {/* HERO: the invitation card, filled in by the visitor, beside the room */}
      <section className="bg-[#5A1420] dark:bg-night p-3 sm:p-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:min-h-[calc(100svh-80px)]">
        <div className="bg-paper flex flex-col overflow-hidden">
          <Stripe />
          <div className="flex-1 flex flex-col items-center text-center px-6 sm:px-12 py-10 lg:py-12">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="text-brand text-3xl leading-none" lang="ta" aria-hidden="true">உ</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="font-display font-bold tracking-tight text-brand text-[clamp(40px,4.6vw,64px)] leading-[1.02] mt-5 max-w-[14ch]">
              Your names, printed in Sivakasi
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="text-lg text-ink mt-6 max-w-[40ch]">
              Wedding and function invitations from Zaro Digitz. Choose a design, approve a proof on WhatsApp, and we print it.
            </motion.p>

            {/* The card itself, updating as the visitor types */}
            <motion.div initial={{ opacity: 0, y: 24, rotate: -1.5 }} animate={{ opacity: 1, y: 0, rotate: -1.5 }} transition={{ duration: 0.8, delay: 0.3 }} whileHover={{ rotate: 0, y: -4 }} className="mt-10 w-full max-w-[340px] aspect-[5/7] bg-primary text-[#F3DFA2] p-3" aria-live="polite" aria-label="Your invitation preview">
              <div className="h-full ring-2 ring-[#C9A032] ring-inset flex flex-col items-center justify-between py-8 px-5">
                <div>
                  <p className="text-xl" lang="ta" aria-hidden="true">உ</p>
                  <p className="text-sm mt-2" lang="ta">திருமண அழைப்பிதழ்</p>
                  <p className="text-sm text-[#EAC96E]">Wedding invitation</p>
                </div>
                <div className="w-full">
                  <AnimatePresence mode="wait">
                    <motion.p key={bride} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="font-display font-bold text-3xl text-white break-words">{bride}</motion.p>
                  </AnimatePresence>
                  <p className="text-[#C9A032] text-lg my-1">&amp;</p>
                  <AnimatePresence mode="wait">
                    <motion.p key={groom} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="font-display font-bold text-3xl text-white break-words">{groom}</motion.p>
                  </AnimatePresence>
                </div>
                <div className="text-sm">
                  <p className="text-white">{when}</p>
                  <p>{town}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mt-3 lg:mt-0 flex flex-col gap-3">
          <Stage className="h-[48svh] lg:h-auto lg:flex-1" />
          {/* The live thing: write your own card */}
          <form className="bg-night text-white p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); window.open(proofHref, '_blank', 'noopener'); }}>
            <h2 className="font-display font-bold text-2xl">Try your names on the card</h2>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <label className="block"><span className="sr-only">Bride&apos;s name</span><input className={field} maxLength={24} placeholder="Bride's name" value={card.bride} onChange={(e) => setCard({ ...card, bride: e.target.value })} /></label>
              <label className="block"><span className="sr-only">Groom&apos;s name</span><input className={field} maxLength={24} placeholder="Groom's name" value={card.groom} onChange={(e) => setCard({ ...card, groom: e.target.value })} /></label>
              <label className="block"><span className="sr-only">Wedding date</span><input type="date" className={field} value={card.date} onChange={(e) => setCard({ ...card, date: e.target.value })} /></label>
              <label className="block"><span className="sr-only">Town</span><input className={field} maxLength={30} placeholder="Town" value={card.town} onChange={(e) => setCard({ ...card, town: e.target.value })} /></label>
            </div>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link to="/cards" className="on-light inline-flex items-center h-14 px-7 bg-secondary text-dark font-bold transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Choose a design</Link>
              <button type="submit" className="inline-flex items-center gap-2 h-14 px-6 bg-white/10 hover:bg-white/20 font-semibold transition-colors"><FaWhatsapp /> Get this as a proof</button>
            </div>
          </form>
        </div>
      </section>

      {/* BENEFITS: the four promises, moving slowly */}
      <div className="bg-secondary text-[#211114] overflow-hidden py-4" aria-label="Our promises">
        <div className="marquee-wrapper">
          <span className="marquee-text text-lg font-semibold">
            {['Free digital proof on WhatsApp', 'Tamil, English or both', 'Gold foil, emboss and laser cut', 'Printed in Sivakasi', 'Courier across India', 'Bulk prices from 100 cards'].map((t) => <span key={t} className="mx-8 inline-flex items-center gap-3"><span className="w-2.5 h-2.5 rotate-45 bg-primary" aria-hidden="true" />{t}</span>)}
          </span>
        </div>
      </div>

      {/* FAVOURITES: designs people order most, gentlest prices first */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-24 lg:pt-32 grid grid-cols-[1fr_auto] items-end gap-y-2">
        <Rise as="h2" className="font-display font-bold tracking-tight text-[clamp(32px,3.4vw,48px)] leading-tight">Customer favourites</Rise>
        <Rail id="rail-favourites" items={favourites} />
      </section>

      {/* SERVICES: everything on the shop sign, one tap away */}
      <section className="bg-night text-[#FBF5EC] py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid lg:grid-cols-12 gap-6 items-end">
            <Rise as="h2" className="lg:col-span-7 font-display font-bold tracking-tight text-[clamp(32px,3.6vw,52px)] leading-tight">Digital colour printing, done here</Rise>
            <Rise i={1} as="p" className="lg:col-span-5 text-lg text-[#FBF5EC]/90">All media up to 13 × 19 inches and 350 gsm, printed in our Sivakasi studio. Small runs today, big runs this week.</Rise>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-12">
            {SERVICES.map(({ name, label, icon: Icon }, i) => (
              <Rise key={name} i={i % 4}>
                <Link to={categoryPath(name)} className="group h-28 sm:h-32 px-5 flex items-center gap-4 bg-white/5 hover:bg-secondary hover:text-[#211114] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
                  <Icon size={30} className="text-secondary group-hover:text-[#211114] transition-colors shrink-0" aria-hidden="true" />
                  <span className="font-display font-semibold text-lg leading-snug">{label}</span>
                </Link>
              </Rise>
            ))}
          </div>
        </div>
      </section>

      {/* PRINTING FAVOURITES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-24 lg:pt-32 pb-8 grid grid-cols-[1fr_auto] items-end gap-y-2">
        <Rise as="h2" className="font-display font-bold tracking-tight text-[clamp(32px,3.4vw,48px)] leading-tight">Printing favourites</Rise>
        <Rail id="rail-printing" items={printing} />
      </section>

      {/* TRADITIONS: every kind of card, drawn */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-24 lg:py-32">
        <Rise as="h2" className="font-display font-bold tracking-tight text-[clamp(32px,3.4vw,48px)] leading-tight">Browse by tradition and style</Rise>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
          {TRADITIONS.map(({ name, note, Sketch }, i) => (
            <Rise key={name} i={i % 4}>
              <Link to={categoryPath(name)} className="group block bg-paper2 hover:bg-paper3 transition-colors p-5 h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <div className="text-brand aspect-square"><Sketch className="w-full h-full transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105" /></div>
                <p className="font-display font-bold text-lg leading-snug mt-3">{name}</p>
                <p className="text-[15px]">{note}</p>
              </Link>
            </Rise>
          ))}
        </div>
      </section>

      {/* NUMBERS: the facts of the order */}
      <section className="bg-secondary text-[#211114]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-14 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[[`${catalogProducts.length}+`, 'designs to start from'], ['100', 'cards minimum, in steps of 50'], ['1 day', 'to your WhatsApp proof'], ['7 days', 'typical printing time']].map(([n, l], i) => (
            <Rise key={l} i={i}>
              <p className="font-display font-bold text-[clamp(40px,5vw,72px)] leading-none tabular-nums">{n}</p>
              <p className="text-lg mt-2">{l}</p>
            </Rise>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS: a timeline that fills as you scroll */}
      <Timeline />

      {/* BUDGET: lovely cards at gentle prices */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-24 lg:py-32 grid grid-cols-[1fr_auto] items-end gap-y-2">
        <Rise as="h2" className="font-display font-bold tracking-tight text-[clamp(32px,3.4vw,48px)] leading-tight">Budget-friendly wedding cards</Rise>
        <Rail id="rail-budget" items={budget} />
      </section>

      {/* FAQ beside the photographs */}
      <section id="faq" className="scroll-mt-28 bg-night text-white py-24 lg:pt-0 lg:pb-40 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 lg:pt-40">
            <Rise as="h2" className="font-display font-bold tracking-tight text-[clamp(30px,3vw,44px)] leading-tight">Before you order</Rise>
            <div className="mt-10 space-y-7">
              {getFaqs(settings).slice(0, 6).map((f, i) => (
                <Rise key={f.q} i={Math.min(i, 5)}>
                  <details className="group">
                    <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-xl font-semibold min-h-[44px] hover:text-secondary transition-colors">
                      {f.q}
                      <span className="w-3 h-3 border-r-2 border-b-2 border-current rotate-45 group-open:-rotate-[135deg] transition-transform shrink-0" aria-hidden="true" />
                    </summary>
                    <p className="text-[17px] text-white/85 mt-3 max-w-[52ch]">{f.a}</p>
                  </details>
                </Rise>
              ))}
            </div>
          </div>
          <div className="lg:col-start-7 lg:col-span-6 relative">
            <Rise className="aspect-[3/4] bg-paper text-brand flex items-center justify-center p-10 lg:mt-40"><ScrollSketch className="w-full h-auto" /></Rise>
            <Rise i={2} className="absolute -bottom-10 -left-4 lg:-left-10 w-[42%] aspect-square bg-secondary text-[#211114] p-5 ring-[10px] ring-night"><GiftBoxSketch className="w-full h-full" /></Rise>
          </div>
        </div>
      </section>

      {/* VISIT: the studio on Maruthu Pandiyar Mettu Street */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-12 gap-6 items-end mb-10">
          <Rise as="h2" className="lg:col-span-7 font-display font-bold tracking-tight text-[clamp(32px,3.4vw,48px)] leading-tight">Visit our Sivakasi studio</Rise>
          <Rise i={1} as="p" className="lg:col-span-5 text-lg">See paper, foil and finishes in your hand, look through samples, and sit with us to set your wording.</Rise>
        </div>
        <div className="grid lg:grid-cols-12 gap-3">
          <Rise className="lg:col-span-5 bg-night text-[#FBF5EC] p-8 sm:p-10 flex flex-col gap-8">
            <OpenNow />
            <div className="flex gap-4">
              <LuMapPin size={24} className="text-secondary shrink-0 mt-1" aria-hidden="true" />
              <div className="text-lg">
                <p className="font-semibold">{BUSINESS.address.streetAddress}</p>
                <p>Sivakasi, Virudhunagar, Tamil Nadu {BUSINESS.address.postalCode}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <LuClock size={24} className="text-secondary shrink-0 mt-1" aria-hidden="true" />
              <div className="text-lg">
                <p>Monday to Saturday, 9 am – 10 pm</p>
                <p>Sunday, 10 am – 8 pm</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-auto">
              <a href={googleBusinessLinks(settings).directions} target="_blank" rel="noopener noreferrer" className="on-light inline-flex items-center justify-center gap-2 h-14 bg-secondary text-[#211114] font-bold transition-transform hover:-translate-y-0.5"><LuNavigation size={18} aria-hidden="true" /> Directions</a>
              <a href="tel:+919787702336" className="inline-flex items-center justify-center gap-2 h-14 bg-white/10 hover:bg-white/20 font-semibold transition-colors"><LuPhone size={18} aria-hidden="true" /> Call</a>
            </div>
          </Rise>
          <Rise i={1} className="lg:col-span-7 min-h-[380px] bg-paper2">
            <iframe title="Map to Zaro Digitz, Sivakasi" src={googleBusinessLinks(settings).embed} className="w-full h-full min-h-[380px]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </Rise>
        </div>
      </section>

    </div>
  );
}
