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
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        title="Chat with us on WhatsApp"
        className="w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-green-400/40 transition-all hover:scale-110"
      >
        <FaWhatsapp size={26} />
      </a>

      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-12 h-12 bg-primary hover:bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
          >
            <FiArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
