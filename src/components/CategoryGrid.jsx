import { Link } from 'react-router-dom';
import { categoryTamil } from '../data/products';
import { SHOP_CATEGORIES, categoryPath } from '../seo/catalog';

/** Links to every category landing page, with product counts. Strong internal linking for crawlers. */
export default function CategoryGrid({ products, limit }) {
  const counts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  const list = SHOP_CATEGORIES.filter((c) => counts[c]).slice(0, limit || undefined);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {list.map((cat) => (
        <Link
          key={cat}
          to={categoryPath(cat)}
          className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all p-4"
        >
          <div className="font-display font-bold text-dark text-sm sm:text-base leading-snug group-hover:text-primary transition-colors">
            {cat}
          </div>
          {categoryTamil[cat] && (
            <div className="text-xs text-gray-500 mt-0.5" lang="ta">{categoryTamil[cat]}</div>
          )}
          <div className="text-xs text-gray-500 mt-2">
            {counts[cat]} {counts[cat] === 1 ? 'product' : 'products'}
          </div>
        </Link>
      ))}
    </div>
  );
}
