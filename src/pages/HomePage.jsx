import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import Seo from '../components/Seo';
import { faqSchema, getFaqs, categoryPath, productPath } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { getCatalogProducts, PLACEHOLDER_IMAGE } from '../data/products';
import { qtyRules } from '../utils/pricing';
import ProductCard from '../components/ProductCard';
import { hasPhoto } from '../components/sketchFor';
import { CategorySketch, InviteCardSketch, EnvelopeSketch, ScrollSketch, GiftBoxSketch, AcrylicSketch, CalendarSketch, ThoranamSketch, KolamSketch } from '../components/Sketches';
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

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
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
function Rail({ items }) {
  const [at, setAt] = useState(0);
  const scroller = (el) => el && (el.onscroll = () => {
    const w = el.firstElementChild?.offsetWidth || 1;
    setAt(Math.min(items.length - 1, Math.round(el.scrollLeft / (w + 16))));
  });
  const move = (dir) => {
    const el = document.getElementById('fav-rail');
    const w = el?.firstElementChild?.offsetWidth || 280;
    el?.scrollBy({ left: dir * (w + 16), behavior: 'smooth' });
  };
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="tabular-nums text-lg" aria-live="polite">{at + 1} / {items.length}</span>
        <button type="button" aria-label="Previous designs" onClick={() => move(-1)} className="w-12 h-12 bg-paper2 hover:bg-paper3 text-xl transition-colors">←</button>
        <button type="button" aria-label="Next designs" onClick={() => move(1)} className="w-12 h-12 bg-paper2 hover:bg-paper3 text-xl transition-colors">→</button>
      </div>
      <div id="fav-rail" ref={scroller} className="col-span-full flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none mt-8 -mx-4 px-4 sm:-mx-8 sm:px-8">
        {items.map((p) => (
          <div key={p.code} className="snap-start shrink-0 w-[72%] sm:w-[42%] lg:w-[23%]"><ProductCard product={p} /></div>
        ))}
      </div>
    </>
  );
}

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

export default function HomePage() {
  const { settings } = useShopSettings();
  const [catalogProducts, setCatalogProducts] = useState(() => getCatalogProducts());
  // The live card: what the visitor types appears on the invitation as they type.
  const [card, setCard] = useState({ bride: '', groom: '', date: '', town: '' });
  const [tab, setTab] = useState('Wedding');

  useEffect(() => {
    const sync = () => setCatalogProducts(getCatalogProducts());
    sync();
    window.addEventListener('digitz-catalog-updated', sync);
    return () => window.removeEventListener('digitz-catalog-updated', sync);
  }, []);

  const priced = useMemo(() => catalogProducts.filter((p) => p.price != null), [catalogProducts]);
  const groups = useMemo(() => {
    const by = new Map();
    priced.forEach((p) => { if (!by.has(p.category)) by.set(p.category, []); by.get(p.category).push(p); });
    return [...by.entries()].map(([name, items]) => ({ name, items: items.sort((a, b) => a.price - b.price) }));
  }, [priced]);
  const favourites = useMemo(() => [...priced].sort((a, b) => a.price - b.price).slice(0, 10), [priced]);
  const tiles = useMemo(() => [...priced].sort((a, b) => (b.sortOrder ?? b.id ?? 0) - (a.sortOrder ?? a.id ?? 0)).slice(0, 8), [priced]);

  const bride = card.bride.trim() || 'Priya';
  const groom = card.groom.trim() || 'Arjun';
  const when = fmtDate(card.date) || 'Sunday, 24 January 2027';
  const town = card.town.trim() || 'Sivakasi';
  const proofHref = shopWhatsAppLink(`Hi Zaro Digitz! Please send me a proof for our wedding card.\nNames: ${bride} & ${groom}\nDate: ${when}\nPlace: ${town}`, settings.whatsappNumber);

  const showcase = {
    Wedding: { title: 'Wedding cards', text: 'Hindu, Muslim and Christian invitations, from a simple single card to scrolls, acrylic and keepsake boxes, in Tamil, English or both.', to: '/cards', cat: 'Hindu Wedding Cards' },
    Functions: { title: 'Function cards', text: 'Birthdays, house warmings, ear piercing, valaikappu and puberty ceremonies, each printed with your family names and the venue.', to: categoryPath('House Warming Invitations'), cat: 'Birthday Invitations' },
    Printing: { title: 'Printing', text: 'Calendars, diaries, return gifts, visiting cards and bill books, printed on the same presses as our invitations.', to: categoryPath('Diaries & Calendars'), cat: 'Diaries & Calendars' },
  }[tab];

  const field = 'w-full bg-white/10 text-white placeholder-white/60 px-4 py-3 text-base focus:outline-none focus:bg-white/15 focus-visible:ring-2 focus-visible:ring-secondary';

  return (
    <div className="bg-paper text-ink">
      <Seo path="/" jsonLd={faqSchema(getFaqs(settings))} />

      {/* HERO: the invitation card, filled in by the visitor, beside the room */}
      <section className="bg-[#5A1420] dark:bg-night p-3 sm:p-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:min-h-[calc(100svh-108px)]">
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
        <Rail items={favourites} />
      </section>

      {/* SHOWCASE: what we print, one plate at a time */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-24 lg:py-32 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <Rise className="relative aspect-square overflow-hidden bg-paper2 text-brand">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, rotate: -3 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 3 }} transition={{ duration: 0.5 }} className="absolute inset-0 p-10 sm:p-16">
              {tab === 'Wedding' && <InviteCardSketch className="w-full h-full" />}
              {tab === 'Functions' && <KolamSketch className="w-full h-full" />}
              {tab === 'Printing' && <CalendarSketch className="w-full h-full" />}
            </motion.div>
          </AnimatePresence>
        </Rise>
        <div className="flex flex-col gap-10 lg:min-h-[520px] justify-between">
          <Rise i={1} as="div">
            <div role="tablist" aria-label="What we print" className="flex gap-6 text-lg">
              {['Wedding', 'Functions', 'Printing'].map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`pb-1 font-semibold transition-colors ${tab === t ? 'text-brand border-b-4 border-secondary' : 'text-ink/70 hover:text-ink'}`}>{t}</button>
              ))}
            </div>
          </Rise>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
              <h2 className="font-display font-bold tracking-tight text-[clamp(32px,3.4vw,48px)] leading-tight">{showcase.title}</h2>
              <p className="text-lg mt-6 max-w-[38ch]">{showcase.text}</p>
            </motion.div>
          </AnimatePresence>
          <Rise i={2} className="grid grid-cols-2">
            <Link to={showcase.to} className="h-[72px] px-5 flex items-center bg-primary text-white font-semibold hover:bg-[#5A1420] transition-colors">See the designs</Link>
            <Link to={categoryPath(showcase.cat)} className="h-[72px] px-5 flex items-center bg-paper2 text-ink font-semibold hover:bg-paper3 transition-colors">{showcase.cat}</Link>
          </Rise>
        </div>
      </section>

      {/* TRADITIONS: every kind of card, drawn */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-24 lg:pb-32">
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

      {/* PRICES: one giant word, then every category as a bar that opens */}
      <section className="bg-paper2 py-24 lg:py-32">
        <div className="max-w-[640px] mx-auto px-4 [container-type:inline-size]">
          <Rise as="h2" className="font-display font-bold uppercase text-brand leading-[0.8] tracking-tight text-[21cqw] whitespace-nowrap">Prices</Rise>
          <Rise i={1} as="p" className="text-lg mt-6">Price per card, printing of your names and wording included. Bigger orders cost less per card; each design shows its bulk price.</Rise>
          <div className="mt-8 flex flex-col gap-1.5">
            {groups.map((g, gi) => (
              <Rise key={g.name} i={Math.min(gi, 6)}>
                <details open={gi === 0} className="group bg-paper">
                  <summary className="h-14 px-5 flex items-center justify-between cursor-pointer list-none font-semibold hover:bg-paper3 transition-colors">
                    <span>{g.name}</span>
                    <span className="text-brand text-2xl leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <ul className="px-5 pb-5 pt-1 space-y-3.5">
                    {g.items.map((p) => (
                      <li key={p.code}>
                        <Link to={productPath(p)} className="flex justify-between gap-4 hover:text-brand transition-colors">
                          <span>{p.name}</span>
                          <span className="tabular-nums font-semibold whitespace-nowrap">{money(p.price)} <span className="font-normal text-ink/70">/ {String(p.per || 'card').replace(/^1\s+/, '')}</span></span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </Rise>
            ))}
          </div>
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

      {/* HOW IT WORKS: printed as a receipt slip */}
      <section className="bg-primary dark:bg-[#3A0E16] text-white py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <Rise as="h2" className="font-display font-bold tracking-tight text-[clamp(40px,4.4vw,68px)] leading-[1.02]">From your phone to the press</Rise>
            <Rise i={1} as="p" className="text-lg mt-6 max-w-[30ch] text-white/90">Nothing is printed until you have seen your own card, with your own names, and said yes.</Rise>
          </div>
          <Rise i={2} className="lg:col-start-7 lg:col-span-5 w-full max-w-[480px] bg-paper text-ink p-7 pb-16 [clip-path:polygon(0_0,100%_0,100%_calc(100%-14px),95%_100%,90%_calc(100%-14px),85%_100%,80%_calc(100%-14px),75%_100%,70%_calc(100%-14px),65%_100%,60%_calc(100%-14px),55%_100%,50%_calc(100%-14px),45%_100%,40%_calc(100%-14px),35%_100%,30%_calc(100%-14px),25%_100%,20%_calc(100%-14px),15%_100%,10%_calc(100%-14px),5%_100%,0_calc(100%-14px))]">
            <h3 className="font-display font-bold text-2xl">Zaro Digitz, Sivakasi</h3>
            {[
              ['Today', [['Choose a design and quantity', '5 min'], ['Place the order online', '2 min']]],
              ['Within a day', [['We message you on WhatsApp', 'names, date, venue'], ['Your digital proof arrives', 'free changes']]],
              ['The week after', [['Printed on our Sivakasi presses', '5–7 days'], ['Packed flat and couriered', 'across India']]],
            ].map(([head, rows]) => (
              <div key={head} className="mt-7">
                <p className="font-bold">{head}</p>
                {rows.map(([a, b]) => (
                  <div key={a} className="flex items-baseline gap-2 mt-2.5 tabular-nums">
                    <span>{a}</span>
                    <span className="flex-1 border-b-[3px] border-dotted border-ink/40 translate-y-[-4px]" aria-hidden="true" />
                    <span className="text-right">{b}</span>
                  </div>
                ))}
              </div>
            ))}
            <div className="mt-8 -mx-7 h-11 px-7 bg-ink text-paper flex items-center justify-between font-semibold">
              <span>Your cards, in your hands</span><span className="tabular-nums">about a week</span>
            </div>
          </Rise>
        </div>
      </section>

      {/* DESIGNS: each one a print with its swing tag */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-24 lg:py-32">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <Rise as="h2" className="font-display font-bold tracking-tight text-[32px] leading-tight">Designs to start from</Rise>
          <Rise i={1}><Link to="/cards" className="text-lg font-semibold text-brand underline underline-offset-4 decoration-2 hover:decoration-secondary">All designs</Link></Rise>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-7">
          {tiles.map((p, i) => {
            const pair = [['bg-primary', 'text-white'], ['bg-[#C9A032]', 'text-[#211114]'], ['bg-[#211114]', 'text-[#F3DFA2]'], ['bg-paper2', 'text-ink']][i % 4];
            return (
              <Rise key={p.code} i={i % 4}>
                <Link to={productPath(p)} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <div className="aspect-[4/5] overflow-hidden bg-paper2 text-brand">
                    {hasPhoto(p)
                      ? <img src={p.image} alt={p.name} width="400" height="500" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }} />
                      : <CategorySketch category={p.category} className="w-full h-full p-6 transition-transform duration-700 group-hover:scale-105 group-hover:-rotate-2" />}
                  </div>
                  <div className={`${pair[0]} ${pair[1]} p-3 min-h-[92px] text-[13px] tabular-nums flex flex-col justify-between`}>
                    <div className="flex justify-between font-semibold text-sm"><span>{money(p.price)}</span><span>min {qtyRules(p).min}</span><span className="hidden sm:inline">{p.size || '—'}</span></div>
                    <p className="font-semibold text-base leading-snug group-hover:underline">{p.name}</p>
                    <div className="flex justify-between opacity-90"><span>{p.code}</span><span className="hidden sm:inline">{p.category.replace(/ (Cards|Invitations)$/, '')}</span></div>
                  </div>
                </Link>
              </Rise>
            );
          })}
        </div>
      </section>

      {/* FAQ beside the photographs */}
      <section id="faq" className="scroll-mt-28 bg-night text-white py-24 lg:pt-0 lg:pb-40 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 lg:pt-40">
            <Rise as="h2" className="font-display font-bold tracking-tight text-[clamp(30px,3vw,44px)] leading-tight">Before you order</Rise>
            <Rise i={1} className="mt-6 space-y-1 text-lg text-white/90">
              <p>{BUSINESS.address.streetAddress}, Sivakasi {BUSINESS.address.postalCode}</p>
              <p>Monday to Saturday, 9 am to 10 pm</p>
              <p>Call or WhatsApp <a href="tel:+919787702336" className="underline underline-offset-4 hover:text-secondary">+91 97877 02336</a></p>
            </Rise>
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
            <div className="flex flex-wrap items-center gap-6 mt-12">
              <a href={shopWhatsAppLink('Hi Zaro Digitz! I have a question about invitation cards.', settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="on-light inline-flex items-center gap-2 h-14 px-7 bg-secondary text-dark font-bold transition-transform hover:-translate-y-0.5"><FaWhatsapp /> Ask us on WhatsApp</a>
              <a href={googleBusinessLinks(settings).directions} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold underline underline-offset-4 hover:text-secondary">Directions to the shop</a>
            </div>
          </div>
          <div className="lg:col-start-7 lg:col-span-6 relative">
            <Rise className="aspect-[3/4] bg-paper text-brand flex items-center justify-center p-10 lg:mt-40"><ScrollSketch className="w-full h-auto" /></Rise>
            <Rise i={2} className="absolute -bottom-10 -left-4 lg:-left-10 w-[42%] aspect-square bg-secondary text-[#211114] p-5 ring-[10px] ring-night"><GiftBoxSketch className="w-full h-full" /></Rise>
          </div>
        </div>
      </section>

      {/* VISIT: the studio on Maruthu Pandiyar Mettu Street */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-24 lg:py-32 grid lg:grid-cols-2 gap-10 items-stretch">
        <div className="flex flex-col justify-between gap-8">
          <div>
            <Rise as="h2" className="font-display font-bold tracking-tight text-[clamp(32px,3.4vw,48px)] leading-tight">Visit our Sivakasi studio</Rise>
            <Rise i={1} as="p" className="text-lg mt-5 max-w-[40ch]">See paper, foil and finishes in your hand, look through sample cards and sit with us to set your wording.</Rise>
            <Rise i={2} className="mt-8 text-lg space-y-1">
              <p className="font-semibold">{BUSINESS.address.streetAddress}</p>
              <p>Sivakasi, Virudhunagar, Tamil Nadu {BUSINESS.address.postalCode}</p>
              <p>Monday to Saturday 9 am – 10 pm · Sunday 10 am – 8 pm</p>
            </Rise>
          </div>
          <Rise i={3} className="flex flex-wrap gap-3">
            <a href={googleBusinessLinks(settings).directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-14 px-7 bg-primary text-white font-bold hover:bg-[#5A1420] transition-colors">Get directions</a>
            <a href="tel:+919787702336" className="inline-flex items-center h-14 px-7 bg-paper2 hover:bg-paper3 font-semibold transition-colors">Call before you come</a>
          </Rise>
        </div>
        <Rise i={1} className="min-h-[360px] bg-paper2">
          <iframe title="Map to Zaro Digitz, Sivakasi" src={googleBusinessLinks(settings).embed} className="w-full h-full min-h-[360px] grayscale-[30%]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </Rise>
      </section>

      {/* WHATSAPP: talk to a person */}
      <section className="bg-paper2">
        <ThoranamSketch className="w-full h-auto text-brand" count={14} />
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-20 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <Rise as="h2" className="font-display font-bold tracking-tight text-[clamp(32px,3.4vw,48px)] leading-tight">Not sure which card? Ask us</Rise>
            <Rise i={1} as="p" className="text-lg mt-4 max-w-[46ch]">Send your event date, guest count and a colour you like. We reply with three designs and their prices, usually within the hour.</Rise>
          </div>
          <Rise i={2} className="lg:col-span-5 lg:justify-self-end">
            <a href={shopWhatsAppLink('Hi Zaro Digitz! My event date is ___, about ___ guests. Can you suggest three designs?', settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 h-16 px-8 bg-[#1F7A4D] text-white text-lg font-bold hover:-translate-y-0.5 transition-transform"><FaWhatsapp size={22} /> Chat on WhatsApp</a>
          </Rise>
        </div>
      </section>

      {/* CLOSE: the idea again, inverted */}
      <section className="bg-[#211114] dark:bg-black text-[#FBF5EC] min-h-[80svh] lg:min-h-[90svh] flex flex-col justify-between px-4 sm:px-8 py-20">
        <Rise as="p" className="font-display font-bold tracking-tight leading-[0.92] text-[15vw] lg:text-[10vw] max-w-[12ch]" aria-hidden="true">Your names, on paper</Rise>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mt-16">
          <Rise i={1} as="p" className="text-xl max-w-[34ch]">Pick a design today and your proof can be on your phone tomorrow.</Rise>
          <Rise i={2}><Link to="/cards" className="on-light w-full lg:w-auto inline-flex items-center justify-center h-14 px-10 bg-secondary text-dark font-bold text-lg transition-transform hover:-translate-y-0.5">Choose a design</Link></Rise>
        </div>
      </section>
    </div>
  );
}
