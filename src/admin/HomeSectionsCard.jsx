import { useState } from 'react';
import { useAdminData } from './AdminData';
import { saveSettings } from '../firebase/catalog';
import { useToast } from './Toast';
import { Button, Card, Toggle } from './ui';

const SECTIONS = [
  ['newyear', 'New Year calendars & diaries', 'The kinds of calendars and diaries, notes for companies, and the carousel'],
  ['benefits', 'Promise strip', 'The moving gold strip under the hero'],
  ['favourites', 'Customer favourites', 'Carousel of popular designs'],
  ['services', 'Digital printing services', 'The grid of everything on the shop sign'],
  ['printing', 'Printing favourites', 'Carousel of notebooks, flyers, ID cards…'],
  ['traditions', 'Browse by tradition and style', 'Sketched tiles for wedding and function cards'],
  ['numbers', 'Numbers', 'Gold bar with designs, proof time, printing time'],
  ['timeline', 'From your phone to the press', 'The four-step timeline'],
  ['budget', 'Budget-friendly wedding cards', 'Carousel of the lowest-priced cards'],
  ['reviews', 'Google reviews', 'Shows only when reviews are available'],
  ['faq', 'Questions', 'Frequently asked questions'],
  ['visit', 'Visit our studio', 'Address, hours, map, directions'],
];
const TABS = [['calendar', 'Calendar'], ['diary', 'Diary'], ['wedding', 'Wedding card']];

/** Admin → Settings → Home page: show or hide each section and each hero tab. */
export default function HomeSectionsCard() {
  const toast = useToast();
  const { settings } = useAdminData();
  const [sections, setSections] = useState(() => ({ ...(settings?.homeSections || {}) }));
  const [tabs, setTabs] = useState(() => ({ ...(settings?.heroTabs || {}) }));
  const [busy, setBusy] = useState(false);
  const on = (map, key) => map[key] !== false;
  const visibleTabs = TABS.filter(([k]) => on(tabs, k)).length;

  const save = async () => {
    setBusy(true);
    try { await saveSettings({ homeSections: sections, heroTabs: tabs }); toast('Home page updated'); }
    catch (e) { toast(e.message || 'Could not save', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <Card title="Home page">
      <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">Choose what customers see on the home page. Turned-off sections disappear as soon as you save; turn them back on any time.</p>

      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Hero tabs</p>
      <div className="flex flex-wrap gap-6 mb-6">
        {TABS.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-200">
            <Toggle size="sm" tone="green" checked={on(tabs, k)} disabled={on(tabs, k) && visibleTabs === 1} onChange={(v) => setTabs({ ...tabs, [k]: v })} label={label} />
            {label}
          </label>
        ))}
      </div>

      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Sections</p>
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
        {SECTIONS.map(([k, label, hint]) => (
          <label key={k} className="flex items-start gap-3">
            <Toggle size="sm" tone="green" checked={on(sections, k)} onChange={(v) => setSections({ ...sections, [k]: v })} label={label} />
            <span className="text-sm"><span className="block font-medium text-zinc-900 dark:text-zinc-100">{label}</span><span className="block text-xs text-zinc-500">{hint}</span></span>
          </label>
        ))}
      </div>
      <div className="mt-5"><Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save home page'}</Button></div>
    </Card>
  );
}
