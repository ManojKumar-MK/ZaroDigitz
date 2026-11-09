import { Link } from 'react-router-dom';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { SHOP_CATEGORIES, GUIDES, categoryPath, guidePath } from '../seo/catalog';
import { BUSINESS } from '../seo/site';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { googleBusinessLinks } from '../seo/site';
import { LuHeart, LuMail, LuMapPin, LuPenLine, LuPhone, LuStar } from 'react-icons/lu';

const quickLinks = [
  ['/', 'Home'],
  ['/about', 'About Us'],
  ['/cards', 'All Designs'],
  ['/contact', 'Contact Us'],
  ['/track', 'Track Order'],
  ['/#faq', 'FAQ'],
  ...GUIDES.map((g) => [guidePath(g), g.title]),
];

export default function Footer() {
  const { settings } = useShopSettings();
  return (
    <footer className="bg-dark text-gray-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Company */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/zaro-logo-112.webp"
              width="40"
              height="40"
              loading="lazy"
              alt="ZARO Digitz logo"
              className="w-10 h-10 object-cover rounded-full border border-white/20 shadow-md"
            />
            <div>
              <div className="font-display font-bold text-white text-lg">ZARO Digitz</div>
              <div className="text-xs text-secondary uppercase tracking-wider">Wedding Cards &amp; Printing</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-400">
            Wedding cards, function invitations and printing from Sivakasi. Designed with your names, approved by you, printed with care.
          </p>
          <div className="flex gap-3 mt-5">
            <a href={shopWhatsAppLink(settings.whatsappGreeting, settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-9 h-9 bg-green-600 hover:bg-green-500 rounded-full flex items-center justify-center transition-colors">
              <FaWhatsapp />
            </a>
            {BUSINESS.instagram && <a
              href={BUSINESS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-9 h-9 bg-gradient-to-br from-pink-600 to-orange-500 hover:opacity-80 rounded-full flex items-center justify-center transition-opacity"
            >
              <FaInstagram />
            </a>}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-display font-bold text-white text-lg mb-5 border-b border-white/10 pb-3">Quick Links</h3>
          <ul className="space-y-2">
            {quickLinks.map(([path, label]) => (
              <li key={path}>
                <Link to={path} className="text-sm hover:text-secondary transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary group-hover:bg-secondary transition-colors" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-display font-bold text-white text-lg mb-5 border-b border-white/10 pb-3">Contact Us</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-sm">
              <LuPhone className="text-secondary mt-0.5 flex-shrink-0" size={18} />
              <div>
                <div>+91 7010935230</div>
                <div>+91 6369619148</div>
              </div>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <LuMail className="text-secondary mt-0.5 flex-shrink-0" size={18} />
              <div>zarocrackers@gmail.com</div>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <LuMapPin className="text-secondary mt-0.5 flex-shrink-0" size={18} />
              <div>
                <a href={googleBusinessLinks(settings).maps} target="_blank" rel="noopener noreferrer" className="hover:text-white">Sivakasi to Sattur Bypass Road,<br />Sivakasi, Tamil Nadu - 626189</a>
              </div>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <LuStar className="text-secondary mt-0.5 flex-shrink-0" size={18} />
              <a href={googleBusinessLinks(settings).review} target="_blank" rel="noopener noreferrer" className="hover:text-white underline-offset-2 hover:underline">Rate us on Google</a>
            </li>
          </ul>
        </div>

        {/* Business Hours */}
        <div>
          <h3 className="font-display font-bold text-white text-lg mb-5 border-b border-white/10 pb-3">Business Hours</h3>
          <ul className="space-y-2 text-sm">
            {[
              ['Mon – Sat', '9:00 AM – 10:00 PM'],
              ['Sunday', '10:00 AM – 8:00 PM'],
            ].map(([day, time]) => (
              <li key={day} className="flex justify-between">
                <span className="text-gray-400">{day}</span>
                <span className="text-secondary font-medium">{time}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400">
            <LuPenLine className="inline-block align-[-0.15em]" aria-hidden="true" /> Wedding season rush? Order early: proof in 1–2 days, printing in about a week.
          </div>
        </div>
      </div>

      {/* Shop by category: every category page is one click from every page */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4">Cards &amp; Printing by Category</h3>
          <ul className="flex flex-wrap gap-2">
            {SHOP_CATEGORIES.map((cat) => (
              <li key={cat}>
                <Link to={categoryPath(cat)} className="inline-block text-xs text-gray-400 hover:text-secondary bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition-colors">
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} ZARO Digitz. All rights reserved.</span>
          <span>Crafted with <LuHeart className="inline-block align-[-0.15em] text-primary" aria-label="love" /> for every celebration</span>
        </div>
      </div>
    </footer>
  );
}
