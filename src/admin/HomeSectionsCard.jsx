import { useState } from 'react';
import { useAdminData } from './AdminData';
import { saveSettings } from '../firebase/catalog';
import { useToast } from './Toast';
import { Button, Card, Toggle } from './ui';

const SECTIONS = [
  ['benefits', 'Every media', 'Photos on the big words, with the full shop-sign list'],
  ['services', 'Prices', 'Price per piece for calendars, business printing and cards'],
  ['numbers', 'Numbers beside the prices', '13 × 19 in, 350 gsm, 1 day to proof, 7 days printing'],
  ['traditions', 'Invitations in the prices', 'The wedding and function cards rows'],
  ['newyear', 'Calendars and diaries for 2027', 'Big words with the diary photo, and the five New Year pieces'],
  ['timeline', 'How an order goes', 'The four steps from file to finished job'],
  ['favourites', 'Designs: calendars tab', 'Ready to order, calendars and diaries first'],
  ['printing', 'Designs: printing tab', 'Visiting cards, flyers, bill books, notebooks…'],
  ['budget', 'Designs: wedding cards tab', 'Wedding and function cards, lowest price first'],
  ['reviews', 'Google reviews', 'Shows only when reviews are available'],
  ['visit', 'Visit and phone number', 'Phone number, open now, address and directions'],
];
const TABS = [['calendar', 'Calendar'], ['diary', 'Diary'], ['wedding', 'Wedding card']]; // “Try your details on a design” tabs

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

      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">“Try your details on a design” tabs</p>
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
