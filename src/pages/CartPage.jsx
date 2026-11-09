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
          <div className="mx-auto w-24 h-24 mb-6 rounded-full bg-primary/10 text-primary flex items-center justify-center"><LuShoppingCart size={36} /></div>
          <h2 className="font-display font-black text-3xl text-dark mb-3">Your Cart is Empty</h2>
          <p className="text-gray-500 mb-8">Pick a card design to get started.</p>
          <Link to="/cards" className="inline-flex items-center gap-2 bg-primary text-white font-bold px-8 py-4 rounded-2xl hover:bg-orange-600 transition-colors">
            Browse Products <FiArrowRight />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-black text-4xl text-dark">Your Cart</h1>
          <p className="text-gray-500 mt-1">{totalItems} item{totalItems !== 1 ? 's' : ''} in cart</p>
        </div>
        <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors">Clear All</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {cart.map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4 items-center"
              >
                <img src={item.image || PLACEHOLDER_IMAGE} alt={item.name} className="w-20 h-24 rounded-xl object-cover flex-shrink-0 bg-orange-50" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 font-mono">{item.code}</div>
                  <div className="font-bold text-dark text-base truncate">{item.name}</div>
                  <div className="text-xs text-gray-400">{item.category}</div>
                  <div className="font-black text-primary text-lg mt-1">₹{item.price} <span className="text-xs font-normal text-gray-400">per {String(item.per || 'card').replace(/^1\s+/, '')}</span></div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <FiTrash2 size={18} />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="Fewer"
                      onClick={() => item.quantity <= qtyRules(item).min ? removeItem(item.id) : updateQuantity(item.id, item.quantity - qtyRules(item).step)}
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold transition-colors"
                    >−</button>
                    <span className="w-12 text-center font-bold text-dark">{item.quantity}</span>
                    <button
                      aria-label="More"
                      onClick={() => updateQuantity(item.id, item.quantity + qtyRules(item).step)}
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold transition-colors"
                    >+</button>
                  </div>
                  <div className="text-sm font-bold text-dark">₹{(item.price * item.quantity).toLocaleString()}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="font-display font-bold text-xl text-dark mb-5 pb-4 border-b border-gray-100">Order Summary</h2>
            <div className="space-y-3 mb-5">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-500 truncate mr-3">{item.name} × {item.quantity}</span>
                  <span className="font-semibold text-dark flex-shrink-0">₹{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4 mb-6">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Subtotal</span>
                <span>₹{totalAmount.toLocaleString()}</span>
              </div>
              {chargeLines.map((line) => (
                <div key={line.id} className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>{line.label}</span>
                  <span>₹{line.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-gray-400 mb-2 gap-4">
                <span>Note</span>
                <span className="text-right">{chargesNote}</span>
              </div>
              {!canCheckout && (
                <div className="text-xs text-orange-500 mt-2">Minimum order amount for checkout is ₹{MIN_CHECKOUT_AMOUNT.toLocaleString()}.</div>
              )}
              <div className="flex justify-between font-bold text-lg text-dark mt-3 pt-3 border-t border-gray-100">
                <span>Total</span>
                <span className="text-primary">₹{(totalAmount + chargesTotal).toLocaleString()}</span>
              </div>
            </div>
            {canCheckout ? (
              <Link
                to="/checkout"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-orange-500 hover:from-orange-600 hover:to-primary text-white font-bold py-4 rounded-2xl transition-all hover:shadow-xl hover:shadow-orange-500/30"
              >
                <FiShoppingBag />
                Proceed to Checkout
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-500 font-bold py-4 rounded-2xl cursor-not-allowed"
              >
                <FiShoppingBag />
                Proceed to Checkout
              </button>
            )}
            <Link to="/cards" className="w-full flex items-center justify-center mt-3 text-sm text-gray-500 hover:text-primary transition-colors">
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
