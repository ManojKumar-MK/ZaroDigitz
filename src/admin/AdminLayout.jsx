import { useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { LuLayoutDashboard, LuClipboardList, LuPlus, LuPalette, LuLayers, LuUsers, LuChartLine, LuMessageSquareText, LuSettings, LuGlobe, LuExternalLink, LuLogOut, LuMenu, LuX } from 'react-icons/lu';
import { signOutAdmin } from '../firebase/auth';
import { useAdminData } from './AdminData';
import { ThemeSegmented, ThemeToggle } from '../theme/ThemeToggle';

// The studio's working day, in the order it happens.
const SECTIONS = [
  { title: 'Studio', items: [{ to: '/admin', label: 'Today', icon: LuLayoutDashboard, end: true }] },
  { title: 'Orders', items: [{ to: '/admin/orders', label: 'Orders', icon: LuClipboardList, badge: 'new' }, { to: '/admin/enquiries', label: 'Enquiries', icon: LuMessageSquareText, badge: 'enquiries' }, { to: '/admin/customers', label: 'Customers', icon: LuUsers }] },
  { title: 'Designs', items: [{ to: '/admin/products', label: 'Designs & prices', icon: LuPalette }, { to: '/admin/templates', label: 'Personalise templates', icon: LuLayers }] },
  { title: 'Growth', items: [{ to: '/admin/analytics', label: 'Sales report', icon: LuChartLine }, { to: '/admin/seo', label: 'Google & SEO', icon: LuGlobe }] },
  { items: [{ to: '/admin/settings', label: 'Settings', icon: LuSettings }] },
];

export default function AdminLayout({ user }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { orders, enquiries, error } = useAdminData();
  const counts = {
    new: orders.filter((o) => o.status === 'new' && !o.test).length,
    enquiries: enquiries.filter((e) => e.status !== 'resolved').length,
  };
  const onOrders = pathname === '/admin/orders' || (pathname.startsWith('/admin/orders/') && !pathname.startsWith('/admin/orders/new'));

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <img src="/zaro-logo-112.webp" alt="" className="w-11 h-11 object-contain" />
        <div className="min-w-0">
          <div className="font-display font-bold text-lg leading-tight text-[rgb(var(--accent-light-rgb))]">ZARO Digitz</div>
          <div className="text-[13px] text-[#FBF5EC]/70">Print studio</div>
        </div>
      </div>

      <div className="px-4">
        <Link to="/admin/orders/new" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 h-11 bg-secondary hover:bg-secondary/90 text-[#211114] text-sm font-bold transition-colors">
          <LuPlus size={18} /> New order
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-5">
        {SECTIONS.map((sec, i) => (
          <div key={i}>
            {sec.title && <div className="px-3 mb-1.5 text-[13px] font-semibold text-[#FBF5EC]/50">{sec.title}</div>}
            <ul className="space-y-0.5">
              {sec.items.map((it) => {
                const Icon = it.icon;
                const forceActive = it.to === '/admin/orders' ? onOrders : it.to === '/admin/products' ? pathname.startsWith('/admin/products') : undefined;
                return (
                  <li key={it.to}>
                    <NavLink
                      to={it.to}
                      end={it.end || it.to === '/admin/orders'}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) => {
                        const active = forceActive ?? isActive;
                        return `relative flex items-center gap-3 h-10 px-3 text-[14px] font-medium transition-colors ${active ? 'bg-white/10 text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-secondary' : 'text-[#FBF5EC]/75 hover:bg-white/5 hover:text-white'}`;
                      }}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span className="flex-1">{it.label}</span>
                      {it.badge && counts[it.badge] > 0 && <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-secondary text-[#211114] text-[12px] font-bold flex items-center justify-center tabular-nums">{counts[it.badge]}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 space-y-1 bg-black/15">
        <ThemeSegmented className="mb-2" />
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 h-9 px-3 text-sm text-[#FBF5EC]/80 hover:bg-white/5"><LuExternalLink size={16} /> Open the website</a>
        <button type="button" onClick={() => signOutAdmin()} className="w-full flex items-center gap-3 h-9 px-3 text-sm text-[#FBF5EC]/80 hover:bg-white/5"><LuLogOut size={16} /> Sign out</button>
        <div className="px-3 pt-1 text-xs text-[#FBF5EC]/50 truncate" title={user.email}>{user.email}</div>
      </div>
    </div>
  );

  return (
    <div className="admin-root min-h-screen bg-[#F6F0E7] dark:bg-[#0f0b0c] flex font-body text-zinc-900">
      <aside className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 h-screen bg-night text-[#FBF5EC] transform transition-transform lg:transform-none ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="lg:hidden absolute top-5 right-3 w-9 h-9 flex items-center justify-center text-[#FBF5EC]/70 hover:bg-white/10"><LuX /></button>
        {sidebar}
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-night text-[#FBF5EC] h-14 px-4 flex items-center gap-3">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="w-10 h-10 -ml-2 flex items-center justify-center hover:bg-white/10"><LuMenu size={20} /></button>
          <img src="/zaro-logo-112.webp" alt="" className="w-8 h-8 object-contain" />
          <span className="font-display font-bold flex-1 text-[rgb(var(--accent-light-rgb))]">ZARO Digitz</span>
          <ThemeToggle size={18} className="w-10 h-10 -mr-2 flex items-center justify-center hover:bg-white/10" />
        </header>
        {error && <div className="mx-4 lg:mx-10 mt-4 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 text-sm px-4 py-3">Couldn&apos;t load live data: {error}</div>}
        <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
