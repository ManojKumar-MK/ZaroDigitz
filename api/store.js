// Firestore-like document store on MySQL: get, query (where ==, orderBy, limit),
// and atomic batched writes (add / set with merge / update / delete) with rules applied.
import crypto from 'node:crypto';
import { pool, retryOnDeadlock, readQuery } from './db.js';
import { canRead, canWrite } from './rules.js';

const COLLECTION_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const ID_RE = /^[^/\s]{1,160}$/;

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function parsePath(p) {
  const [collection, id, ...rest] = String(p || '').split('/');
  if (rest.length || !COLLECTION_RE.test(collection || '') || !ID_RE.test(id || '')) throw new HttpError(400, `bad path: ${p}`);
  return { collection, id };
}
export function checkCollection(c) {
  if (!COLLECTION_RE.test(String(c || ''))) throw new HttpError(400, `bad collection: ${c}`);
  return c;
}

const AUTO_ID = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const autoId = () => Array.from(crypto.randomBytes(20), (b) => AUTO_ID[b % AUTO_ID.length]).join('');

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !('__ts' in v);

/** Replace server-timestamp sentinels ({__sts:1}) with {__ts: now}. */
function resolveServerTs(v, now) {
  if (Array.isArray(v)) return v.map((x) => resolveServerTs(x, now));
  if (v && typeof v === 'object') {
    if (v.__sts) return { __ts: now };
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveServerTs(x, now)]));
  }
  return v;
}

/** Firestore setDoc(..., { merge: true }): nested maps merge, everything else replaces. */
function deepMerge(base, patch) {
  const out = { ...(isPlain(base) ? base : {}) };
  for (const [k, v] of Object.entries(patch)) out[k] = isPlain(v) && isPlain(out[k]) ? deepMerge(out[k], v) : v;
  return out;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const changedKeys = (before = {}, after = {}) => [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => !same(before[k], after[k]));

function getField(data, path) {
  return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);
}
const sortVal = (v) => (v && typeof v === 'object' && '__ts' in v ? v.__ts : v);

/* ---------------- reads ---------------- */

export async function getDoc(path, ctx) {
  const { collection, id } = parsePath(path);
  if (!canRead(collection, id, ctx, 'get')) throw new HttpError(403, 'permission denied');
  const [rows] = await readQuery('SELECT data FROM docs WHERE collection = ? AND id = ? AND deleted = 0', [collection, id]);
  return rows.length ? { id, exists: true, data: JSON.parse(rows[0].data) } : { id, exists: false, data: null };
}

/** Change marker for a collection: any write (including deletes) changes it. */
export async function collectionVersion(collection) {
  const [rows] = await readQuery('SELECT COUNT(*) AS n, MAX(updated_at) AS u FROM docs WHERE collection = ?', [collection]);
  const u = rows[0].u ? new Date(rows[0].u).getTime() : 0;
  return `${rows[0].n}-${u}`;
}

/**
 * query = { collection, where: [[field, '==', value]], orderBy: [[field, 'asc'|'desc']], limit, ifVersion }
 * Returns { version, unchanged } or { version, docs: [{ id, data }] }.
 */
export async function queryDocs(query, ctx) {
  const collection = checkCollection(query.collection);
  if (!canRead(collection, null, ctx, 'list')) throw new HttpError(403, 'permission denied');
  const version = await collectionVersion(collection);
  if (query.ifVersion && query.ifVersion === version) return { version, unchanged: true };
  const [rows] = await readQuery('SELECT id, data FROM docs WHERE collection = ? AND deleted = 0', [collection]);
  let docs = rows.map((r) => ({ id: r.id, data: JSON.parse(r.data) }));
  for (const [field, op, value] of query.where || []) {
    if (op !== '==') throw new HttpError(400, `unsupported operator ${op}`);
    docs = docs.filter((d) => same(getField(d.data, field), value));
  }
  for (const [field, dir] of [...(query.orderBy || [])].reverse()) {
    const sign = dir === 'desc' ? -1 : 1;
    docs.sort((a, b) => {
      const x = sortVal(getField(a.data, field));
      const y = sortVal(getField(b.data, field));
      if (x == null && y == null) return 0;
      if (x == null) return 1; // Firestore leaves out docs without the field; keep them last
      if (y == null) return -1;
      return x < y ? -sign : x > y ? sign : 0;
    });
  }
  if (query.orderBy?.length) docs = docs.filter((d) => query.orderBy.every(([f]) => getField(d.data, f) != null));
  if (query.limit) docs = docs.slice(0, Math.max(0, Number(query.limit)));
  return { version, docs };
}

/* ---------------- writes ---------------- */

/**
 * ops: [{ op: 'add', collection, data } | { op: 'set', path, data, merge } |
 *       { op: 'update', path, data } | { op: 'delete', path }]
 * All or nothing. Returns [{ id }] in the same order.
 */
export function writeOps(ops, ctx) {
  return retryOnDeadlock(() => writeOpsOnce(ops, ctx));
}

async function writeOpsOnce(ops, ctx) {
  if (!Array.isArray(ops) || !ops.length || ops.length > 500) throw new HttpError(400, 'ops must be 1-500 operations');
  const now = Date.now();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const results = [];
    for (const raw of ops) {
      let collection;
      let id;
      if (raw.op === 'add') { collection = checkCollection(raw.collection); id = autoId(); } else ({ collection, id } = parsePath(raw.path));
      const [rows] = await conn.query('SELECT data, deleted FROM docs WHERE collection = ? AND id = ? FOR UPDATE', [collection, id]);
      const exists = rows.length > 0 && !rows[0].deleted;
      const before = exists ? JSON.parse(rows[0].data) : null;
      const data = raw.data == null ? null : resolveServerTs(raw.data, now);
      let after = null;
      let kind;
      switch (raw.op) {
        case 'add': kind = 'create'; after = data || {}; break;
        case 'set': kind = exists ? 'update' : 'create'; after = raw.merge ? deepMerge(before || {}, data || {}) : data || {}; break;
        case 'update':
          if (!exists) throw new HttpError(404, `no document to update: ${collection}/${id}`);
          kind = 'update'; after = { ...before, ...(data || {}) }; break;
        case 'delete': kind = 'delete'; break;
        default: throw new HttpError(400, `bad op ${raw.op}`);
      }
      if (!canWrite(collection, id, kind, { after, changed: changedKeys(before || {}, after || {}) }, ctx)) {
        throw new HttpError(403, `permission denied: ${kind} ${collection}/${id}`);
      }
      if (kind === 'delete') {
        if (rows.length) await conn.query('UPDATE docs SET deleted = 1, data = ?, updated_at = ? WHERE collection = ? AND id = ?', ['{}', new Date(now), collection, id]);
      } else {
        await conn.query(
          'INSERT INTO docs (collection, id, data, deleted, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), deleted = 0, updated_at = VALUES(updated_at)',
          [collection, id, JSON.stringify(after), new Date(now), new Date(now)],
        );
      }
      results.push({ id, collection, kind });
    }
    await conn.commit();
    // One line per new website order, so a missing order can be traced in the Hostinger logs.
    results.filter((r) => r.collection === 'orders' && r.kind === 'create').forEach((r) => console.log(`order saved ${r.id}${ctx.admin ? ' (admin)' : ''}`));
    return results.map(({ id }) => ({ id }));
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/* ---------------- migration from Firestore ---------------- */

/**
 * Admin bulk import: docs = [{ id, data, createTime, updateTime }]. A document already in
 * MySQL with a newer update time is kept (so re-running the copy never overwrites newer data).
 */
export function importDocs(collection, docs) {
  return retryOnDeadlock(() => importDocsOnce(collection, docs));
}

async function importDocsOnce(collection, docs) {
  checkCollection(collection);
  let written = 0;
  let skipped = 0;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const d of docs) {
      const { id } = parsePath(`${collection}/${d.id}`);
      // No known update time = treat as oldest: it never replaces a document already here.
      const incoming = Number(d.updateTime) || 0;
      const [rows] = await conn.query('SELECT updated_at FROM docs WHERE collection = ? AND id = ? FOR UPDATE', [collection, id]);
      if (rows.length && new Date(rows[0].updated_at).getTime() >= incoming) { skipped++; continue; }
      const updated = new Date(incoming || Date.now());
      const created = new Date(Number(d.createTime) || updated.getTime());
      await conn.query(
        'INSERT INTO docs (collection, id, data, deleted, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), deleted = 0, updated_at = VALUES(updated_at)',
        [collection, id, JSON.stringify(d.data || {}), created, updated],
      );
      written++;
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return { written, skipped };
}

export async function stats() {
  const [rows] = await readQuery('SELECT collection, SUM(deleted = 0) AS live, SUM(deleted = 1) AS deleted, MAX(updated_at) AS last FROM docs GROUP BY collection ORDER BY collection');
  return rows.map((r) => ({ collection: r.collection, count: Number(r.live), deleted: Number(r.deleted), lastUpdate: r.last }));
}
