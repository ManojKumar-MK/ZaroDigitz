// Writes public/sitemap.xml (with image entries for product pages) from scripts/routes.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRoutes, SITE_URL } from './routes.mjs';
import { safeUrl } from '../src/seo/site.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'sitemap.xml');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const urls = getRoutes()
  .map((r) => {
    const loc = r.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${r.path}`;
    const image = r.image
      ? `\n    <image:image><image:loc>${esc(safeUrl(r.image))}</image:loc><image:title>${esc(r.imageTitle)}</image:title></image:image>`
      : '';
    return `  <url>\n    <loc>${esc(loc)}</loc>\n    <lastmod>${r.lastmod}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>${image}\n  </url>`;
  })
  .join('\n');

fs.writeFileSync(
  out,
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`
);
console.log(`Wrote ${getRoutes().length} URLs to public/sitemap.xml`);
