import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiDownload } from 'react-icons/fi';
import Seo from '../components/Seo';
import { isFirebaseEnabled } from '../firebase/client';
import { getInvoiceShare } from '../firebase/orders';
import { generateInvoicePDF } from '../utils/generateInvoicePDF';

/** Public invoice viewer opened from WhatsApp/Telegram links: /invoice/<token> */
export default function InvoicePage() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let url = null;
    let cancelled = false;
    (async () => {
      try {
        if (!isFirebaseEnabled) throw new Error('not-configured');
        const share = await getInvoiceShare(token);
        if (!share) { if (!cancelled) setState({ status: 'missing' }); return; }
        const { doc, invoiceNo } = await generateInvoicePDF(share.snapshot, share.invoiceNumber || share.orderNumber || 'Invoice'); // viewing never takes a new number
        url = URL.createObjectURL(doc.output('blob'));
        if (!cancelled) setState({ status: 'ready', url, invoiceNo, share });
      } catch (error) {
        console.warn('Invoice could not be loaded:', error);
        if (!cancelled) setState({ status: 'error' });
      }
    })();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [token]);

  const filename = state.invoiceNo ? `Invoice-${String(state.invoiceNo).replace(/[#/\\]+/g, '-')}.pdf` : 'Invoice.pdf';

  return (
    <div className="bg-paper min-h-[70vh]">
      <Seo title="Invoice" noindex path={`/invoice/${token}`} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {state.status === 'loading' && <p className="text-ink/75 text-center py-20">Preparing your invoice…</p>}
        {state.status === 'missing' && (
          <div className="text-center py-20">
            <h1 className="font-display font-bold text-2xl text-ink">Invoice not found</h1>
            <p className="text-ink/75 mt-2">This link is not valid. Please check the message you received, or contact us on WhatsApp at +91 9787702336.</p>
          </div>
        )}
        {state.status === 'error' && (
          <div className="text-center py-20">
            <h1 className="font-display font-bold text-2xl text-ink">Invoice unavailable</h1>
            <p className="text-ink/75 mt-2">Please try again in a moment or contact us on WhatsApp at +91 9787702336.</p>
          </div>
        )}
        {state.status === 'ready' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h1 className="font-display font-bold text-2xl text-ink">Invoice {state.invoiceNo}</h1>
                <p className="text-[15px] text-ink/75">
                  {state.share.orderNumber ? `Order ${state.share.orderNumber} · ` : ''}{state.share.snapshot?.form?.fullName} · ₹{Number(state.share.snapshot?.grandTotal || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <a href={state.url} download={filename} className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-5 py-3 transition-colors">
                <FiDownload /> Download PDF
              </a>
            </div>
            <iframe title="Invoice PDF" src={state.url} className="w-full h-[75vh] bg-paper2" />
            <p className="text-[15px] text-ink/75 mt-3 text-center">Zaro Digitz · No. 3U, Maruthu Pandiyar Mettu Street, Sivakasi 626123 · <Link to="/" className="text-primary hover:underline">digitz.zarocrackers.com</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
