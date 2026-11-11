import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import Seo from '../components/Seo';
import { staticPage } from '../seo/pages';
import { breadcrumbSchema, googleBusinessLinks, BUSINESS } from '../seo/site';
import { saveEnquiry } from '../firebase/orders';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';

const WRAP = 'max-w-[1440px] mx-auto px-4 sm:px-7 xl:px-10';
const rise = { hidden: { opacity: 0, y: 24 }, show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 } }) };
const Rise = ({ i = 0, as = 'div', className, children }) => {
  const M = motion[as];
  return <M variants={rise} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} className={className}>{children}</M>;
};

const PHONES = ['+91 97877 02336', '+91 63696 19148', '+91 63830 34170'];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', mobile: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const { settings } = useShopSettings();
  const g = googleBusinessLinks(settings);
  const a = BUSINESS.address;
  const wa = shopWhatsAppLink('Hi Zaro Digitz! I have a question about printing.', settings.whatsappNumber);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Please write your name';
    if (!form.mobile.replace(/\D/g, '').match(/^(91)?[6-9]\d{9}$/)) errs.mobile = 'A 10-digit mobile number, like 97877 02336';
    if (form.email && !form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'An email like name@example.com, or leave it empty';
    if (!form.message.trim()) errs.message = 'Tell us what you would like printed';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSending(true);
    await Promise.all([saveEnquiry(form), new Promise((r) => setTimeout(r, 800))]);
    setSending(false);
    setSent(true);
  };

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: '' })); };
  const input = (bad) => `w-full px-4 bg-white/15 text-white text-[17px] placeholder:text-white/75 focus:outline-none focus:bg-white/25 focus-visible:ring-2 focus-visible:ring-secondary ${bad ? 'ring-2 ring-[rgb(var(--accent-light-rgb))]' : ''}`;

  return (
    <div className="bg-paper text-ink">
      <Seo
        title={staticPage('/contact').title}
        description="Contact Zaro Digitz, Sivakasi. Call or WhatsApp +91 97877 02336, or visit us at No. 3U, Maruthu Pandiyar Mettu Street, Sivakasi 626123."
        path="/contact"
        jsonLd={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Contact Us', path: '/contact' }])}
      />

      {/* Where we are, with the map */}
      <section className={`${WRAP} pt-14 sm:pt-20 pb-24 lg:pb-32 grid lg:grid-cols-12 gap-12 lg:gap-8`}>
        <div className="lg:col-span-5 flex flex-col">
          <Rise as="h1" className="font-display font-extrabold tracking-[-0.05em] leading-[0.9] text-[clamp(40px,5vw,76px)] max-w-[12ch]">Call, WhatsApp or visit us</Rise>
          <Rise i={1} as="p" className="text-xl leading-relaxed mt-6 max-w-[40ch]">Ask about designs, prices, wording or delivery. We usually reply the same day.</Rise>
          <Rise i={2} className="flex flex-wrap gap-2 mt-10">
            <a href={wa} target="_blank" rel="noopener noreferrer" className="h-14 px-6 inline-flex items-center gap-2 bg-primary text-white text-[17px] font-bold transition-colors hover:bg-primary-dark"><FaWhatsapp size={20} aria-hidden="true" /> WhatsApp us</a>
            <a href="tel:+919787702336" className="h-14 px-6 inline-flex items-center bg-paper2 text-[17px] font-semibold transition-colors hover:bg-paper3">Call +91 97877 02336</a>
          </Rise>
          <Rise i={3} as="dl" className="grid sm:grid-cols-2 gap-x-8 gap-y-8 mt-14 text-lg">
            <div>
              <dt className="font-display font-semibold text-primary">Studio</dt>
              <dd className="mt-1"><a href={g.maps} target="_blank" rel="noopener noreferrer" className="hover:text-primary">{a.streetAddress},<br />Sivakasi, Tamil Nadu {a.postalCode}</a></dd>
            </div>
            <div>
              <dt className="font-display font-semibold text-primary">Hours</dt>
              <dd className="mt-1">Monday to Saturday<br />9 am to 10 pm<br />Sunday 10 am to 8 pm</dd>
            </div>
            <div>
              <dt className="font-display font-semibold text-primary">Phone</dt>
              <dd className="mt-1 grid tabular-nums">{PHONES.map((p) => <a key={p} href={`tel:${p.replace(/\s/g, '')}`} className="hover:text-primary">{p}</a>)}</dd>
            </div>
            <div>
              <dt className="font-display font-semibold text-primary">Email</dt>
              <dd className="mt-1"><a href={`mailto:${BUSINESS.email}`} className="hover:text-primary break-all">{BUSINESS.email}</a></dd>
            </div>
          </Rise>
        </div>
        <Rise i={1} className="lg:col-start-7 lg:col-span-6 min-h-[420px] lg:min-h-[640px] bg-paper2 flex flex-col">
          <iframe title="Map to Zaro Digitz, Sivakasi" src={g.embed} className="w-full flex-1 min-h-[420px]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          <div className="grid grid-cols-2 gap-2 p-2">
            <a href={g.directions} target="_blank" rel="noopener noreferrer" className="h-14 inline-flex items-center justify-center bg-ink text-paper text-[17px] font-semibold transition-colors hover:bg-night">Get directions</a>
            <a href={g.review} target="_blank" rel="noopener noreferrer" className="h-14 inline-flex items-center justify-center bg-paper text-[17px] font-semibold transition-colors hover:bg-paper3">Review us on Google</a>
          </div>
        </Rise>
      </section>

      <Rise className={`${WRAP} pb-24 lg:pb-32 grid grid-cols-2 lg:grid-cols-3 gap-3`}>
        <img src="/photos/paper-stack.webp" alt="A stack of printed sheets" loading="lazy" className="w-full aspect-[4/5] object-cover" />
        <img src="/photos/colour-loupe.webp" alt="Checking colour with a loupe" loading="lazy" className="w-full aspect-[4/5] object-cover lg:mt-16" />
        <img src="/photos/spiral-notebook.webp" alt="A wire-bound notebook and pens" loading="lazy" className="hidden lg:block w-full aspect-[4/5] object-cover" />
      </Rise>

      {/* A message, on a coupon */}
      <section className={`${WRAP} pb-24 lg:pb-40`}>
        <Rise className="coupon bg-ink text-paper grid lg:grid-cols-[46%_auto_1fr] max-w-[1200px] mx-auto">
          <div className="p-8 sm:p-12 flex flex-col justify-between gap-8">
            <h2 className="font-display font-extrabold tracking-[-0.05em] leading-[1.02] text-[clamp(30px,3vw,44px)]">Send us a message</h2>
            <p className="text-lg max-w-[34ch]">Tell us what you need and how many. We reply on your phone with a price, usually the same day.</p>
          </div>
          <span className="coupon-perforation" aria-hidden="true" />
          <div className="p-8 sm:p-12">
            {sent ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-10" role="status">
                <p className="font-display font-bold text-[28px]">Thank you, {form.name}.</p>
                <p className="text-lg mt-3">We have your message and will call or WhatsApp you on {form.mobile}.</p>
                <button type="button" onClick={() => { setSent(false); setForm({ name: '', mobile: '', email: '', message: '' }); }} className="mt-6 text-lg font-semibold underline underline-offset-4">Send another message</button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2.5">
                {[['name', 'Your name', 'text'], ['mobile', 'Mobile number', 'tel'], ['email', 'Email (if you like)', 'email']].map(([k, label, type]) => (
                  <div key={k}>
                    <label htmlFor={`c-${k}`} className="sr-only">{label}</label>
                    <input id={`c-${k}`} type={type} value={form[k]} onChange={set(k)} placeholder={label} aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `c-${k}-err` : undefined} className={`${input(errors[k])} h-[54px]`} />
                    {errors[k] && <p id={`c-${k}-err`} className="text-[15px] mt-1 text-[rgb(var(--accent-light-rgb))]">{errors[k]}</p>}
                  </div>
                ))}
                <div>
                  <label htmlFor="c-message" className="sr-only">What would you like printed?</label>
                  <textarea id="c-message" rows={4} value={form.message} onChange={set('message')} placeholder="What would you like printed?" aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'c-message-err' : undefined} className={`${input(errors.message)} py-3 resize-none`} />
                  {errors.message && <p id="c-message-err" className="text-[15px] mt-1 text-[rgb(var(--accent-light-rgb))]">{errors.message}</p>}
                </div>
                <button type="submit" disabled={sending} className="h-14 mt-1 bg-primary text-white text-[17px] font-bold transition-colors hover:bg-primary-dark active:scale-[0.99] disabled:opacity-70">{sending ? 'Sending…' : 'Send message'}</button>
              </form>
            )}
          </div>
        </Rise>
      </section>
    </div>
  );
}
