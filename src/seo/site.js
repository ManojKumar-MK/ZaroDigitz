// Single source of truth for site-wide SEO values.
// Change SITE_URL here when the shop moves to a custom domain.

export const SITE_URL = 'https://digitz.zarocrackers.com';
export const SITE_NAME = 'Zaro Digitz';
export const DEFAULT_TITLE = 'Zaro Digitz | Digital Colour Printing & Wedding Cards, Sivakasi';
export const DEFAULT_DESCRIPTION =
  'Digital colour printing in Sivakasi: wedding cards and invitations, visiting cards, stickers, flyers, brochures, bill books, letterheads, ID cards, certificates and notebooks. Call 97877 02336.';
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
export const LOGO_URL = `${SITE_URL}/zaro-logo.png`;
/** Spellings people use for the brand; helps Google learn "zaro" is a name, not a typo of "zara". */
export const BRAND_ALTERNATE_NAMES = ['ZARO Digitz', 'ஷாரோ டிஜிட்ஸ்', 'Zaro Digitz Sivakasi', 'Zaro Digital Colour Printing', 'Zaro Wedding Cards'];
export const LOCALE = 'en_IN';

export const BUSINESS = {
  name: SITE_NAME,
  legalName: 'Zaro Digitz',
  phones: ['+91 97877 02336', '+91 63696 19148', '+91 63830 34170'],
  email: 'zarodigitz@gmail.com',
  whatsapp: 'https://wa.me/919787702336',
  instagram: '',
  address: {
    streetAddress: 'No. 3U, Maruthu Pandiyar Mettu Street',
    addressLocality: 'Sivakasi',
    addressRegion: 'Tamil Nadu',
    postalCode: '626123',
    addressCountry: 'IN',
  },
  // Shop pin (Maruthu Pandiyar Mettu Street, Sivakasi 626123). Set the Google Business
  // Profile's place id / cid here or in Admin → Settings once it is connected; until then
  // map links use these coordinates.
  geo: { latitude: 9.45367, longitude: 77.79937 },
  googlePlaceId: '',
  googleCid: '2617162767219858473', // the Zaro Digitz listing on Google Maps
  gstin: '33AAEFZ1822D1ZK',
  openingHours: [
    { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '22:00' },
    { days: ['Sunday'], opens: '10:00', closes: '20:00' },
  ],
  foundingYear: '2025',
};

/**
 * Links to the shop's Google Business Profile. Admin → Settings can override the place
 * (googlePlaceId / googleCid) if the listing ever changes.
 */
export function googleBusinessLinks(settings = {}) {
  const placeId = String(settings.googlePlaceId || BUSINESS.googlePlaceId || '').trim();
  const cid = String(settings.googleCid || BUSINESS.googleCid || '').trim();
  const ll = `${BUSINESS.geo.latitude},${BUSINESS.geo.longitude}`;
  const maps = cid ? `https://maps.google.com/?cid=${cid}` : `https://maps.google.com/?q=${ll}`;
  return {
    maps,
    // Review links need the profile's place id; until it is set they open the map pin.
    review: placeId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}` : maps,
    reviews: placeId ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(placeId)}` : maps,
    // Directions go to the shop by name and street (Google resolves it to the listing).
    directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${SITE_NAME}, ${BUSINESS.address.streetAddress}, Sivakasi ${BUSINESS.address.postalCode}`)}${placeId ? `&destination_place_id=${encodeURIComponent(placeId)}` : ''}`,
    embed: cid ? `https://maps.google.com/maps?hl=en&z=16&output=embed&cid=${cid}` : `https://maps.google.com/maps?hl=en&z=16&output=embed&q=${ll}`,
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
    slogan: 'Digital colour printing, Sivakasi',
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
