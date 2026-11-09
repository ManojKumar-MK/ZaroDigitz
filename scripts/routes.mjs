// Every public route of the SPA. Shared by the sitemap generator and the pre-renderer.
import { SHOP_CATEGORIES, GUIDES, slugify, productPath } from '../src/seo/catalog.js';
import { products } from '../src/data/products.js';

export const SITE_URL = 'https://digitz.zarocrackers.com';

export function getRoutes() {
  const today = new Date().toISOString().slice(0, 10);
  const r = (path, extra = {}) => ({ path, lastmod: today, ...extra });
  return [
    r('/', { priority: '1.0', changefreq: 'weekly' }),
    r('/cards', { priority: '0.9', changefreq: 'weekly' }),
    ...SHOP_CATEGORIES.map((c) => r(`/cards/${slugify(c)}`, { priority: '0.8', changefreq: 'weekly' })),
    ...GUIDES.map((g) => r(`/guides/${g.slug}`, { priority: '0.7', changefreq: 'monthly', lastmod: g.datePublished })),
    r('/about', { priority: '0.6', changefreq: 'monthly' }),
    r('/contact', { priority: '0.6', changefreq: 'monthly' }),
    r('/track', { priority: '0.4', changefreq: 'yearly' }),
    ...products.map((p) =>
      r(productPath(p), {
        priority: '0.6',
        changefreq: 'weekly',
        image: p.image && !p.image.endsWith('placeholder.svg') ? (p.image.startsWith('http') ? p.image : `${SITE_URL}${p.image}`) : null,
        imageTitle: p.name,
      })
    ),
  ];
}

/** Routes that must exist as pages but must not be in the sitemap. */
export const PRIVATE_ROUTES = ['/cart', '/checkout', '/admin'];
