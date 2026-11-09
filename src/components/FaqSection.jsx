import { getFaqs } from '../seo/catalog';
import { useShopSettings } from '../context/ShopSettingsContext';

/** Plain <details> so every answer is in the DOM for crawlers and works without JavaScript. */
export default function FaqSection({ faqs: faqsProp }) {
  const { settings } = useShopSettings();
  const faqs = faqsProp || getFaqs(settings);
  return (
    <section id="faq" className="py-20 bg-paper2">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-primary font-bold text-sm ">FAQ</span>
          <h2 className="font-display font-black text-4xl sm:text-5xl text-dark mt-2">
            Questions About <span className="gradient-text">Ordering Cards</span>
          </h2>
        </div>
        <div className="divide-y divide-gray-100 bg-paper">
          {faqs.map((f) => (
            <details key={f.q} className="group px-5 sm:px-6 py-4 open:bg-white transition-colors">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold text-dark">
                <span>{f.q}</span>
                <span className="text-primary text-xl leading-none group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
              </summary>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed mt-3">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
