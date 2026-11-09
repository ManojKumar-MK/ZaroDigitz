import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { LuSparkles } from 'react-icons/lu';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-br from-dark to-gray-900 text-center px-4 py-20">
      <Seo title="Page Not Found" noindex />
      <div>
        <div className="mx-auto w-20 h-20 mb-5 rounded-full bg-white/10 text-secondary flex items-center justify-center"><LuSparkles size={36} /></div>
        <h1 className="font-display font-black text-4xl sm:text-5xl text-white">Page not found</h1>
        <p className="text-gray-400 mt-3 mb-8">That page doesn&apos;t exist, but the crackers do.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/cards" className="bg-primary hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl transition-colors">View Price List</Link>
          <Link to="/" className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-2xl transition-colors">Go Home</Link>
        </div>
      </div>
    </div>
  );
}
