import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiPhone, FiMapPin, FiCheckCircle, FiDownload } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import LocationFields from '../components/LocationFields';
import { useCart } from '../context/CartContext';
import { generateInvoicePDF, downloadInvoicePDF } from '../utils/generateInvoicePDF';
import { sendInvoiceToTelegram } from '../utils/telegram';
import { saveOrder, saveInvoiceShare, generateInvoiceToken, recordTelegramResult, generateOrderNumber, getTracking } from '../firebase/orders';
import { isFirebaseEnabled } from '../firebase/client';
import { runtimeUrl } from '../seo/site';
import { trackPurchase } from '../utils/analytics';
import { useShopSettings } from '../context/ShopSettingsContext';
import { computeCharges, DEFAULT_CHARGES_NOTE } from '../data/charges';
import { LuReceiptText, LuShoppingCart } from 'react-icons/lu';

const MIN_CHECKOUT_AMOUNT = 1; // cards have a minimum quantity per design instead
const EXTRA_CHARGES_NOTE = DEFAULT_CHARGES_NOTE;

const FIELD_CONFIG = [
  { name: 'fullName', label: 'Full Name *', type: 'text', placeholder: 'Enter your full name', icon: FiUser, required: true },
  { name: 'mobile', label: 'Mobile Number *', type: 'tel', placeholder: '10-digit mobile number', required: true },
  { name: 'altMobile', label: 'Alternative Mobile', type: 'tel', placeholder: 'Optional', required: false },
  { name: 'email', label: 'Email (Optional)', type: 'email', placeholder: 'Optional: invoice email', required: false },
  { name: 'address', label: 'Address *', type: 'textarea', placeholder: 'Door no., street, area...', required: true },
  { name: 'pincode', label: 'Pincode *', type: 'tel', placeholder: '6-digit pincode (fills state & district)', required: true },
  { name: 'city', label: 'Town / City *', type: 'text', placeholder: 'Town or city', required: true },
];

export default function CheckoutPage() {
  const { cart, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', mobile: '', altMobile: '', email: '', address: '', city: '', district: '', state: '', country: '', pincode: '', eventFor: '', eventDate: '', eventNotes: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [success, setSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState(null); // snapshot kept so the invoice can be re-downloaded after clearCart()
  const { settings } = useShopSettings();
  // Backwards compatible: settings saved before the three-way option used a boolean.
  const whatsappMode = settings.whatsappAfterOrder || (settings.autoOpenWhatsApp === false ? 'off' : 'prompt');
  const [showWaPrompt, setShowWaPrompt] = useState(false);

  useEffect(() => {
    if (!success) return undefined;

    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Let the customer read the confirmation first, then invite them to WhatsApp.
    if (whatsappMode !== 'prompt') return undefined;
    const t = setTimeout(() => setShowWaPrompt(true), 2500);
    return () => clearTimeout(t);
  }, [success, whatsappMode]);

  const canCheckout = totalAmount >= MIN_CHECKOUT_AMOUNT;
  const delivery = 0;
  // Additional charges (handling etc.) are configured in the admin panel.
  const { lines: chargeLines, total: chargesTotal } = computeCharges(totalAmount, settings.charges);
  const chargesNote = settings.chargesNote || DEFAULT_CHARGES_NOTE;
  const grandTotal = totalAmount + chargesTotal;

  /**
   * Text the customer sends us on WhatsApp from the success screen. Keeps the shop
   * in the loop even if Telegram is down, and gives us the customer's own number.
   * Kept under ~1500 chars so the wa.me link opens on every phone.
   */
  const buildWhatsAppOrderText = (order) => {
    const f = order.form;
    const lines = order.cart.map((item) => `• ${item.name} x${item.quantity} = ₹${(item.price * item.quantity).toLocaleString('en-IN')}`);
    const maxLines = 25;
    const shown = lines.slice(0, maxLines);
    if (lines.length > maxLines) shown.push(`… and ${lines.length - maxLines} more items (see invoice)`);
    return [
      `Hi Zaro Digitz, I just placed an order on your website.`,
      order.orderNumber ? `Order ID: ${order.orderNumber}` : null,
      order.invoiceNo ? `Invoice: ${order.invoiceNo}` : null,
      order.invoiceUrl ? `Invoice PDF: ${order.invoiceUrl}` : null,
      '',
      `Name: ${f.fullName}`,
      `Mobile: ${f.mobile}`,
      `Address: ${f.address}, ${f.city}, ${f.district}, ${f.state} - ${f.pincode}`,
      f.eventFor ? `Card for: ${f.eventFor}` : null,
      f.eventDate ? `Event date: ${f.eventDate}` : null,
      f.eventNotes ? `Notes: ${f.eventNotes}` : null,
      '',
      'Items:',
      ...shown,
      '',
      `Subtotal: ₹${Number(order.totalAmount).toLocaleString('en-IN')}`,
      ...(order.charges || []).map((c) => `${c.label}: ₹${Number(c.amount).toLocaleString('en-IN')}`),
      `Total: ₹${Number(order.grandTotal).toLocaleString('en-IN')}`,
      '',
      'Please confirm my order. Thank you!',
    ].filter((l) => l !== null).join('\n');
  };
  const shopWhatsApp = String(settings.whatsappNumber || '917010935230').replace(/\D/g, '');

  /** Plain-text order summary used for downstream order notifications. */
  const buildOrderMessage = () => {
    const lines = [
      '💌 New Order — ZARO Digitz',
      '',
      `Customer: ${form.fullName}`,
      `Mobile: ${form.mobile}${form.altMobile ? ' / ' + form.altMobile : ''}`,
      `Address: ${form.address}, ${form.city}, ${form.district}, ${form.state}, ${form.country} - ${form.pincode}`,
      '',
      'Items:',
      ...cart.map(
        (item) => `• ${item.name} x${item.quantity} — ₹${(item.price * item.quantity).toLocaleString()}`
      ),
      '',
      `Subtotal: ₹${totalAmount.toLocaleString()}`,
      `Note: ${EXTRA_CHARGES_NOTE}`,
      `Total: ₹${grandTotal.toLocaleString()}`,
    ];
    return lines.join('\n');
  };

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Name is required';
    if (!form.mobile.match(/^[6-9]\d{9}$/)) errs.mobile = 'Enter a valid 10-digit mobile number';
    if (form.altMobile && !form.altMobile.match(/^[6-9]\d{9}$/)) errs.altMobile = 'Enter a valid mobile number';
    // Email validation disabled along with the email box.
    // if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address';
    if (!form.address.trim()) errs.address = 'Address is required';
    if (!form.city.trim()) errs.city = 'City is required';
    if (!form.country.trim()) errs.country = 'Country is required';
    if (!form.district.trim()) errs.district = 'District is required';
    if (!form.state.trim()) errs.state = 'State is required';
    if (!form.pincode.match(/^\d{6}$/)) errs.pincode = 'Enter a valid 6-digit pincode';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Open WhatsApp automatically: the tab must be opened synchronously inside the
    // click (popup blockers), then pointed at the prefilled chat once the order is saved.
    // WhatsApp still requires the customer to press Send; no site can do that for them.
    let waWindow = null;
    if (whatsappMode === 'auto') {
      try {
        waWindow = window.open('', '_blank');
        waWindow?.document?.write('<p style="font-family:sans-serif;padding:24px">Placing your order… WhatsApp will open in a moment.</p>');
      } catch { waWindow = null; }
    }

    // Snapshot the order now — cart/form will be cleared/reset shortly after.
    const orderSnapshot = { form, cart, totalAmount, charges: chargeLines, chargesTotal, note: settings.showNoteOnInvoice ? chargesNote : '', delivery, grandTotal };
    // Private invoice link (unguessable token) shared in WhatsApp/Telegram messages.
    const invoiceToken = isFirebaseEnabled ? generateInvoiceToken() : null;
    const invoiceUrl = invoiceToken ? runtimeUrl(`/invoice/${invoiceToken}`) : null;

    setLoading(true);
    setLoadingStep('Preparing your invoice…');

    // Generate the invoice once so Telegram can be sent before the local PDF save starts.
    const { doc, invoiceNo } = await generateInvoicePDF(orderSnapshot);
    const pdfArrayBuffer = doc.output('arraybuffer');
    const pdfBase64 = btoa(
      Array.from(new Uint8Array(pdfArrayBuffer), (byte) => String.fromCharCode(byte)).join('')
    );

    // Telegram runs in the background: it makes two API calls with a PDF upload and
    // can take several seconds, so the customer must not wait for it.
    // The order number is made here (not when saving) so Telegram shows it and the
    // invoice link is written once with it.
    const orderNumber = generateOrderNumber();
    const telegramPromise = settings.telegramEnabled === false
      ? Promise.resolve(null)
      : sendInvoiceToTelegram({ order: { ...orderSnapshot, invoiceUrl, orderNumber }, invoiceNumber: invoiceNo, pdfBase64 })
          .then((r) => { if (!r?.ok) console.warn('Telegram delivery failed:', r); return r; })
          .catch((error) => { console.warn('Telegram forward failed:', error); return { ok: false, reason: error?.message || 'telegram-error' }; });

    // Persist to Firebase (no-op when not configured). The order and its invoice copy
    // are written together; the Telegram outcome is attached when it arrives.
    setLoadingStep('Saving your order…');
    // Saving is retried (a sleeping server or a weak mobile network can fail once).
    // Only network failures are retried. "Permission denied" usually means the order already
    // exists: the website server saves it too when it forwards it to Telegram, or an earlier
    // try arrived. Its public tracking record confirms that.
    const alreadySaved = async () => Boolean(await getTracking(orderNumber, form.mobile).catch(() => null));
    const saveWithRetry = async () => {
      let last = null;
      let maybeArrived = false;
      for (const wait of [0, 1500, 4000]) {
        if (wait) await new Promise((r) => setTimeout(r, wait));
        last = await saveOrder({ ...orderSnapshot, invoiceUrl }, { invoiceNumber: invoiceNo, orderNumber, telegram: { ok: false, reason: 'pending' } });
        if (last.ok || last.reason === 'firebase-disabled') return last;
        if (last.code === 'permission-denied' && (maybeArrived || await alreadySaved())) return { ok: true, id: orderNumber, orderNumber };
        if (last.code === 'permission-denied' || last.code === 'invalid-argument') return last; // the order itself was refused
        maybeArrived = true;
      }
      return last;
    };
    const [saved] = await Promise.all([
      saveWithRetry(),
      invoiceToken ? saveInvoiceShare(invoiceToken, { snapshot: orderSnapshot, invoiceNumber: invoiceNo, orderNumber }) : Promise.resolve(),
    ]);
    if (!saved.ok && saved.reason !== 'firebase-disabled') {
      // Never lose an order silently: tell the shop on Telegram/WhatsApp to add it by hand.
      console.warn('Order not saved after retries:', saved.reason);
      sendInvoiceToTelegram({
        order: { ...orderSnapshot, invoiceUrl, orderNumber, alert: `This order could NOT be saved in the admin panel (${saved.reason || 'error'}). Please add it in Admin → New order.` },
        invoiceNumber: invoiceNo,
      }).catch(() => {});
    }
    telegramPromise.then((result) => { if (saved.ok) recordTelegramResult(saved.id, result); });

    // Invoice email disabled for now (GoDaddy blocks outgoing SMTP). Re-enable together with the email box.
    // const trimmedEmail = form.email?.trim();
    // if (trimmedEmail) {
    //   try {
    //     const emailResponse = await fetch('/api/send-invoice-email', {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({
    //         email: trimmedEmail,
    //         invoiceNumber: invoiceNo,
    //         pdfBase64,
    //       }),
    //     });
    //
    //     const responseText = await emailResponse.text();
    //     let emailPayload = null;
    //
    //     if (responseText) {
    //       try {
    //         emailPayload = JSON.parse(responseText);
    //       } catch {
    //         emailPayload = { ok: false, reason: 'invalid-json-response', raw: responseText.slice(0, 200) };
    //       }
    //     }
    //
    //     if (!emailResponse.ok || !emailPayload?.ok) {
    //       console.warn('Invoice email delivery failed:', emailPayload || { ok: false, reason: 'empty-response' });
    //     }
    //   } catch (error) {
    //     console.warn('Invoice email send failed:', error);
    //   }
    // }

    doc.save(`Invoice-${String(invoiceNo).replace(/[#/\\]+/g, '-')}.pdf`);

    setLoading(false);
    setLoadingStep('');
    const finalOrder = { ...orderSnapshot, invoiceNo, invoiceUrl, orderNumber: saved.ok ? saved.orderNumber : null, pdfBlob: new Blob([pdfArrayBuffer], { type: 'application/pdf' }) };
    setLastOrder(finalOrder);
    trackPurchase(finalOrder);
    if (waWindow) {
      try {
        waWindow.location.href = `https://wa.me/${shopWhatsApp}?text=${encodeURIComponent(buildWhatsAppOrderText(finalOrder))}`;
      } catch { try { waWindow.close(); } catch { /* ignore */ } }
    }
    setSuccess(true);
    clearCart();
  };

  if (success) {
    return (
      <div className={`min-h-[80vh] flex items-center justify-center px-4 py-20 ${showWaPrompt ? 'pb-72 sm:pb-20' : ''}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <FiCheckCircle size={48} className="text-green-500" />
          </motion.div>
          <h2 className="font-display font-black text-4xl text-dark mb-3">Order Placed!</h2>
          <p className="text-gray-500 mb-6 leading-relaxed">
            Thank you for your order! Our team will contact you on <strong>{form.mobile}</strong> to confirm delivery details.
          </p>
          {lastOrder && (
            <a
              href={`https://wa.me/${shopWhatsApp}?text=${encodeURIComponent(buildWhatsAppOrderText(lastOrder))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mb-3 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-colors shadow-lg shadow-green-600/30"
            >
              <FaWhatsapp size={22} /> Send order on WhatsApp
            </a>
          )}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-sm text-green-700">
            {whatsappMode === 'auto' ? 'WhatsApp should have opened with your order filled in; just press Send. If it did not open, tap the button above.' : 'Tap the button above and press Send in WhatsApp.'} That lets us confirm your order quickly. Otherwise our team will call you within 24 hours. WhatsApp: +91 7010935230 / +91 6369619148.
          </div>

          {lastOrder?.orderNumber && (
            <p className="text-sm text-gray-600 mb-4">
              Order ID: <span className="font-mono font-bold text-dark">{lastOrder.orderNumber}</span>. Quote this when you contact us.
            </p>
          )}
          {lastOrder?.pdfBlob && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [new File([lastOrder.pdfBlob], 'invoice.pdf', { type: 'application/pdf' })] }) && (
            <button
              type="button"
              onClick={() => {
                const file = new File([lastOrder.pdfBlob], `Invoice-${String(lastOrder.invoiceNo).replace(/[#/\\]+/g, '-')}.pdf`, { type: 'application/pdf' });
                navigator.share({ files: [file], title: `Zaro Digitz invoice ${lastOrder.invoiceNo}`, text: `My Zaro Digitz order${lastOrder.orderNumber ? ` ${lastOrder.orderNumber}` : ''} invoice` }).catch(() => {});
              }}
              className="w-full mb-3 inline-flex items-center justify-center gap-2 bg-white border border-green-600 text-green-700 font-bold px-8 py-3 rounded-2xl hover:bg-green-50 transition-colors"
            >
              <FaWhatsapp /> Share invoice PDF (WhatsApp, etc.)
            </button>
          )}
          {lastOrder && (
            <button
              onClick={() => downloadInvoicePDF(lastOrder, lastOrder.invoiceNo)}
              className="w-full mb-4 inline-flex items-center justify-center gap-2 bg-white border border-primary text-primary font-bold px-8 py-3 rounded-2xl hover:bg-orange-50 transition-colors"
            >
              <FiDownload /> Download Invoice ({lastOrder.invoiceNo})
            </button>
          )}

          <Link to="/" className="inline-flex items-center gap-2 bg-primary text-white font-bold px-8 py-4 rounded-2xl hover:bg-orange-600 transition-colors">
            Back to Home
          </Link>
        </motion.div>

        {/* Delayed, non-blocking WhatsApp invitation (mode 'prompt') */}
        <AnimatePresence>
          {showWaPrompt && lastOrder && (
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="fixed bottom-24 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[380px] z-[95] bg-white rounded-3xl shadow-2xl border border-green-200 p-5"
              role="dialog"
              aria-label="Send your order on WhatsApp"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0"><FaWhatsapp size={24} /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-dark">One last step</div>
                  <p className="text-sm text-gray-600 mt-0.5">Send us your order on WhatsApp so we can confirm it right away. The message is already written; just press Send.</p>
                </div>
                <button type="button" onClick={() => setShowWaPrompt(false)} aria-label="Dismiss" className="text-gray-400 hover:text-dark text-xl leading-none">×</button>
              </div>
              <div className="flex gap-2 mt-4">
                <a
                  href={`https://wa.me/${shopWhatsApp}?text=${encodeURIComponent(buildWhatsAppOrderText(lastOrder))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowWaPrompt(false)}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-3 rounded-2xl transition-colors"
                >
                  <FaWhatsapp /> Send on WhatsApp
                </a>
                <button type="button" onClick={() => setShowWaPrompt(false)} className="px-4 py-3 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Later</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
        <div>
          <div className="mx-auto w-20 h-20 mb-5 rounded-full bg-primary/10 text-primary flex items-center justify-center"><LuShoppingCart size={36} /></div>
          <h2 className="font-display font-black text-3xl text-dark mb-3">Your cart is empty</h2>
          <Link to="/cards" className="text-primary hover:underline font-medium">Browse Products</Link>
        </div>
      </div>
    );
  }

  if (!canCheckout) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
        <div className="max-w-md">
          <div className="mx-auto w-20 h-20 mb-5 rounded-full bg-primary/10 text-primary flex items-center justify-center"><LuReceiptText size={36} /></div>
          <h2 className="font-display font-black text-3xl text-dark mb-3">Minimum Order Not Reached</h2>
          <p className="text-gray-500 mb-3">Checkout is available only for orders above ₹{MIN_CHECKOUT_AMOUNT.toLocaleString()}.</p>
          <p className="text-sm text-gray-500 mb-8">Current cart total: ₹{totalAmount.toLocaleString()}</p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="bg-white border border-primary text-primary font-bold px-6 py-3 rounded-2xl hover:bg-orange-50 transition-colors"
            >
              Back to Cart
            </button>
            <Link to="/cards" className="bg-primary text-white font-bold px-6 py-3 rounded-2xl hover:bg-orange-600 transition-colors">
              Add More Items
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display font-black text-4xl text-dark mb-2">Checkout</h1>
      <p className="text-gray-500 mb-8">Fill in your details to complete the order</p>
      {settings.acceptingOrders === false && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 px-5 py-4 text-sm">
          We are not taking online orders right now. Please WhatsApp or call us and we will help you directly.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
            <h2 className="font-display font-bold text-xl text-dark mb-6 pb-4 border-b border-gray-100">Delivery Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {FIELD_CONFIG.filter(field => field.name !== 'email').map(field => (
                <div key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label className="block text-sm font-semibold text-dark mb-2">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={form[field.name]}
                      onChange={e => { setForm(f => ({ ...f, [field.name]: e.target.value })); if (errors[field.name]) setErrors(er => ({ ...er, [field.name]: '' })); }}
                      placeholder={field.placeholder}
                      rows={3}
                      className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-primary resize-none transition-colors ${errors[field.name] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={form[field.name]}
                      onChange={e => { setForm(f => ({ ...f, [field.name]: e.target.value })); if (errors[field.name]) setErrors(er => ({ ...er, [field.name]: '' })); }}
                      placeholder={field.placeholder}
                      className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-primary transition-colors ${errors[field.name] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                    />
                  )}
                  {errors[field.name] && <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>}
                </div>
              ))}

              {/* Email box disabled for now (GoDaddy blocks outgoing SMTP).
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-dark mb-2">Email ID (Optional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, email: event.target.value }));
                    if (errors.email) setErrors((current) => ({ ...current, email: '' }));
                  }}
                  placeholder="Optional: invoice will be sent here"
                  className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-primary transition-colors ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                />
                <p className="mt-1 text-xs text-gray-500">If you enter your email, we will send the invoice PDF to it.</p>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              */}

              <LocationFields form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
            </div>

            {/* Card details: optional, they help us prepare the proof faster */}
            <div className="mt-8">
              <h3 className="font-display font-bold text-lg text-dark">Card details <span className="text-sm font-normal text-gray-400">(optional)</span></h3>
              <p className="text-xs text-gray-500 mb-4">We confirm everything with you on WhatsApp before printing, so you can skip this and tell us later.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Names on the card</span>
                  <input name="eventFor" value={form.eventFor} onChange={(e) => setForm({ ...form, eventFor: e.target.value })} maxLength={160} placeholder="e.g. Priya & Arjun" className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Event date</span>
                  <input type="date" name="eventDate" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Wording or special requests</span>
                  <textarea name="eventNotes" value={form.eventNotes} onChange={(e) => setForm({ ...form, eventNotes: e.target.value })} maxLength={2000} rows={3} placeholder="Language (Tamil / English), venue, family names, colours you like…" className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </label>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                After you place the order, we will message you on WhatsApp to collect the names and wording and send a digital proof. Printing starts only after you approve it.
              </p>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full mt-7 bg-gradient-to-r from-primary to-orange-500 hover:from-orange-600 hover:to-primary text-white font-bold py-4 rounded-2xl text-lg transition-all hover:shadow-xl hover:shadow-orange-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  {loadingStep || 'Placing Order...'}
                </span>
              ) : `Place Order — ₹${grandTotal.toLocaleString()}`}
            </motion.button>
          </form>
        </div>

        {/* Summary */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-[124px]">
            <h2 className="font-display font-bold text-xl text-dark mb-4 pb-4 border-b border-gray-100">Order Summary</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4 pr-1">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3 items-start">
                  <img src={item.image || undefined} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-dark truncate">{item.name}</div>
                    <div className="text-xs text-gray-400">Qty: {item.quantity}</div>
                    <div className="text-sm font-bold text-primary">₹{(item.price * item.quantity).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>₹{totalAmount.toLocaleString()}</span></div>
              {chargeLines.map((line) => (
                <div key={line.id} className="flex justify-between text-sm text-gray-500"><span>{line.label}</span><span>₹{line.amount.toLocaleString()}</span></div>
              ))}
              <div className="flex justify-between text-xs text-gray-400 gap-4">
                <span>Note</span>
                <span className="text-right">{chargesNote}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-dark pt-2 border-t border-gray-100">
                <span>Total</span>
                <span className="text-primary">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
