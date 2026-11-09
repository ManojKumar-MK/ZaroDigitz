// Pure data helpers shared by the React app AND the Node build scripts
// (scripts/routes.mjs imports this file), so keep it free of JSX and browser APIs.
import { categories, categoryTamil, getOfferPrice } from '../data/products.js';
import { DEFAULT_CHARGES, describeCharges } from '../data/charges.js';
import { fullTitle, TITLE_LIMIT } from './pages.js';

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const SHOP_CATEGORIES = categories.filter((c) => c !== 'All');
export const CATEGORY_BY_SLUG = Object.fromEntries(SHOP_CATEGORIES.map((c) => [slugify(c), c]));

export const categoryPath = (category) => `/cards/${slugify(category)}`;
/** URL slug for a product: readable name + code, e.g. "ivory-lotus-foil-invite-zd-001". The code keeps it unique. */
export function productSlug(product) {
  const code = slugify(product.code) || String(product.code).toLowerCase();
  const name = slugify(product.name || '').slice(0, 60).replace(/-+$/, '');
  return name ? `${name}-${code}` : code;
}
export const productPath = (product) => `/product/${productSlug(product)}`;

/**
 * Product for a URL slug. Accepts the readable form ("name-zc-003") and the old
 * code-only form ("zc-003"); callers redirect to productPath() when it differs.
 */
export function findProductBySlug(list, slug) {
  const s = String(slug || '').toLowerCase();
  let best = null;
  list.forEach((p) => {
    const code = slugify(p.code) || String(p.code).toLowerCase();
    if ((s === code || s.endsWith(`-${code}`) || s === String(p.code).toLowerCase()) && (!best || code.length > best.len)) best = { p, len: code.length };
  });
  return best ? best.p : null;
}

/** WhatsApp/phone shown in search descriptions (people can tap it right from Google). */
const SHOP_PHONE = '97877 02336';
const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
/** First description that fits Google's ~160 characters, else the shortest. */
const fitDescription = (...options) => options.find((d) => d.length <= 160) || options[options.length - 1].slice(0, 160);

/** First title that fits Google's ~60 characters with "| Zaro Digitz", else the shortest. */
const fitTitle = (...options) => options.find((t) => fullTitle(t).length <= TITLE_LIMIT) || options[options.length - 1];
export const guidePath = (guide) => `/guides/${guide.slug}`;

// No downloadable price list for cards (designs change often); kept for shared components.
export const PRICE_LIST_PDF = null;
export const PRICE_LIST_PDF_FILENAME = null;

/** One or two honest sentences per category: what it is and who it suits. */
export const CATEGORY_BLURBS = {
  "Hindu Wedding Cards": "Traditional and modern Hindu wedding invitations with Ganesha, kalash, temple and kolam motifs, in English, Tamil or both.",
  "Muslim Wedding Cards": "Nikah and walima invitations with elegant calligraphy-inspired layouts, crescent and arch motifs, and space for Arabic, Urdu, Tamil or English text.",
  "Christian Wedding Cards": "Church wedding invitations with clean typography, floral and cross motifs, and room for verses and the order of service.",
  "Budget Wedding Cards": "Well-printed wedding cards at low per-card prices for big guest lists, without giving up a neat design.",
  "Scroll Invitations": "Royal scroll invitations rolled in tubes or boxes, for a grand, keepsake first impression.",
  "Acrylic Invitations": "Clear and frosted acrylic invitations with printed or foil designs: modern, sturdy and memorable.",
  "Foil & Metallic Cards": "Cards with gold, silver or rose-gold foil and metallic boards that catch the light.",
  "Premium Box Invitations": "Rigid and padded box invitations with inserts, ideal for close family and VIP guests; can hold sweets or small gifts.",
  "Birthday Invitations": "Bright, fun birthday invitations for kids and milestone birthdays, personalised with name, age and venue.",
  "House Warming Invitations": "Griha pravesam and house warming invitations with kalash, mango leaf and kolam designs.",
  "Ear Piercing Invitations": "Invitations for ear piercing (kaathu kuthu) ceremonies with family-friendly traditional designs.",
  "Baby Shower Invitations": "Valaikappu, seemantham and baby shower invitations with bangle, cradle and floral motifs.",
  "Puberty Ceremony Invitations": "Manjal neerattu vizha and puberty ceremony invitations in graceful traditional styles.",
  "Holy Communion Invitations": "First holy communion and confirmation invitations with soft colours and simple, elegant layouts.",
  "School & College Notebooks": "Long and short notebooks, hard-bound and spiral notebooks with your school, college or company name on the cover, printed in bulk.",
  "Bill Books & Receipt Books": "Numbered bill books, receipt books and delivery challans in duplicate or triplicate, with your shop name and GST details.",
  "Labels & Stickers": "Product labels, name stickers and die-cut stickers for shops, makers and return gifts.",
  "Sweet & Cake Boxes": "Printed sweet boxes, cake boxes and gift cartons with your shop name, for festivals and functions.",
  "Diaries & Calendars": "Personalised diaries, desk and wall calendars for businesses, shops and gifting.",
  "Return Gifts": "Personalised return gifts for weddings and functions, printed with names or the event date.",
  "Visiting Cards & Stationery": "Visiting cards, letterheads, bill books and envelopes printed in Sivakasi.",
  "Flyers & Brochures": "Flyers, pamphlets and folded brochures in full colour on art paper, for shops, schools, events and offers.",
  "Letterheads & Envelopes": "Company letterheads, envelopes and stationery sets with your logo and contact details.",
  "ID Cards": "PVC and laminated ID cards with photo for schools, colleges, offices and events.",
  "Certificates": "Certificates printed on texture board or art card, with gold borders and names filled in for every student or participant.",
  "Synthetic & Texture Board Prints": "Tear-proof synthetic prints and premium texture board prints up to 13 x 19 inches and 350 gsm.",
  "Branding & Signage": "Logos, shop branding, standees and boards to make your business look its best.",
  "Custom Printing": "Anything else you need printed: flex banners, stickers, labels and custom jobs. Tell us what you need."
};

/* ---------- categories added in Admin → Products → Categories (settings.customCategories) ---------- */
const customNames = new Set();
/**
 * Add shop-defined categories to the shared lists (categories, SHOP_CATEGORIES, CATEGORY_BY_SLUG,
 * categoryTamil, CATEGORY_BLURBS) so every page, the sitemap and the admin see them.
 * list = [{ name, tamil, blurb }]. Categories removed from the list are taken out again.
 * Returns true when something changed.
 */
export function applyCustomCategories(list = []) {
  const next = (Array.isArray(list) ? list : []).filter((c) => String(c?.name || '').trim() && slugify(c.name));
  const names = new Set(next.map((c) => c.name.trim()));
  let changed = false;
  customNames.forEach((name) => {
    if (names.has(name)) return;
    for (const arr of [categories, SHOP_CATEGORIES]) { const i = arr.indexOf(name); if (i >= 0) arr.splice(i, 1); }
    delete CATEGORY_BY_SLUG[slugify(name)];
    delete categoryTamil[name];
    delete CATEGORY_BLURBS[name];
    customNames.delete(name);
    changed = true;
  });
  next.forEach((c) => {
    const name = c.name.trim();
    if (!categories.includes(name)) { categories.push(name); changed = true; }
    if (!SHOP_CATEGORIES.includes(name)) SHOP_CATEGORIES.push(name);
    CATEGORY_BY_SLUG[slugify(name)] = name;
    if (c.tamil && categoryTamil[name] !== c.tamil) { categoryTamil[name] = c.tamil; changed = true; }
    if (c.blurb && CATEGORY_BLURBS[name] !== c.blurb) { CATEGORY_BLURBS[name] = c.blurb; changed = true; }
    customNames.add(name);
  });
  return changed;
}
export const isCustomCategory = (name) => customNames.has(name);

export function categoryBlurb(category) {
  return CATEGORY_BLURBS[category] || `${category} designed and printed by Zaro Digitz in Sivakasi.`;
}

export function categoryMeta(category, items = []) {
  const prices = items.map((p) => getOfferPrice(p)).filter((n) => n != null);
  const min = prices.length ? Math.min(...prices) : null;
  const tamil = categoryTamil[category];
  const count = items.length;
  const offs = items.map((p) => { const o = getOfferPrice(p); return p.mrp && o != null && o < p.mrp ? Math.round((1 - o / p.mrp) * 100) : 0; });
  const maxOff = offs.length ? Math.max(...offs) : 0;
  const from = min != null ? ` from ${money(min)}` : '';
  const off = maxOff >= 10 ? `, up to ${maxOff}% off MRP` : '';
  const n = `${count} ${count === 1 ? 'item' : 'items'}`;
  return {
    title: fitTitle(`${category} - Designs & Prices`, `${category} Designs`, category),
    h1: category,
    tamil,
    // Price, discount and the WhatsApp number up front: that is what earns the click and the enquiry.
    description: fitDescription(
      `${category}${from} per card${off}. ${n}, printed in Sivakasi, design approved on WhatsApp before printing. Call ${SHOP_PHONE}.`,
      `${category}${from} per card${off}. ${n} from Zaro Digitz, Sivakasi. WhatsApp ${SHOP_PHONE}.`,
      `${category}${from}. Zaro Digitz, Sivakasi. WhatsApp ${SHOP_PHONE}.`,
    ),
    intro: `${categoryBlurb(category)}${tamil ? ` Known in Tamil as ${tamil}.` : ''}`,
  };
}

/** "₹24 per card (…). … from Zaro Digitz, Sivakasi. …" within 160 characters. */
function productSnippet(p, price) {
  const per = String(p.per || 'card').replace(/^1\s+/, '');
  const pct = p.mrp && price != null && price < p.mrp ? Math.round((1 - price / p.mrp) * 100) : 0;
  const min = Number(p.minQty) > 1 ? ` Min ${p.minQty}.` : '';
  const head = price != null ? `${money(price)} per ${per}${pct ? ` (${pct}% off ${money(p.mrp)})` : ''}.${min}` : 'Ask for the price.';
  return fitDescription(
    `${head} ${p.name}, printed by Zaro Digitz, Sivakasi. Design approved on WhatsApp ${SHOP_PHONE}.`,
    `${head} ${p.name} from Zaro Digitz, Sivakasi. WhatsApp ${SHOP_PHONE}.`,
    `${head} Zaro Digitz, Sivakasi. WhatsApp ${SHOP_PHONE}.`,
  );
}

export function productMeta(product) {
  const price = getOfferPrice(product);
  const blurb = categoryBlurb(product.category);
  const seoTitle = String(product.seoTitle || '').trim();
  const seoDescription = String(product.seoDescription || '').trim();
  return {
    title: seoTitle || fitTitle(`${product.name} - ${product.category}`, `${product.name} - Wedding Card`, product.name),
    description: seoDescription || productSnippet(product, price),
    longDescription: `${product.name} is part of our ${product.category} range. ${blurb} Design code ${product.code}. After you order, we share a digital proof on WhatsApp with your names, dates and wording; printing starts only after you approve it.`,
  };
}

export const FAQS = [
  {
    q: "How do I order wedding cards?",
    a: "Pick a design, choose the quantity and place the order. We then message you on WhatsApp to collect the names, dates, venue and wording, send a digital proof, and print once you approve it.",
  },
  {
    q: "What is the minimum order?",
    a: "Most wedding cards start at 100 cards and go up in steps of 50. Bigger orders get a lower price per card, shown on each design.",
  },
  {
    q: "Will I see the design before printing?",
    a: "Yes. We always send a digital proof on WhatsApp first. You can ask for changes to text, colours or layout, and printing starts only after you approve.",
  },
  {
    q: "Can the card be printed in Tamil?",
    a: "Yes. We print in Tamil, English or both, and can also set text in other languages on request.",
  },
  {
    q: "How long does printing take?",
    a: "Most orders are printed within 5 to 7 working days after you approve the proof. Premium, acrylic and box invitations may take a little longer. Tell us your event date and we will plan for it.",
  },
  {
    q: "Do you deliver outside Sivakasi?",
    a: "Yes. We courier across India. Courier charges are shown at checkout, and you can also collect your order from our shop in Sivakasi.",
  },
  {
    q: "Are there any extra charges?",
    a: "Charges, if any, are shown before you place the order.",
  },
  {
    q: "Where is Zaro Digitz located?",
    a: "Zaro Digitz is in Sivakasi, Tamil Nadu: No. 3U, Maruthu Pandiyar Mettu Street, Sivakasi 626123. Call or WhatsApp 97877 02336.",
  },
];

/** FAQ list with live store settings applied (charges can be changed in the admin panel). */
export function getFaqs(settings) {
  const charges = settings?.charges || DEFAULT_CHARGES;
  return FAQS.map((f) =>
    f.q === 'Are there any extra charges?'
      ? { ...f, a: `${describeCharges(charges)} are added to the order value and shown before you place the order.` }
      : f
  );
}

export function faqSchema(faqs = FAQS) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** Editorial guide pages. `sections` render as h2 + paragraphs (+ optional bullets / category links). */
/** Editorial guide pages (card ideas, wording tips). Add entries here to publish them. */
export const GUIDES = [];

export function guideBySlug(slug) {
  return GUIDES.find((g) => g.slug === slug) || null;
}
