import { motion } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { useInView } from 'framer-motion';
import Seo from '../components/Seo';
import { staticPage } from '../seo/pages';
import { breadcrumbSchema } from '../seo/site';
import { LuBadgeCheck, LuBadgeIndianRupee, LuPackageCheck, LuRocket, LuShieldCheck, LuSparkles, LuTarget, LuTruck } from 'react-icons/lu';

function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef();
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 120;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export default function AboutPage() {
  const timeline = [
    { year: '2005', title: 'Founded', desc: 'Started as a small retail shop in Sivakasi, Tamil Nadu.' },
    { year: '2010', title: 'Expansion', desc: 'Expanded to wholesale distribution across South India.' },
    { year: '2015', title: 'Online Presence', desc: 'Launched online ordering for customers across India.' },
    { year: '2020', title: 'Pan India', desc: 'Started delivering to all major cities across India.' },
    { year: '2024', title: 'Milestone', desc: '10,000+ customers and 200+ product catalog reached.' },
  ];

  const team = [
    { name: 'ZARO Crackers Kumar', role: 'Founder & CEO', emoji: '' },
    { name: 'Kavitha Devi', role: 'Head of Operations', emoji: '👩‍💼' },
    { name: 'Arjun Rajan', role: 'Sales Manager', emoji: '👨‍💼' },
  ];

  const values = [
    { icon: LuBadgeIndianRupee, title: 'Best Price', desc: 'We guarantee competitive prices with no hidden charges. Bulk discounts available.' },
    { icon: LuBadgeCheck, title: 'Quality Products', desc: 'Every product is sourced from BIS-certified manufacturers for maximum safety and quality.' },
    { icon: LuPackageCheck, title: 'Safe Packaging', desc: 'Specialized fire-resistant packaging ensures products reach you in perfect condition.' },
    { icon: LuTruck, title: 'Fast Delivery', desc: 'Pan-India delivery within 3-5 business days. Express options available.' },
    { icon: LuShieldCheck, title: 'Trusted Seller', desc: 'Serving 10,000+ happy customers with 20+ years of industry experience.' },
  ];

  return (
    <div>
      <Seo
        title={staticPage('/about').title}
        description="Zaro Digitz has supplied Sivakasi fireworks since 2005. Learn about our shop on the Sattur Bypass Road, Sivakasi, our quality standards and pan-India wholesale delivery."
        path="/about"
        jsonLd={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'About Us', path: '/about' }])}
      />
      {/* Hero */}
      <section className="bg-gradient-to-br from-dark to-gray-900 py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <LuSparkles key={i} size={34} className="absolute text-white" style={{ left: `${(i * 17) % 100}%`, top: `${(i * 13) % 100}%` }} aria-hidden="true" />
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="text-secondary font-bold text-sm uppercase tracking-widest">About Us</span>
            <h1 className="font-display font-black text-5xl sm:text-6xl text-white mt-3 mb-6">
              The <span className="gradient-text">Zaro Digitz</span> Story
            </h1>
            <p className="text-gray-300 text-xl max-w-2xl mx-auto leading-relaxed">
              Two decades of Sivakasi fireworks, bringing joy and colour to celebrations across India
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-primary font-bold text-sm uppercase tracking-widest">Our History</span>
              <h2 className="font-display font-black text-4xl text-dark mt-2 mb-6">
                20 Years of Illuminating <span className="gradient-text">Celebrations</span>
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>Founded in 2005 by Mr. ZARO Crackers Kumar in the fireworks capital of India — Sivakasi, Tamil Nadu — ZARO Crackers began as a humble retail store with a dream to make quality fireworks accessible to everyone.</p>
                <p>Over two decades, we have grown into one of the most trusted names in the fireworks industry, serving customers from households to large-scale event organizers across the entire country.</p>
                <p>Our mission is simple: provide the highest quality fireworks at the most competitive prices, backed by unmatched customer service and safe delivery practices.</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {timeline.map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-16 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white text-xs font-black">
                    {item.year}
                  </div>
                  <div className="pt-1">
                    <div className="font-bold text-dark">{item.title}</div>
                    <div className="text-gray-500 text-sm">{item.desc}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-gradient-to-r from-primary to-orange-500">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { num: 10000, suffix: '+', label: 'Happy Customers' },
              { num: 200, suffix: '+', label: 'Products' },
              { num: 20, suffix: '+', label: 'Years Experience' },
              { num: 50000, suffix: '+', label: 'Orders Delivered' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="font-display font-black text-5xl text-white"><Counter target={stat.num} suffix={stat.suffix} /></div>
                <div className="text-white/80 mt-2 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-bg">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">Why Choose Us</span>
            <h2 className="font-display font-black text-4xl text-dark mt-2">The <span className="gradient-text">ZARO Crackers</span> Promise</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(122,31,43,0.15)' }}
                className="bg-white rounded-2xl p-7 shadow-md border border-transparent hover:border-primary/20 transition-all group"
              >
                <div className="w-14 h-14 mb-4 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors"><v.icon size={28} aria-hidden="true" /></div>
                <h3 className="font-display font-bold text-xl text-dark mb-3">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Mission */}
      <section className="py-20 bg-dark">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: LuTarget, title: 'Our Vision', text: 'To be the most trusted and preferred fireworks supplier in India, bringing joy and safety to every celebration across the country.' },
              { icon: LuRocket, title: 'Our Mission', text: 'To offer the widest range of premium quality fireworks at the most affordable prices, while maintaining the highest standards of safety, packaging, and customer service.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8"
              >
                <h3 className="font-display font-bold text-2xl text-white mb-4 flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-primary/20 text-secondary flex items-center justify-center"><item.icon size={20} aria-hidden="true" /></span>{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
