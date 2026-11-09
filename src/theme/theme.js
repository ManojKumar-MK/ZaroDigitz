// Light / dark / system theme, shared by the storefront and the admin.
// The early inline script in index.html applies the class before React renders.
const KEY = 'digitz-theme';
const listeners = new Set();
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function getThemePreference() {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch { return 'system'; }
}
export function resolvedTheme(pref = getThemePreference()) {
  return pref === 'system' ? (media?.matches ? 'dark' : 'light') : pref;
}
export function applyTheme(pref = getThemePreference()) {
  if (typeof document === 'undefined') return;
  // The storefront is always light; only the admin follows the light/dark choice.
  const dark = resolvedTheme(pref) === 'dark' && window.location.pathname.startsWith('/admin');
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0f0809' : '#5A1420');
}
export function setThemePreference(pref) {
  try { if (pref === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, pref); } catch { /* storage blocked */ }
  applyTheme(pref);
  listeners.forEach((fn) => fn(pref));
}
export function subscribeTheme(fn) {
  listeners.add(fn);
  const onMedia = () => { if (getThemePreference() === 'system') { applyTheme('system'); fn('system'); } };
  media?.addEventListener?.('change', onMedia);
  return () => { listeners.delete(fn); media?.removeEventListener?.('change', onMedia); };
}
