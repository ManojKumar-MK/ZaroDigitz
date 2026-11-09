import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingBag, FiMenu, FiX, FiSearch, FiChevronDown, FiMinus, FiPlus } from 'react-icons/fi';
import { useShopSettings } from '../context/ShopSettingsContext';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useCart } from '../context/CartContext';
import { getCatalogProducts, PLACEHOLDER_IMAGE } from '../data/products';
import { categoryPath, productPath } from '../seo/catalog';
import { qtyRules } from '../utils/pricing';
import { InviteCardSketch, ScrollSketch, NotebookSketch } from './Sketches';

// Menu groups, in the order a visitor thinks about them.
const MENUS = [
  {
    label: 'Wedding Cards',
    sketch: InviteCardSketch,
    items: ['Hindu Wedding Cards', 'Muslim Wedding Cards', 'Christian Wedding Cards', 'Budget Wedding Cards', 'Scroll Invitations', 'Acrylic Invitations', 'Foil & Metallic Cards', 'Premium Box Invitations'],
  },
  {
    label: 'Other Invitations',
    sketch: ScrollSketch,
    items: ['Birthday Invitations', 'House Warming Invitations', 'Ear Piercing Invitations', 'Baby Shower Invitations', 'Puberty Ceremony Invitations', 'Holy Communion Invitations', 'Return Gifts'],
  },
  {
    label: 'Digital Printing',
    sketch: NotebookSketch,
    items: ['Visiting Cards & Stationery', 'Labels & Stickers', 'Flyers & Brochures', 'Bill Books & Receipt Books', 'Letterheads & Envelopes', 'ID Cards', 'Certificates', 'Synthetic & Texture Board Prints', 'School & College Notebooks', 'Diaries & Calendars', 'Sweet & Cake Boxes', 'Branding & Signage', 'Custom Printing'],
  },
];
// Single-page sections sit beside the menus.
const LINKS = [{ to: '/contact', label: 'Visit Us' }];
const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function SearchPanel({ onClose }) {
  const [q, setQ] = useState('');
  const products = useMemo(() => getCatalogProducts(), []);
  const term = q.trim().toLowerCase();
  const results = term ? products.filter((p) => [p.name, p.code, p.category].some((v) => String(v).toLowerCase().includes(term))).slice(0, 8) : [];
  const cats = term ? MENUS.flatMap((m) => m.items).filter((c) => c.toLowerCase().includes(term)).slice(0, 4) : [];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-night/60" onClick={onClose}>
      <motion.div initial={{ y: -24 }} animate={{ y: 0 }} exit={{ y: -24 }} className="bg-paper text-ink px-4 sm:px-8 py-6 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search designs">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 bg-paper2 px-4">
            <FiSearch className="shrink-0" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search designs, codes or occasions" aria-label="Search" className="flex-1 h-14 bg-transparent text-lg focus:outline-none placeholder:text-ink/50" />
            <button type="button" onClick={onClose} aria-label="Close search" className="p-2 hover:text-brand"><FiX size={20} /></button>
          </div>
          {cats.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {cats.map((c) => <Link key={c} to={categoryPath(c)} onClick={onClose} className="px-4 py-2 bg-paper2 hover:bg-paper3 font-medium">{c}</Link>)}
            </div>
          )}
          <ul className="mt-4 grid sm:grid-cols-2 gap-2">
            {results.map((p) => (
              <li key={p.code}>
                <Link to={productPath(p)} onClick={onClose} className="flex items-center gap-3 p-2 hover:bg-paper2">
                  <img src={p.image || PLACEHOLDER_IMAGE} alt="" className="w-12 h-14 object-cover bg-paper2" />
                  <span className="min-w-0"><span className="block font-semibold truncate">{p.name}</span><span className="text-sm">{money(p.price)} per card · {p.category}</span></span>
                </Link>
              </li>
            ))}
          </ul>
          {term && !results.length && !cats.length && <p className="mt-4">Nothing found for “{q}”. Try “foil”, “scroll” or a design code like ZD-001.</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Slide-out cart: change quantities in steps, see the total, go to checkout. */
function CartDrawer({ onClose }) {
  const { cart, updateQuantity, removeItem, totalAmount } = useCart();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-night/60" onClick={onClose}>
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.3 }} className="absolute right-0 top-0 h-full w-full max-w-md bg-paper text-ink flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Your cart">
        <div className="flex items-center justify-between px-6 h-16 bg-paper2">
          <h2 className="font-display font-bold text-xl">Your cart</h2>
          <button type="button" onClick={onClose} aria-label="Close cart" className="p-2 hover:text-brand"><FiX size={22} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!cart.length && <p className="py-10 text-center">Your cart is empty. Pick a design to start.</p>}
          {cart.map((item) => {
            const { min, step } = qtyRules(item);
            return (
              <div key={item.id} className="flex gap-4">
                <img src={item.image || PLACEHOLDER_IMAGE} alt="" className="w-16 h-20 object-cover bg-paper2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{item.name}</p>
                  <p className="text-sm">{money(item.price)} per card</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="inline-flex items-center bg-paper2">
                      <button type="button" aria-label="Fewer" onClick={() => (item.quantity <= min ? removeItem(item.id) : updateQuantity(item.id, item.quantity - step))} className="w-9 h-9 flex items-center justify-center hover:text-brand"><FiMinus /></button>
                      <span className="w-12 text-center font-semibold tabular-nums">{item.quantity}</span>
                      <button type="button" aria-label="More" onClick={() => updateQuantity(item.id, item.quantity + step)} className="w-9 h-9 flex items-center justify-center hover:text-brand"><FiPlus /></button>
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
            <div className="flex justify-between text-lg"><span>Subtotal</span><span className="font-bold tabular-nums">{money(totalAmount)}</span></div>
            <p className="text-sm">Courier charges and your proof are confirmed on WhatsApp.</p>
            <Link to="/checkout" onClick={onClose} className="flex items-center justify-center h-14 bg-primary text-white font-bold hover:bg-[#5A1420] transition-colors">Checkout</Link>
            <Link to="/cart" onClick={onClose} className="block text-center font-semibold underline underline-offset-4">View cart</Link>
          </div>
        )}
      </motion.aside>
    </motion.div>
  );
}

export default function Navbar() {
  const { settings } = useShopSettings();
  const { totalItems } = useCart();
  const location = useLocation();
  const [open, setOpen] = useState(null); // which desktop menu is open
  const [panel, setPanel] = useState(null); // 'search' | 'cart' | 'menu'
  // Panels close on navigation: they belong to the page they were opened on.
  const [openedOn, setOpenedOn] = useState(location.key);
  const show = openedOn === location.key ? panel : null;
  const openPanel = (p) => { setOpenedOn(location.key); setPanel(p); };
  const close = () => setPanel(null);
  // An open dropdown closes as soon as the page scrolls, so it never sits over what is being read.
  useEffect(() => {
    const onScroll = () => setOpen(null);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
    <header className="sticky top-0 z-50">
      <nav className="relative bg-paper dark:bg-paper2 text-ink" onMouseLeave={() => setOpen(null)} aria-label="Main">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-[72px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Open menu" className="lg:hidden p-2 -ml-2 hover:text-brand" onClick={() => openPanel('menu')}><FiMenu size={22} /></button>
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/zaro-logo-112.webp" width="52" height="52" alt="" className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full object-cover transition-transform duration-500 group-hover:rotate-[20deg]" />
              <span className="leading-tight">
                <span className="block font-display font-bold text-lg sm:text-xl text-brand">ZARO Digitz</span>
                <span className="hidden sm:block text-[13px]">Digital colour printing · Sivakasi</span>
              </span>
            </Link>
          </div>

          <ul className="hidden lg:flex items-center gap-1">
            {MENUS.map((m) => (
              <li key={m.label} onMouseEnter={() => setOpen(m.label)}>
                <button type="button" aria-expanded={open === m.label} onClick={() => setOpen(open === m.label ? null : m.label)} className={`relative h-[72px] px-3 xl:px-4 inline-flex items-center gap-1.5 font-medium transition-colors ${open === m.label ? 'text-brand' : 'hover:text-brand'}`}>
                  {m.label} <FiChevronDown className={`transition-transform ${open === m.label ? 'rotate-180' : ''}`} />
                  {open === m.label && <motion.span layoutId="nav-open" className="absolute left-3 right-3 xl:left-4 xl:right-4 bottom-0 h-[3px] bg-secondary" />}
                </button>
              </li>
            ))}
            {LINKS.map((l) => (
              <li key={l.to}><Link to={l.to} onMouseEnter={() => setOpen(null)} className={`h-[72px] px-3 xl:px-4 inline-flex items-center font-medium transition-colors ${location.pathname === l.to ? 'text-brand' : 'hover:text-brand'}`}>{l.label}</Link></li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            <button type="button" aria-label="Search designs" onClick={() => openPanel('search')} className="p-2.5 hover:text-brand transition-colors"><FiSearch size={21} /></button>
            <ThemeToggle className="p-2.5 hover:text-brand transition-colors" />
            <a href={`https://wa.me/${String(settings.whatsappNumber || '919787702336').replace(/\D/g, '')}?text=${encodeURIComponent('Hi Zaro Digitz! I would like a quote for printing.')}`} target="_blank" rel="noopener noreferrer" className="hidden xl:inline-flex items-center h-11 px-5 ml-2 order-last bg-primary text-white font-semibold transition-colors hover:bg-[#5A1420]">Get a quote</a>
            <button type="button" data-cart-target="nav" aria-label={`Cart, ${totalItems} designs`} onClick={() => openPanel('cart')} className="relative p-2.5 hover:text-brand transition-colors">
              <FiShoppingBag size={21} />
              {totalItems > 0 && <motion.span key={totalItems} initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-0.5 right-0.5 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">{totalItems}</motion.span>}
            </button>
          </div>
        </div>

        {/* The card's stripe runs along the bar's bottom edge */}
        <div className="flex h-1 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 120 }, (_, i) => <span key={i} className={`shrink-0 w-7 ${i % 2 ? 'bg-secondary' : 'bg-primary'}`} />)}
        </div>

        {/* Desktop mega menu */}
        <AnimatePresence>
          {open && (
            <motion.div key={open} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="hidden lg:block absolute inset-x-0 top-full bg-paper2 dark:bg-paper3 text-ink shadow-xl">
              {MENUS.filter((m) => m.label === open).map((m) => (
                <div key={m.label} className="max-w-7xl mx-auto px-8 py-10 grid grid-cols-12 gap-8">
                  <ul className={`col-span-8 grid ${m.items.length > 8 ? 'grid-cols-3' : 'grid-cols-2'} gap-x-10 gap-y-3`}>
                    {m.items.map((c) => <li key={c}><Link to={categoryPath(c)} onClick={() => setOpen(null)} className="text-lg hover:text-brand hover:translate-x-1 inline-block transition-transform">{c}</Link></li>)}
                    <li className="col-span-2 mt-3"><Link to="/cards" onClick={() => setOpen(null)} className="font-semibold text-brand underline underline-offset-4">See every design</Link></li>
                  </ul>
                  <div className="col-span-4 text-brand"><m.sketch className="w-full max-w-[220px] ml-auto" /></div>
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
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-night/60 lg:hidden" onClick={close}>
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.3 }} className="absolute left-0 top-0 h-full w-[86%] max-w-sm bg-paper text-ink overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Menu">
              <div className="flex items-center justify-between px-5 h-16 bg-paper2">
                <span className="font-display font-bold text-lg text-brand">ZARO Digitz</span>
                <button type="button" onClick={close} aria-label="Close menu" className="p-2"><FiX size={22} /></button>
              </div>
              <div className="px-5 py-4">
                {MENUS.map((m) => (
                  <details key={m.label} className="group">
                    <summary className="flex items-center justify-between h-14 font-semibold text-lg cursor-pointer list-none">{m.label}<FiChevronDown className="group-open:rotate-180 transition-transform" /></summary>
                    <ul className="pb-3 pl-3 space-y-2.5">
                      {m.items.map((c) => <li key={c}><Link to={categoryPath(c)} onClick={close} className="block hover:text-brand">{c}</Link></li>)}
                    </ul>
                  </details>
                ))}
                {[{ to: '/cards', label: 'All designs' }, ...LINKS, { to: '/about', label: 'About us' }].map((l) => (
                  <Link key={l.to} to={l.to} onClick={close} className="flex items-center h-14 font-semibold text-lg hover:text-brand">{l.label}</Link>
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
