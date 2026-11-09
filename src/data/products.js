// Starter catalog for Zaro Digitz (wedding invitations and printing). The live catalog
// comes from the admin panel (API); these sample cards only fill the site until then.
//
// Pricing for cards is per card. A product can also have:
//   minQty  - smallest order (default 100 cards)
//   qtyStep - quantity steps above the minimum (default 50)
//   tiers   - lower per-card prices for bigger orders: [{ from: 200, price: 21 }, ...]
// See src/utils/pricing.js (priceForQty) for how the cart uses them.

/** Catalog-wide discount in percent. null = prices are shown as entered. */
export let DISCOUNT_PERCENT = null;

/** Runtime override (e.g. from settings/shop). null = no catalog-wide discount. */
export function setDiscountPercent(value) {
  const n = value == null || value === '' ? null : Number(value);
  DISCOUNT_PERCENT = n == null || Number.isNaN(n) ? null : Math.min(95, Math.max(0, n));
}

export const SHOP = {
  name: "Zaro Digitz",
  tagline: "Digital Color Prints",
  address: "No. 3U, Maruthu Pandiyar Mettu Street, Sivakasi - 626123",
  email: "zarodigitz@gmail.com",
  website: "digitz.zarocrackers.com",
  phones: ["97877 02336", "63696 19148", "63830 34170"],
};

export const TERMS = [
  "Card wording and design are confirmed with you on WhatsApp before printing.",
  "Printing starts after the design is approved and the advance is paid.",
  "Courier charges as shown at checkout are charged extra.",
];

export const PLACEHOLDER_IMAGE = '/card-placeholder.svg';

export const PRODUCT_STORAGE_KEY = 'digitz-products-v1';
const LEGACY_PRODUCT_STORAGE_KEYS = [];

// The live catalog can add, hide and reorder products, so any well-formed list is valid;
// only reject empty or corrupt data.
function hasMatchingCatalogShape(saved) {
  return Array.isArray(saved) && saved.length > 0 && saved.every((p) => p && typeof p.code === 'string' && typeof p.name === 'string');
}

export function normalizeProduct(product) {
  const next = {
    ...product,
    image: product.image || '',
    brand: product.brand || 'Zaro Digitz',
    category: product.category || 'Hindu Wedding Cards',
    per: product.per || '1 card',
    unit: product.unit || 'card',
    minQty: Number(product.minQty) > 0 ? Number(product.minQty) : 100,
    qtyStep: Number(product.qtyStep) > 0 ? Number(product.qtyStep) : 50,
    tiers: Array.isArray(product.tiers) ? product.tiers.filter((t) => Number(t?.from) > 0 && Number(t?.price) >= 0).map((t) => ({ from: Number(t.from), price: Number(t.price) })).sort((a, b) => a.from - b.from) : [],
    images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
    mrp: product.mrp == null || Number.isNaN(Number(product.mrp)) ? null : Number(product.mrp),
    offerPrice:
      product.offerPrice == null || Number.isNaN(Number(product.offerPrice))
        ? null
        : Number(product.offerPrice),
  };

  next.price = getOfferPrice(next);
  next.image = next.image || next.images[0] || PLACEHOLDER_IMAGE;
  return next;
}

export function getCatalogProducts() {
  if (typeof window === 'undefined') {
    return rawProducts.map((product) => normalizeProduct(product));
  }

  try {
    const saved = JSON.parse(localStorage.getItem(PRODUCT_STORAGE_KEY) || 'null');
    if (hasMatchingCatalogShape(saved)) {
      return saved.map((product) => normalizeProduct(product));
    }

    LEGACY_PRODUCT_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(PRODUCT_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to read saved catalog data.', error);
  }

  return rawProducts.map((product) => normalizeProduct(product));
}

export function saveCatalogProducts(list) {
  const catalog = (Array.isArray(list) ? list : rawProducts).map((product) => normalizeProduct(product));

  if (typeof window !== 'undefined') {
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(catalog));
    window.dispatchEvent(new CustomEvent('digitz-catalog-updated', { detail: catalog }));
  }

  return catalog;
}

// Shown in the "partners" strip; add printing partners or paper brands here later.
export const partners = [
  { id: 1, name: "Zaro Digitz", logo: "/zaro-logo.png" },
];

// PLACEHOLDER — shape matches HomePage.jsx's rendering (t.id, t.rating,
// t.review, t.name, t.location). None of this text came from the PDF —
// replace with real customer reviews whenever you have them.
export const testimonials = [
  {
    id: 1,
    name: "Customer Name",
    location: "City, State",
    rating: 5,
    review: "Replace this with a real customer testimonial.",
  },
  {
    id: 2,
    name: "Customer Name",
    location: "City, State",
    rating: 5,
    review: "Replace this with a real customer testimonial.",
  },
  {
    id: 3,
    name: "Customer Name",
    location: "City, State",
    rating: 5,
    review: "Replace this with a real customer testimonial.",
  },
  {
    id: 4,
    name: "Customer Name",
    location: "City, State",
    rating: 5,
    review: "Replace this with a real customer testimonial.",
  },
];

/**
 * Selling price for a product.
 * Per-product offerPrice wins; otherwise DISCOUNT_PERCENT is applied to mrp.
 * Returns null when there is no printed rate (e.g. Nayagara Falls).
 */
export function getOfferPrice(product) {
  if (product.offerPrice != null) return product.offerPrice;
  if (product.mrp == null) return null;
  if (DISCOUNT_PERCENT == null) return product.mrp;
  return Math.round(product.mrp * (1 - DISCOUNT_PERCENT / 100));
}

/** True when the offer price is genuinely below the printed rate. */
export function hasDiscount(product) {
  const offer = getOfferPrice(product);
  return offer != null && product.mrp != null && offer < product.mrp;
}


export const categories = ["All", "Hindu Wedding Cards", "Muslim Wedding Cards", "Christian Wedding Cards", "Budget Wedding Cards", "Scroll Invitations", "Acrylic Invitations", "Foil & Metallic Cards", "Premium Box Invitations", "Birthday Invitations", "House Warming Invitations", "Ear Piercing Invitations", "Baby Shower Invitations", "Puberty Ceremony Invitations", "Holy Communion Invitations", "School & College Notebooks", "Diaries & Calendars", "Return Gifts", "Visiting Cards & Stationery", "Bill Books & Receipt Books", "Labels & Stickers", "Sweet & Cake Boxes", "Flyers & Brochures", "Letterheads & Envelopes", "ID Cards", "Certificates", "Synthetic & Texture Board Prints", "Branding & Signage", "Custom Printing"];

/** Tamil names shown under category headings (optional). */
export const categoryTamil = {
  "Hindu Wedding Cards": "இந்து திருமண அழைப்பிதழ்",
  "Muslim Wedding Cards": "முஸ்லிம் திருமண அழைப்பிதழ்",
  "Christian Wedding Cards": "கிறிஸ்தவ திருமண அழைப்பிதழ்",
  "Budget Wedding Cards": "குறைந்த விலை அழைப்பிதழ்",
  "Birthday Invitations": "பிறந்தநாள் அழைப்பிதழ்",
  "House Warming Invitations": "புதுமனை புகுவிழா அழைப்பிதழ்",
  "Ear Piercing Invitations": "காது குத்து அழைப்பிதழ்",
  "Baby Shower Invitations": "வளைகாப்பு அழைப்பிதழ்",
  "Puberty Ceremony Invitations": "மஞ்சள் நீராட்டு விழா அழைப்பிதழ்",
  "Diaries & Calendars": "டைரி & காலண்டர்",
  "School & College Notebooks": "நோட்டுப் புத்தகங்கள்",
  "Return Gifts": "ரிட்டர்ன் கிஃப்ட்"
};

/** Sample cards (marked sample: true) shown until real products are added in the admin. */
export const rawProducts = [
  {"id": 1, "code": "ZD-001", "name": "Ivory Lotus Foil Invite", "category": "Hindu Wedding Cards", "per": "1 card", "mrp": 24, "offerPrice": 24, "minQty": 100, "qtyStep": 50, "tiers": [{"from": 200, "price": 22}, {"from": 500, "price": 20}], "material": "Art board", "size": "5 x 7 in", "orientation": "Portrait", "style": "Single card", "image": "", "sample": true},
  {"id": 2, "code": "ZD-002", "name": "Temple Arch Maroon Invite", "category": "Hindu Wedding Cards", "per": "1 card", "mrp": 32, "offerPrice": 32, "minQty": 100, "qtyStep": 50, "tiers": [{"from": 200, "price": 30}, {"from": 500, "price": 27}], "material": "Textured board", "size": "6 x 8 in", "orientation": "Portrait", "style": "Card with insert", "image": "", "sample": true},
  {"id": 3, "code": "ZD-003", "name": "Kolam Border Classic", "category": "Budget Wedding Cards", "per": "1 card", "mrp": 12, "offerPrice": 12, "minQty": 100, "qtyStep": 50, "tiers": [{"from": 300, "price": 11}, {"from": 1000, "price": 9.5}], "material": "Art board", "size": "4.5 x 7 in", "orientation": "Portrait", "style": "Single card", "image": "", "sample": true},
  {"id": 4, "code": "ZD-004", "name": "Crescent Gold Nikah Invite", "category": "Muslim Wedding Cards", "per": "1 card", "mrp": 28, "offerPrice": 28, "minQty": 100, "qtyStep": 50, "tiers": [{"from": 200, "price": 26}, {"from": 500, "price": 24}], "material": "Pearl board", "size": "5 x 7 in", "orientation": "Portrait", "style": "Single card", "image": "", "sample": true},
  {"id": 5, "code": "ZD-005", "name": "Olive Branch Church Invite", "category": "Christian Wedding Cards", "per": "1 card", "mrp": 26, "offerPrice": 26, "minQty": 100, "qtyStep": 50, "tiers": [{"from": 200, "price": 24}, {"from": 500, "price": 22}], "material": "Matte board", "size": "5 x 7 in", "orientation": "Portrait", "style": "Single card", "image": "", "sample": true},
  {"id": 6, "code": "ZD-006", "name": "Royal Scroll in Velvet Tube", "category": "Scroll Invitations", "per": "1 card", "mrp": 85, "offerPrice": 85, "minQty": 50, "qtyStep": 25, "tiers": [{"from": 200, "price": 79}], "material": "Parchment paper", "size": "A4 scroll", "orientation": "Portrait", "style": "Scroll", "image": "", "sample": true},
  {"id": 7, "code": "ZD-007", "name": "Clear Acrylic Mandala Invite", "category": "Acrylic Invitations", "per": "1 card", "mrp": 120, "offerPrice": 120, "minQty": 50, "qtyStep": 25, "tiers": [{"from": 150, "price": 112}], "material": "3 mm acrylic", "size": "5 x 7 in", "orientation": "Portrait", "style": "Single sheet", "image": "", "sample": true},
  {"id": 8, "code": "ZD-008", "name": "Peacock Foil Gatefold", "category": "Foil & Metallic Cards", "per": "1 card", "mrp": 45, "offerPrice": 45, "minQty": 100, "qtyStep": 50, "tiers": [{"from": 200, "price": 42}, {"from": 500, "price": 39}], "material": "Metallic board", "size": "6 x 9 in", "orientation": "Portrait", "style": "Gatefold", "image": "", "sample": true},
  {"id": 9, "code": "ZD-009", "name": "Keepsake Rigid Box Invite", "category": "Premium Box Invitations", "per": "1 card", "mrp": 350, "offerPrice": 350, "minQty": 50, "qtyStep": 25, "tiers": [], "material": "Rigid box with inserts", "size": "8 x 8 in", "orientation": "Square", "style": "Box set", "image": "", "sample": true},
  {"id": 10, "code": "ZD-010", "name": "Balloon Party Birthday Card", "category": "Birthday Invitations", "per": "1 card", "mrp": 10, "offerPrice": 10, "minQty": 100, "qtyStep": 50, "tiers": [{"from": 300, "price": 9}], "material": "Art card", "size": "4 x 6 in", "orientation": "Landscape", "style": "Single card", "image": "", "sample": true},
  {"id": 11, "code": "ZD-011", "name": "Kalash Griha Pravesh Invite", "category": "House Warming Invitations", "per": "1 card", "mrp": 15, "offerPrice": 15, "minQty": 100, "qtyStep": 50, "tiers": [{"from": 300, "price": 13.5}], "material": "Art board", "size": "5 x 7 in", "orientation": "Portrait", "style": "Single card", "image": "", "sample": true},
  {"id": 12, "code": "ZD-012", "name": "Valaikappu Bangles Invite", "category": "Baby Shower Invitations", "per": "1 card", "mrp": 16, "offerPrice": 16, "minQty": 100, "qtyStep": 50, "tiers": [{"from": 300, "price": 14.5}], "material": "Art board", "size": "5 x 7 in", "orientation": "Portrait", "style": "Single card", "image": "", "sample": true},
  {"id": 13, "code": "ZD-013", "name": "2027 Table Calendar", "category": "Diaries & Calendars", "per": "1 piece", "mrp": 95, "offerPrice": 95, "minQty": 50, "qtyStep": 25, "tiers": [{"from": 100, "price": 88}, {"from": 250, "price": 82}], "material": "Board with wire binding", "size": "8 x 6 in", "orientation": "Landscape", "style": "Desk calendar", "image": "/products-art/desk-calendar.svg", "sample": true},
  {"id": 14, "code": "ZD-014", "name": "Personalised Steel Tumbler Gift", "category": "Return Gifts", "per": "1 piece", "mrp": 120, "offerPrice": 120, "minQty": 50, "qtyStep": 25, "tiers": [{"from": 100, "price": 110}], "material": "Steel", "size": "300 ml", "orientation": "-", "style": "Gift", "image": "", "sample": true},
  {"id": 15, "code": "ZD-015", "name": "Premium Visiting Cards (100)", "category": "Visiting Cards & Stationery", "per": "1 pack", "mrp": 450, "offerPrice": 450, "minQty": 1, "qtyStep": 1, "tiers": [], "material": "350 gsm matte", "size": "3.5 x 2 in", "orientation": "Landscape", "style": "Pack of 100", "image": "", "sample": true},
  {"id": 16, "code": "ZD-016", "name": "Long Notebook, 172 Pages, Custom Cover", "category": "School & College Notebooks", "per": "1 notebook", "mrp": 48, "offerPrice": 48, "minQty": 100, "qtyStep": 50, "tiers": [{"from": 500, "price": 44}, {"from": 1000, "price": 41}], "material": "58 gsm maplitho, 250 gsm cover", "size": "29.7 x 19 cm", "orientation": "Portrait", "style": "Centre-stapled", "image": "", "sample": true},
  {"id": 17, "code": "ZD-017", "name": "Hard Bound A5 Notebook with Your Logo", "category": "School & College Notebooks", "per": "1 notebook", "mrp": 95, "offerPrice": 95, "minQty": 50, "qtyStep": 25, "tiers": [{"from": 200, "price": 88}, {"from": 500, "price": 82}], "material": "70 gsm, hard board cover", "size": "A5", "orientation": "Portrait", "style": "Case bound", "image": "", "sample": true},
  {"id": 18, "code": "ZD-018", "name": "Bill Book, Duplicate, 50 Sets", "category": "Bill Books & Receipt Books", "per": "1 book", "mrp": 85, "offerPrice": 85, "minQty": 10, "qtyStep": 5, "tiers": [{"from": 50, "price": 76}], "material": "NCR carbonless paper", "size": "A5", "orientation": "Portrait", "style": "Numbered, perforated", "image": "", "sample": true},
  {"id": 19, "code": "ZD-019", "name": "Round Product Labels, Gloss", "category": "Labels & Stickers", "per": "1 sheet of 24", "mrp": 18, "offerPrice": 18, "minQty": 50, "qtyStep": 50, "tiers": [{"from": 500, "price": 14}], "material": "Gloss sticker paper", "size": "40 mm round", "orientation": "-", "style": "Die cut", "image": "", "sample": true},
  {"id": 20, "code": "ZD-020", "name": "Sweet Box with Window, 500 g", "category": "Sweet & Cake Boxes", "per": "1 box", "mrp": 22, "offerPrice": 22, "minQty": 200, "qtyStep": 100, "tiers": [{"from": 1000, "price": 19}], "material": "300 gsm duplex board", "size": "20 x 14 x 5 cm", "orientation": "-", "style": "Printed, window", "image": "", "sample": true},
  {"id": 21, "code": "ZD-021", "name": "2027 Executive Diary with Name Emboss", "category": "Diaries & Calendars", "per": "1 diary", "mrp": 260, "offerPrice": 260, "minQty": 25, "qtyStep": 25, "tiers": [{"from": 100, "price": 240}], "material": "Leatherette cover, 70 gsm", "size": "A5", "orientation": "Portrait", "style": "Dated, gold emboss", "image": "/products-art/executive-diary.svg", "sample": true},
  {"id": 22, "code": "ZD-022", "name": "A5 Flyers, Full Colour, Both Sides", "category": "Flyers & Brochures", "per": "1 flyer", "mrp": 3.5, "offerPrice": 3.5, "minQty": 500, "qtyStep": 500, "tiers": [{"from": 2000, "price": 2.6}], "material": "130 gsm art paper", "size": "A5", "orientation": "Portrait", "style": "Double side", "image": "", "sample": true},
  {"id": 23, "code": "ZD-023", "name": "Tri-fold Brochure, A4", "category": "Flyers & Brochures", "per": "1 brochure", "mrp": 12, "offerPrice": 12, "minQty": 200, "qtyStep": 100, "tiers": [{"from": 1000, "price": 9.5}], "material": "170 gsm gloss", "size": "A4 folded", "orientation": "Landscape", "style": "Tri-fold", "image": "", "sample": true},
  {"id": 24, "code": "ZD-024", "name": "Company Letterhead, 100 gsm", "category": "Letterheads & Envelopes", "per": "1 sheet", "mrp": 4, "offerPrice": 4, "minQty": 250, "qtyStep": 250, "tiers": [{"from": 1000, "price": 3.2}], "material": "100 gsm bond", "size": "A4", "orientation": "Portrait", "style": "Single side", "image": "", "sample": true},
  {"id": 25, "code": "ZD-025", "name": "PVC ID Card with Photo", "category": "ID Cards", "per": "1 card", "mrp": 45, "offerPrice": 45, "minQty": 25, "qtyStep": 25, "tiers": [{"from": 200, "price": 38}], "material": "PVC", "size": "86 x 54 mm", "orientation": "Portrait", "style": "Both sides, with lanyard slot", "image": "", "sample": true},
  {"id": 26, "code": "ZD-026", "name": "Certificate on Texture Board", "category": "Certificates", "per": "1 certificate", "mrp": 18, "offerPrice": 18, "minQty": 50, "qtyStep": 50, "tiers": [{"from": 300, "price": 14}], "material": "300 gsm texture board", "size": "A4", "orientation": "Landscape", "style": "Gold border", "image": "", "sample": true},
  {"id": 27, "code": "ZD-027", "name": "Synthetic Waterproof Print, 13 x 19 in", "category": "Synthetic & Texture Board Prints", "per": "1 sheet", "mrp": 40, "offerPrice": 40, "minQty": 10, "qtyStep": 10, "tiers": [{"from": 100, "price": 32}], "material": "Synthetic, tear-proof", "size": "13 x 19 in", "orientation": "-", "style": "Full colour", "image": "", "sample": true},
  {"id": 28, "code": "ZD-028", "name": "2027 Wall Calendar, 12 Sheets, Your Name", "category": "Diaries & Calendars", "per": "1 calendar", "mrp": 120, "offerPrice": 120, "minQty": 50, "qtyStep": 25, "tiers": [{"from": 200, "price": 105}, {"from": 500, "price": 95}], "material": "170 gsm art paper", "size": "12 x 18 in", "orientation": "Portrait", "style": "Wire-bound, hanger", "image": "/products-art/wall-calendar.svg", "sample": true},
  {"id": 29, "code": "ZD-029", "name": "2027 Pocket Diary with Logo", "category": "Diaries & Calendars", "per": "1 diary", "mrp": 75, "offerPrice": 75, "minQty": 50, "qtyStep": 50, "tiers": [{"from": 300, "price": 66}], "material": "Soft-touch cover, 60 gsm", "size": "A6", "orientation": "Portrait", "style": "Dated, logo foil", "image": "/products-art/pocket-diary.svg", "sample": true},
  {"id": 30, "code": "ZD-030", "name": "New Year Gift Set: Diary, Calendar and Pen", "category": "Diaries & Calendars", "per": "1 set", "mrp": 450, "offerPrice": 450, "minQty": 25, "qtyStep": 25, "tiers": [{"from": 100, "price": 410}], "material": "Gift box with diary, desk calendar and pen", "size": "Box 28 x 22 cm", "orientation": "-", "style": "Name printed on all three", "image": "/products-art/gift-set.svg", "sample": true}
];

// Enrich every product with a `price` field (its current offer price) so
// components like ProductCard/HomePage can read `product.price` directly
// without needing to know about getOfferPrice/DISCOUNT_PERCENT. This stays
// correct if DISCOUNT_PERCENT or a per-product offerPrice is set later,
// since it's computed fresh from rawProducts every time this module loads.
export const products = getCatalogProducts();

/**
 * Pick `count` random, non-repeating products, optionally restricted to
 * those priced above `minPrice`. Used for things like the homepage's
 * "Featured Products" section so it doesn't always show the same items.
 */
export function getRandomProducts(count, { minPrice = 0 } = {}) {
  const pool = products.filter((p) => p.price != null && p.price > minPrice);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default products;
