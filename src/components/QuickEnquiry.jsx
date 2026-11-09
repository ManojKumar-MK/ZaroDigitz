import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { LuSend, LuCircleCheck } from 'react-icons/lu';
import { saveEnquiry } from '../firebase/orders';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { trackLead } from '../utils/analytics';

/**
 * "Get the best price" enquiry: name + mobile + a prefilled message about what the visitor
 * was looking at. Saved to Admin → Enquiries; WhatsApp offered as the instant alternative.
 */
export default function QuickEnquiry({ subject, title = 'Need the best price or a bulk quote?' }) {
  const { settings } = useShopSettings();
  const [form, setForm] = useState({ name: '', mobile: '', message: subject ? `I'm interested in ${subject}. Quantity: ` : '' });
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); if (error) setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    const mobile = form.mobile.replace(/\D/g, '');
    if (!form.name.trim()) { setError('Please enter your name'); return; }
    if (!/^[6-9]\d{9}$/.test(mobile.slice(-10))) { setError('Please enter a 10-digit mobile number'); return; }
    setError('');
    setState('sending');
    const page = typeof window !== 'undefined' ? window.location.href : '';
    const r = await saveEnquiry({ name: form.name.trim(), mobile, message: `${form.message.trim() || 'Price enquiry'}\n\nPage: ${page}` });
    if (r?.ok) { setState('sent'); trackLead('enquiry_form'); } else { setState('error'); setError('Could not send right now. Please use WhatsApp instead.'); }
  };

  const wa = shopWhatsAppLink(`Hi Zaro Digitz! ${form.message.trim() || `I'd like the best price${subject ? ` for ${subject}` : ''}.`}`, settings.whatsappNumber);

  if (state === 'sent') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3">
        <LuCircleCheck className="text-emerald-600 mt-0.5 shrink-0" size={22} aria-hidden="true" />
        <div>
          <div className="font-bold text-dark">Thank you, {form.name.split(' ')[0]}!</div>
          <p className="text-sm text-gray-600 mt-1">We will call or WhatsApp you on {form.mobile} shortly with the best price.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-paper2 p-5 sm:p-6" aria-label="Price enquiry">
      <h2 className="font-display font-bold text-xl text-dark">{title}</h2>
      <p className="text-sm text-gray-500 mt-1">Leave your number and we will call you back, or chat on WhatsApp now.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <input className="h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:border-primary" placeholder="Your name" value={form.name} onChange={set('name')} autoComplete="name" aria-label="Your name" />
        <input className="h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:border-primary" placeholder="10-digit mobile number" inputMode="tel" value={form.mobile} onChange={set('mobile')} autoComplete="tel" aria-label="Mobile number" />
        <textarea className="sm:col-span-2 rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:border-primary" value={form.message} onChange={set('message')} aria-label="Message" placeholder="What do you need? Quantity, budget, delivery city…" />
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <div className="flex flex-wrap gap-2 mt-4">
        <button type="submit" disabled={state === 'sending'} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold bg-primary hover:bg-orange-600 text-white disabled:opacity-60">
          <LuSend aria-hidden="true" /> {state === 'sending' ? 'Sending…' : 'Get the best price'}
        </button>
        <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold bg-green-600 hover:bg-green-700 text-white">
          <FaWhatsapp aria-hidden="true" /> WhatsApp us
        </a>
      </div>
    </form>
  );
}
