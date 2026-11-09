import { fullTitle, TITLE_LIMIT, DESCRIPTION_LIMIT } from '../seo/pages';
import { SITE_URL, SITE_NAME } from '../seo/site';
import { inputClass } from './ui';

const host = new URL(SITE_URL).host;
const crumbsOf = (path) => [SITE_URL.replace(/^https?:\/\//, 'https://'), ...path.split('/').filter(Boolean)].join(' › ');

/** Character count with a bar: green inside the ideal range, amber outside. */
export function LengthMeter({ value, min, max }) {
  const n = value.length;
  const ok = n >= min && n <= max;
  const pct = Math.min(100, Math.round((n / max) * 100));
  return (
    <div className="flex items-center gap-2 mt-1.5" aria-live="polite">
      <div className="flex-1 h-1 rounded-full bg-zinc-200 overflow-hidden"><div className={`h-full rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} /></div>
      <span className={`text-[11px] tabular-nums ${ok ? 'text-zinc-500' : 'text-amber-700'}`}>{n} / {max}</span>
    </div>
  );
}

/** How the page looks as a Google result. */
export function GooglePreview({ path, title, description }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4" aria-label="Google result preview">
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-full bg-zinc-100 ring-1 ring-zinc-200 flex items-center justify-center overflow-hidden"><img src="/zaro-logo.png" alt="" className="w-5 h-5 object-contain" /></span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[13px] text-zinc-900">{SITE_NAME}</span>
          <span className="block text-xs text-zinc-500 truncate">{crumbsOf(path)}</span>
        </span>
      </div>
      <div className="mt-1.5 text-[19px] leading-snug text-[#1a0dab] dark:text-[#99c3ff] truncate" title={title}>{title}</div>
      <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-600 line-clamp-2">{description}</p>
    </div>
  );
}

/** How a shared link looks in WhatsApp (Open Graph tags). */
export function WhatsAppPreview({ title, description, image }) {
  return (
    <div className="rounded-xl p-3 bg-[#efeae2] dark:bg-[#0b141a]" aria-label="WhatsApp link preview">
      <div className="ml-auto max-w-[300px] rounded-lg bg-[#d9fdd3] dark:bg-[#005c4b] p-1 shadow-sm">
        <div className="rounded-md overflow-hidden bg-black/5">
          <img src={image || '/og-image.jpg'} alt="" className="w-full h-36 object-cover bg-white" onError={(e) => { e.currentTarget.src = '/og-image.jpg'; }} />
          <div className="px-2.5 py-2">
            <div className="text-[13px] font-semibold text-zinc-900 dark:text-white line-clamp-2">{title}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 mt-0.5">{description}</div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">{host}</div>
          </div>
        </div>
        <div className="px-1.5 pt-1 pb-0.5 text-[13px] text-[#027eb5] dark:text-[#53bdeb] truncate">{SITE_URL}</div>
      </div>
    </div>
  );
}

/**
 * Title + description inputs with the automatic text as placeholder. Blank = automatic.
 * value: { title, description } (custom only) · auto: { title, description }
 */
export function SeoFields({ value, onChange, auto }) {
  const shownTitle = fullTitle(value.title || auto.title);
  const shownDescription = value.description || auto.description;
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="flex items-center justify-between text-[13px] font-medium text-zinc-700 mb-1.5">
          Search title
          {value.title && <button type="button" className="text-xs font-normal text-primary hover:underline" onClick={() => onChange({ ...value, title: '' })}>Use automatic</button>}
        </span>
        <input className={inputClass} value={value.title} placeholder={auto.title} maxLength={120} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        <LengthMeter value={shownTitle} min={30} max={TITLE_LIMIT} />
        <span className="block text-xs text-zinc-500 mt-1">“| {SITE_NAME}” is added at the end. Leave blank to use the automatic title.</span>
      </label>
      <label className="block">
        <span className="flex items-center justify-between text-[13px] font-medium text-zinc-700 mb-1.5">
          Search description
          {value.description && <button type="button" className="text-xs font-normal text-primary hover:underline" onClick={() => onChange({ ...value, description: '' })}>Use automatic</button>}
        </span>
        <textarea rows={3} className={`${inputClass} !h-auto py-2 leading-relaxed`} value={value.description} placeholder={auto.description} maxLength={320} onChange={(e) => onChange({ ...value, description: e.target.value })} />
        <LengthMeter value={shownDescription} min={110} max={DESCRIPTION_LIMIT} />
        <span className="block text-xs text-zinc-500 mt-1">Shown under the title in Google and in WhatsApp previews. Mention price, Sivakasi and delivery.</span>
      </label>
    </div>
  );
}
