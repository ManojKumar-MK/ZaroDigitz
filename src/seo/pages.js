// Search titles and descriptions for the fixed pages, plus the admin's overrides.
// Shared by the server (server/seoHead.mjs), the storefront <Seo> and the admin SEO page,
// so keep it free of JSX and browser APIs.
import { SITE_NAME, DEFAULT_TITLE, DEFAULT_DESCRIPTION } from './site.js';

export const TITLE_LIMIT = 60; // Google shows about 60 characters (600px) of a title
export const DESCRIPTION_LIMIT = 160; // and about 155-160 characters of a description

export const STATIC_PAGES = [
  { path: '/', label: 'Home', title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  {
    path: '/cards', crumb: 'All Designs', label: 'All designs', title: 'Wedding Card Designs & Prices',
    description: (count = 100) => `Browse ${count}+ wedding and function invitation designs from Zaro Digitz, Sivakasi: Hindu, Muslim, Christian, foil, scroll, acrylic and box invites. Price per card shown.`,
  },
  { path: '/about', crumb: 'About Us', label: 'About us', title: 'About Us - Invitation Printing in Sivakasi', description: 'Zaro Digitz designs and prints wedding cards, function invitations, calendars and stationery in Sivakasi, from the team behind Zaro Digitz.' },
  { path: '/contact', crumb: 'Contact Us', label: 'Contact', title: 'Contact Us - Call or WhatsApp', description: 'Contact Zaro Digitz, Sivakasi. Call or WhatsApp +91 70109 35230, or visit us at No. 3U, Maruthu Pandiyar Mettu Street, Sivakasi 626123.' },
];

export const staticPage = (path) => STATIC_PAGES.find((p) => p.path === path);
export const staticDescription = (page, count) => (typeof page.description === 'function' ? page.description(count) : page.description);

/** The title exactly as it appears in the browser tab and in Google. */
export const fullTitle = (title) => (!title ? DEFAULT_TITLE : title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`);

/** Admin override for a page path ({ title, description }, blanks ignored), or null. */
export function seoOverride(settings, path) {
  const o = settings?.seoPages?.[path];
  if (!o) return null;
  const title = String(o.title || '').trim();
  const description = String(o.description || '').trim();
  return title || description ? { title, description } : null;
}
