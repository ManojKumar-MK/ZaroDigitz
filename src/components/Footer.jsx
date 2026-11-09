import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { LuClock, LuMail, LuMapPin, LuPhone } from 'react-icons/lu';
import { categoryPath } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { googleBusinessLinks, BUSINESS } from '../seo/site';

const COLUMNS = [
  {
    title: 'Wedding & invitations',
    links: ['Hindu Wedding Cards', 'Muslim Wedding Cards', 'Christian Wedding Cards', 'Scroll Invitations', 'Premium Box Invitations', 'Birthday Invitations', 'House Warming Invitations'].map((c) => [categoryPath(c), c.replace(/ (Cards|Invitations)$/, '')]),
  },
  {
    title: 'Digital printing',
    links: ['Visiting Cards & Stationery', 'Labels & Stickers', 'Flyers & Brochures', 'Bill Books & Receipt Books', 'ID Cards', 'Certificates', 'School & College Notebooks'].map((c) => [categoryPath(c), c]),
  },
  {
    title: 'Studio',
    links: [['/cards', 'All designs'], ['/about', 'About us'], ['/contact', 'Visit us'], ['/#faq', 'Questions'], ['/cart', 'Your cart']],
  },
];

const PHONES = ['+91 97877 02336', '+91 63696 19148', '+91 63830 34170'];

/** Site footer: who we are, where everything is, and how to reach us. */
export default function Footer() {
  const { settings } = useShopSettings();
  const a = BUSINESS.address;
  return (
    <footer className="bg-night text-[#FBF5EC]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 xl:px-12 py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <img src="/zaro-logo-112.webp" width="52" height="52" loading="lazy" alt="" className="w-[52px] h-[52px] object-contain" />
              <span className="leading-tight">
                <span className="block font-display font-bold text-xl text-[rgb(var(--accent-light-rgb))]">ZARO Digitz</span>
                <span className="block text-sm text-[#FBF5EC]/75">Digital Color Prints</span>
              </span>
            </Link>
            <p className="mt-5 text-[15px] leading-relaxed text-[#FBF5EC]/85 max-w-[36ch]">Digital colour printing and wedding invitations from Sivakasi. Every order gets a proof on WhatsApp before we print.</p>
            <div className="flex flex-wrap gap-2 mt-6">
              <a href={shopWhatsAppLink(settings.whatsappGreeting, settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-11 px-5 bg-[#1F7A4D] text-white text-sm font-semibold transition-transform hover:-translate-y-0.5"><FaWhatsapp size={18} aria-hidden="true" /> WhatsApp</a>
              <a href="tel:+919787702336" className="inline-flex items-center gap-2 h-11 px-5 bg-white/10 hover:bg-white/15 text-sm font-semibold transition-colors"><LuPhone size={16} aria-hidden="true" /> Call us</a>
            </div>
          </div>

          {/* Links */}
          <nav aria-label="Footer" className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h2 className="font-display font-semibold text-[15px] text-[rgb(var(--accent-light-rgb))]">{col.title}</h2>
                <ul className="mt-4 space-y-2.5 text-[15px]">
                  {col.links.map(([to, label]) => (
                    <li key={to}><Link to={to} className="text-[#FBF5EC]/80 hover:text-white transition-colors">{label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Visit */}
          <div className="lg:col-span-3">
            <h2 className="font-display font-semibold text-[15px] text-[rgb(var(--accent-light-rgb))]">Visit us</h2>
            <ul className="mt-4 space-y-4 text-[15px] text-[#FBF5EC]/85">
              <li className="flex gap-3"><LuMapPin size={18} className="shrink-0 mt-0.5 text-secondary" aria-hidden="true" /><a href={googleBusinessLinks(settings).maps} target="_blank" rel="noopener noreferrer" className="hover:text-white">{a.streetAddress},<br />Sivakasi, Tamil Nadu {a.postalCode}</a></li>
              <li className="flex gap-3"><LuPhone size={18} className="shrink-0 mt-0.5 text-secondary" aria-hidden="true" /><span className="grid">{PHONES.map((p) => <a key={p} href={`tel:${p.replace(/\s/g, '')}`} className="hover:text-white tabular-nums">{p}</a>)}</span></li>
              <li className="flex gap-3"><LuMail size={18} className="shrink-0 mt-0.5 text-secondary" aria-hidden="true" /><a href={`mailto:${BUSINESS.email}`} className="hover:text-white break-all">{BUSINESS.email}</a></li>
              <li className="flex gap-3"><LuClock size={18} className="shrink-0 mt-0.5 text-secondary" aria-hidden="true" /><span>Mon–Sat 9 am – 10 pm<br />Sunday 10 am – 8 pm</span></li>
            </ul>
          </div>
        </div>

      </div>
      <div className="bg-black/25">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 xl:px-12 py-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-[13px] text-[#FBF5EC]/70">
          <p>© {new Date().getFullYear()} Zaro Digitz, Sivakasi · GSTIN {BUSINESS.gstin}</p>
          <p>Designed and printed in Sivakasi</p>
        </div>
      </div>
    </footer>
  );
}
