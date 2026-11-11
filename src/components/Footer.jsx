import { Link } from 'react-router-dom';
import { categoryPath } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';
import { googleBusinessLinks, BUSINESS } from '../seo/site';

const LINKS = [
  [categoryPath('Diaries & Calendars'), 'Calendars'],
  [categoryPath('Visiting Cards & Stationery'), 'Visiting cards'],
  ['/cards', 'All designs'],
  ['/about', 'About'],
  ['/contact', 'Contact'],
];

/** The close of every page: the way to write to us, set as the headline. */
export default function Footer() {
  const { settings } = useShopSettings();
  const a = BUSINESS.address;
  const [user, domain] = String(BUSINESS.email).split('@');
  return (
    <footer className="bg-primary text-white min-h-[72svh] lg:min-h-[90svh] flex flex-col">
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-7 xl:px-10 pt-10 flex-1 flex flex-col">
        <div className="grid lg:grid-cols-12 gap-6 text-[15px] leading-snug">
          <Link to="/" className="lg:col-span-2 font-display font-extrabold text-lg tracking-[-0.03em]">ZARO Digitz</Link>
          <a href={googleBusinessLinks(settings).maps} target="_blank" rel="noopener noreferrer" className="lg:col-span-3 hover:underline underline-offset-4">{a.streetAddress},<br />Sivakasi, Tamil Nadu {a.postalCode}</a>
          <p className="lg:col-span-3">Monday to Saturday, 9 am to 10 pm<br />Sunday, 10 am to 8 pm</p>
          <p className="lg:col-span-3">Digital colour printing. A proof on WhatsApp before anything is printed.</p>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="lg:col-span-1 text-left lg:text-right font-semibold hover:underline underline-offset-4">Back to top</button>
        </div>

        <a href={`mailto:${BUSINESS.email}`} className="mt-auto pt-24 block font-display font-extrabold tracking-[-0.05em] leading-[0.9] text-[clamp(44px,8.6vw,140px)] break-words transition-opacity hover:opacity-80">
          {user}<wbr />@{domain}
        </a>

        <div className="mt-10 mb-8 grid gap-3 sm:grid-cols-3 text-[15px]">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-1">{LINKS.map(([to, l]) => <Link key={to} to={to} className="hover:underline underline-offset-4">{l}</Link>)}</nav>
          <p className="sm:text-center">GSTIN {BUSINESS.gstin} · +91 97877 02336</p>
          <p className="sm:text-right">Sivakasi, {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
