// Single source of truth for site-wide SEO values.
// Change SITE_URL here when the shop moves to a custom domain.

export const SITE_URL = 'https://digitz.zarocrackers.com';
export const SITE_NAME = 'Zaro Digitz';
export const DEFAULT_TITLE = 'Zaro Digitz | Wedding Cards & Invitation Printing in Sivakasi';
export const DEFAULT_DESCRIPTION =
  'Wedding invitation cards printed in Sivakasi: Hindu, Muslim and Christian designs, foil, scroll, acrylic and box invites, plus calendars and return gifts. Design approved on WhatsApp before printing. Call 70109 35230.';
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
export const LOGO_URL = `${SITE_URL}/zaro-logo.png`;
/** Spellings people use for the brand; helps Google learn "zaro" is a name, not a typo of "zara". */
export const BRAND_ALTERNATE_NAMES = ['ZARO Digitz', 'Zaro Digitz Sivakasi', 'Zaro Digital Printing', 'Zaro Wedding Cards'];
export const LOCALE = 'en_IN';

export const BUSINESS = {
  name: SITE_NAME,
  legalName: 'Zaro Digitz',
  phones: ['+91 70109 35230', '+91 63696 19148'],
  email: 'zarocrackers@gmail.com',
  whatsapp: 'https://wa.me/917010935230',
  instagram: '',
  address: {
    streetAddress: 'Sivakasi to Sattur Bypass Road',
    addressLocality: 'Sivakasi',
    addressRegion: 'Tamil Nadu',
    postalCode: '626189',
    addressCountry: 'IN',
  },
  // Same premises as Zaro Digitz until Zaro Digitz has its own Google Business Profile
  // (then set its place id / cid here or in Admin → Settings).
  geo: { latitude: 9.4532852, longitude: 77.802417 },
  googlePlaceId: 'ChIJTRUNBWTPBjsRJhBHyqhSIEk',
  googleCid: '5269302448925118502',
  openingHours: [
    { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '22:00' },
    { days: ['Sunday'], opens: '10:00', closes: '20:00' },
  ],
  foundingYear: '2026',
};

/**
 * Links to the shop's Google Business Profile. Admin → Settings can override the place
 * (googlePlaceId / googleCid) if the listing ever changes.
 */
export function googleBusinessLinks(settings = {}) {
  const placeId = String(settings.googlePlaceId || BUSINESS.googlePlaceId).trim();
  const cid = String(settings.googleCid || BUSINESS.googleCid).trim();
  return {
    maps: `https://maps.google.com/?cid=${cid}`,
    review: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
    reviews: `https://search.google.com/local/reviews?placeid=${encodeURIComponent(placeId)}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${SITE_NAME}, Sivakasi`)}&destination_place_id=${encodeURIComponent(placeId)}`,
    embed: `https://maps.google.com/maps?hl=en&z=16&output=embed&cid=${cid}`,
  };
}

/**
 * URL for links that are opened right now (WhatsApp text, tracking/invoice links):
 * follows the origin the site is actually running on (localhost in dev, the Netlify
 * preview, or the real domain). SEO tags keep using absoluteUrl()/SITE_URL.
 */
export function runtimeUrl(path = '/') {
  const origin = typeof window !== 'undefined' && /^https?:/.test(window.location?.origin || '') ? window.location.origin : SITE_URL;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${clean === '/' ? '' : clean}`;
}

/** Encode a path exactly once, whether or not it was already percent-encoded. */
export function safeUrl(u) {
  const str = String(u || '');
  try { return encodeURI(decodeURI(str)); } catch { return encodeURI(str); }
}

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${clean}`; // home is https://digitz.zarocrackers.com/ (same form as the sitemap)
}

/** LocalBusiness + Store schema used on every page. */
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Store', 'LocalBusiness'],
    '@id': `${SITE_URL}/#business`,
    name: BUSINESS.name,
    alternateName: BRAND_ALTERNATE_NAMES,
    slogan: 'Wedding cards and printing from Sivakasi',
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: LOGO_URL, width: 531, height: 470 },
    image: DEFAULT_IMAGE,
    description: DEFAULT_DESCRIPTION,
    telephone: BUSINESS.phones[0],
    email: BUSINESS.email,
    foundingDate: BUSINESS.foundingYear,
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    address: { '@type': 'PostalAddress', ...BUSINESS.address },
    geo: { '@type': 'GeoCoordinates', ...BUSINESS.geo },
    areaServed: { '@type': 'Country', name: 'India' },
    hasMap: googleBusinessLinks().maps,
    sameAs: [BUSINESS.instagram, googleBusinessLinks().maps].filter(Boolean),
    openingHoursSpecification: BUSINESS.openingHours.map((slot) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: slot.days,
      opens: slot.opens,
      closes: slot.closes,
    })),
    contactPoint: BUSINESS.phones.map((phone) => ({
      '@type': 'ContactPoint',
      telephone: phone,
      contactType: 'sales',
      areaServed: 'IN',
      availableLanguage: ['en', 'ta'],
    })),
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    alternateName: BRAND_ALTERNATE_NAMES,
    publisher: { '@id': `${SITE_URL}/#business` },
    inLanguage: 'en-IN',
  };
}

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
