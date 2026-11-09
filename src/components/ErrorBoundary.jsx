import { Component } from 'react';
import { LuSparkles } from 'react-icons/lu';

/** Catches render/chunk errors so the visitor sees a reload button instead of a blank page. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const isChunk = /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(this.state.error?.message || '');
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-20 text-center">
        <div className="max-w-md">
          <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-primary/10 text-primary flex items-center justify-center"><LuSparkles size={36} /></div>
          <h1 className="font-display font-black text-2xl text-dark mb-2">{isChunk ? 'The site was just updated' : 'Something went wrong'}</h1>
          <p className="text-gray-500 text-sm mb-6">
            {isChunk ? 'Please reload to get the latest version. Your cart is kept.' : 'Please reload the page. If this keeps happening, WhatsApp us at +91 7010935230.'}
          </p>
          <button type="button" onClick={() => window.location.reload()} className="bg-primary hover:bg-[#5A1420] text-white font-bold px-6 py-3 ">
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
