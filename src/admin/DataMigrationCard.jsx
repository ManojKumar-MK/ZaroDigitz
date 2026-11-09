import { useState } from 'react';
import { FiUploadCloud, FiCheckCircle, FiDatabase } from 'react-icons/fi';
import { DATA_BACKEND } from '../firebase/client';
import { API_URL } from '../firebase/apiStore';
import { copyFirestoreToApi, apiStats, COPY_COLLECTIONS } from '../firebase/copyToApi';
import { useToast } from './Toast';
import { Button, Card } from './ui';

/** Admin → Settings: copy all Firestore data to MySQL on Hostinger and compare counts. */
export default function DataMigrationCard() {
  const toast = useToast();
  const [rows, setRows] = useState({});
  const [mysql, setMysql] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const copy = async () => {
    if (DATA_BACKEND === 'api' && !window.confirm('The shop already runs on Hostinger. Copy from Firebase again? Only documents that are newer in Firebase are copied; nothing newer in MySQL is overwritten.')) return;
    setBusy(true);
    setError('');
    try {
      await copyFirestoreToApi((r) => setRows((cur) => ({ ...cur, [r.collection]: r })));
      setMysql(await apiStats());
      toast('All data copied to Hostinger');
    } catch (e) {
      setError(e.message || 'Copy failed');
      toast(e.message || 'Copy failed', 'error');
    } finally { setBusy(false); }
  };
  const check = async () => {
    setBusy(true);
    try { setMysql(await apiStats()); } catch (e) { toast(e.message || 'Could not reach the API', 'error'); } finally { setBusy(false); }
  };
  const countIn = (c) => mysql?.find((x) => x.collection === c)?.count ?? 0;

  return (
    <Card title="Move data to Hostinger (MySQL)">
      <p className="text-sm text-zinc-600 mb-1 flex items-center gap-2"><FiDatabase className="text-zinc-400" /> The shop reads and writes data in <strong>{DATA_BACKEND === 'api' ? 'MySQL on Hostinger' : 'Firebase (Firestore)'}</strong>.</p>
      <p className="text-xs text-zinc-500 mb-4">Copy sends every product, photo, setting, order, tracking record, invoice link, customer and enquiry to {API_URL}. Safe to run again: it only copies what changed and never overwrites newer data. Sign-in stays on Firebase.</p>
      <div className="flex flex-wrap gap-2 mb-4">
        <Button icon={FiUploadCloud} disabled={busy} onClick={copy}>{busy ? 'Working…' : 'Copy all data to Hostinger'}</Button>
        <Button variant="secondary" disabled={busy} onClick={check}>Check MySQL counts</Button>
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {(Object.keys(rows).length > 0 || mysql) && (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-zinc-500"><tr><th className="py-1.5 font-medium">Collection</th><th className="py-1.5 font-medium text-right">Firebase</th><th className="py-1.5 font-medium text-right">Copied</th><th className="py-1.5 font-medium text-right">In MySQL</th><th /></tr></thead>
          <tbody className="divide-y divide-zinc-100">
            {COPY_COLLECTIONS.map((c) => {
              const r = rows[c];
              const ok = r?.done && mysql && countIn(c) >= r.read;
              return (
                <tr key={c}>
                  <td className="py-1.5 text-zinc-800">{c}</td>
                  <td className="py-1.5 text-right tabular-nums">{r ? r.read : '—'}</td>
                  <td className="py-1.5 text-right tabular-nums">{r ? `${r.written}${r.skipped ? ` (+${r.skipped} kept)` : ''}` : '—'}</td>
                  <td className="py-1.5 text-right tabular-nums">{mysql ? countIn(c) : '—'}</td>
                  <td className="py-1.5 pl-2 w-6">{ok && <FiCheckCircle className="text-emerald-600" aria-label="matches" />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}
