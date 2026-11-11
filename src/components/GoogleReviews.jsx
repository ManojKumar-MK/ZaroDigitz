import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaGoogle, FaStar } from 'react-icons/fa';
import { API_URL } from '../firebase/apiStore';
import { googleBusinessLinks } from '../seo/site';
import { useShopSettings } from '../context/ShopSettingsContext';

const Stars = ({ n, size = 16 }) => (
  <span className="inline-flex gap-0.5 text-secondary" aria-label={`${n} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => <FaStar key={i} size={size} className={i <= Math.round(n) ? '' : 'opacity-25'} aria-hidden="true" />)}
  </span>
);

/**
 * Real Google reviews of Zaro Digitz, fetched by our API from Google's Places API.
 * Shows nothing until there are reviews to show (no placeholder or invented quotes).
 */
export default function GoogleReviews() {
  const { settings } = useShopSettings();
  const [data, setData] = useState(null);
  useEffect(() => {
    let gone = false;
    fetch(`${API_URL}/v1/reviews`).then((r) => r.json()).then((j) => { if (!gone) setData(j); }).catch(() => {});
    return () => { gone = true; };
  }, []);
  const reviews = (data?.reviews || []).slice(0, 6);
  if (!reviews.length) return null;
  const links = googleBusinessLinks(settings);

  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-7 xl:px-10 py-0">
      <div className="grid lg:grid-cols-12 gap-6 items-end">
        <div className="lg:col-span-7">
          <h2 className="font-display font-extrabold tracking-[-0.05em] text-[clamp(40px,4.6vw,68px)] leading-[0.9]">What customers say on Google</h2>
          {data.rating && (
            <p className="mt-4 flex flex-wrap items-center gap-3 text-lg">
              <span className="font-display font-extrabold text-4xl">{Number(data.rating).toFixed(1)}</span>
              <Stars n={data.rating} size={20} />
              <span>from {data.count} Google {data.count === 1 ? 'review' : 'reviews'}</span>
            </p>
          )}
        </div>
        <div className="lg:col-span-5 flex flex-wrap gap-3 lg:justify-end">
          <a href={data.url || links.reviews} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-12 px-5 bg-paper2 hover:bg-paper3 font-semibold transition-colors"><FaGoogle aria-hidden="true" /> Read all reviews</a>
          <a href={links.review} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-12 px-5 bg-primary text-white font-semibold hover:bg-primary-dark transition-colors">Write a review</a>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-10">
        {reviews.map((r, i) => (
          <motion.figure key={`${r.author}-${i}`} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.08 }} className="bg-paper2 p-6 flex flex-col">
            <Stars n={r.rating} />
            <blockquote className="mt-4 text-[17px] leading-relaxed flex-1 line-clamp-6">{r.text}</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              {r.photo ? <img src={r.photo} alt="" width="40" height="40" loading="lazy" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full" /> : <span className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center" aria-hidden="true">{r.author[0]}</span>}
              <span className="text-sm">
                {r.authorUrl ? <a href={r.authorUrl} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{r.author}</a> : <span className="font-semibold">{r.author}</span>}
                <span className="block text-ink/70">{r.when}</span>
              </span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-ink/70">Reviews from Google.</p>
    </section>
  );
}
