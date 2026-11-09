import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useShopSettings } from '../context/ShopSettingsContext';
import { ThemeToggle } from '../theme/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingCart, FiMenu, FiX, FiGrid } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { LuBadgeCheck, LuHeart, LuPenLine, LuShoppingCart, LuSparkles } from 'react-icons/lu';

const BRAND_COLORS = {
  maroon: '#7A1F2B',
  wine: '#5A1420',
  gold: '#D4AF37',
  ivory: '#FBF5EC',
  black: '#1A0E10',
};

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/cards', label: 'Wedding Cards' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/track', label: 'Track Order' },
];

export default function Navbar() {
  const { settings } = useShopSettings();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems } = useCart();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location]);

  return (
    <header className="sticky top-0 z-50">
      {/* Offer Bar */}
      <div className="text-[#F3DFA2] py-2 overflow-hidden" style={{ backgroundColor: BRAND_COLORS.black }}>
        <div className="marquee-wrapper">
            <span className="marquee-text text-sm font-medium tracking-wide">
            {settings.announcement ? settings.announcement : (<>
            <LuHeart className="inline-block align-[-0.15em]" aria-hidden="true" /> Wedding cards printed in Sivakasi — Hindu, Muslim & Christian designs &nbsp;&nbsp;&nbsp; <LuPenLine className="inline-block align-[-0.15em]" aria-hidden="true" /> Free digital proof on WhatsApp before printing &nbsp;&nbsp;&nbsp; <LuSparkles className="inline-block align-[-0.15em]" aria-hidden="true" /> Foil, scroll, acrylic & box invitations &nbsp;&nbsp;&nbsp; <LuBadgeCheck className="inline-block align-[-0.15em]" aria-hidden="true" /> Call / WhatsApp: +91 70109 35230 &nbsp;&nbsp;&nbsp;
            </>)}
          </span>
        </div>
      </div>

      {/* Main Nav */}
      <nav style={{ backgroundColor: BRAND_COLORS.wine }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/zaro-logo-112.webp"
                width="48"
                height="48"
                alt="ZARO Digitz logo"
                className="w-12 h-12 object-cover rounded-full group-hover:scale-110 transition-transform"
              />
              <div>
                <div className="font-display font-bold text-white text-lg leading-tight">ZARO Digitz</div>
                <div className="text-[13px] font-medium" style={{ color: BRAND_COLORS.gold }}>Wedding cards &amp; printing</div>
              </div>
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="relative px-4 py-2 text-[15px] font-medium transition-colors group"
                  style={{
                    color: location.pathname === link.to ? BRAND_COLORS.gold : '#E9DCCB',
                  }}
                >
                  {link.label}
                  {location.pathname === link.to && (
                    <motion.div layoutId="nav-underline" className="absolute bottom-0 left-4 right-4 h-[3px]" style={{ backgroundColor: BRAND_COLORS.gold }} />
                  )}
                  <span className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
                </Link>
              ))}
            </div>

            {/* Cart + Mobile */}
            <div className="flex items-center gap-3">
              <Link
                to="/cards"
                className="on-light hidden sm:inline-flex items-center gap-2 h-11 px-5 text-[15px] font-semibold text-black transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: BRAND_COLORS.gold }}
              >
                <FiGrid size={16} /> Browse Designs
              </Link>
              <ThemeToggle className="p-2 text-gray-300 hover:text-white transition-colors" />
              <Link to="/cart" data-cart-target="nav" aria-label={`Cart, ${totalItems} items`} className="relative p-2 text-gray-300 hover:text-white transition-colors">
                <FiShoppingCart size={22} />
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </Link>
              <button
                type="button"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                className="md:hidden p-2 text-gray-300 hover:text-white"
                onClick={() => setMobileOpen(o => !o)}
              >
                {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-dark overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`block px-4 py-3 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname === link.to ? 'bg-primary/20 text-secondary' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link to="/cart" className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 text-sm font-medium">
                  <LuShoppingCart className="inline-block align-[-0.15em]" aria-hidden="true" /> Cart ({totalItems} items)
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
