import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import { FiArrowUp } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink, pageContextMessage } from '../utils/whatsapp';

export default function FloatingButtons() {
  const [showTop, setShowTop] = useState(false);
  const { settings } = useShopSettings();
  const { pathname } = useLocation();
  // Recomputed per route so the message names the page the visitor is on.
  const [waHref, setWaHref] = useState(() => shopWhatsAppLink(settings.whatsappGreeting, settings.whatsappNumber));
  useEffect(() => {
    const t = setTimeout(() => setWaHref(shopWhatsAppLink(pageContextMessage(settings.whatsappGreeting), settings.whatsappNumber)), 300);
    return () => clearTimeout(t);
  }, [pathname, settings.whatsappGreeting, settings.whatsappNumber]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    // On a product page the phone layout has a sticky "Add" bar along the bottom; sit above it.
    <div className={`fixed left-4 sm:left-6 z-40 flex flex-col gap-3 ${pathname.startsWith('/product/') ? 'bottom-24 lg:bottom-6' : 'bottom-6'}`}>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        title="Chat with us on WhatsApp"
        className="w-14 h-14 bg-[#1F7A4D] rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
      >
        <FaWhatsapp size={26} />
      </a>

      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            type="button"
            aria-label="Back to top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
          >
            <FiArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
