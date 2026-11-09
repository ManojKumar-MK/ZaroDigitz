// One-time (and repeatable) copy of every Firestore collection into MySQL on Hostinger,
// run from Admin → Settings with the signed-in admin's own Firebase session.
// Re-running only copies what changed: a document already in MySQL with a newer update
// time is kept, so it never overwrites newer data.
import { getFirestoreNative, getFirebaseAuth } from './client';
import { API_URL } from './apiStore';

export const COPY_COLLECTIONS = ['settings', 'products', 'productImages', 'orders', 'tracking', 'invoices', 'customers', 'enquiries'];
const MAX_CHUNK_BYTES = 6 * 1024 * 1024;
const MAX_CHUNK_DOCS = 400;

/** Firestore values → API JSON ({__ts: ms} for timestamps). */
function toApi(v) {
  if (v && typeof v === 'object' && typeof v.toMillis === 'function') return { __ts: v.toMillis() };
  if (v instanceof Date) return { __ts: v.getTime() };
  if (Array.isArray(v)) return v.map(toApi);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, toApi(x)]));
  return v;
}
const millis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : 0);

async function api(path, token, body) {
  const r = await fetch(`${API_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error(j?.error || `API ${r.status}`);
  return j;
}

/** onProgress({ collection, read, written, skipped, done }) */
export async function copyFirestoreToApi(onProgress = () => {}) {
  const { db, fs } = await getFirestoreNative();
  const { auth } = await getFirebaseAuth();
  if (!auth.currentUser) throw new Error('Sign in as admin first');
  const token = () => auth.currentUser.getIdToken();
  const summary = [];
  for (const name of COPY_COLLECTIONS) {
    let snap;
    try {
      snap = await fs.getDocs(fs.collection(db, name));
    } catch (e) {
      throw new Error(`Could not read ${name} from Firebase: ${e.code || e.message}`, { cause: e });
    }
    const docs = snap.docs.map((d) => {
      const data = d.data();
      const updateTime = millis(data.updatedAt) || millis(data.createdAt) || 0;
      return { id: d.id, data: toApi(data), createTime: millis(data.createdAt) || updateTime || undefined, updateTime: updateTime || undefined };
    });
    const row = { collection: name, read: docs.length, written: 0, skipped: 0, done: false };
    onProgress({ ...row });
    let chunk = [];
    let bytes = 0;
    const flush = async () => {
      if (!chunk.length) return;
      const r = await api('/v1/admin/import', await token(), { collection: name, docs: chunk });
      row.written += r.written;
      row.skipped += r.skipped;
      onProgress({ ...row });
      chunk = [];
      bytes = 0;
    };
    for (const d of docs) {
      const size = JSON.stringify(d).length;
      if (chunk.length && (bytes + size > MAX_CHUNK_BYTES || chunk.length >= MAX_CHUNK_DOCS)) await flush();
      chunk.push(d);
      bytes += size;
    }
    await flush();
    row.done = true;
    onProgress({ ...row });
    summary.push(row);
  }
  return summary;
}

/** Document counts in MySQL, per collection. */
export async function apiStats() {
  const { auth } = await getFirebaseAuth();
  if (!auth.currentUser) throw new Error('Sign in as admin first');
  const j = await api('/v1/admin/stats', await auth.currentUser.getIdToken());
  return j.collections;
}
