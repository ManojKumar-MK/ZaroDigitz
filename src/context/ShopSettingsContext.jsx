import { createContext, useContext, useEffect, useState } from 'react';
import { isFirebaseEnabled } from '../firebase/client';
import { DEFAULT_SETTINGS } from '../firebase/catalog';
import { initAnalytics } from '../utils/analytics';
import { applyCustomCategories } from '../seo/catalog';

const ShopSettingsContext = createContext({ settings: DEFAULT_SETTINGS, live: false });

/**
 * Starts the Firestore catalog/settings sync (when Firebase is configured) and
 * exposes store-wide settings. Without Firebase it just serves the defaults, so
 * the storefront behaves exactly as it did before.
 */
export function ShopSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!isFirebaseEnabled) return undefined;
    let stop = () => {};
    let cancelled = false;
    // Start the live catalog after the page has painted: the cached catalog shows meanwhile,
    // and the Firebase SDK no longer competes with the first render.
    const whenIdle = () => new Promise((resolve) => {
      const go = () => (window.requestIdleCallback ? window.requestIdleCallback(resolve, { timeout: 2500 }) : setTimeout(resolve, 300));
      if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    });
    whenIdle()
      .then(() => (cancelled ? Promise.reject(new Error('unmounted')) : import('../firebase/catalog')))
      .then(({ startCatalogSync }) => startCatalogSync({ onSettings: (s) => { applyCustomCategories(s.customCategories); setSettings(s); setLive(true); if (s.ga4Id && !window.location.pathname.startsWith('/admin')) initAnalytics(s.ga4Id); } }))
      .then((unsub) => { if (cancelled) unsub(); else stop = unsub; })
      .catch((err) => { if (!cancelled) console.warn('Live catalog unavailable, using static price list.', err); });
    return () => { cancelled = true; stop(); };
  }, []);

  return <ShopSettingsContext.Provider value={{ settings, live }}>{children}</ShopSettingsContext.Provider>;
}

export const useShopSettings = () => useContext(ShopSettingsContext);
