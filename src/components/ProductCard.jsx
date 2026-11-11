import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LuHeart, LuShoppingBag } from 'react-icons/lu';
import { toggleSaved, useSaved } from '../utils/favourites';
import { productPath } from '../seo/catalog';
import { flyToCart } from '../utils/flyToCart';
import { useCart } from '../context/CartContext';
import { defaultOptions } from '../utils/pricing';
import { PLACEHOLDER_IMAGE } from '../data/products';
import { hasPhoto } from './sketchFor';
import { CategorySketch } from './Sketches';

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** A design in a grid or carousel: picture, name, price per piece and one clear action. */
export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const saved = useSaved().includes(product.code);
  const unit = String(product.per || 'card').replace(/^1\s+/, '');
  return (
    <article className="group relative h-full flex flex-col">
      <Link to={productPath(product)} className="relative block aspect-[4/5] overflow-hidden bg-paper2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
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
      </Link>
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={() => toggleSaved(product.code)}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
        className={`absolute right-3 top-3 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${saved ? 'bg-primary text-white' : 'bg-paper text-ink hover:text-primary'}`}
      >
        <LuHeart size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
      </motion.button>

      <div className="flex-1 flex flex-col pt-4">
        <h3 className="text-[17px] font-semibold leading-snug line-clamp-2">
          <Link to={productPath(product)} className="hover:text-primary transition-colors">{product.name}</Link>
        </h3>
        <p className="mt-1 text-[17px] tabular-nums">{money(product.price)} <span className="text-ink/70">/ {unit}</span></p>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={(e) => { addItem({ ...product, ...defaultOptions(product), quantity: 1 }); flyToCart(e.currentTarget.closest('.group')?.querySelector('img, svg') || e.currentTarget); }}
          className="mt-auto pt-3 self-start inline-flex items-center gap-2 text-[16px] font-semibold underline underline-offset-4 decoration-2 decoration-ink/30 hover:decoration-primary hover:text-primary transition-colors"
        >
          <LuShoppingBag size={17} aria-hidden="true" /> Add to cart
        </motion.button>
      </div>
    </article>
  );
}
