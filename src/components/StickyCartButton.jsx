import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../context/CartContext';

const MIN_CHECKOUT_AMOUNT = 1; // cards have a minimum quantity per design instead

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
            className="flex items-center gap-3 bg-primary text-white px-6 py-4    font-bold text-sm"
          >
            <FiShoppingBag size={20} />
            <div className="text-left">
              <div className="text-xs opacity-80">{totalItems} items</div>
              <div>{canCheckout ? 'Proceed to Checkout' : 'View Cart'}</div>
            </div>
            <div className="bg-white/20 px-3 py-1 text-secondary font-bold">
              ₹{totalAmount.toLocaleString()}
            </div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
