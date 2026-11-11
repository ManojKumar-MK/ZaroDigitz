import { Link } from 'react-router-dom';
import { useLang } from '../i18n/context';
import Seo from '../components/Seo';

export default function NotFoundPage() {
  const { t } = useLang();
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-paper text-center px-4 py-20">
      <Seo title={t('Page Not Found')} noindex />
      <div>
        <h1 className="font-display font-extrabold tracking-[-0.04em] text-4xl sm:text-5xl text-ink">{t('Page not found')}</h1>
        <p className="text-xl text-ink mt-3 mb-8">{t('That page does not exist, but our designs do.')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/cards" className="bg-primary hover:bg-primary-dark text-white font-bold px-6 py-3 transition-colors">{t('View Price List')}</Link>
          <Link to="/" className="bg-paper2 hover:bg-paper3 text-ink font-bold px-6 py-3 transition-colors">{t('Go Home')}</Link>
        </div>
      </div>
    </div>
  );
}
