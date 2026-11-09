// Builds the list of public pages with the title/description Google gets, and checks each one.
import { normalizeProduct, getOfferPrice } from '../data/products';
import { SHOP_CATEGORIES, GUIDES, categoryMeta, productMeta, categoryPath, productPath, guidePath } from '../seo/catalog';
import { STATIC_PAGES, staticDescription, fullTitle, seoOverride, TITLE_LIMIT, DESCRIPTION_LIMIT } from '../seo/pages';
import { SITE_URL, SITE_NAME, DEFAULT_IMAGE } from '../seo/site';

export const KIND_LABEL = { page: 'Page', category: 'Category', product: 'Product', guide: 'Guide' };
const LOGO = '/zaro-logo.png';

/** Every indexable page: { key, kind, label, path, url, title, description, auto, custom, image, product, issues }. */
export function buildSeoPages(adminProducts, settings) {
  const visible = adminProducts.filter((p) => p.active !== false);
  const shown = visible.map((p) => normalizeProduct(p));
  const pages = [];

  const withOverride = (base) => {
    const o = seoOverride(settings, base.path);
    return { ...base, custom: { title: o?.title || '', description: o?.description || '' }, title: fullTitle(o?.title || base.auto.title), description: o?.description || base.auto.description };
  };

  STATIC_PAGES.forEach((sp) => pages.push(withOverride({ key: sp.path, kind: 'page', label: sp.label, path: sp.path, image: DEFAULT_IMAGE, auto: { title: sp.title, description: staticDescription(sp, shown.length) } })));
  SHOP_CATEGORIES.forEach((c) => {
    const items = shown.filter((p) => p.category === c);
    const meta = categoryMeta(c, items);
    pages.push(withOverride({ key: categoryPath(c), kind: 'category', label: c, path: categoryPath(c), image: DEFAULT_IMAGE, itemCount: items.length, auto: { title: meta.title, description: meta.description } }));
  });
  GUIDES.forEach((g) => pages.push(withOverride({ key: guidePath(g), kind: 'guide', label: g.title, path: guidePath(g), image: DEFAULT_IMAGE, auto: { title: g.title, description: g.description } })));

  visible.forEach((raw) => {
    const p = normalizeProduct(raw);
    const auto = productMeta({ ...p, seoTitle: '', seoDescription: '' });
    const meta = productMeta(p);
    const custom = { title: String(raw.seoTitle || '').trim(), description: String(raw.seoDescription || '').trim() };
    pages.push({ key: productPath(p), kind: 'product', label: p.name, path: productPath(p), image: p.image || LOGO, product: raw, price: getOfferPrice(p), auto: { title: auto.title, description: auto.description }, custom, title: fullTitle(meta.title), description: meta.description });
  });

  pages.forEach((pg) => { pg.url = pg.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${pg.path}`; });
  audit(pages);
  return pages;
}

/** Problems Google would care about. level: error (breaks a rich result) · warning (hurts ranking or clicks) · info. */
function audit(pages) {
  const byTitle = new Map();
  pages.forEach((p) => byTitle.set(p.title.toLowerCase(), (byTitle.get(p.title.toLowerCase()) || 0) + 1));
  pages.forEach((p) => {
    const issues = [];
    const t = p.title.length;
    const d = p.description.length;
    const base = p.title.replace(` | ${SITE_NAME}`, '').length;
    if (base > TITLE_LIMIT) issues.push({ id: 'title-long', level: 'warning', text: `Title is ${t} characters, so Google cuts it after about ${TITLE_LIMIT}.` });
    else if (t > TITLE_LIMIT) issues.push({ id: 'title-brand-cut', level: 'info', text: `Title is ${t} characters, so Google may drop “| ${SITE_NAME}” at the end.` });
    if (t < 25) issues.push({ id: 'title-short', level: 'warning', text: `Title is only ${t} characters. Add what the page sells and "Sivakasi".` });
    if (d < 70) issues.push({ id: 'desc-short', level: 'warning', text: `Description is only ${d} characters. Aim for 120 to 160.` });
    if (d > DESCRIPTION_LIMIT) issues.push({ id: 'desc-long', level: 'info', text: `Description is ${d} characters. Google shows about ${DESCRIPTION_LIMIT} and cuts the rest.` });
    if (byTitle.get(p.title.toLowerCase()) > 1) issues.push({ id: 'title-duplicate', level: 'warning', text: 'Another page has the same title, so Google may show only one of them.' });
    if (p.kind === 'product') {
      if (p.price == null) issues.push({ id: 'no-price', level: 'error', text: 'No price, so Google cannot show it as a product with a price.' });
      if (!p.image || p.image.endsWith(LOGO)) issues.push({ id: 'no-photo', level: 'warning', text: 'No photo. Google Images and WhatsApp previews show the logo instead.' });
      if (!String(p.product.description || '').trim()) issues.push({ id: 'no-description', level: 'info', text: 'Uses the automatic product text. A few lines of your own help it rank.' });
    }
    if (p.kind === 'category' && !p.itemCount) issues.push({ id: 'empty-category', level: 'warning', text: 'No products on the website, so the page is empty.' });
    p.issues = issues;
    p.worst = issues.some((i) => i.level === 'error') ? 'error' : issues.some((i) => i.level === 'warning') ? 'warning' : issues.length ? 'info' : 'ok';
  });
}

export const ISSUE_TITLES = {
  'no-price': 'Products without a price',
  'no-photo': 'Products without a photo',
  'title-duplicate': 'Pages with the same title',
  'title-long': 'Titles longer than 60 characters',
  'title-short': 'Titles that are too short',
  'desc-short': 'Descriptions that are too short',
  'empty-category': 'Categories with no products',
  'desc-long': 'Descriptions cut off in Google',
  'title-brand-cut': 'Titles where Google may drop the shop name',
  'no-description': 'Products using the automatic text',
};
const LEVEL_RANK = { error: 0, warning: 1, info: 2 };

/** Issues grouped by type, most serious first: [{ id, title, level, pages }]. */
export function groupIssues(pages) {
  const groups = new Map();
  pages.forEach((p) => p.issues.forEach((i) => {
    const g = groups.get(i.id) || { id: i.id, title: ISSUE_TITLES[i.id] || i.id, level: i.level, pages: [] };
    g.pages.push(p);
    groups.set(i.id, g);
  }));
  return [...groups.values()].sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || b.pages.length - a.pages.length);
}

/** 0-100: share of pages without errors or warnings, minus 5 per missing site essential. */
export function healthScore(pages, siteProblems = 0) {
  if (!pages.length) return 0;
  const good = pages.filter((p) => p.worst === 'ok' || p.worst === 'info').length;
  return Math.max(0, Math.round((good / pages.length) * 100) - siteProblems * 5);
}

/** What the live server actually sends for a page (title, description, tags, structured data). */
export async function inspectLive(path) {
  const res = await fetch(path, { cache: 'no-store', headers: { Accept: 'text/html' } });
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const meta = (sel) => doc.querySelector(sel)?.getAttribute('content') || '';
  const types = [...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => {
    try { const j = JSON.parse(s.textContent); return (Array.isArray(j) ? j : [j]).map((x) => x['@type']).filter(Boolean); } catch { return []; }
  });
  return {
    status: res.status,
    title: doc.querySelector('title')?.textContent?.trim() || '',
    description: meta('meta[name="description"]'),
    robots: meta('meta[name="robots"]'),
    canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
    ogImage: meta('meta[property="og:image"]'),
    types: [...new Set(types.flat())],
  };
}

/** Sitemap, robots.txt and home page checks against the live server. */
export async function siteChecks(expectedProducts) {
  const get = async (u) => { try { const r = await fetch(u, { cache: 'no-store' }); return { ok: r.ok, status: r.status, text: await r.text(), type: r.headers.get('content-type') || '' }; } catch (e) { return { ok: false, status: 0, text: '', error: e.message }; } };
  const [sitemap, robots, home] = await Promise.all([get('/sitemap.xml'), get('/robots.txt'), inspectLive('/').catch(() => null)]);
  const urls = (sitemap.text.match(/<loc>/g) || []).length;
  const productUrls = (sitemap.text.match(/<loc>[^<]*\/product\//g) || []).length;
  const images = (sitemap.text.match(/<image:loc>/g) || []).length;
  const checks = [
    { id: 'sitemap', label: 'Sitemap', ok: sitemap.ok && urls > 0, detail: sitemap.ok ? `${urls} pages, ${images} product photos` : `Could not load /sitemap.xml (${sitemap.status || 'offline'})` },
    { id: 'sitemap-products', label: 'All products in the sitemap', ok: sitemap.ok && productUrls >= expectedProducts, detail: sitemap.ok ? `${productUrls} of ${expectedProducts} products${productUrls < expectedProducts ? ' (new products appear within 10 minutes, or press Publish now)' : ''}` : 'Sitemap not available' },
    { id: 'robots', label: 'robots.txt points to the sitemap', ok: robots.ok && /sitemap:\s*https?:\/\/\S+sitemap\.xml/i.test(robots.text) && !/disallow:\s*\/\s*$/im.test(robots.text), detail: robots.ok ? (/sitemap:/i.test(robots.text) ? 'Search engines can crawl the shop' : 'No Sitemap line') : `Could not load /robots.txt (${robots.status || 'offline'})` },
    { id: 'home', label: 'Home page sends its title to Google', ok: Boolean(home && home.status === 200 && /Zaro Digitz/.test(home.title) && home.types.length), detail: home ? `${home.title || 'No title'} · ${home.types.join(', ') || 'no structured data'}` : 'Home page did not load' },
    { id: 'indexable', label: 'Home page can be indexed', ok: Boolean(home && !/noindex/i.test(home.robots)), detail: home ? (home.robots || 'index, follow') : '—' },
  ];
  return { checks, sitemapUrls: urls, sitemapImages: images, checkedAt: new Date() };
}

/** Ask the server to re-read the live catalog and SEO settings now. */
export async function publishSeo() {
  const r = await fetch('/api/seo/refresh', { method: 'POST' });
  if (!r.ok) throw new Error(`Server answered ${r.status}`);
  return r.json();
}

export const toolLinks = (url) => ({
  inspect: `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent('sc-domain:zarocrackers.com')}&id=${encodeURIComponent(url)}`,
  rich: `https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`,
  speed: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=mobile`,
  google: `https://www.google.com/search?q=${encodeURIComponent(`site:${url.replace(/^https?:\/\//, '')}`)}`,
});
