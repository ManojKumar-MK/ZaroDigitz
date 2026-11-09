import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { CartProvider } from './context/CartContext';
import { ShopSettingsProvider } from './context/ShopSettingsContext';
import ErrorBoundary from './components/ErrorBoundary';
import { trackPage } from './utils/analytics';

/**
 * React.lazy that survives a deploy: hashed chunk names change, so a visitor on
 * the old page gets a 404 for the new chunk. Reload once to pick up the new build;
 * if it still fails, let the ErrorBoundary show a reload button.
 */
function lazyWithRetry(factory, key) {
  return lazy(() =>
    factory().then((mod) => { sessionStorage.removeItem(`chunk-retry-${key}`); return mod; }).catch((error) => {
      const flag = `chunk-retry-${key}`;
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, '1');
        window.location.reload();
        return new Promise(() => {}); // never resolves; the reload takes over
      }
      throw error;
    })
  );
}
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingButtons from './components/FloatingButtons';
import StickyCartButton from './components/StickyCartButton';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import PriceListPage from './pages/PriceListPage';
import CartPage from './pages/CartPage';
// Checkout pulls in jsPDF and the country/state/city dataset (several MB);
// load it only when someone actually reaches /checkout.
const CheckoutPage = lazyWithRetry(() => import('./pages/CheckoutPage'), 'checkout');
// Admin panel (Firebase-backed). Separate chunk; only loads on /admin.
const AdminApp = lazyWithRetry(() => import('./admin/AdminApp'), 'admin');
import ContactPage from './pages/ContactPage';
import Seo from './components/Seo';
import ProductPage from './pages/ProductPage';
import NotFoundPage from './pages/NotFoundPage';
import TrackPage from './pages/TrackPage';
const InvoicePage = lazyWithRetry(() => import('./pages/InvoicePage'), 'invoice');

// Remount the price list when the category changes so search/pagination state resets.
function PriceListRoute() {
  const { slug } = useParams();
  return <PriceListPage key={slug || 'all'} />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    // after <Seo> has set the title for this route
    const t = setTimeout(() => trackPage(pathname), 300);
    return () => clearTimeout(t);
  }, [pathname]);
  return null;
}

function AppLayout() {
  const { pathname } = useLocation();
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading admin…</div>}>
          <AdminApp />
        </Suspense>
      </ErrorBoundary>
    );
  }
  return (
    <div className="store-root min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/cards" element={<PriceListRoute />} />
          <Route path="/cards/:slug" element={<PriceListRoute />} />
          <Route path="/product/:code" element={<ProductPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/invoice/:token" element={<Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-12 text-gray-500">Loading invoice…</div>}><InvoicePage /></Suspense>} />
          <Route path="/cart" element={<><Seo title="Your Cart" path="/cart" noindex /><CartPage /></>} />
          <Route path="/checkout" element={<><Seo title="Checkout" path="/checkout" noindex /><Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-12 text-gray-500 flex items-center gap-3"><span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Loading checkout…</div>}><CheckoutPage /></Suspense></>} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      <FloatingButtons />
      <StickyCartButton />
      <ScrollToTop />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ShopSettingsProvider>
        <CartProvider>
          <AppLayout />
        </CartProvider>
      </ShopSettingsProvider>
    </BrowserRouter>
  );
}
