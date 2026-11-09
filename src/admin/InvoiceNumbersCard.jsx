import { useState } from 'react';
import { FiEye, FiCheck, FiRotateCcw } from 'react-icons/fi';
import { apiRequest } from '../firebase/apiStore';
import { getFirebaseAuth } from '../firebase/client';
import { useToast } from './Toast';
import { Button, Card, fmtDate } from './ui';

/** Admin → Settings: financial-year invoice numbers and a one-time renumbering of old orders. */
export default function InvoiceNumbersCard() {
  const toast = useToast();
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const call = async (method, path, body) => { await getFirebaseAuth(); return apiRequest(method, path, body); };

  const load = async () => {
    setBusy(true);
    try { setPreview(await call('GET', '/v1/admin/invoices/renumber')); } catch (e) { toast(e.message || 'Could not load', 'error'); } finally { setBusy(false); }
  };
  const apply = async () => {
    if (!window.confirm(`Renumber ${preview.changes} invoices? Orders and invoice links get the new numbers. PDFs already sent to customers keep the old number. You can undo this.`)) return;
    setBusy(true);
    try { const r = await call('POST', '/v1/admin/invoices/renumber', { confirm: true }); toast(`${r.changed} invoices renumbered`); setPreview(await call('GET', '/v1/admin/invoices/renumber')); } catch (e) { toast(e.message || 'Renumbering failed', 'error'); } finally { setBusy(false); }
  };
  const undo = async () => {
    if (!window.confirm('Put back the invoice numbers from before the last renumbering?')) return;
    setBusy(true);
    try { const r = await call('POST', '/v1/admin/invoices/renumber-undo', {}); toast(`${r.restored} invoice numbers restored`); setPreview(null); } catch (e) { toast(e.message || 'Undo failed', 'error'); } finally { setBusy(false); }
  };

  const rows = preview?.plan || [];
  const shown = rows.filter((r) => r.old !== r.next);
  return (
    <Card title="Invoice numbers">
      <p className="text-sm text-zinc-600">New invoices are numbered for the whole shop, per financial year (April–March): <strong>ZD/26-27/0001</strong>, ZD/26-27/0002… Customers are identified by their name and phone, printed on every invoice.</p>
      <p className="text-xs text-zinc-500 mt-1 mb-4">Older orders may share numbers such as 2026#0. Renumbering gives them consecutive numbers by date. Cancelled orders keep a number; test and sample orders are kept out of the series.</p>
      <div className="flex flex-wrap gap-2 mb-3">
        <Button variant="secondary" icon={FiEye} disabled={busy} onClick={load}>{busy && !preview ? 'Loading…' : 'Preview renumbering'}</Button>
        {preview && preview.changes > 0 && <Button icon={FiCheck} disabled={busy} onClick={apply}>Renumber {preview.changes} invoices</Button>}
        <Button variant="ghost" icon={FiRotateCcw} disabled={busy} onClick={undo}>Undo last renumbering</Button>
      </div>
      {preview && (
        <>
          <p className="text-sm text-zinc-700 mb-2">
            {rows.length} orders · {preview.changes ? `${preview.changes} would change` : 'all numbers are already in order'}
            {preview.duplicatesBefore ? ` · ${preview.duplicatesBefore} orders share a number today` : ''}
            {Object.keys(preview.counters || {}).length > 0 && ` · next new invoice: ${Object.entries(preview.counters).map(([fy, n]) => `ZD/${fy}/${String(n + 1).padStart(4, '0')}`).pop()}`}
          </p>
          {shown.length > 0 && (
            <div className="overflow-x-auto max-h-80 rounded-lg ring-1 ring-zinc-200">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500 bg-zinc-50 sticky top-0"><tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Order</th><th className="px-3 py-2 font-medium">Customer</th><th className="px-3 py-2 font-medium">Old</th><th className="px-3 py-2 font-medium">New</th></tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {shown.slice(0, 200).map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-1.5 text-zinc-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-3 py-1.5 text-zinc-800 whitespace-nowrap">{r.orderNumber}{r.status === 'cancelled' && <span className="ml-1 text-[11px] text-red-600">cancelled</span>}</td>
                      <td className="px-3 py-1.5 text-zinc-800">{r.customer}<span className="block text-xs text-zinc-500">{r.mobile}</span></td>
                      <td className="px-3 py-1.5 text-zinc-500 whitespace-nowrap">{r.old || '—'}</td>
                      <td className="px-3 py-1.5 font-medium text-zinc-900 whitespace-nowrap">{r.next}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {shown.length > 200 && <p className="text-xs text-zinc-500 mt-1">Showing the first 200 changes.</p>}
        </>
      )}
    </Card>
  );
}
