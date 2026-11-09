import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { productPath } from '../seo/catalog';
import { flyToCart } from '../utils/flyToCart';
import { useCart } from '../context/CartContext';
import { qtyRules } from '../utils/pricing';
import { PLACEHOLDER_IMAGE } from '../data/products';
import { hasPhoto } from './sketchFor';
import { CategorySketch } from './Sketches';

/** A design shown like a print with its swing tag: the picture, then a filled strip with the facts. */
export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { min } = qtyRules(product);
  const unit = String(product.per || 'card').replace(/^1\s+/, '');
  return (
    <div className="group">
      <Link to={productPath(product)} className="relative block aspect-[4/5] overflow-hidden bg-paper2 text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        {hasPhoto(product) ? (
          <img
            src={product.image}
            alt={`${product.name} - ${product.category} by Zaro Digitz`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={(event) => { event.currentTarget.src = PLACEHOLDER_IMAGE; }}
          />
        ) : (
          <CategorySketch category={product.category} className="w-full h-full p-6 transition-transform duration-700 group-hover:scale-105 group-hover:-rotate-2" />
        )}
      </Link>
      <div className="bg-primary text-white p-3 sm:p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-base leading-snug">
            <Link to={productPath(product)} className="hover:text-secondary transition-colors">{product.name}</Link>
          </h3>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            aria-label={`Add ${min} ${product.name} to cart`}
            onClick={(e) => { addItem({ ...product, quantity: min }); flyToCart(e.currentTarget.closest('.group')?.querySelector('img') || e.currentTarget); }}
            className="on-light shrink-0 w-10 h-10 flex items-center justify-center bg-secondary text-dark transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <FiPlus size={18} />
          </motion.button>
        </div>
        <div className="flex justify-between text-[13px] tabular-nums text-white/90">
          <span><span className="text-base font-bold text-white">₹{product.price}</span> / {unit}</span>
          {min > 1 && <span>min {min}</span>}
        </div>
      </div>
    </div>
  );
}
