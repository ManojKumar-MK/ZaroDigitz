// Brand colours chosen in Admin → Settings. They become CSS variables that the storefront, the
// admin panel and the printed invoice all read, so one change recolours everything.

export const PRESETS = [
  { id: 'maroon-gold', label: 'Maroon & Gold', primary: '#7A1F2B', accent: '#C9A032', night: '#2C0A10' },
  { id: 'royal-gold', label: 'Royal Blue & Gold', primary: '#1F3C88', accent: '#D4A73A', night: '#0E1A3A' },
  { id: 'emerald-gold', label: 'Emerald & Gold', primary: '#0F5E4A', accent: '#C9A032', night: '#082A22' },
  { id: 'black-rose', label: 'Black & Rose Gold', primary: '#2A2A2E', accent: '#C98B7A', night: '#111114' },
  { id: 'teal-coral', label: 'Teal & Coral', primary: '#126E73', accent: '#E8836B', night: '#082E31' },
];
export const DEFAULT_BRAND = PRESETS[0];

const STORE = 'digitz-brand';
const HEX = /^#?([0-9a-f]{6})$/i;

/** '#7A1F2B' -> [122, 31, 43] (null when not a 6-digit hex). */
export function hexToRgb(hex) {
  const m = HEX.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (rgb, to, t) => rgb.map((c, i) => Math.round(c + (to[i] - c) * t));
const css = (rgb) => rgb.join(' ');

/** A complete, valid brand from whatever was saved (missing or broken values fall back). */
export function normaliseBrand(theme = {}) {
  return {
    primary: hexToRgb(theme.primary) ? theme.primary : DEFAULT_BRAND.primary,
    accent: hexToRgb(theme.accent) ? theme.accent : DEFAULT_BRAND.accent,
    night: hexToRgb(theme.night) ? theme.night : DEFAULT_BRAND.night,
  };
}

/** Set the CSS variables for a brand (and remember it so the next visit starts in it). */
export function applyBrand(theme, { remember = true } = {}) {
  if (typeof document === 'undefined') return;
  const b = normaliseBrand(theme);
  const primary = hexToRgb(b.primary);
  const accent = hexToRgb(b.accent);
  const night = hexToRgb(b.night);
  const root = document.documentElement.style;
  root.setProperty('--primary-rgb', css(primary));
  root.setProperty('--primary-dark-rgb', css(mix(primary, [0, 0, 0], 0.28)));
  root.setProperty('--accent-rgb', css(accent));
  root.setProperty('--accent-light-rgb', css(mix(accent, [255, 255, 255], 0.35)));
  root.setProperty('--night-brand-rgb', css(night));
  if (remember) { try { localStorage.setItem(STORE, JSON.stringify(b)); } catch { /* storage blocked */ } }
}

/** Apply the last saved brand before React renders (no flash of the default colours). */
export function applyStoredBrand() {
  try { const b = JSON.parse(localStorage.getItem(STORE) || 'null'); if (b) applyBrand(b, { remember: false }); } catch { /* ignore */ }
}

/** The current brand as RGB arrays, for drawing (the invoice PDF). */
export function currentBrandRgb() {
  const read = (name, fallback) => {
    const v = typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : '';
    const parts = v.split(/\s+/).map(Number);
    return parts.length === 3 && parts.every((n) => Number.isFinite(n)) ? parts : fallback;
  };
  return { primary: read('--primary-rgb', [122, 31, 43]), accent: read('--accent-rgb', [201, 160, 50]) };
}
