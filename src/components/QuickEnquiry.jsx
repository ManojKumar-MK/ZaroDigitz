import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import { saveEnquiry } from '../firebase/orders';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { trackLead } from '../utils/analytics';

const field = 'w-full h-14 px-4 bg-paper text-ink text-[17px] placeholder:text-ink/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * "Tell us what you need" enquiry: name, mobile, quantity and a note about what the visitor
 * was looking at. Saved to Admin → Enquiries; WhatsApp offered as the instant alternative.
 */
export default function QuickEnquiry({ subject, title = 'Tell us what you have in mind' }) {
  const { settings } = useShopSettings();
  const [form, setForm] = useState({ name: '', mobile: '', qty: '', note: '' });
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); if (error) setError(''); };
  const about = subject ? `I'm interested in ${subject}.` : 'I need invitation cards.';
  const message = [about, form.qty && `Quantity: ${form.qty}.`, form.note.trim()].filter(Boolean).join(' ');

  const submit = async (e) => {
    e.preventDefault();
    const mobile = form.mobile.replace(/\D/g, '');
    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    if (!/^[6-9]\d{9}$/.test(mobile.slice(-10))) { setError('Please enter a 10-digit mobile number.'); return; }
    setError('');
    setState('sending');
    const page = typeof window !== 'undefined' ? window.location.href : '';
    const r = await saveEnquiry({ name: form.name.trim(), mobile, message: `${message}\n\nPage: ${page}` });
    if (r?.ok) { setState('sent'); trackLead('enquiry_form'); } else { setState('error'); setError('Could not send right now. Please use WhatsApp instead.'); }
  };

  const wa = shopWhatsAppLink(`Hi Zaro Digitz! ${message}`, settings.whatsappNumber);

  return (
    <section className="bg-paper2 text-ink" aria-label="Enquiry">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 xl:px-12 py-24 lg:py-32 grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5">
          <h2 className="font-display font-bold tracking-[-0.03em] text-[clamp(28px,3vw,44px)] leading-[1.02]">{title}</h2>
          <p className="text-lg mt-4 max-w-[40ch]">Leave your number and we call you back with designs and prices, or chat with us on WhatsApp right now.</p>
        </div>

        <div className="lg:col-span-7">
          {state === 'sent' ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-paper p-8">
              <p className="font-display font-bold text-2xl">Thank you, {form.name.split(' ')[0]}.</p>
              <p className="text-lg mt-2">We will call or WhatsApp you on {form.mobile} soon with designs and prices.</p>
            </motion.div>
          ) : (
            <form onSubmit={submit} noValidate className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block font-semibold mb-1.5">Your name</span>
                <input className={field} value={form.name} onChange={set('name')} autoComplete="name" />
              </label>
              <label className="block">
                <span className="block font-semibold mb-1.5">Mobile number</span>
                <input className={field} inputMode="tel" placeholder="10 digits" value={form.mobile} onChange={set('mobile')} autoComplete="tel" />
              </label>
              <label className="block">
                <span className="block font-semibold mb-1.5">How many?</span>
                <input className={field} inputMode="numeric" placeholder="e.g. 300" value={form.qty} onChange={set('qty')} />
              </label>
              <label className="block">
                <span className="block font-semibold mb-1.5">Looking for</span>
                <input className={`${field} bg-paper3`} value={subject || 'Invitation cards'} readOnly tabIndex={-1} />
              </label>
              <label className="block sm:col-span-2">
                <span className="block font-semibold mb-1.5">Anything else? <span className="font-normal">(optional)</span></span>
                <textarea className={`${field} h-auto min-h-[96px] py-3`} value={form.note} onChange={set('note')} placeholder="Event date, colours you like, language, delivery city…" />
              </label>
              {error && <p className="sm:col-span-2 text-red-700 font-medium" role="alert">{error}</p>}
              <div className="sm:col-span-2 flex flex-wrap gap-3 mt-1">
                <button type="submit" disabled={state === 'sending'} className="inline-flex items-center justify-center h-14 px-8 bg-primary text-white font-bold transition-colors hover:bg-primary-dark disabled:opacity-60">
                  {state === 'sending' ? 'Sending…' : 'Call me back'}
                </button>
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 h-14 px-8 bg-ink text-paper font-bold transition-colors hover:bg-night">
                  <FaWhatsapp size={20} aria-hidden="true" /> WhatsApp us
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
