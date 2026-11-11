// Storefront language: English or Tamil. The English sentence is the key, so a missing
// translation simply shows the English text instead of a blank.
import { createContext, useContext } from 'react';
import { TA, PRODUCT_TA } from './ta';
import { categoryTamil } from '../data/products';

export const LANGS = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ta', label: 'தமிழ்', short: 'த' },
];
export const LANG_KEY = 'digitz-lang';

/** The language to start with: ?lang= in the address, then the visitor's last choice, then English. */
export function initialLang() {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'ta' || q === 'en') return q;
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'ta' || saved === 'en') return saved;
  } catch { /* storage blocked: fall through */ }
  return 'en';
}

/** Translate one English string (with {name} placeholders) into the given language. */
export function translate(lang, text, vars) {
  let out = lang === 'ta' && TA[text] ? TA[text] : text;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return out;
}

export const LanguageContext = createContext({ lang: 'en', setLang: () => {} });

/**
 * useLang() → { lang, setLang, t, cat, pname, ta }
 *   t('See what we print')            UI text
 *   cat('Diaries & Calendars')         category name
 *   pname(product)                     product name (its Tamil name when one is saved)
 */
export function useLang() {
  const { lang, setLang } = useContext(LanguageContext);
  const ta = lang === 'ta';
  return {
    lang,
    ta,
    setLang,
    t: (text, vars) => translate(lang, text, vars),
    cat: (c) => (ta && (categoryTamil[c] || TA[c])) || c,
    pname: (p) => (ta && (p?.tamil || PRODUCT_TA[String(p?.code || '').split('::')[0]])) || p?.name || '',
  };
}
