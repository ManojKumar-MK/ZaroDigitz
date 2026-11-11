import { Link } from 'react-router-dom';
import { categoryPath } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { googleBusinessLinks, BUSINESS } from '../seo/site';

const SHOP = [
  ['Diaries & Calendars', 'Calendars and diaries'],
  ['Visiting Cards & Stationery', 'Visiting cards'],
  ['Flyers & Brochures', 'Flyers and brochures'],
  ['Bill Books & Receipt Books', 'Bill books'],
  ['Hindu Wedding Cards', 'Wedding cards'],
].map(([c, l]) => [categoryPath(c), l]);
const STUDIO = [['/cards', 'All designs'], ['/about', 'About us'], ['/contact', 'Visit us'], ['/#faq', 'Questions'], ['/saved', 'Saved designs']];
const PHONES = ['+91 97877 02336', '+91 63696 19148', '+91 63830 34170'];

/** The back of the stationery: tiles that fill the last two rows, the name set large. */
export default function Footer() {
  const { settings } = useShopSettings();
  const a = BUSINESS.address;
  const tile = 'bg-[#3a1018] p-6 sm:p-7';
  const link = 'text-white/90 hover:text-white hover:underline underline-offset-4';
  return (
    <footer className="bg-night text-white p-2 sm:p-3">
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-2">
        <div className={`${tile} col-span-2 lg:col-span-4 min-h-[220px] flex flex-col justify-between gap-8 order-5 lg:order-none`}>
          <p className="text-[22px] leading-snug max-w-[30ch]">Digital colour printing from Sivakasi. Every order gets a proof on WhatsApp before we print.</p>
          <p className="text-sm text-white/75">© {new Date().getFullYear()} Zaro Digitz · GSTIN {BUSINESS.gstin}</p>
        </div>
        <nav aria-label="Shop" className={`${tile} lg:col-span-3 order-3 lg:order-none`}>
          <h2 className="font-display font-semibold text-[17px] text-[rgb(var(--accent-light-rgb))]">Shop</h2>
          <ul className="mt-4 space-y-2 text-[17px]">{SHOP.map(([to, l]) => <li key={to}><Link to={to} className={link}>{l}</Link></li>)}</ul>
        </nav>
        <nav aria-label="Studio" className={`${tile} lg:col-span-2 order-4 lg:order-none`}>
          <h2 className="font-display font-semibold text-[17px] text-[rgb(var(--accent-light-rgb))]">Studio</h2>
          <ul className="mt-4 space-y-2 text-[17px]">{STUDIO.map(([to, l]) => <li key={to}><Link to={to} className={link}>{l}</Link></li>)}</ul>
        </nav>
        <div className={`${tile} col-span-2 lg:col-span-3 flex flex-col justify-between gap-6 order-6 lg:order-none`}>
          <a href={googleBusinessLinks(settings).maps} target="_blank" rel="noopener noreferrer" className={`text-[17px] ${link}`}>{a.streetAddress},<br />Sivakasi, Tamil Nadu {a.postalCode}</a>
          <p className="grid text-[17px] tabular-nums">{PHONES.map((p) => <a key={p} href={`tel:${p.replace(/\s/g, '')}`} className={link}>{p}</a>)}</p>
          <a href={`mailto:${BUSINESS.email}`} className={`text-[17px] break-all ${link}`}>{BUSINESS.email}</a>
        </div>

        <Link to="/" className="col-span-2 lg:col-span-8 min-h-[160px] lg:min-h-[320px] bg-primary flex items-center justify-center order-1 lg:order-none transition-colors hover:bg-primary-dark" aria-label="Zaro Digitz home">
          <span className="font-display font-bold tracking-[-0.05em] leading-none text-[clamp(56px,9vw,148px)] text-white">ZARO Digitz</span>
        </Link>
        <a href={shopWhatsAppLink(settings.whatsappGreeting, settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="group col-span-2 lg:col-span-4 min-h-[160px] lg:min-h-[320px] bg-secondary text-[#211114] p-6 sm:p-7 flex flex-col justify-between order-2 lg:order-none">
          <span className="font-display font-bold text-[clamp(26px,2.2vw,34px)] leading-tight max-w-[12ch]">Ask for a price on WhatsApp</span>
          <svg viewBox="0 0 48 48" className="w-12 h-12 self-end transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" aria-hidden="true"><path d="M10 38 38 10M16 10h22v22" fill="none" stroke="currentColor" strokeWidth="4" /></svg>
        </a>
      </div>
    </footer>
  );
}
