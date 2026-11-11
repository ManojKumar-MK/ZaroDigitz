import { useState } from 'react';
import { useAdminData } from './AdminData';
import { saveSettings } from '../firebase/catalog';
import { useToast } from './Toast';
import { Button, Card, Toggle } from './ui';

const SECTIONS = [
  ['newyear', 'Calendars and diaries for 2027', 'Large picture with tabs: desk calendar, wall calendar, diaries, gift set'],
  ['services', 'Rate card', 'The printed price list on the wine background'],
  ['numbers', 'Numbers beside the rate card', '13 × 19 in, 350 gsm, 1 day to proof, 7 days printing'],
  ['traditions', 'Invitations on the rate card', 'The wedding and function cards group in the price list'],
  ['favourites', 'Designs: calendars and diaries tab', 'Designs ready to order, calendars and diaries first'],
  ['printing', 'Designs: printing tab', 'Visiting cards, flyers, bill books, notebooks…'],
  ['budget', 'Designs: wedding cards tab', 'Wedding and function cards, lowest price first'],
  ['timeline', 'From your phone to the press', 'The six steps of an order'],
  ['benefits', 'Shop sign', 'Everything on our shop sign, on a gold background'],
  ['reviews', 'Google reviews', 'Shows only when reviews are available'],
  ['faq', 'Questions', 'Frequently asked questions, as reading text'],
  ['visit', 'Visit our studio', 'Address, hours, open now, and the ask-for-a-price coupon'],
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
