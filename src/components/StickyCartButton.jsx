import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../context/CartContext';

const MIN_CHECKOUT_AMOUNT = 2500;

export default function StickyCartButton() {
  const { totalItems, totalAmount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const canCheckout = totalAmount >= MIN_CHECKOUT_AMOUNT;

  if (location.pathname !== '/cards') {
    return null;
  }

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 right-6 z-50"
          data-cart-target="sticky"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(canCheckout ? '/checkout' : '/cart')}
            className="flex items-center gap-3 bg-gradient-to-r from-primary to-orange-500 hover:from-orange-600 hover:to-primary text-white px-6 py-4 rounded-2xl shadow-2xl shadow-orange-500/40 font-bold text-sm"
          >
            <FiShoppingBag size={20} />
            <div className="text-left">
              <div className="text-xs opacity-80">{totalItems} items</div>
              <div>{canCheckout ? 'Proceed to Checkout' : 'View Cart'}</div>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-1 text-secondary font-bold">
              ₹{totalAmount.toLocaleString()}
            </div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
