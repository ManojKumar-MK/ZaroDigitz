import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Seo from '../components/Seo';
import { isFirebaseEnabled } from '../firebase/client';
import { onAdminAuth } from '../firebase/auth';
import { AdminDataProvider } from './AdminData';
import { ToastProvider } from './Toast';
import AdminLayout from './AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import NewOrder from './pages/NewOrder';
import EditOrder from './pages/EditOrder';
import OrderPage from './pages/OrderPage';
import ProductPage from './pages/ProductPage';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import Enquiries from './pages/Enquiries';
import Settings from './pages/Settings';
import SeoDashboard from './pages/SeoDashboard';
import { FiWifiOff } from 'react-icons/fi';

function NotConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark text-center px-4">
      <div className="max-w-md text-zinc-300">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-zinc-300"><FiWifiOff size={22} /></div>
        <h1 className="font-semibold text-2xl text-white">Admin panel is not connected</h1>
        <p className="mt-3 text-sm leading-relaxed">
          Add the <code className="text-secondary">VITE_FIREBASE_*</code> values to the environment (see <code className="text-secondary">.env.example</code>) and rebuild. The storefront keeps working without them.
        </p>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [user, setUser] = useState(undefined); // undefined = still checking

  useEffect(() => {
    if (!isFirebaseEnabled) return undefined;
    let unsub = () => {};
    onAdminAuth(setUser).then((u) => { unsub = u; }).catch(() => setUser(null));
    return () => unsub();
  }, []);

  if (!isFirebaseEnabled) return <><Seo title="Admin" noindex path="/admin" /><NotConfigured /></>;
  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-zinc-500"><Seo title="Admin" noindex path="/admin" />Checking sign-in…</div>;
  }
  if (!user) return <div className="admin-root"><Seo title="Admin Login" noindex path="/admin" /><Login /></div>;

  return (
    <ToastProvider>
    <AdminDataProvider>
      <Seo title="Admin" noindex path="/admin" />
      <Routes>
        <Route path="/admin" element={<AdminLayout user={user} />}>
          <Route index element={<Dashboard />} />
          <Route path="orders/new" element={<NewOrder />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderPage />} />
          <Route path="orders/:id/edit" element={<EditOrder />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductPage />} />
          <Route path="products/:code" element={<ProductPage />} />
          <Route path="customers" element={<Customers />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="seo" element={<SeoDashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminDataProvider>
    </ToastProvider>
  );
}
