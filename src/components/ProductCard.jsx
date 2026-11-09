import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { productPath } from '../seo/catalog';
import { flyToCart } from '../utils/flyToCart';
import { FiShoppingCart } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { qtyRules } from '../utils/pricing';
import { PLACEHOLDER_IMAGE } from '../data/products';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { min } = qtyRules(product);
  const unit = String(product.per || 'card').replace(/^1\s+/, '');
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:shadow-orange-100 transition-shadow duration-300 group"
    >
      <Link to={productPath(product)} className="relative overflow-hidden aspect-[4/5] block bg-orange-50">
        <img
          src={product.image || PLACEHOLDER_IMAGE}
          alt={`${product.name} - ${product.category} by Zaro Digitz`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = PLACEHOLDER_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
          {product.category}
        </span>
      </Link>
      <div className="p-4">
        <div className="text-xs text-gray-400 font-medium mb-1">{product.code}</div>
        <h3 className="font-display font-bold text-dark text-lg leading-tight mb-3">
          <Link to={productPath(product)} className="hover:text-primary transition-colors">{product.name}</Link>
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-primary">₹{product.price}</span>
            <span className="text-xs text-gray-400 ml-1">/{unit}</span>
            {min > 1 && <div className="text-[11px] text-gray-500">Min {min}</div>}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { addItem({ ...product, quantity: min }); flyToCart(e.currentTarget.closest('.group')?.querySelector('img') || e.currentTarget); }}
            className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <FiShoppingCart size={14} />
            Add
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
