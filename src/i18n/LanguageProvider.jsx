import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LanguageContext, LANG_KEY, initialLang } from './context';

/** Holds the storefront language, remembers it, and sets <html lang> for screen readers and search. */
export default function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  const { pathname } = useLocation();
  const admin = pathname.startsWith('/admin'); // the admin panel stays in English
  const active = admin ? 'en' : lang;
  useEffect(() => {
    document.documentElement.lang = active;
    document.documentElement.dataset.lang = active;
  }, [active]);
  const setLang = (next) => {
    setLangState(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* private mode */ }
  };
  return <LanguageContext.Provider value={{ lang: active, setLang }}>{children}</LanguageContext.Provider>;
}
