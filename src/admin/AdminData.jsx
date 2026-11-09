import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useToast } from './Toast';
import { subscribeOrders, subscribeEnquiries, subscribeCustomers } from '../firebase/orders';
import { subscribeProducts, subscribeSettings, DEFAULT_SETTINGS } from '../firebase/catalog';
import { applyCustomCategories } from '../seo/catalog';

const Ctx = createContext(null);

/** One set of live Firestore subscriptions shared by every admin page. */
export function AdminDataProvider({ children }) {
  const [orders, setOrders] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [products, setProducts] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState(null);
  const toast = useToast();
  const seenIds = useRef(null); // null until the first snapshot, then a Set of order ids

  useEffect(() => {
    const unsubs = [];
    const wrap = (p) => p.then((u) => unsubs.push(u)).catch((e) => setError(e.message || String(e)));
    wrap(subscribeOrders((list) => {
      setOrders(list);
      // Pop up for orders that arrive while the admin is open (skip the initial load + imports).
      if (seenIds.current) {
        const fresh = list.filter((o) => !seenIds.current.has(o.id) && !o.imported && !o.demo && o.status === 'new');
        fresh.slice(0, 3).forEach((o) => toast(`New order ${o.orderNumber} from ${o.customer?.name || 'a customer'} · ₹${Number(o.grandTotal || 0).toLocaleString('en-IN')}`, 'info', { sticky: true, action: { label: 'Open order', onClick: () => { window.location.hash = ''; window.history.pushState({}, '', `/admin/orders/${o.id}`); window.dispatchEvent(new PopStateEvent('popstate')); } } }));
        if (fresh.length) document.title = `(${fresh.length}) New order · Zaro Admin`;
      }
      seenIds.current = new Set(list.map((o) => o.id));
    }, { max: 3000 }));
    wrap(subscribeCustomers(setCustomers));
    wrap(subscribeEnquiries(setEnquiries));
    wrap(subscribeProducts(setProducts));
    wrap(subscribeSettings((s) => { applyCustomCategories(s.customCategories); setSettings(s); }));
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Ctx.Provider value={{ orders: orders || [], ordersLoading: orders === null, enquiries, products: products || [], productsLoading: products === null, settings, customers, error }}>{children}</Ctx.Provider>;
}

export const useAdminData = () => useContext(Ctx);
