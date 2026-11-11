import { Link } from 'react-router-dom';
import { categoryPath } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { googleBusinessLinks, BUSINESS } from '../seo/site';

const COLUMNS = [
  ['Print', [
    [categoryPath('Diaries & Calendars'), 'Calendars and diaries'],
    [categoryPath('Visiting Cards & Stationery'), 'Visiting cards'],
    [categoryPath('Flyers & Brochures'), 'Flyers and brochures'],
    [categoryPath('Bill Books & Receipt Books'), 'Bill books'],
    [categoryPath('Hindu Wedding Cards'), 'Invitations'],
  ]],
  ['Shop', [['/cards', 'All designs'], ['/saved', 'Saved designs'], ['/cart', 'Cart'], ['/#faq', 'Questions']]],
  ['Studio', [['/about', 'About us'], ['/contact', 'Contact']]],
];

/** A quiet close: who we are, where things are, how to reach us. */
export default function Footer() {
  const { settings } = useShopSettings();
  const a = BUSINESS.address;
  const link = 'text-paper/85 hover:text-paper hover:underline underline-offset-4';
  return (
    <footer className="bg-ink text-paper">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-7 xl:px-10 pt-16 pb-10 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src="/zaro-logo-112.webp" width="40" height="40" loading="lazy" alt="" className="w-10 h-10 object-contain" />
            <span className="font-display font-extrabold text-xl tracking-[-0.03em]">ZARO Digitz</span>
          </Link>
          <p className="mt-4 text-[17px] text-paper/85 max-w-[34ch]">Digital Color Prints, Sivakasi. A proof on WhatsApp before anything is printed.</p>
          <a href={shopWhatsAppLink(settings.whatsappGreeting, settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center h-12 px-5 bg-primary text-white text-[16px] font-semibold transition-colors hover:bg-primary-dark">Get a price on WhatsApp</a>
        </div>
        {COLUMNS.map(([title, items]) => (
          <nav key={title} aria-label={title} className="lg:col-span-2">
            <h2 className="text-[15px] font-semibold text-paper/70">{title}</h2>
            <ul className="mt-3 space-y-2 text-[16px]">{items.map(([to, l]) => <li key={to}><Link to={to} className={link}>{l}</Link></li>)}</ul>
          </nav>
        ))}
        <div className="lg:col-span-2 text-[16px] space-y-2">
          <h2 className="text-[15px] font-semibold text-paper/70">Reach us</h2>
          <p><a href="tel:+919787702336" className={`${link} tabular-nums`}>+91 97877 02336</a></p>
          <p><a href={`mailto:${BUSINESS.email}`} className={`${link} break-all`}>{BUSINESS.email}</a></p>
          <p><a href={googleBusinessLinks(settings).maps} target="_blank" rel="noopener noreferrer" className={link}>{a.streetAddress}, Sivakasi</a></p>
        </div>
      </div>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-7 xl:px-10 py-6 flex flex-col sm:flex-row gap-2 sm:justify-between text-[14px] text-paper/70">
        <p>© {new Date().getFullYear()} Zaro Digitz · GSTIN {BUSINESS.gstin}</p>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="self-start sm:self-auto hover:text-paper hover:underline underline-offset-4">Back to top</button>
      </div>
    </footer>
  );
}
