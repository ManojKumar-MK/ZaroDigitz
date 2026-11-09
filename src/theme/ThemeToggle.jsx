import { useEffect, useState } from 'react';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';
import { getThemePreference, setThemePreference, subscribeTheme } from './theme';

const ORDER = ['system', 'light', 'dark'];
const META = {
  system: { icon: FiMonitor, label: 'Theme: follow device' },
  light: { icon: FiSun, label: 'Theme: light' },
  dark: { icon: FiMoon, label: 'Theme: dark' },
};

export function useThemePreference() {
  const [pref, setPref] = useState(getThemePreference);
  useEffect(() => subscribeTheme(setPref), []);
  return [pref, setThemePreference];
}

/** Icon button that cycles device → light → dark. */
export function ThemeToggle({ className = '', size = 20 }) {
  const [pref, setPref] = useThemePreference();
  const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
  const { icon: Icon, label } = META[pref];
  return (
    <button type="button" onClick={() => setPref(next)} aria-label={`${label}. Switch to ${next}.`} title={`${label} (click for ${next})`} className={className}>
      <Icon size={size} />
    </button>
  );
}

/** Three-way segmented control: Light / Dark / Device. */
export function ThemeSegmented({ className = '' }) {
  const [pref, setPref] = useThemePreference();
  return (
    <div role="radiogroup" aria-label="Theme" className={`grid grid-cols-3 gap-1 p-1 rounded-lg bg-zinc-100 ${className}`}>
      {[['light', 'Light', FiSun], ['dark', 'Dark', FiMoon], ['system', 'Auto', FiMonitor]].map(([v, l, Icon]) => (
        <button key={v} type="button" role="radio" aria-checked={pref === v} onClick={() => setPref(v)} className={`h-7 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${pref === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}>
          <Icon size={13} /> {l}
        </button>
      ))}
    </div>
  );
}
