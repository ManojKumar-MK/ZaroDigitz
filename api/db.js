// MySQL connection pool. Credentials come only from environment variables
// (set in Hostinger hPanel → Node.js → Environment variables), never from code.
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1', // the app runs on the same Hostinger server as MySQL
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 8,
  charset: 'utf8mb4',
  supportBigNumbers: true,
  // MySQL closes idle connections; keep them alive and drop idle ones early so a request
  // never gets a dead connection (seen as "write ECONNRESET").
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  idleTimeout: 60000,
  maxIdle: 2,
});

// Tables from the first API draft, replaced by `docs`; dropped only while still empty.
const LEGACY_TABLES = ['products', 'product_images', 'settings', 'orders', 'invoices', 'customers', 'enquiries', 'counters', 'admin_users'];

/** Create missing tables (idempotent). */
export async function migrate() {
  const sql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  const statements = sql.split(/;\s*$/m).map((s) => s.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean);
  for (const s of statements) await pool.query(s);
  for (const t of LEGACY_TABLES) {
    try {
      const [rows] = await pool.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
      if (Number(rows[0].n) === 0) await pool.query(`DROP TABLE \`${t}\``);
    } catch { /* table does not exist */ }
  }
  return statements.length;
}

// Concurrent saves (an order, its tracking record and its invoice link arrive together)
// must not lock each other: READ COMMITTED takes no gap locks, so inserts of different
// documents no longer deadlock.
pool.pool.on('connection', (conn) => {
  conn.query('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');
});

const RETRYABLE = new Set([1213, 1205]); // deadlock, lock wait timeout
/**
 * Run a transactional function again when MySQL picks it as a deadlock victim (or a lock
 * wait times out) - the standard remedy; the whole transaction was rolled back, so a retry is safe.
 */
export async function retryOnDeadlock(fn, attempts = 5) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!RETRYABLE.has(e?.errno) || i >= attempts) throw e;
      await new Promise((r) => setTimeout(r, 20 * i + Math.random() * 60));
    }
  }
}

const CONNECTION_LOST = new Set(['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'EPIPE', 'ETIMEDOUT']);
/** Read-only query, tried again once on a dropped connection (safe: it changes nothing). */
export async function readQuery(sql, params) {
  try {
    return await pool.query(sql, params);
  } catch (e) {
    if (!CONNECTION_LOST.has(e?.code)) throw e;
    return pool.query(sql, params);
  }
}

export const isConfigured = () => Boolean(process.env.DB_USER && process.env.DB_NAME);
