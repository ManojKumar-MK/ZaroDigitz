import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { LuChevronDown, LuHeart, LuMenu, LuSearch, LuShoppingBag, LuX } from 'react-icons/lu';
import { useShopSettings } from '../context/ShopSettingsContext';
import { useCart } from '../context/CartContext';
import { getCatalogProducts, PLACEHOLDER_IMAGE } from '../data/products';
import { useSaved } from '../utils/favourites';
import { categoryPath, productPath } from '../seo/catalog';
import { qtyRules } from '../utils/pricing';
import { useLang, LANGS } from '../i18n/context';

// Menu groups, in the order a visitor thinks about them.
const MENUS = [
  {
    label: 'Calendars & Diaries',
    items: ['Diaries & Calendars', 'School & College Notebooks', 'Return Gifts', 'Custom Printing'],
  },
  {
    label: 'Invitations',
    items: ['Hindu Wedding Cards', 'Muslim Wedding Cards', 'Christian Wedding Cards', 'Budget Wedding Cards', 'Scroll Invitations', 'Acrylic Invitations', 'Foil & Metallic Cards', 'Premium Box Invitations', 'Birthday Invitations', 'House Warming Invitations', 'Ear Piercing Invitations', 'Baby Shower Invitations', 'Puberty Ceremony Invitations', 'Holy Communion Invitations'],
  },
  {
    label: 'Printing',
    items: ['Visiting Cards & Stationery', 'Labels & Stickers', 'Flyers & Brochures', 'Bill Books & Receipt Books', 'Letterheads & Envelopes', 'ID Cards', 'Certificates', 'Synthetic & Texture Board Prints', 'Sweet & Cake Boxes', 'Branding & Signage'],
  },
];
// Single-page sections sit beside the menus.
const LINKS = [{ to: '/cards', label: 'All designs' }, { to: '/contact', label: 'Visit us' }];
const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** English / தமிழ்: two plain buttons, the current one filled. */
function LangSwitch({ className = '' }) {
  const { lang, setLang, t } = useLang();
  return (
    <div role="group" aria-label={t('Language')} className={`inline-flex bg-paper2 p-0.5 ${className}`}>
      {LANGS.map((l) => (
        <button key={l.code} type="button" lang={l.code} aria-pressed={lang === l.code} onClick={() => setLang(l.code)} className={`h-9 px-2.5 sm:px-3 text-[14px] font-semibold transition-colors ${lang === l.code ? 'bg-ink text-paper' : 'hover:bg-paper3'}`}>
          <span className="sm:hidden">{l.short}</span><span className="hidden sm:inline">{l.label}</span>
        </button>
      ))}
    </div>
  );
}

function SearchPanel({ onClose }) {
  const { t, cat, pname } = useLang();
  const [q, setQ] = useState('');
  const products = useMemo(() => getCatalogProducts(), []);
  const term = q.trim().toLowerCase();
  const results = term ? products.filter((p) => [p.name, p.tamil || '', p.code, p.category, cat(p.category)].some((v) => String(v).toLowerCase().includes(term))).slice(0, 8) : [];
  const cats = term ? MENUS.flatMap((m) => m.items).filter((c) => c.toLowerCase().includes(term) || cat(c).includes(q.trim())).slice(0, 4) : [];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-night/60" onClick={onClose}>
      <motion.div initial={{ y: -24 }} animate={{ y: 0 }} exit={{ y: -24 }} className="bg-paper text-ink px-4 sm:px-8 py-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('Search designs')}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 bg-paper2 px-4">
            <LuSearch className="shrink-0" size={20} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search designs, codes or occasions')} aria-label={t('Search')} className="flex-1 h-14 bg-transparent text-lg focus:outline-none placeholder:text-ink/50" />
            <button type="button" onClick={onClose} aria-label={t('Close search')} className="p-2 hover:text-brand"><LuX size={20} /></button>
          </div>
          {cats.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {cats.map((c) => <Link key={c} to={categoryPath(c)} onClick={onClose} className="px-4 py-2 bg-paper2 hover:bg-paper3 font-medium">{cat(c)}</Link>)}
            </div>
          )}
          <ul className="mt-4 grid sm:grid-cols-2 gap-2">
            {results.map((p) => (
              <li key={p.code}>
                <Link to={productPath(p)} onClick={onClose} className="flex items-center gap-3 p-2 hover:bg-paper2">
                  <img src={p.image || PLACEHOLDER_IMAGE} alt="" className="w-12 h-14 object-cover bg-paper2" />
                  <span className="min-w-0"><span className="block font-semibold truncate">{pname(p)}</span><span className="text-sm">{money(p.price)} · {cat(p.category)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
          {term && !results.length && !cats.length && <p className="mt-4">{t('Nothing found for “{q}”. Try “calendar”, “visiting card” or a design code like ZD-013.', { q })}</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Slide-out cart: change quantities in steps, see the total, go to checkout. */
function CartDrawer({ onClose }) {
  const { t, pname } = useLang();
  const { cart, updateQuantity, removeItem, totalAmount } = useCart();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-night/60" onClick={onClose}>
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.3 }} className="absolute right-0 top-0 h-full w-full max-w-md bg-paper text-ink flex flex-col" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('Your cart')}>
        <div className="flex items-center justify-between px-6 h-16 bg-paper2">
          <h2 className="font-display font-bold text-xl">{t('Your cart')}</h2>
          <button type="button" onClick={onClose} aria-label={t('Close cart')} className="p-2 hover:text-brand"><LuX size={22} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!cart.length && <p className="py-10 text-center">{t('Your cart is empty. Pick a design to start.')}</p>}
          {cart.map((item) => {
            const { min, step } = qtyRules(item);
            return (
              <div key={item.id} className="flex gap-4">
                <img src={item.image || PLACEHOLDER_IMAGE} alt="" className="w-16 h-20 object-cover bg-paper2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{pname(item)}</p>
                  <p className="text-sm">{t('{price} each', { price: money(item.price) })}</p>
                  {item.options && <p className="text-xs text-ink/70">{Object.values(item.options).join(' · ')}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <div className="inline-flex items-center bg-paper2">
                      <button type="button" aria-label={t('Fewer')} onClick={() => (item.quantity <= min ? removeItem(item.id) : updateQuantity(item.id, item.quantity - step))} className="w-9 h-9 flex items-center justify-center hover:text-brand"><FiMinus /></button>
                      <span className="w-12 text-center font-semibold tabular-nums">{item.quantity}</span>
                      <button type="button" aria-label={t('More')} onClick={() => updateQuantity(item.id, item.quantity + step)} className="w-9 h-9 flex items-center justify-center hover:text-brand"><FiPlus /></button>
                    </div>
                    <span className="font-bold tabular-nums">{money(item.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {cart.length > 0 && (
          <div className="px-6 py-5 bg-paper2 space-y-3">
            <div className="flex justify-between text-lg"><span>{t('Subtotal')}</span><span className="font-bold tabular-nums">{money(totalAmount)}</span></div>
            <p className="text-sm">{t('Courier charges and your proof are confirmed on WhatsApp.')}</p>
            <Link to="/checkout" onClick={onClose} className="flex items-center justify-center h-14 bg-primary text-white font-bold hover:bg-primary-dark transition-colors">{t('Checkout')}</Link>
            <Link to="/cart" onClick={onClose} className="block text-center font-semibold underline underline-offset-4">{t('View cart')}</Link>
          </div>
        )}
      </motion.aside>
    </motion.div>
  );
}

export default function Navbar() {
  const { t, cat, ta } = useLang();
  const { settings } = useShopSettings();
  const { totalItems } = useCart();
  const saved = useSaved();
  const location = useLocation();
  const [open, setOpen] = useState(null); // which desktop menu is open
  const [panel, setPanel] = useState(null); // 'search' | 'cart' | 'menu'
  // Panels close on navigation: they belong to the page they were opened on.
  const [openedOn, setOpenedOn] = useState(location.key);
  const show = openedOn === location.key ? panel : null;
  const openPanel = (p) => { setOpenedOn(location.key); setPanel(p); };
  const close = () => setPanel(null);
  // An open dropdown closes as soon as the page scrolls.
  useEffect(() => {
    const onScroll = () => setOpen(null);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
    <header className="sticky top-0 z-50">
      <nav className="relative bg-paper text-ink" onMouseLeave={() => setOpen(null)} aria-label={t('Main')}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-7 xl:px-10 h-[72px] grid grid-cols-[1fr_auto] xl:grid-cols-[auto_1fr_auto] items-center gap-4 xl:gap-8">
          <div className="flex items-center gap-2">
            <button type="button" aria-label={t('Open menu')} className="xl:hidden w-11 h-11 -ml-2 rounded-full flex items-center justify-center hover:bg-paper3 hover:text-brand" onClick={() => openPanel('menu')}><LuMenu size={22} /></button>
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/zaro-logo-112.webp" width="40" height="40" alt="" className="w-10 h-10 object-contain" />
              <span className="leading-tight">
                <span className="block font-display font-extrabold text-lg sm:text-xl tracking-[-0.03em] whitespace-nowrap">ZARO Digitz</span>
              </span>
            </Link>
          </div>

          <ul className="hidden xl:flex items-center justify-center gap-0.5 whitespace-nowrap min-w-0">
            {MENUS.map((m) => (
              <li key={m.label} onMouseEnter={() => setOpen(m.label)}>
                <button type="button" aria-expanded={open === m.label} onClick={() => setOpen(m.label)} className={`relative h-[72px] ${ta ? 'px-2.5 text-[15px]' : 'px-3.5 text-[16px]'} inline-flex items-center gap-2 font-semibold transition-colors ${open === m.label ? 'text-primary' : 'hover:text-primary'}`}>
                  {t(m.label)}<LuChevronDown size={15} className={`opacity-70 transition-transform ${open === m.label ? 'rotate-180' : ''}`} aria-hidden="true" />
                  {open === m.label && <motion.span layoutId="nav-open" className="absolute left-3.5 right-3.5 bottom-0 h-[3px] bg-secondary" />}
                </button>
              </li>
            ))}
            {LINKS.map((l) => (
              <li key={l.to}><Link to={l.to} onMouseEnter={() => setOpen(null)} className={`h-[72px] ${ta ? 'px-2.5 text-[15px]' : 'px-3.5 text-[16px]'} inline-flex items-center gap-2 font-semibold transition-colors ${location.pathname === l.to ? 'text-primary' : 'hover:text-primary'}`}>{t(l.label)}</Link></li>
            ))}
          </ul>

          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
            <button type="button" aria-label={t('Search designs')} onClick={() => openPanel('search')} className="hidden min-[400px]:flex w-10 h-10 rounded-full items-center justify-center hover:bg-paper3 hover:text-brand transition-colors"><LuSearch size={19} /></button>
            <a href={`https://wa.me/${String(settings.whatsappNumber || '919787702336').replace(/\D/g, '')}?text=${encodeURIComponent('Hi Zaro Digitz! I would like a quote for printing.')}`} target="_blank" rel="noopener noreferrer" className="hidden 2xl:inline-flex items-center h-10 px-5 ml-3 order-last bg-primary text-white text-[15px] font-semibold transition-colors hover:bg-primary-dark">{t('Get a quote')}</a>
            <LangSwitch className="ml-1" />
            <Link to="/saved" aria-label={t('Saved designs, {n}', { n: saved.length })} className="relative w-10 h-10 rounded-full hidden min-[420px]:flex items-center justify-center hover:bg-paper3 hover:text-brand transition-colors">
              <LuHeart size={19} />
              {saved.length > 0 && <span className="absolute top-0.5 right-0.5 w-5 h-5 bg-secondary text-[#211114] text-xs rounded-full flex items-center justify-center font-bold">{saved.length}</span>}
            </Link>
            <button type="button" data-cart-target="nav" aria-label={t('Cart, {n} designs', { n: totalItems })} onClick={() => openPanel('cart')} className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-paper3 hover:text-brand transition-colors">
              <LuShoppingBag size={19} />
              {totalItems > 0 && <motion.span key={totalItems} initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-0.5 right-0.5 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">{totalItems}</motion.span>}
            </button>
          </div>
        </div>

        {/* Desktop mega menu */}
        <AnimatePresence>
          {open && (
            <motion.div key={open} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="hidden xl:block absolute inset-x-0 top-full bg-paper2 text-ink">
              {MENUS.filter((m) => m.label === open).map((m) => (
                <div key={m.label} className="max-w-[1440px] mx-auto px-12 py-12 grid grid-cols-12 gap-x-8 gap-y-6">
                  <p className="col-span-12 -mb-3 font-display font-extrabold text-[28px] tracking-[-0.04em]">{t(m.label)}</p>
                  <ul className={`col-span-12 grid ${m.items.length > 8 ? 'grid-cols-4' : 'grid-cols-3'} gap-x-10 gap-y-3`}>
                    {m.items.map((c) => <li key={c}><Link to={categoryPath(c)} onClick={() => setOpen(null)} className="text-lg hover:text-brand hover:translate-x-1 inline-block transition-transform">{cat(c)}</Link></li>)}
                    <li className="col-span-full mt-3"><Link to="/cards" onClick={() => setOpen(null)} className="font-semibold text-brand underline underline-offset-4">{t('See every design')}</Link></li>
                  </ul>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <AnimatePresence>
        {show === 'search' && <SearchPanel key="search" onClose={close} />}
        {show === 'cart' && <CartDrawer key="cart" onClose={close} />}
        {show === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-night/60 xl:hidden" onClick={close}>
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.3 }} className="absolute left-0 top-0 h-full w-[86%] max-w-sm bg-paper text-ink overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('Menu')}>
              <div className="flex items-center justify-between px-5 h-16 bg-paper2">
                <span className="font-display font-extrabold text-lg tracking-[-0.03em]">ZARO Digitz</span>
                <button type="button" onClick={close} aria-label={t('Close menu')} className="p-2"><LuX size={22} /></button>
              </div>
              <div className="px-5 py-4">
                <LangSwitch className="mb-3" />
                {MENUS.map((m) => (
                  <details key={m.label} className="group">
                    <summary className="flex items-center justify-between h-14 font-semibold text-lg cursor-pointer list-none"><span>{t(m.label)}</span><LuChevronDown className="group-open:rotate-180 transition-transform" /></summary>
                    <ul className="pb-3 pl-8 space-y-2.5">
                      {m.items.map((c) => <li key={c}><Link to={categoryPath(c)} onClick={close} className="block hover:text-brand">{cat(c)}</Link></li>)}
                    </ul>
                  </details>
                ))}
                {[...LINKS, { to: '/saved', label: 'Saved designs' }, { to: '/about', label: 'About us' }].map((l) => (
                  <Link key={l.to} to={l.to} onClick={close} className="flex items-center h-14 font-semibold text-lg hover:text-brand">{t(l.label)}</Link>
                ))}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    </>
  );
}
