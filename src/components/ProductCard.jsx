import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LuShoppingBag } from 'react-icons/lu';
import { productPath } from '../seo/catalog';
import { flyToCart } from '../utils/flyToCart';
import { useCart } from '../context/CartContext';
import { qtyRules } from '../utils/pricing';
import { PLACEHOLDER_IMAGE } from '../data/products';
import { hasPhoto } from './sketchFor';
import { CategorySketch } from './Sketches';

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** A design in a grid or carousel: picture, name, price per piece, minimum, and one clear action. */
export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { min } = qtyRules(product);
  const unit = String(product.per || 'card').replace(/^1\s+/, '');
  return (
    <motion.article whileHover={{ y: -6 }} transition={{ duration: 0.25 }} className="group h-full flex flex-col bg-paper2">
      <Link to={productPath(product)} className="relative block aspect-[4/5] overflow-hidden bg-paper3/60 text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        {hasPhoto(product) ? (
          <img
            src={product.image}
            alt={`${product.name} - ${product.category} by Zaro Digitz`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={(event) => { event.currentTarget.src = PLACEHOLDER_IMAGE; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-[16%]">
            <CategorySketch category={product.category} className="w-full h-full transition-transform duration-700 group-hover:scale-[1.06] group-hover:-rotate-2" />
          </div>
        )}
        <span className="absolute left-4 top-4 text-[13px] font-semibold text-ink/80">{product.category}</span>
      </Link>

      <div className="flex-1 flex flex-col p-4 sm:p-5">
        <h3 className="font-display font-semibold text-[17px] leading-snug min-h-[2.6em] line-clamp-2">
          <Link to={productPath(product)} className="hover:text-brand transition-colors">{product.name}</Link>
        </h3>
        <div className="flex items-baseline justify-between gap-3 mt-3 tabular-nums">
          <p><span className="text-xl font-bold text-brand">{money(product.price)}</span> <span className="text-sm">/ {unit}</span></p>
          {min > 1 && <p className="text-sm">Min {min}</p>}
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={(e) => { addItem({ ...product, quantity: min }); flyToCart(e.currentTarget.closest('.group')?.querySelector('img, svg') || e.currentTarget); }}
          className="mt-4 h-11 w-full inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold transition-colors hover:bg-[#5A1420] focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary"
        >
          <LuShoppingBag size={17} aria-hidden="true" /> Add {min > 1 ? min : ''} to cart
        </motion.button>
      </div>
    </motion.article>
  );
}
