// Google Analytics 4, enabled only when VITE_GA4_ID is set (e.g. G-XXXXXXXXXX).
// Admin pages are never tracked.
// The ID comes from Admin → Settings (settings/shop.ga4Id) or, if set at build time, VITE_GA4_ID.
let GA_ID = (import.meta.env ?? {}).VITE_GA4_ID || '';
let started = false;
let pendingPath = null;

export function initAnalytics(id) {
  if (id) GA_ID = String(id).trim();
  if (!/^G-[A-Z0-9]+$/i.test(GA_ID) || started || typeof window === 'undefined') return;
  started = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
  if (pendingPath) { const p = pendingPath; pendingPath = null; trackPage(p); }
  // Every WhatsApp or phone tap anywhere on the shop counts as a lead (enquiry).
  document.addEventListener('click', (e) => {
    const a = e.target?.closest?.('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const method = /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href) ? 'whatsapp' : href.startsWith('tel:') ? 'phone' : null;
    if (method) trackLead(method);
  }, { capture: true });
}

/** GA4 "generate_lead": WhatsApp tap, phone tap or enquiry form (method), on the current page. */
export function trackLead(method) {
  if (!started || !window.gtag || window.location.pathname.startsWith('/admin')) return;
  window.gtag('event', 'generate_lead', { method, page_path: window.location.pathname, currency: 'INR', value: 0 });
}

export function trackPage(pathname) {
  if (pathname.startsWith('/admin') || pathname.startsWith('/invoice/')) return;
  if (!started) { pendingPath = pathname; return; } // first view is sent once the ID arrives
  window.gtag('event', 'page_view', { page_path: pathname, page_location: window.location.href, page_title: document.title });
}

/** Ecommerce purchase event after checkout. */
export function trackPurchase(order) {
  if (!started || !window.gtag) return;
  window.gtag('event', 'purchase', {
    transaction_id: order.orderNumber || order.invoiceNo,
    value: Number(order.grandTotal) || 0,
    currency: 'INR',
    items: (order.cart || []).map((i) => ({ item_id: i.code || i.id, item_name: i.name, item_category: i.category, price: i.price, quantity: i.quantity })),
  });
}
