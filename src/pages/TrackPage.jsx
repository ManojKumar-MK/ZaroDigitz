import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import Seo from '../components/Seo';
import { isFirebaseEnabled } from '../firebase/client';
import { getTracking, STATUS_LABELS, STATUS_DESCRIPTIONS } from '../firebase/orders';
import { breadcrumbSchema, googleBusinessLinks } from '../seo/site';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { LuCheck, LuStar } from 'react-icons/lu';

const FLOW = ['new', 'confirmed', 'packed', 'shipped', 'delivered'];
const fmt = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const fmtDay = (v) => { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };

/** Customer order tracking: order number + mobile number -> timeline, transport details, photos. */
export default function TrackPage() {
  const [params, setParams] = useSearchParams();
  const { settings } = useShopSettings();
  const [orderNumber, setOrderNumber] = useState(params.get('order') || '');
  const [mobile, setMobile] = useState(params.get('mobile') || '');
  const [state, setState] = useState({ status: 'idle' });

  const lookup = async (o = orderNumber, m = mobile) => {
    if (!o.trim() || String(m).replace(/\D/g, '').length < 4) { setState({ status: 'error', message: 'Enter your order number and the mobile number used for the order.' }); return; }
    setState({ status: 'loading' });
    try {
      const doc = await getTracking(o.trim(), m);
      setState(doc ? { status: 'found', doc } : { status: 'missing' });
      setParams({ order: o.trim(), mobile: String(m).replace(/\D/g, '') }, { replace: true });
    } catch (error) {
      console.warn('Tracking lookup failed:', error);
      setState({ status: 'error', message: 'Could not reach the tracking service. Please try again or WhatsApp us.' });
    }
  };

  // Auto-lookup when both values arrive via the link in WhatsApp/Telegram.
  useEffect(() => {
    const o = params.get('order'), m = params.get('mobile');
    if (o && m && isFirebaseEnabled) lookup(o, m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doc = state.doc;
  const stepIndex = doc ? FLOW.indexOf(doc.status) : -1;
  const history = doc ? [...(doc.statusHistory || [])].reverse() : [];
  const helpLink = shopWhatsAppLink(`Hi Zaro Digitz, I need help with my order ${orderNumber || ''}.`, settings.whatsappNumber);

  return (
    <div className="bg-bg min-h-[70vh]">
      <Seo
        title="Track Your Order"
        description="Track your Zaro Digitz order with your order number and mobile number: order status, packing, transport and LR details, and delivery updates."
        path="/track"
        jsonLd={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Track Order', path: '/track' }])}
      />
      <section className="bg-gradient-to-br from-dark to-gray-900 py-14">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <span className="text-secondary text-sm font-bold uppercase tracking-widest">Order status</span>
          <h1 className="font-display font-black text-4xl sm:text-5xl text-white mt-2">Track Your <span className="gradient-text">Order</span></h1>
          <p className="text-gray-400 mt-3">Enter the order ID from your confirmation message and the mobile number you ordered with.</p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input className="sm:col-span-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary uppercase" placeholder="Order ID, e.g. ZD-251020-7K3Q" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} autoCapitalize="characters" />
          <input className="sm:col-span-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary" placeholder="Mobile number" inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <button type="submit" disabled={state.status === 'loading'} className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-orange-600 disabled:opacity-60 text-white font-bold px-4 py-3 rounded-xl"><FiSearch /> Track</button>
        </form>

        {!isFirebaseEnabled && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4">Online tracking is not available right now. Please WhatsApp us for an update.</p>}
        {state.status === 'error' && <p className="text-sm text-red-600 mt-4">{state.message}</p>}
        {state.status === 'loading' && <p className="text-sm text-gray-500 mt-4">Looking up your order…</p>}
        {state.status === 'missing' && (
          <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-5 text-sm text-gray-600">
            No order found for that ID and mobile number. Check the order ID in your confirmation message (it looks like ZD-251020-7K3Q) and use the same mobile number you ordered with.
            <div className="mt-3"><a href={helpLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-green-700 font-semibold hover:underline"><FaWhatsapp /> Ask us on WhatsApp</a></div>
          </div>
        )}

        {doc && (
          <div className="mt-6 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-gray-400">Order</div>
                  <div className="font-mono font-bold text-dark">{doc.orderNumber}</div>
                  <div className="text-xs text-gray-500 mt-1">{doc.customerName ? `Hi ${doc.customerName}! ` : ''}Placed {fmt(doc.placedAt)} · {doc.itemCount} items · ₹{Number(doc.grandTotal || 0).toLocaleString('en-IN')}</div>
                </div>
                <span className={`text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full ${doc.status === 'cancelled' ? 'bg-red-100 text-red-700' : doc.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-primary'}`}>{STATUS_LABELS[doc.status] || doc.status}</span>
              </div>

              {doc.status !== 'cancelled' && (
                <ol className="flex items-center justify-between gap-1 mt-6">
                  {FLOW.map((st, i) => {
                    const done = i <= stepIndex;
                    return (
                      <li key={st} className="flex-1 flex flex-col items-center text-center">
                        <div className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center border-2 ${done ? 'bg-primary border-primary text-white' : 'bg-white border-gray-300 text-gray-400'} ${st === doc.status ? 'ring-4 ring-primary/20' : ''}`}>{done && st !== doc.status ? <LuCheck size={15} aria-label="done" /> : i + 1}</div>
                        <span className={`mt-1.5 text-[11px] font-semibold ${done ? 'text-dark' : 'text-gray-400'}`}>{STATUS_LABELS[st]}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
              <p className="text-sm text-gray-600 mt-5">{STATUS_DESCRIPTIONS[doc.status]}</p>
            </div>

            {doc.status === 'delivered' && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-dark">Happy with your crackers?</h2>
                  <p className="text-sm text-gray-600 mt-1">A short Google review helps other families find Zaro Digitz. It takes a minute.</p>
                </div>
                <a href={googleBusinessLinks(settings).review} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold bg-dark text-white hover:bg-black"><LuStar aria-hidden="true" /> Rate us on Google</a>
              </div>
            )}

            {doc.shipment && (doc.shipment.lrNumber || doc.shipment.transport) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-display font-bold text-dark mb-3">Transport details</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {doc.shipment.lrNumber && <><dt className="text-gray-500">LR number</dt><dd className="font-mono font-semibold text-dark">{doc.shipment.lrNumber}</dd></>}
                  {doc.shipment.transport && <><dt className="text-gray-500">Transport</dt><dd className="text-dark">{doc.shipment.transport}</dd></>}
                  {doc.shipment.transportContact && <><dt className="text-gray-500">Transport contact</dt><dd><a href={`tel:${doc.shipment.transportContact}`} className="text-primary">{doc.shipment.transportContact}</a></dd></>}
                  {doc.shipment.vehicle && <><dt className="text-gray-500">Vehicle</dt><dd className="text-dark">{doc.shipment.vehicle}</dd></>}
                  {doc.shipment.bookedAt && <><dt className="text-gray-500">Booked on</dt><dd className="text-dark">{fmtDay(doc.shipment.bookedAt)}</dd></>}
                  {doc.shipment.expectedBy && <><dt className="text-gray-500">Expected by</dt><dd className="text-dark">{fmtDay(doc.shipment.expectedBy)}</dd></>}
                </dl>
                {doc.shipment.notes && <p className="text-sm text-gray-600 mt-3 bg-bg rounded-xl px-3 py-2">{doc.shipment.notes}</p>}
              </div>
            )}

            {doc.photos?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-display font-bold text-dark mb-3">Photos</h2>
                <ul className="grid grid-cols-3 gap-3">
                  {doc.photos.map((ph) => (
                    <li key={ph.id}><a href={ph.dataUrl} target="_blank" rel="noopener noreferrer"><img src={ph.dataUrl} alt={ph.label} className="w-full h-28 object-cover rounded-xl border" /></a><div className="text-[11px] text-gray-500 mt-1">{ph.label}</div></li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-display font-bold text-dark mb-3">Timeline</h2>
              <ol className="relative border-l-2 border-gray-100 ml-3 space-y-4">
                {history.map((h, i) => (
                  <li key={i} className="ml-4">
                    <span className={`absolute -left-[9px] mt-1 w-4 h-4 rounded-full border-2 border-white ${h.status === 'cancelled' ? 'bg-red-500' : h.status === 'delivered' ? 'bg-emerald-500' : 'bg-primary'}`} />
                    <div className="text-sm font-semibold text-dark">{STATUS_LABELS[h.status] || h.status}<span className="text-gray-400 font-normal text-xs ml-2">{fmt(h.at)}</span></div>
                    {h.note && <p className="text-sm text-gray-600 mt-0.5">{h.note}</p>}
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <a href={helpLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-3 rounded-2xl"><FaWhatsapp /> Need help? WhatsApp us</a>
              <Link to="/cards" className="inline-flex items-center gap-2 bg-white border border-gray-200 text-dark font-bold px-5 py-3 rounded-2xl hover:border-primary">Order again</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
