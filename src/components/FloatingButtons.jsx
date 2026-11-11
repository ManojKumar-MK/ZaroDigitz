import { useState, useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink, pageContextMessage } from '../utils/whatsapp';

export default function FloatingButtons() {
  const { settings } = useShopSettings();
  const { pathname } = useLocation();
  // Recomputed per route so the message names the page the visitor is on.
  const [waHref, setWaHref] = useState(() => shopWhatsAppLink(settings.whatsappGreeting, settings.whatsappNumber));
  useEffect(() => {
    const t = setTimeout(() => setWaHref(shopWhatsAppLink(pageContextMessage(settings.whatsappGreeting), settings.whatsappNumber)), 300);
    return () => clearTimeout(t);
  }, [pathname, settings.whatsappGreeting, settings.whatsappNumber]);

  return (
    // Bottom-right, out of the reading column. Sit above the phone "Add" bar on product pages and
    // above the "View cart" button on the design list.
    <div className={`fixed right-4 sm:right-6 z-40 ${pathname.startsWith('/product/') ? 'bottom-24 lg:bottom-6' : pathname.startsWith('/cards') ? 'bottom-24' : 'bottom-5 sm:bottom-6'}`}>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        title="Chat with us on WhatsApp"
        className="w-[52px] h-[52px] bg-[#1F7A4D] rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
      >
        <FaWhatsapp size={24} />
      </a>

    </div>
  );
}
