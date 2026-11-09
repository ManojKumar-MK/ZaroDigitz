import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  LOCALE,
  absoluteUrl,
} from '../seo/site';
import { seoOverride } from '../seo/pages';
import { useShopSettings } from '../context/ShopSettingsContext';

const MANAGED_ATTR = 'data-seo-managed';

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => {
      if (key !== 'content') el.setAttribute(key, value);
    });
    document.head.appendChild(el);
  }
  el.setAttribute('content', attrs.content);
  return el;
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(schemas) {
  document.head
    .querySelectorAll(`script[type="application/ld+json"][${MANAGED_ATTR}]`)
    .forEach((node) => node.remove());
  schemas.filter(Boolean).forEach((schema) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(MANAGED_ATTR, 'true');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  });
}

/**
 * Per-page SEO without extra dependencies. Renders nothing; it updates
 * <head> on mount and whenever its props change.
 *
 * Props:
 *  - title: page title (SITE_NAME is appended unless `title` already contains it)
 *  - description: meta description (~150-160 chars)
 *  - path: canonical path, defaults to the current route
 *  - image: absolute or root-relative image for social previews
 *  - noindex: true for cart / checkout and other private pages
 *  - type: Open Graph type, defaults to "website"
 *  - jsonLd: a schema object or an array of them, injected as JSON-LD
 */
export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image = DEFAULT_IMAGE,
  noindex = false,
  type = 'website',
  jsonLd,
}) {
  const location = useLocation();
  const { settings } = useShopSettings();
  const canonicalPath = path ?? location.pathname;
  // Titles and descriptions edited in Admin → SEO win over the built-in ones.
  const override = noindex ? null : seoOverride(settings, canonicalPath.replace(/\/+$/, '') || '/');
  const pageTitle = override?.title || title;
  const pageDescription = override?.description || description;
  const fullTitle = !pageTitle
    ? DEFAULT_TITLE
    : pageTitle.includes(SITE_NAME)
      ? pageTitle
      : `${pageTitle} | ${SITE_NAME}`;
  const canonical = absoluteUrl(canonicalPath);
  const imageUrl = absoluteUrl(image);
  const serializedJsonLd = JSON.stringify(jsonLd ?? null);

  useEffect(() => {
    document.title = fullTitle;
    upsertMeta('meta[name="description"]', { name: 'description', content: pageDescription });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    });
    upsertLink('canonical', canonical);

    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: LOCALE });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: pageDescription });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl });

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: pageDescription });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });

    const parsed = JSON.parse(serializedJsonLd);
    setJsonLd(Array.isArray(parsed) ? parsed : [parsed]);
  }, [fullTitle, pageDescription, canonical, imageUrl, noindex, type, serializedJsonLd]);

  return null;
}
