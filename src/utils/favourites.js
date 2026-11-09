// Saved designs (the heart on each card). Kept in this browser only; no account needed.
import { useEffect, useState } from 'react';

const KEY = 'digitz-saved';
const EVENT = 'digitz-saved-changed';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function toggleSaved(code) {
  const list = read();
  const next = list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent(EVENT));
  return next.includes(code);
}

/** The saved design codes, updated whenever any heart is tapped. */
export function useSaved() {
  const [saved, setSaved] = useState(read);
  useEffect(() => {
    const sync = () => setSaved(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return saved;
}
