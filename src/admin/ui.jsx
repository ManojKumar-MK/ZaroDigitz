// Admin design system: neutral zinc surfaces, orange as the single accent,
// compact controls, icons from react-icons/fi (no emoji).
import { useEffect, useRef, useState } from 'react';
import { FiInbox, FiMoreHorizontal, FiX } from 'react-icons/fi';
import { STATUS_LABELS } from '../firebase/orders.js';
import { toDate } from '../firebase/client.js';

export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
export const fmtDate = (v) => { const d = toDate(v); return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; };
export const fmtDateTime = (v) => { const d = toDate(v); return d ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; };

const TONES = {
  new: ['bg-sky-50 text-sky-700 ring-sky-600/20', 'bg-sky-500'],
  confirmed: ['bg-indigo-50 text-indigo-700 ring-indigo-600/20', 'bg-indigo-500'],
  packed: ['bg-amber-50 text-amber-800 ring-amber-600/20', 'bg-amber-500'],
  shipped: ['bg-violet-50 text-violet-700 ring-violet-600/20', 'bg-violet-500'],
  delivered: ['bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'bg-emerald-500'],
  cancelled: ['bg-red-50 text-red-700 ring-red-600/20', 'bg-red-500'],
  open: ['bg-sky-50 text-sky-700 ring-sky-600/20', 'bg-sky-500'],
  resolved: ['bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'bg-emerald-500'],
  unpaid: ['bg-zinc-50 text-zinc-700 ring-zinc-500/20', 'bg-zinc-400'],
  advance: ['bg-amber-50 text-amber-800 ring-amber-600/20', 'bg-amber-500'],
  paid: ['bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'bg-emerald-500'],
  refunded: ['bg-red-50 text-red-700 ring-red-600/20', 'bg-red-500'],
  test: ['bg-amber-50 text-amber-800 ring-amber-600/20', 'bg-amber-500'],
};
const capital = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

export function Badge({ value, label }) {
  const [cls, dot] = TONES[value] || ['bg-zinc-50 text-zinc-700 ring-zinc-500/20', 'bg-zinc-400'];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label || STATUS_LABELS[value] || capital(value)}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div className="min-w-0">
        {back}
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, action, children, className = '', bodyClassName = 'p-5' }) {
  return (
    <section className={`bg-white rounded-xl border border-zinc-200 ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-zinc-100">
          <h2 className="text-[15px] font-semibold text-zinc-900">{title}</h2>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, accent = 'text-zinc-900', icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>{label}</span>
        {Icon && <Icon className="text-zinc-400" size={16} />}
      </div>
      <div className={`text-2xl font-semibold tabular-nums mt-1.5 ${accent}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

export function Button({ children, variant = 'primary', size = 'md', icon: Icon, className = '', ...props }) {
  const styles = {
    primary: 'bg-primary hover:bg-orange-600 text-white shadow-sm',
    secondary: 'bg-white hover:bg-zinc-50 text-zinc-800 ring-1 ring-inset ring-zinc-300 shadow-sm',
    danger: 'bg-white hover:bg-red-50 text-red-600 ring-1 ring-inset ring-red-200',
    ghost: 'hover:bg-zinc-100 text-zinc-600',
    dark: 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm',
  };
  const sizes = { sm: 'h-8 px-2.5 text-[13px] gap-1.5', md: 'h-9 px-3.5 text-sm gap-2', lg: 'h-11 px-5 text-sm gap-2' };
  return (
    <button type="button" className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${styles[variant]} ${sizes[size]} ${className}`} {...props}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Square icon-only button with an accessible label. */
export function IconButton({ icon: Icon, label, className = '', ...props }) {
  return (
    <button type="button" aria-label={label} title={label} className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors disabled:opacity-40 ${className}`} {...props}>
      <Icon size={17} />
    </button>
  );
}

/** Accessible on/off switch. */
export function Toggle({ checked, onChange, label, disabled, size = 'md', tone = 'amber' }) {
  const w = size === 'sm' ? 'w-8 h-[18px]' : 'w-10 h-6';
  const k = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  const shift = size === 'sm' ? 'translate-x-[14px]' : 'translate-x-4';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={`relative inline-flex shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 ${w} ${checked ? (tone === 'green' ? 'bg-emerald-500' : tone === 'orange' ? 'bg-primary' : 'bg-amber-500') : 'bg-zinc-300'}`}
    >
      <span className={`inline-block ${k} rounded-full bg-white shadow transform transition-transform ml-0.5 ${checked ? shift : 'translate-x-0'}`} />
    </button>
  );
}

/** Underlined tab strip. items: [{ value, label, count }] */
export function Tabs({ items, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 -mb-px">
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button key={t.value} type="button" onClick={() => onChange(t.value)} className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${active ? 'border-primary text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>
            {t.label}
            {t.count != null && <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${active ? 'bg-orange-100 text-primary' : 'bg-zinc-100 text-zinc-500'}`}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Dropdown menu. items: [{ label, icon, onClick, danger, href, disabled }] */
export function Menu({ items, label = 'More actions' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" icon={FiMoreHorizontal} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={label} className="!px-2.5" />
      {open && (
        <div role="menu" className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white shadow-lg ring-1 ring-zinc-200 py-1 z-40">
          {items.filter(Boolean).map((it) => {
            const Icon = it.icon;
            const cls = `w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left ${it.danger ? 'text-red-600 hover:bg-red-50' : 'text-zinc-700 hover:bg-zinc-50'} ${it.disabled ? 'opacity-40 pointer-events-none' : ''}`;
            const inner = <>{Icon && <Icon size={15} className={it.danger ? '' : 'text-zinc-400'} />}{it.label}</>;
            return it.href
              ? <a key={it.label} role="menuitem" href={it.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={() => setOpen(false)}>{inner}</a>
              : <button key={it.label} type="button" role="menuitem" className={cls} onClick={() => { setOpen(false); it.onClick?.(); }}>{inner}</button>;
          })}
        </div>
      )}
    </div>
  );
}

export const inputClass = 'w-full h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-zinc-50';

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-zinc-700 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-zinc-500 mt-1">{hint}</span>}
    </label>
  );
}

export function Empty({ title, children, icon: Icon = FiInbox, action }) {
  return (
    <div className="text-center py-14 px-4">
      <div className="mx-auto w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400"><Icon size={20} /></div>
      <div className="mt-3 text-sm font-medium text-zinc-900">{title}</div>
      {children && <div className="text-sm text-zinc-500 mt-1">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Drawer({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-zinc-900/30" onClick={onClose} />
      <div className={`relative h-full w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} bg-zinc-50 shadow-2xl overflow-y-auto`}>
        <header className="sticky top-0 bg-white border-b border-zinc-200 px-5 py-3.5 flex items-center justify-between z-10">
          <h2 className="font-semibold text-zinc-900">{title}</h2>
          <IconButton icon={FiX} label="Close" onClick={onClose} />
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/** Download rows as CSV. columns: [{ key | get, label }] */
export function downloadCsv(filename, rows, columns) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(c.get ? c.get(r) : r[c.key])).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${head}\n${body}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
