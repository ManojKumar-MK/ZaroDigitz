import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import { FiSend, FiCheckCircle } from 'react-icons/fi';
import Seo from '../components/Seo';
import { staticPage } from '../seo/pages';
import { breadcrumbSchema, googleBusinessLinks } from '../seo/site';
import { saveEnquiry } from '../firebase/orders';
import { useShopSettings } from '../context/ShopSettingsContext';
import { shopWhatsAppLink } from '../utils/whatsapp';
import { LuMail, LuMapPin, LuNavigation, LuPhone, LuStar } from 'react-icons/lu';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', mobile: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const { settings } = useShopSettings();
  const g = googleBusinessLinks(settings);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.mobile.match(/^[6-9]\d{9}$/)) errs.mobile = 'Enter valid mobile number';
    if (form.email && !form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'Enter valid email';
    if (!form.message.trim()) errs.message = 'Message is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSending(true);
    // Stored in Firebase when configured; the UI flow is unchanged either way.
    await Promise.all([saveEnquiry(form), new Promise(r => setTimeout(r, 1200))]);
    setSending(false);
    setSent(true);
  };

  const contactInfo = [
    { icon: LuPhone, label: 'Call Us', value: '+91 7010935230, +91 6369619148', sub: 'Mon-Sat: 9AM - 7PM', color: 'from-blue-500 to-blue-600', href: 'tel:+917010935230' },
    { icon: LuMail, label: 'Email Us', value: 'zarocrackers@gmail.com', sub: 'We reply within 24 hours', color: 'from-red-500 to-red-600', href: 'mailto:zarocrackers@gmail.com' },
    { icon: FaWhatsapp, label: 'WhatsApp', value: '+91 7010935230', sub: 'Quick responses', color: 'from-green-500 to-green-600', href: shopWhatsAppLink('Hi Zaro Digitz! I have a question about invitation cards. Could you help me?', settings.whatsappNumber) },
    { icon: LuMapPin, label: 'Visit Us', value: 'No. 3U, Maruthu Pandiyar Mettu Street', sub: 'Sivakasi, Tamil Nadu - 626123', color: 'from-orange-500 to-primary', href: '#map' },
  ];

  return (
    <div>
      <Seo
        title={staticPage('/contact').title}
        description="Contact Zaro Digitz, Sivakasi. Call or WhatsApp +91 70109 35230, or visit us at No. 3U, Maruthu Pandiyar Mettu Street, Sivakasi 626123."
        path="/contact"
        jsonLd={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Contact Us', path: '/contact' }])}
      />
      {/* Hero */}
      <section className="bg-gradient-to-br from-dark to-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-secondary font-bold text-sm uppercase tracking-widest">Get In Touch</span>
            <h1 className="font-display font-black text-5xl text-white mt-2">Contact <span className="gradient-text">Zaro Digitz</span></h1>
            <p className="text-gray-400 mt-3 max-w-xl mx-auto">Call, WhatsApp or message us about card designs, prices, wording or delivery. We usually reply the same day.</p>
          </motion.div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-12 bg-bg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {contactInfo.map((info, i) => (
              <motion.a
                key={i}
                href={info.href}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl border border-transparent hover:border-primary/20 transition-all group block"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <info.icon size={22} className="text-white" />
                </div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">{info.label}</div>
                <div className="font-bold text-dark text-sm">{info.value}</div>
                <div className="text-xs text-gray-400 mt-1">{info.sub}</div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Map + Form */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Map */}
            <motion.div
              id="map"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display font-bold text-2xl text-dark mb-5">Find Our Store</h2>
              <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 h-80">
                <iframe
                  title="Zaro Digitz on Google Maps"
                  src={g.embed}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                />
              </div>
              <div className="mt-4 p-4 bg-bg rounded-xl border border-gray-100">
                <div className="font-bold text-dark">ZARO Digitz</div>
                <div className="text-sm text-gray-500 mt-1">No. 3U, Maruthu Pandiyar Mettu Street,<br />Sivakasi, Tamil Nadu - 626123</div>
                <div className="text-sm text-primary font-medium mt-2 flex items-center gap-1.5"><LuPhone aria-hidden="true" /> +91 7010935230 / +91 6369619148</div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <a href={g.directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors bg-dark text-white hover:bg-black"><LuNavigation aria-hidden="true" /> Get directions</a>
                  <a href={g.maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors bg-white text-dark ring-1 ring-gray-200 hover:bg-gray-50"><LuMapPin aria-hidden="true" /> Open in Google Maps</a>
                  <a href={g.review} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors on-light bg-secondary text-dark hover:brightness-95"><LuStar aria-hidden="true" /> Rate us on Google</a>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display font-bold text-2xl text-dark mb-5">Send Us a Message</h2>
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center"
                >
                  <FiCheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                  <h3 className="font-display font-bold text-xl text-dark mb-2">Message Sent!</h3>
                  <p className="text-gray-500 text-sm">Thank you, {form.name}! We'll get back to you within 24 hours.</p>
                  <button onClick={() => { setSent(false); setForm({ name: '', mobile: '', email: '', message: '' }); }} className="mt-5 text-primary hover:underline text-sm font-medium">Send another message</button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {[
                    { name: 'name', label: 'Your Name *', type: 'text', placeholder: 'Enter your name' },
                    { name: 'mobile', label: 'Mobile Number *', type: 'tel', placeholder: '10-digit number' },
                    { name: 'email', label: 'Email Address', type: 'email', placeholder: 'Optional' },
                  ].map(field => (
                    <div key={field.name}>
                      <label className="block text-sm font-semibold text-dark mb-2">{field.label}</label>
                      <input
                        type={field.type}
                        value={form[field.name]}
                        onChange={e => { setForm(f => ({ ...f, [field.name]: e.target.value })); setErrors(er => ({ ...er, [field.name]: '' })); }}
                        placeholder={field.placeholder}
                        className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-primary transition-colors ${errors[field.name] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                      />
                      {errors[field.name] && <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>}
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2">Message *</label>
                    <textarea
                      value={form.message}
                      onChange={e => { setForm(f => ({ ...f, message: e.target.value })); setErrors(er => ({ ...er, message: '' })); }}
                      placeholder="How can we help you?"
                      rows={5}
                      className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-primary transition-colors resize-none ${errors.message ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                    />
                    {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
                  </div>
                  <motion.button
                    type="submit"
                    disabled={sending}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-orange-500 hover:from-orange-600 hover:to-primary text-white font-bold py-4 rounded-2xl transition-all hover:shadow-xl hover:shadow-orange-500/30 disabled:opacity-60"
                  >
                    {sending ? (
                      <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Sending...</>
                    ) : (
                      <><FiSend /> Send Message</>
                    )}
                  </motion.button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
