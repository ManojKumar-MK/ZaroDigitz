// Server-rendered page content for crawlers and link previews that do not run JavaScript.
// It goes inside <div id="root">; React replaces it as soon as the app starts (createRoot),
// so visitors see the normal page. The text matches what the app shows: same names, prices
// and descriptions, never extra keywords.
import { getOfferPrice } from '../src/data/products.js';
import { SHOP_CATEGORIES, CATEGORY_BY_SLUG, GUIDES, categoryMeta, productMeta, categoryPath, productPath, guidePath, getFaqs, findProductBySlug, PRICE_LIST_PDF } from '../src/seo/catalog.js';
import { staticPage, staticDescription } from '../src/seo/pages.js';
import { SITE_NAME, DEFAULT_DESCRIPTION, safeUrl } from '../src/seo/site.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const a = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;

// Plain, dark styling close to the real site so the swap to the app is not jarring.
const STYLE = 'max-width:72rem;margin:0 auto;padding:6rem 1rem 3rem;font-family:Inter,system-ui,sans-serif;color:#e5e7eb;background:#0f0f10;line-height:1.6';

const NAV = `<nav aria-label="Main">${[['/', 'Home'], ['/cards', 'Wedding Cards'], ['/about', 'About Us'], ['/contact', 'Contact Us'], ['/track', 'Track Order']].map(([h, t]) => a(h, t)).join(' · ')}</nav>`;
const crumbs = (items) => `<nav aria-label="Breadcrumb">${[['/', 'Home'], ...items].map(([h, t]) => a(h, t)).join(' › ')}</nav>`;
const priceLine = (p) => {
  const price = getOfferPrice(p);
  if (price == null) return 'Price on request';
  const mrp = p.mrp != null && p.mrp > price ? ` <s>MRP ${money(p.mrp)}</s>` : '';
  return `${money(price)} per ${esc(p.per || 'pack')}${mrp}`;
};
const productList = (items) => `<ul>${items.map((p) => `<li>${a(productPath(p), p.name)} – ${priceLine(p)}</li>`).join('')}</ul>`;
const categoryLinks = (visible) => `<ul>${SHOP_CATEGORIES.map((c) => { const n = visible.filter((p) => p.category === c).length; return n ? `<li>${a(categoryPath(c), c)} (${n})</li>` : ''; }).join('')}</ul>`;
const CSS = '<style>[data-ssr] h1{font-size:2rem;line-height:1.2;font-weight:800;color:#fff;margin:.75rem 0}[data-ssr] h2{font-size:1.25rem;font-weight:700;color:#fff;margin:1.5rem 0 .5rem}[data-ssr] h3{font-weight:600;margin:1rem 0 .25rem}[data-ssr] a{color:#fbbf24}[data-ssr] p{margin:.5rem 0}[data-ssr] ul{margin:.5rem 0;padding-left:1.25rem;list-style:disc}[data-ssr] nav{font-size:.875rem;margin:.25rem 0}</style>';
const wrap = (inner) => `${CSS}<div data-ssr="true" style="${STYLE}">${NAV}<main>${inner}</main><footer><p>${esc(SITE_NAME)}, No. 3U, Maruthu Pandiyar Mettu Street, Sivakasi, Tamil Nadu 626123 · Call or WhatsApp +91 70109 35230</p></footer></div>`;

/** HTML for the page body, or '' when the page has no server content. */
export function bodyFor(path, { products, settings }) {
  const visible = products.filter((p) => p.active !== false);
  if (path === '/') {
    return wrap(`<h1>Wedding Cards and Invitations, Printed in Sivakasi</h1><p>${esc(DEFAULT_DESCRIPTION)}</p><p>${a('/cards', 'Browse all card designs')}</p><h2>Shop by category</h2>${categoryLinks(visible)}<h2>Questions about buying crackers</h2>${getFaqs(settings).map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}<h2>Guides</h2><ul>${GUIDES.map((g) => `<li>${a(guidePath(g), g.title)}</li>`).join('')}</ul>`);
  }
  if (path === '/cards') {
    const sp = staticPage(path);
    return wrap(`${crumbs([[path, 'All Designs']])}<h1>${esc(sp.title)}</h1><p>${esc(staticDescription(sp, visible.length))}</p>${SHOP_CATEGORIES.map((c) => { const items = visible.filter((p) => p.category === c); return items.length ? `<h2>${a(categoryPath(c), c)}</h2>${productList(items)}` : ''; }).join('')}`);
  }
  const sp = staticPage(path);
  if (path === '/guides') return wrap(`${crumbs([[path, 'Guides']])}<h1>Card Ideas</h1><p>${esc(sp.description)}</p><ul>${GUIDES.map((g) => `<li>${a(guidePath(g), g.title)} – ${esc(g.description)}</li>`).join('')}</ul>`);
  if (sp) return wrap(`${crumbs([[path, sp.crumb]])}<h1>${esc(sp.crumb)}</h1><p>${esc(staticDescription(sp, visible.length))}</p><h2>Shop by category</h2>${categoryLinks(visible)}`);

  let m = path.match(/^\/cards\/([^/]+)$/);
  if (m && CATEGORY_BY_SLUG[m[1]]) {
    const c = CATEGORY_BY_SLUG[m[1]];
    const items = visible.filter((p) => p.category === c);
    const meta = categoryMeta(c, items);
    return wrap(`${crumbs([['/cards', 'All Designs'], [path, c]])}<h1>${esc(c)}</h1>${meta.tamil ? `<p lang="ta">${esc(meta.tamil)}</p>` : ''}<p>${esc(meta.intro)}</p>${items.length ? productList(items) : '<p>No products in this category right now.</p>'}<p>${a('/cards', 'See all categories')}</p>`);
  }
  m = path.match(/^\/product\/([^/]+)$/);
  if (m) {
    const p = findProductBySlug(visible, m[1]);
    if (!p) return '';
    const meta = productMeta(p);
    const related = visible.filter((x) => x.category === p.category && x.code !== p.code).slice(0, 8);
    const img = p.image ? `<img src="${esc(safeUrl(p.image))}" alt="${esc(p.name)}" width="400" height="400" style="max-width:100%;height:auto">` : '';
    return wrap(`${crumbs([['/cards', 'All Designs'], [categoryPath(p.category), p.category], [productPath(p), p.name]])}<h1>${esc(p.name)}</h1>${p.tamil ? `<p lang="ta">${esc(p.tamil)}</p>` : ''}${img}<p><strong>${priceLine(p)}</strong></p><p>${esc(p.description || meta.longDescription)}</p><p>Product code ${esc(p.code)} · Brand ${esc(p.brand || 'Zaro')} · Category ${a(categoryPath(p.category), p.category)}</p>${related.length ? `<h2>More ${esc(p.category)}</h2>${productList(related)}` : ''}`);
  }
  m = path.match(/^\/guides\/([^/]+)$/);
  if (m) {
    const g = GUIDES.find((x) => x.slug === m[1]);
    if (!g) return '';
    const sections = (g.sections || []).map((s) => `<h2>${esc(s.heading)}</h2>${(s.paragraphs || []).map((t) => `<p>${esc(t)}</p>`).join('')}${s.bullets ? `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}${s.products ? productList(s.products.map((c) => visible.find((p) => p.code === c)).filter(Boolean)) : ''}${s.categories ? `<p>${s.categories.map((c) => a(categoryPath(c), c)).join(' · ')}</p>` : ''}`).join('');
    return wrap(`${crumbs([['/guides', 'Guides'], [guidePath(g), g.title]])}<h1>${esc(g.title)}</h1><p>${esc(g.intro || g.description)}</p>${sections}`);
  }
  return '';
}

