import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { SHOP_CATEGORIES, categoryPath } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { googleBusinessLinks, BUSINESS } from '../seo/site';

const menu = [
  ['/cards', 'All designs'],
  ['/about', 'About us'],
  ['/track', 'Track your order'],
  ['/contact', 'Contact'],
  ['/#faq', 'Questions'],
];

// Open-licence pictures used on the site (see docs/image-credits.json).
const CREDITS = [
  ['Offset printers in Sambad Press, Bhubaneswar', 'Subhashish Panigrahi', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Offset_printers_in_Sambad_Press_in_Bhubaneswar,_Odisha,_India.jpg', 'https://creativecommons.org/licenses/by-sa/4.0'],
  ['Merry Go Round Letterpress Print', 'AlanKitching', 'CC BY 4.0', 'https://commons.wikimedia.org/w/index.php?curid=140212191', 'https://creativecommons.org/licenses/by/4.0/'],
  ['Women drawing a kolam outside the Mylapore Temple', 'McKay Savage', 'CC BY 2.0', 'https://commons.wikimedia.org/w/index.php?curid=23467740', 'https://creativecommons.org/licenses/by/2.0/'],
  ['Pipe organ Thaarai at a Tamil wedding', 'Magentic Manifestations', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/w/index.php?curid=144951948', 'https://creativecommons.org/licenses/by-sa/4.0/'],
  ['A shrine decorated with marigold garlands', 'Alina Kakshapati', 'CC0', 'https://wordpress.org/photos/photo/3646a211f6/', 'https://creativecommons.org/publicdomain/zero/1.0/'],
  ['Sivakasi Railway Station', 'Gowtham Sampath', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/w/index.php?curid=80389353', 'https://creativecommons.org/licenses/by-sa/4.0/'],
];

/** The back of the card: the stripe again, the press, and the menu set large. */
export default function Footer() {
  const { settings } = useShopSettings();
  const a = BUSINESS.address;
  return (
    <footer className="bg-[#2C0A10] text-[#FBF5EC]">
      <div className="flex h-2 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 120 }, (_, i) => <span key={i} className={`shrink-0 w-7 ${i % 2 ? 'bg-[#FBF5EC]' : 'bg-[#C9A032]'}`} />)}
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:min-h-[100svh]">
        <div className="relative h-[50svh] lg:h-auto overflow-hidden">
          <img src="/world/offset-press.jpg" alt="Offset printing presses with paper rolls" width="1600" height="1200" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-left scale-110" />
        </div>

        <div className="px-4 sm:px-10 lg:px-16 py-16 lg:py-20 flex flex-col">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <img src="/zaro-logo-112.webp" width="40" height="40" loading="lazy" alt="" className="w-10 h-10 rounded-full object-cover" />
            <span className="font-display font-bold text-lg">ZARO Digitz</span>
          </Link>

          <nav aria-label="Footer" className="mt-14 group/menu">
            <ul className="space-y-5">
              {menu.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="inline-block font-display font-bold text-[8vw] lg:text-[2.6vw] leading-none transition-[transform,color] duration-300 hover:translate-x-3 hover:text-secondary group-hover/menu:text-[#FBF5EC]/60 hover:!text-secondary">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid sm:grid-cols-2 gap-8 mt-16 text-[15px] leading-relaxed">
            <div>
              <p className="font-semibold">Visit or call</p>
              <a href={googleBusinessLinks(settings).maps} target="_blank" rel="noopener noreferrer" className="block hover:text-secondary">{a.streetAddress},<br />Sivakasi, Tamil Nadu {a.postalCode}</a>
              <a href="tel:+917010935230" className="block mt-1 hover:text-secondary">+91 70109 35230</a>
              <a href="tel:+916369619148" className="block hover:text-secondary">+91 63696 19148</a>
            </div>
            <div>
              <p className="font-semibold">Message us</p>
              <a href={shopWhatsAppLink(settings.whatsappGreeting, settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-secondary"><FaWhatsapp /> WhatsApp</a>
              <p className="mt-1">Monday to Saturday, 9 am to 10 pm</p>
              <p>Sunday, 10 am to 8 pm</p>
            </div>
          </div>

          <div className="mt-12">
            <p className="font-semibold text-[15px]">Cards and printing</p>
            <p className="mt-2 text-[15px] leading-relaxed">
              {SHOP_CATEGORIES.map((cat, i) => (
                <span key={cat}>
                  <Link to={categoryPath(cat)} className="hover:text-secondary underline-offset-4 hover:underline">{cat}</Link>
                  {i < SHOP_CATEGORIES.length - 1 && <span aria-hidden="true"> · </span>}
                </span>
              ))}
            </p>
          </div>

          <div className="mt-auto pt-14 text-[13px] text-[#FBF5EC]/85 space-y-3">
            <p>
              Pictures:{' '}
              {CREDITS.map(([title, by, lic, page, licUrl], i) => (
                <span key={page}>
                  <a href={page} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-secondary">{title}</a> by {by}, <a href={licUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-secondary">{lic}</a>{i < CREDITS.length - 1 ? '; ' : '.'}
                </span>
              ))}
            </p>
            <p>© {new Date().getFullYear()} Zaro Digitz, Sivakasi · GSTIN {BUSINESS.gstin}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
