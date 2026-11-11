import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiTrash2, FiArrowRight, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { qtyRules } from '../utils/pricing';
import { PLACEHOLDER_IMAGE } from '../data/products';
import { useShopSettings } from '../context/ShopSettingsContext';
import { computeCharges, DEFAULT_CHARGES_NOTE } from '../data/charges';
import { LuShoppingCart } from 'react-icons/lu';

const MIN_CHECKOUT_AMOUNT = 1; // cards have a minimum quantity per design instead

export default function CartPage() {
  const { cart, removeItem, updateQuantity, totalAmount, totalItems, clearCart } = useCart();
  const canCheckout = totalAmount >= MIN_CHECKOUT_AMOUNT;
  const { settings } = useShopSettings();
  const { lines: chargeLines, total: chargesTotal } = computeCharges(totalAmount, settings.charges);
  const chargesNote = settings.chargesNote || DEFAULT_CHARGES_NOTE;

  // Warm the checkout chunk while the customer reviews the cart.
  useEffect(() => { import('./CheckoutPage').catch(() => {}); }, []);

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-20">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <LuShoppingCart size={44} className="mx-auto mb-6 text-primary" aria-hidden="true" />
          <h1 className="font-display font-bold tracking-[-0.03em] text-[clamp(32px,3.6vw,52px)] leading-[1.02]">Your cart is empty</h1>
          <p className="text-xl mt-4 mb-10">Pick a calendar, a diary or any design to start.</p>
          <Link to="/cards" className="inline-flex items-center gap-2 h-14 px-8 bg-primary text-white text-[17px] font-bold hover:bg-primary-dark transition-colors">
            See all designs <FiArrowRight />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 xl:px-12 pt-10 pb-24 lg:pb-32">
      <div className="flex items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="font-display font-bold tracking-[-0.04em] leading-[0.98] text-primary text-[clamp(40px,5vw,72px)]">Your cart</h1>
          <p className="text-xl mt-3">{totalItems} design{totalItems !== 1 ? 's' : ''}, printed after you approve a proof on WhatsApp.</p>
        </div>
        <button onClick={clearCart} className="text-[17px] font-semibold underline underline-offset-4 hover:text-primary transition-colors shrink-0">Empty the cart</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-2">
          <AnimatePresence>
            {cart.map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                className="bg-paper2 p-4 sm:p-5 flex gap-4 sm:gap-6 items-center"
              >
                <img src={item.image || PLACEHOLDER_IMAGE} alt={item.name} className="w-24 h-28 sm:w-28 sm:h-32 object-cover flex-shrink-0 bg-paper3" />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-lg leading-snug">{item.name}</div>
                  <div className="text-[15px] text-ink/75">{item.category}</div>
                  {item.options && <div className="text-[15px] text-ink mt-0.5">{Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>}
                  <div className="font-bold text-primary text-lg mt-1 tabular-nums">₹{item.price} <span className="text-[15px] font-normal text-ink/75">per {String(item.per || 'card').replace(/^1\s+/, '')}</span></div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button type="button" aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.id)} className="w-10 h-10 flex items-center justify-center hover:text-primary transition-colors">
                    <FiTrash2 size={18} />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="Fewer"
                      onClick={() => item.quantity <= qtyRules(item).min ? removeItem(item.id) : updateQuantity(item.id, item.quantity - qtyRules(item).step)}
                      className="w-10 h-10 bg-paper hover:bg-paper3 flex items-center justify-center text-lg font-bold transition-colors"
                    >−</button>
                    <span className="w-12 text-center text-lg font-bold tabular-nums">{item.quantity}</span>
                    <button
                      aria-label="More"
                      onClick={() => updateQuantity(item.id, item.quantity + qtyRules(item).step)}
                      className="w-10 h-10 bg-paper hover:bg-paper3 flex items-center justify-center text-lg font-bold transition-colors"
                    >+</button>
                  </div>
                  <div className="text-lg font-bold tabular-nums">₹{(item.price * item.quantity).toLocaleString()}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-ink text-paper p-6 sm:p-8 sticky top-[96px]">
            <h2 className="font-display font-bold text-[22px] mb-6">Order summary</h2>
            <div className="space-y-3 mb-5">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-[15px]">
                  <span className="text-paper/80 truncate mr-3">{item.name} × {item.quantity}</span>
                  <span className="font-semibold text-paper flex-shrink-0">₹{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 mb-6">
              <div className="flex justify-between text-[15px] text-paper/80 mb-2">
                <span>Subtotal</span>
                <span>₹{totalAmount.toLocaleString()}</span>
              </div>
              {chargeLines.map((line) => (
                <div key={line.id} className="flex justify-between text-[15px] text-paper/80 mb-2">
                  <span>{line.label}</span>
                  <span>₹{line.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-[15px] text-paper/80 mb-2 gap-4">
                <span>Note</span>
                <span className="text-right">{chargesNote}</span>
              </div>
              {!canCheckout && (
                <div className="text-[15px] text-[rgb(var(--accent-light-rgb))] mt-2">Minimum order amount for checkout is ₹{MIN_CHECKOUT_AMOUNT.toLocaleString()}.</div>
              )}
              <div className="flex justify-between font-bold text-lg text-paper mt-3 pt-3 ">
                <span>Total</span>
                <span className="text-[rgb(var(--accent-light-rgb))]">₹{(totalAmount + chargesTotal).toLocaleString()}</span>
              </div>
            </div>
            {canCheckout ? (
              <Link
                to="/checkout"
                className="w-full h-14 flex items-center justify-center gap-2 bg-secondary text-[#211114] text-[17px] font-bold transition-colors hover:bg-[rgb(var(--accent-light-rgb))]"
              >
                <FiShoppingBag />
                Go to checkout
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-2 bg-gray-200 text-paper/80 font-bold py-4 cursor-not-allowed"
              >
                <FiShoppingBag />
                Proceed to Checkout
              </button>
            )}
            <Link to="/cards" className="w-full flex items-center justify-center mt-4 text-[17px] underline underline-offset-4 hover:text-[rgb(var(--accent-light-rgb))] transition-colors">
              Keep shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
