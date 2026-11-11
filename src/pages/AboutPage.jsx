import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import Seo from '../components/Seo';
import { staticPage } from '../seo/pages';
import { breadcrumbSchema, googleBusinessLinks, BUSINESS } from '../seo/site';
import { categoryPath } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';

const WRAP = 'max-w-[1440px] mx-auto px-4 sm:px-7 xl:px-10';
const H2 = 'font-display font-extrabold tracking-[-0.05em] leading-[1.02] text-[clamp(32px,3.6vw,52px)]';
const rise = { hidden: { opacity: 0, y: 24 }, show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 } }) };
const Rise = ({ i = 0, as = 'div', className, children }) => {
  const M = motion[as];
  return <M variants={rise} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} className={className}>{children}</M>;
};

const PROMISES = [
  ['A proof before we print.', 'Every order gets a digital proof on WhatsApp. Nothing goes to the press until you say yes.'],
  ['Tamil, English or both.', 'We set your wording with care for spelling, and print in either language or both.'],
  ['One person for your order.', 'The person who takes your first message follows the order to dispatch, so you always know who to ask.'],
  ['Prices you can see.', 'Every design shows its price per piece. For big quantities we quote a better rate on WhatsApp or a call.'],
  ['Finishes in your hand.', 'Come to the studio to feel the boards, foils and laminations before you choose.'],
  ['Packed flat, sent anywhere.', 'Collect from the studio or we courier across India, packed flat and counted.'],
];

const MAKE = [
  { cat: 'Diaries & Calendars', title: 'Calendars and diaries', text: 'Desk and wall calendars, executive and pocket diaries, with your shop or company name. Our busiest work from October to January.', img: '/photos/calendar-pages.webp', big: true },
  { cat: 'Visiting Cards & Stationery', title: 'Printing for your business', text: 'Visiting cards, bill books, letterheads, flyers, stickers, ID cards and certificates.', img: '/photos/large-printer.webp' },
  { cat: 'Hindu Wedding Cards', title: 'Invitations', text: 'Wedding and function cards for every tradition, from single cards to scrolls and boxes.', img: '/photos/invitation-ribbon.webp' },
];

export default function AboutPage() {
  const { settings } = useShopSettings();
  const a = BUSINESS.address;
  return (
    <div className="bg-paper text-ink">
      <Seo
        title={staticPage('/about').title}
        description={staticPage('/about').description}
        path="/about"
        jsonLd={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'About Us', path: '/about' }])}
      />

      {/* The shop, introduced by its own visiting card */}
      <section className={`${WRAP} pt-14 sm:pt-20 pb-24 lg:pb-40 grid lg:grid-cols-2 gap-14 lg:gap-16 items-center`}>
        <div>
          <Rise as="h1" className="font-display font-extrabold tracking-[-0.05em] leading-[0.9] text-[clamp(40px,5.4vw,80px)] max-w-[13ch]">A print shop in Sivakasi</Rise>
          <Rise i={1} as="p" className="text-xl leading-relaxed mt-6 max-w-[44ch]">Zaro Digitz prints calendars, diaries, business stationery and invitations in its own studio, on paper and board up to 13 × 19 inches and 350 gsm.</Rise>
          <Rise i={2} className="flex flex-wrap gap-2 mt-10">
            <Link to="/cards" className="h-14 px-7 inline-flex items-center bg-primary text-white text-[17px] font-bold transition-colors hover:bg-primary-dark">See our designs</Link>
            <a href={shopWhatsAppLink(settings.whatsappGreeting, settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="h-14 px-6 inline-flex items-center gap-2 bg-paper2 text-[17px] font-semibold transition-colors hover:bg-paper3"><FaWhatsapp size={20} aria-hidden="true" /> Message us</a>
          </Rise>
        </div>
        <Rise i={1} className="relative">
          <div className="aspect-[1.75/1] bg-primary text-white p-7 sm:p-10 flex flex-col justify-between -rotate-2 transition-transform duration-500 hover:rotate-0">
            <div className="flex items-center gap-4">
              <img src="/zaro-logo-112.webp" width="64" height="64" alt="" className="w-12 h-12 sm:w-16 sm:h-16 object-contain bg-white rounded-full" />
              <div>
                <p className="font-display font-extrabold text-[clamp(26px,3vw,44px)] leading-none tracking-[-0.05em]">ZARO Digitz</p>
                <p className="text-white/85 text-lg mt-1">Digital Color Prints</p>
              </div>
            </div>
            <div className="text-[15px] sm:text-[17px] leading-snug">
              <p>{a.streetAddress}, Sivakasi {a.postalCode}</p>
              <p className="tabular-nums">+91 97877 02336 · {BUSINESS.email}</p>
            </div>
          </div>
        </Rise>
      </section>

      <Rise className={`${WRAP}`}><img src="/photos/ink-trays.webp" alt="Cyan, magenta and yellow ink in the trays of a press" loading="lazy" className="w-full aspect-[21/9] object-cover" /></Rise>

      {/* How the shop works, as reading text */}
      <section className="mt-24 lg:mt-40 bg-paper2 py-24 lg:py-40">
        <div className={`${WRAP} grid lg:grid-cols-12 gap-10 lg:gap-8`}>
          <Rise as="h2" className={`${H2} lg:col-span-4`}>How we work</Rise>
          <div className="lg:col-start-6 lg:col-span-7 space-y-6 text-xl leading-relaxed">
            <Rise as="p">Sivakasi has printed India’s calendars for generations. Our studio on Maruthu Pandiyar Mettu Street carries that on with digital colour presses: short runs the same week, long runs on offset with presses down the road.</Rise>
            <Rise i={1} as="p">You choose a design here or send your own. We set your name, logo and wording, send a proof to your phone, and print only after you approve it. Most orders are ready in five to seven working days.</Rise>
            <Rise i={2} as="p">Walk in to see paper, foil and finishes in your hand, or do the whole order on WhatsApp from anywhere in India.</Rise>
          </div>
        </div>
      </section>

      {/* What we make, with the pieces themselves */}
      <section className={`${WRAP} py-24 lg:py-40`}>
        <Rise as="h2" className={H2}>What we make</Rise>
        <div className="grid lg:grid-cols-12 gap-x-6 gap-y-14 mt-14">
          {MAKE.map((m, i) => (
            <Rise key={m.title} i={i} className={m.big ? 'lg:col-span-7 lg:row-span-2' : 'lg:col-span-5'}>
              <Link to={categoryPath(m.cat)} className="group block">
                <div className={`${m.big ? 'aspect-[4/3]' : 'aspect-[16/9]'} bg-paper2 overflow-hidden`}><img src={m.img} alt="" width="800" height="600" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" /></div>
                <h3 className="font-display font-bold text-[clamp(22px,2vw,30px)] mt-5 group-hover:text-primary transition-colors">{m.title}</h3>
                <p className="text-lg leading-relaxed mt-2 max-w-[48ch]">{m.text}</p>
              </Link>
            </Rise>
          ))}
        </div>
      </section>

      {/* Promises, as reading text */}
      <section className="bg-ink text-paper py-24 lg:py-40">
        <div className={`${WRAP} grid lg:grid-cols-12 gap-10 lg:gap-8`}>
          <Rise as="h2" className={`${H2} lg:col-span-4`}>What you can count on</Rise>
          <div className="lg:col-start-6 lg:col-span-7 md:columns-2 md:gap-14">
            {PROMISES.map(([t, d], i) => (
              <Rise key={t} i={Math.min(i, 4)} as="p" className="text-lg leading-[1.6] mb-6 break-inside-avoid"><strong className="font-semibold">{t}</strong> {d}</Rise>
            ))}
          </div>
        </div>
      </section>

      <section className={`${WRAP} py-24 lg:py-32 grid lg:grid-cols-2 gap-8 items-end`}>
        <Rise as="h2" className={H2}>Bring your logo, leave with a proof</Rise>
        <Rise i={1} className="flex flex-wrap gap-2 lg:justify-end">
          <a href={googleBusinessLinks(settings).directions} target="_blank" rel="noopener noreferrer" className="h-14 px-7 inline-flex items-center bg-primary text-white text-[17px] font-bold transition-colors hover:bg-primary-dark">Directions to the studio</a>
          <Link to="/contact" className="h-14 px-7 inline-flex items-center bg-paper2 text-[17px] font-semibold transition-colors hover:bg-paper3">Hours and phone numbers</Link>
        </Rise>
      </section>
    </div>
  );
}
