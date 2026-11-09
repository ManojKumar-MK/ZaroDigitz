// Firestore-compatible client for the Zaro API (digitz-api.zarocrackers.com, MySQL on Hostinger).
// It implements the subset of the Firestore SDK this app uses (doc, collection, query,
// where/orderBy/limit, getDoc(s), add/set/update/deleteDoc, writeBatch, onSnapshot,
// serverTimestamp, Timestamp), so src/firebase/orders.js and catalog.js work unchanged.
// Live listeners become polling (and refresh when the tab regains focus).

const env = import.meta.env ?? {};
export const API_URL = String(env.VITE_DATA_API_URL || 'https://digitz-api.zarocrackers.com').replace(/\/+$/, '');

let tokenProvider = async () => null;
/** client.js registers a function that returns the signed-in admin's ID token (or null). */
export function setTokenProvider(fn) { tokenProvider = fn; }

/* ---------------- values ---------------- */

export class Timestamp {
  constructor(ms) {
    this._ms = Number(ms) || 0;
    this.seconds = Math.floor(this._ms / 1000);
    this.nanoseconds = (this._ms % 1000) * 1e6;
  }
  toDate() { return new Date(this._ms); }
  toMillis() { return this._ms; }
  valueOf() { return this._ms; }
  toJSON() { return new Date(this._ms).toISOString(); }
  static fromDate(d) { return new Timestamp(d.getTime()); }
  static fromMillis(ms) { return new Timestamp(ms); }
  static now() { return new Timestamp(Date.now()); }
}

const SERVER_TS = Object.freeze({ __sts: 1 });
export const serverTimestamp = () => SERVER_TS;

function encode(v) {
  if (v === SERVER_TS) return { __sts: 1 };
  if (v instanceof Timestamp) return { __ts: v.toMillis() };
  if (v instanceof Date) return { __ts: v.getTime() };
  if (v && typeof v === 'object' && typeof v.toMillis === 'function') return { __ts: v.toMillis() }; // a real Firestore Timestamp
  if (Array.isArray(v)) return v.map(encode);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) if (x !== undefined) out[k] = encode(x);
    return out;
  }
  return v;
}

function decode(v) {
  if (Array.isArray(v)) return v.map(decode);
  if (v && typeof v === 'object') {
    if ('__ts' in v && Object.keys(v).length === 1) return new Timestamp(v.__ts);
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = decode(x);
    return out;
  }
  return v;
}

/* ---------------- transport ---------------- */

// A request that hangs (dropped mobile network, stalled server) must fail instead of
// waiting forever: callers retry or raise an alert, and polling keeps running.
const TIMEOUT_MS = 15000;
async function fetchWithTimeout(url, init) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    const err = new Error(ctrl.signal.aborted ? 'API timeout' : e?.message || 'network error');
    err.code = 'unavailable';
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function call(path, body) {
  const token = await tokenProvider().catch(() => null);
  const r = await fetchWithTimeout(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  let j = null;
  try { j = await r.json(); } catch { /* not JSON */ }
  if (!r.ok || !j?.ok) {
    const err = new Error(j?.error || `API ${r.status}`);
    err.code = r.status === 403 ? 'permission-denied' : r.status === 404 ? 'not-found' : r.status === 400 ? 'invalid-argument' : 'unavailable';
    throw err;
  }
  return j;
}

/** Plain authenticated call for non-document endpoints (e.g. /v1/admin/gsc). */
export async function apiRequest(method, path, body) {
  const token = await tokenProvider().catch(() => null);
  const r = await fetchWithTimeout(`${API_URL}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error(j?.error || `API ${r.status}`);
  return j;
}

/* ---------------- references ---------------- */

export const db = Object.freeze({ type: 'api-db' });
const AUTO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const autoId = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(20)), (b) => AUTO[b % AUTO.length]).join('');

const docRef = (collection, id) => ({ type: 'doc', collection, id, path: `${collection}/${id}` });

export function collection(_db, name) { return { type: 'collection', id: name, path: name, collection: name }; }

/** doc(db, 'orders', id) | doc(collectionRef) (new id) | doc(collectionRef, id) */
export function doc(parent, a, b) {
  if (parent?.type === 'collection') return docRef(parent.collection, a ?? autoId());
  if (b !== undefined) return docRef(a, b);
  const [c, id] = String(a).split('/');
  return docRef(c, id);
}

export const where = (field, op, value) => ({ kind: 'where', field, op, value });
export const orderBy = (field, dir = 'asc') => ({ kind: 'orderBy', field, dir });
export const limit = (n) => ({ kind: 'limit', n });
export function query(ref, ...constraints) {
  const q = { type: 'query', collection: ref.collection, where: [], orderBy: [], limit: undefined };
  for (const c of constraints) {
    if (c.kind === 'where') q.where.push([c.field, c.op, encode(c.value)]);
    else if (c.kind === 'orderBy') q.orderBy.push([c.field, c.dir]);
    else if (c.kind === 'limit') q.limit = c.n;
  }
  return q;
}
const asQuery = (ref) => (ref.type === 'query' ? ref : { type: 'query', collection: ref.collection, where: [], orderBy: [] });

/* ---------------- snapshots ---------------- */

function docSnap(ref, exists, data) {
  const decoded = exists ? decode(data) : undefined;
  return { id: ref.id, ref, exists: () => exists, data: () => decoded };
}
function querySnap(collectionName, docs) {
  const list = docs.map((d) => docSnap(docRef(collectionName, d.id), true, d.data));
  return { docs: list, size: list.length, empty: list.length === 0, forEach: (fn) => list.forEach(fn) };
}

/* ---------------- reads ---------------- */

export async function getDoc(ref) {
  const r = await call('/v1/docs/get', { path: ref.path });
  return docSnap(ref, r.exists, r.data);
}

export async function getDocs(ref) {
  const q = asQuery(ref);
  const r = await call('/v1/docs/query', { collection: q.collection, where: q.where, orderBy: q.orderBy, limit: q.limit });
  return querySnap(q.collection, r.docs);
}

/* ---------------- writes ---------------- */

const opSet = (ref, data, opts) => ({ op: 'set', path: ref.path, data: encode(data), merge: Boolean(opts?.merge) });
const opUpdate = (ref, data) => ({ op: 'update', path: ref.path, data: encode(data) });
const opDelete = (ref) => ({ op: 'delete', path: ref.path });

const write = (ops) => call('/v1/docs/write', { ops }).then((r) => { notifyLocalWrite(); return r; });

export async function addDoc(collRef, data) {
  const ref = docRef(collRef.collection, autoId());
  await write([opSet(ref, data)]);
  return ref;
}
export async function setDoc(ref, data, opts) { await write([opSet(ref, data, opts)]); }
export async function updateDoc(ref, data) { await write([opUpdate(ref, data)]); }
export async function deleteDoc(ref) { await write([opDelete(ref)]); }

export function writeBatch() {
  const ops = [];
  return {
    set(ref, data, opts) { ops.push(opSet(ref, data, opts)); return this; },
    update(ref, data) { ops.push(opUpdate(ref, data)); return this; },
    delete(ref) { ops.push(opDelete(ref)); return this; },
    async commit() { if (ops.length) await write(ops.splice(0)); },
  };
}

/* ---------------- live listeners (polling) ---------------- */

const listeners = new Set();
function notifyLocalWrite() { listeners.forEach((l) => l.poke()); } // our own writes show at once

if (typeof window !== 'undefined') {
  const wake = () => listeners.forEach((l) => l.poke());
  window.addEventListener('focus', wake);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake(); });
}

/** onSnapshot(docRef | query, next, error). Returns unsubscribe. */
export function onSnapshot(ref, next, error) {
  const isDoc = ref.type === 'doc';
  const interval = isDoc ? 15000 : 20000;
  let stopped = false;
  let timer = null;
  let lastKey = null;
  let version = null;
  let busy = false;

  const tick = async () => {
    if (stopped || busy) return;
    busy = true;
    try {
      if (isDoc) {
        const r = await call('/v1/docs/get', { path: ref.path });
        const key = JSON.stringify([r.exists, r.data]);
        if (key !== lastKey) { lastKey = key; next(docSnap(ref, r.exists, r.data)); }
      } else {
        const q = asQuery(ref);
        const r = await call('/v1/docs/query', { collection: q.collection, where: q.where, orderBy: q.orderBy, limit: q.limit, ifVersion: version });
        if (!r.unchanged) { version = r.version; next(querySnap(q.collection, r.docs)); }
      }
    } catch (e) {
      error?.(e);
    } finally {
      busy = false;
      if (!stopped) { clearTimeout(timer); timer = setTimeout(tick, document.visibilityState === 'hidden' ? interval * 3 : interval); }
    }
  };
  const listener = { poke: () => { clearTimeout(timer); timer = setTimeout(tick, 150); } };
  listeners.add(listener);
  tick();
  return () => { stopped = true; clearTimeout(timer); listeners.delete(listener); };
}

/** Namespace object passed to callers as `fs` (same as the Firestore module). */
export const apiFs = {
  Timestamp, serverTimestamp, collection, doc, where, orderBy, limit, query,
  getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot,
};
