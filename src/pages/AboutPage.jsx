import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import Seo from '../components/Seo';
import { staticPage } from '../seo/pages';
import { breadcrumbSchema } from '../seo/site';
import { LuBadgeIndianRupee, LuFileCheck2, LuHeart, LuLanguages, LuPrinter, LuStamp, LuTarget, LuTruck } from 'react-icons/lu';

export default function AboutPage() {
  const offer = [
    { title: 'Wedding invitations', desc: 'Hindu, Muslim and Christian wedding cards, from simple single cards to scrolls, acrylic and keepsake boxes.' },
    { title: 'Function cards', desc: 'Birthdays, house warmings, ear piercing, baby showers, puberty ceremonies and holy communions.' },
    { title: 'Printing', desc: 'Calendars, diaries, return gifts, visiting cards and stationery for families and businesses.' },
  ];

  const values = [
    { icon: LuFileCheck2, title: 'Proof before print', desc: 'Every order gets a digital proof on WhatsApp. We print only after you say yes.' },
    { icon: LuLanguages, title: 'Your language', desc: 'Tamil, English or both, with careful spelling and layout.' },
    { icon: LuStamp, title: 'Finishes that last', desc: 'Foil, embossing, laser cuts and good boards, so the card feels special in hand.' },
    { icon: LuBadgeIndianRupee, title: 'Honest prices', desc: 'The price per card is on every design, and bulk prices are shown up front.' },
    { icon: LuPrinter, title: 'Printed in Sivakasi', desc: 'Sivakasi is known across India for printing. We work with experienced local presses.' },
    { icon: LuTruck, title: 'Delivered with care', desc: 'Packed flat and couriered across India, or ready for pickup at our shop.' },
  ];

  return (
    <div>
      <Seo
        title={staticPage('/about').title}
        description={staticPage('/about').description}
        path="/about"
        jsonLd={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'About Us', path: '/about' }])}
      />

      {/* Hero */}
      <section className="hero-bg py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="text-secondary font-bold text-sm uppercase tracking-widest">About Us</span>
            <h1 className="font-display font-black text-5xl sm:text-6xl text-white mt-3 mb-6">
              The <span className="gradient-text">Zaro Digitz</span> Story
            </h1>
            <p className="text-orange-50/80 text-xl max-w-2xl mx-auto leading-relaxed">
              Invitations and printing from Sivakasi, by the family behind Zaro Crackers.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="text-primary font-bold text-sm uppercase tracking-widest">Who we are</span>
              <h2 className="font-display font-black text-4xl text-dark mt-2 mb-6">
                Cards That Start the <span className="gradient-text">Celebration</span>
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>The invitation is the first thing your guests see of your celebration. Zaro Digitz was started in Sivakasi to make that first impression easy to get right: good designs, clear prices, and a simple way to order from anywhere.</p>
                <p>We are part of the Zaro family of businesses in Sivakasi, on the Sivakasi to Sattur Bypass Road. Sivakasi has long been one of India&apos;s printing centres, and we work with local presses to print every card carefully.</p>
                <p>You choose a design online, we prepare a proof with your details on WhatsApp, and we print only after you approve it.</p>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4">
              {offer.map((item, i) => (
                <motion.div key={item.title} whileHover={{ x: 6 }} className="flex gap-4 items-start p-5 rounded-2xl bg-bg">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-orange-500 rounded-xl flex items-center justify-center text-secondary font-black">{i + 1}</div>
                  <div>
                    <div className="font-bold text-dark">{item.title}</div>
                    <div className="text-gray-500 text-sm">{item.desc}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-bg">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">Our promise</span>
            <h2 className="font-display font-black text-4xl text-dark mt-2">What You Can <span className="gradient-text">Expect</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(122,31,43,0.15)' }}
                className="bg-white rounded-2xl p-7 shadow-md border border-transparent hover:border-primary/20 transition-all group"
              >
                <div className="w-14 h-14 mb-4 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-secondary transition-colors"><v.icon size={28} aria-hidden="true" /></div>
                <h3 className="font-display font-bold text-xl text-dark mb-3">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision / Mission */}
      <section className="py-20 bg-dark">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: LuTarget, title: 'Our aim', text: 'To be the easiest place to order invitations online: clear designs, fair prices, and no surprises between the proof and the printed card.' },
              { icon: LuHeart, title: 'How we work', text: 'One person follows your order from the first message to dispatch, so you always know who to ask and what happens next.' },
            ].map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="font-display font-bold text-2xl text-white mb-4 flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-primary/40 text-secondary flex items-center justify-center"><item.icon size={20} aria-hidden="true" /></span>{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/cards" className="on-light inline-flex items-center gap-2 bg-secondary text-dark font-bold px-8 py-4 rounded-2xl hover:scale-105 transition-transform">
              Browse Designs <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
