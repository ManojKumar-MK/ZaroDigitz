// Click-to-chat links to the shop's WhatsApp with a prefilled message.
export const DEFAULT_SHOP_WHATSAPP = '919787702336';
export const DEFAULT_WHATSAPP_GREETING = 'Hi Zaro Digitz! I found you on digitz.zarocrackers.com and would like to know more about your crackers and prices.';

export function shopWhatsAppLink(text, number = DEFAULT_SHOP_WHATSAPP) {
  const digits = String(number || DEFAULT_SHOP_WHATSAPP).replace(/\D/g, '') || DEFAULT_SHOP_WHATSAPP;
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Greeting plus the page the visitor is on, so the shop knows what they were looking at. */
export function pageContextMessage(greeting = DEFAULT_WHATSAPP_GREETING) {
  if (typeof window === 'undefined') return greeting;
  const title = document.title.replace(/\s*\|\s*Zaro Digitz\s*$/i, '').trim();
  const path = window.location.pathname;
  const isHome = path === '/';
  return isHome ? greeting : `${greeting}\n\nI was looking at: ${title}\n${window.location.origin}${path}`;
}
