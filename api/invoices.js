// Invoice numbers: one shop-wide, consecutive series per Indian financial year
// (1 April - 31 March, India time), e.g. ZD/26-27/0001. Unique and GST-friendly
// (max 16 characters, letters, digits, '/' and '-').
import { pool, retryOnDeadlock } from './db.js';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const RE = /^ZD\/(\d{2}-\d{2})\/(\d+)$/;

/** Financial year label for a moment, e.g. '26-27' for any date from 1 Apr 2026 to 31 Mar 2027 (IST). */
export function fyLabel(ms = Date.now()) {
  const d = new Date(Number(ms) + IST_OFFSET_MS);
  const start = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  const yy = (n) => String(n % 100).padStart(2, '0');
  return `${yy(start)}-${yy(start + 1)}`;
}
export const formatInvoice = (fy, n) => `ZD/${fy}/${String(n).padStart(4, '0')}`;
const counterName = (fy) => `invoice_seq_fy_${fy}`;

/** Highest number already on an order for this financial year (used to start a counter). */
async function maxUsed(conn, fy) {
  const [rows] = await conn.query("SELECT JSON_VALUE(data, '$.invoiceNumber') AS n FROM docs WHERE collection = 'orders' AND deleted = 0");
  return rows.reduce((max, r) => { const m = RE.exec(String(r.n || '')); return m && m[1] === fy ? Math.max(max, Number(m[2])) : max; }, 0);
}

/** Next invoice number for the current financial year, inside a transaction (never repeats). */
export function nextInvoiceNumber() {
  return retryOnDeadlock(nextInvoiceNumberOnce);
}

async function nextInvoiceNumberOnce() {
  const fy = fyLabel();
  const name = counterName(fy);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT value FROM meta WHERE name = ? FOR UPDATE', [name]);
    const last = rows.length ? Number(rows[0].value) || 0 : await maxUsed(conn, fy);
    const next = last + 1;
    await conn.query('INSERT INTO meta (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [name, String(next)]);
    await conn.commit();
    return { invoiceNumber: formatInvoice(fy, next), fy, sequence: next };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/* ---------------- one-time renumbering of existing orders ---------------- */

const tsOf = (v) => (v && typeof v === 'object' && '__ts' in v ? Number(v.__ts) : Date.parse(v || '') || 0);
const tokenOf = (order) => /\/invoice\/([a-z0-9]+)/i.exec(String(order.invoiceUrl || ''))?.[1] || null;
const isTest = (o) => o.test === true || o.demo === true;

/**
 * Every order sorted by date, numbered per financial year. Test and sample orders are kept out
 * of the series ("TEST/<order number>"); cancelled orders keep a number (GST: never reuse one).
 */
async function buildPlan(conn) {
  const [rows] = await conn.query("SELECT id, data, created_at FROM docs WHERE collection = 'orders' AND deleted = 0");
  const orders = rows.map((r) => { const d = JSON.parse(r.data); return { id: r.id, d, at: tsOf(d.createdAt) || new Date(r.created_at).getTime() }; })
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const seq = {};
  const plan = orders.map(({ id, d, at }) => {
    const fy = fyLabel(at);
    let next;
    if (isTest(d)) next = `TEST/${d.orderNumber || id}`.slice(0, 40);
    else { seq[fy] = (seq[fy] || 0) + 1; next = formatInvoice(fy, seq[fy]); }
    return { id, orderNumber: d.orderNumber || '', customer: d.customer?.name || '', mobile: d.customer?.mobile || '', status: d.status || '', test: isTest(d), date: new Date(at).toISOString(), old: d.invoiceNumber || null, next, token: tokenOf(d) };
  });
  return { plan, counters: seq };
}

export async function renumberPreview() {
  const conn = await pool.getConnection();
  try {
    const { plan, counters } = await buildPlan(conn);
    return { plan, counters, changes: plan.filter((p) => p.old !== p.next).length, duplicatesBefore: duplicates(plan.map((p) => p.old)) };
  } finally {
    conn.release();
  }
}

function duplicates(list) {
  const seen = {};
  list.filter(Boolean).forEach((n) => { seen[n] = (seen[n] || 0) + 1; });
  return Object.values(seen).filter((c) => c > 1).reduce((s, c) => s + c, 0);
}

/** Apply the plan: orders, their invoice links and the counters, all in one transaction. A backup is kept for undo. */
export function renumberApply() {
  return retryOnDeadlock(renumberApplyOnce);
}

async function renumberApplyOnce() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Hold the counters so no new invoice number is handed out halfway through.
    const { plan, counters } = await buildPlan(conn);
    for (const fy of Object.keys(counters)) await conn.query('SELECT value FROM meta WHERE name = ? FOR UPDATE', [counterName(fy)]);
    const now = new Date();
    const backup = [];
    const byOrderNumber = new Map();
    const [invRows] = await conn.query("SELECT id, data FROM docs WHERE collection = 'invoices' AND deleted = 0 FOR UPDATE");
    invRows.forEach((r) => { const d = JSON.parse(r.data); if (d.orderNumber) byOrderNumber.set(d.orderNumber, r.id); });
    const invoiceData = new Map(invRows.map((r) => [r.id, JSON.parse(r.data)]));
    for (const p of plan) {
      if (p.old === p.next) continue;
      const [[row]] = await conn.query("SELECT data FROM docs WHERE collection = 'orders' AND id = ? FOR UPDATE", [p.id]);
      const d = JSON.parse(row.data);
      d.invoiceNumber = p.next;
      d.updatedAt = { __ts: now.getTime() };
      await conn.query("UPDATE docs SET data = ?, updated_at = ? WHERE collection = 'orders' AND id = ?", [JSON.stringify(d), now, p.id]);
      const token = (p.token && invoiceData.has(p.token) ? p.token : null) || byOrderNumber.get(p.orderNumber) || null;
      if (token) {
        const inv = invoiceData.get(token);
        backup.push({ id: p.id, old: p.old, token, oldInvoice: inv.invoiceNumber ?? null });
        inv.invoiceNumber = p.next;
        await conn.query("UPDATE docs SET data = ?, updated_at = ? WHERE collection = 'invoices' AND id = ?", [JSON.stringify(inv), now, token]);
      } else {
        backup.push({ id: p.id, old: p.old, token: null });
      }
    }
    for (const [fy, n] of Object.entries(counters)) {
      await conn.query('INSERT INTO meta (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [counterName(fy), String(n)]);
    }
    const backupName = `invoice_renumber_backup_${now.getTime()}`;
    await conn.query('INSERT INTO meta (name, value) VALUES (?, ?)', [backupName, JSON.stringify(backup)]);
    await conn.commit();
    return { changed: backup.length, counters, backup: backupName };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** Put back the numbers from the latest renumbering (counters are left as they are, so numbers never repeat). */
export function renumberUndo() {
  return retryOnDeadlock(renumberUndoOnce);
}

async function renumberUndoOnce() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[b]] = await conn.query("SELECT name, value FROM meta WHERE name LIKE 'invoice_renumber_backup_%' ORDER BY name DESC LIMIT 1 FOR UPDATE");
    if (!b) throw new Error('No renumbering to undo');
    const now = new Date();
    for (const item of JSON.parse(b.value)) {
      const [[row]] = await conn.query("SELECT data FROM docs WHERE collection = 'orders' AND id = ? FOR UPDATE", [item.id]);
      if (row) { const d = JSON.parse(row.data); d.invoiceNumber = item.old; await conn.query("UPDATE docs SET data = ?, updated_at = ? WHERE collection = 'orders' AND id = ?", [JSON.stringify(d), now, item.id]); }
      if (item.token) {
        const [[inv]] = await conn.query("SELECT data FROM docs WHERE collection = 'invoices' AND id = ? FOR UPDATE", [item.token]);
        if (inv) { const d = JSON.parse(inv.data); d.invoiceNumber = item.oldInvoice; await conn.query("UPDATE docs SET data = ?, updated_at = ? WHERE collection = 'invoices' AND id = ?", [JSON.stringify(d), now, item.token]); }
      }
    }
    await conn.query('UPDATE meta SET name = ? WHERE name = ?', [b.name.replace('backup', 'undone'), b.name]);
    await conn.commit();
    return { restored: JSON.parse(b.value).length };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
