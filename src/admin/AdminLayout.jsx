import { useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { FiGrid, FiShoppingBag, FiPlus, FiPackage, FiUsers, FiBarChart2, FiMessageSquare, FiSettings, FiGlobe, FiExternalLink, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { signOutAdmin } from '../firebase/auth';
import { useAdminData } from './AdminData';
import { ThemeSegmented, ThemeToggle } from '../theme/ThemeToggle';

const SECTIONS = [
  { items: [{ to: '/admin', label: 'Dashboard', icon: FiGrid, end: true }] },
  { title: 'Sales', items: [{ to: '/admin/orders', label: 'Orders', icon: FiShoppingBag, badge: 'new' }, { to: '/admin/customers', label: 'Customers', icon: FiUsers }, { to: '/admin/enquiries', label: 'Enquiries', icon: FiMessageSquare, badge: 'enquiries' }] },
  { title: 'Catalog', items: [{ to: '/admin/products', label: 'Products', icon: FiPackage }] },
  { title: 'Insights', items: [{ to: '/admin/analytics', label: 'Analytics', icon: FiBarChart2 }, { to: '/admin/seo', label: 'SEO', icon: FiGlobe }] },
  { items: [{ to: '/admin/settings', label: 'Settings', icon: FiSettings }] },
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
      <div className="px-4 h-16 flex items-center gap-3 border-b border-zinc-100">
        <img src="/zaro-logo.png" alt="" className="w-8 h-8 rounded-full" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900 leading-tight">Zaro Digitz</div>
          <div className="text-xs text-zinc-500">Admin</div>
        </div>
      </div>

      <div className="px-3 pt-4">
        <Link to="/admin/orders/new" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 h-9 rounded-lg bg-primary hover:bg-orange-600 text-white text-sm font-medium shadow-sm">
          <FiPlus size={16} /> New order
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {SECTIONS.map((sec, i) => (
          <div key={i}>
            {sec.title && <div className="px-2 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">{sec.title}</div>}
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
                        return `group flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-orange-50 text-primary' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`;
                      }}
                    >
                      <Icon size={17} className="shrink-0" />
                      <span className="flex-1">{it.label}</span>
                      {it.badge && counts[it.badge] > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-semibold flex items-center justify-center tabular-nums">{counts[it.badge]}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-100 p-3 space-y-0.5">
        <ThemeSegmented className="mb-2" />
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100"><FiExternalLink size={16} /> View store</a>
        <button type="button" onClick={() => signOutAdmin()} className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100"><FiLogOut size={16} /> Sign out</button>
        <div className="px-2.5 pt-1 text-xs text-zinc-400 truncate" title={user.email}>{user.email}</div>
      </div>
    </div>
  );

  return (
    <div className="admin-root min-h-screen bg-zinc-50 flex font-body text-zinc-900">
      <aside className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-60 h-screen bg-white border-r border-zinc-200 transform transition-transform lg:transform-none ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="lg:hidden absolute top-4 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"><FiX /></button>
        {sidebar}
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-zinc-900/30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-zinc-200 h-14 px-4 flex items-center gap-3">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="w-9 h-9 -ml-2 flex items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"><FiMenu size={20} /></button>
          <img src="/zaro-logo.png" alt="" className="w-7 h-7 rounded-full" />
          <span className="text-sm font-semibold flex-1">Zaro Admin</span>
          <ThemeToggle size={18} className="w-9 h-9 -mr-2 flex items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100" />
        </header>
        {error && <div className="mx-4 lg:mx-8 mt-4 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 text-sm px-4 py-3">Couldn't load live data: {error}</div>}
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
