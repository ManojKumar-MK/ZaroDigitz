import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { handler as sendInvoiceHandler } from './netlify/functions/send-invoice.js';
import { headFor, injectHead, buildSitemap, getCatalog, getProductImage, refreshNow } from './server/seoHead.mjs';
import { getRoutes } from './scripts/routes.mjs';
import { submitUrls, submitSitemap } from './server/indexNow.mjs';
import { productPath } from './src/seo/catalog.js';
import { SITE_URL } from './src/seo/site.js';
import { saveOrderOnServer, recordTelegramOnServer } from './server/saveOrder.mjs';

/** url -> fingerprint of what search engines see, to find pages that changed on Publish. */
function pageFingerprints(c) {
  const m = new Map();
  (c.products || []).filter((p) => p.active !== false).forEach((p) => m.set(SITE_URL + productPath(p), JSON.stringify([p.name, p.mrp, p.offerPrice, p.image, p.category, p.description, p.seoTitle, p.seoDescription, p.per])));
  Object.entries(c.settings?.seoPages || {}).forEach(([path, v]) => m.set(path === '/' ? `${SITE_URL}/` : SITE_URL + path, JSON.stringify(v)));
  return m;
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

const app = express();
const port = Number(process.env.PORT || 3001);

function getSmtpConfig() {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const secure = String(process.env.EMAIL_SECURE ?? process.env.SMTP_SECURE ?? (port === 465 ? 'true' : 'false')).toLowerCase() === 'true';
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const fromName = process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'Zaro Digitz';
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || (user ? `${fromName} <${user}>` : 'Zaro Digitz <zarocrackers@gmail.com>');

  return { host, port, secure, user, pass, fromAddress, fromName };
}

app.use(express.json({ limit: '10mb' }));

// ── Canonical host + old file names ──────────────────────────────────────────
// Cloudflare sits in front on GoDaddy, so the visitor's scheme arrives in X-Forwarded-Proto.
const CANONICAL_HOST = process.env.CANONICAL_HOST ?? 'digitz.zarocrackers.com';
app.use((req, res, next) => {
  const host = String(req.headers.host || '').split(':')[0];
  const isLocal = !host || host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host);
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  if (CANONICAL_HOST && !isLocal && req.method === 'GET' && (host !== CANONICAL_HOST || proto !== 'https')) {
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
  }
  if (req.path.length > 1 && req.path.endsWith('/')) return res.redirect(301, req.path.slice(0, -1) + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''));
  return next();
});

// ── Uploaded product photos (stored compressed in Firestore) ───────────────
// Links carry ?v=<timestamp>, so a changed photo gets a new URL and old ones can be cached hard.
app.get('/img/p/:code', async (req, res) => {
  try {
    const img = await getProductImage(req.params.code, String(req.query.v || ''));
    if (!img) return res.redirect(302, '/card-placeholder.svg');
    res.setHeader('Content-Type', img.type);
    res.setHeader('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
    res.setHeader('ETag', `"${req.params.code}-${img.version}"`);
    if (req.headers['if-none-match'] === `"${req.params.code}-${img.version}"`) return res.status(304).end();
    return res.send(img.buf);
  } catch (error) {
    console.warn('[img] failed for', req.params.code, error?.message || error);
    return res.redirect(302, '/card-placeholder.svg');
  }
});

// /index.html is the same page as / : send crawlers to the one address.
app.get('/index.html', (req, res) => { const q = req.originalUrl.indexOf('?'); res.redirect(301, `/${q >= 0 ? req.originalUrl.slice(q) : ''}`); });

// ── Live sitemap (admin-added products included, hidden ones left out) ─────
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const xml = await buildSitemap(getRoutes());
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.type('application/xml').send(xml);
  } catch (error) {
    console.warn('[seo] live sitemap failed, serving the built one:', error?.message || error);
    return res.sendFile(path.join(distPath, 'sitemap.xml'));
  }
});

// ── Static files (hashed assets are immutable, images cache for a month) ────
app.use('/assets', express.static(path.join(distPath, 'assets'), { immutable: true, maxAge: '1y', fallthrough: true }));
app.use(express.static(distPath, {
  index: false, // clean-URL handler below decides which html to send
  setHeaders(res, filePath) {
    if (/\.(webp|png|jpe?g|svg|ico)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=2592000');
    else if (/\.pdf$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=604800');
    else if (/\.html$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  },
}));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, status: 'running' });
});

// Storefront catalog from the server's cache: visitors cost no Firestore reads.
// 503 when the server has no live copy (the browser then keeps its own copy / reads Firestore).
app.get('/api/catalog', async (_req, res) => {
  try {
    const c = await getCatalog();
    if (!c.live || !c.docs) return res.status(503).json({ ok: false });
    res.setHeader('Cache-Control', 'public, max-age=60');
    const { updatedAt, ...settings } = c.settings || {};
    res.json({ ok: true, at: c.at, products: c.docs, settings: { ...settings, updatedAt: updatedAt?.toMillis ? updatedAt.toMillis() : null } });
  } catch (e) {
    res.status(503).json({ ok: false, error: e?.message || String(e) });
  }
});

// Admin → SEO "Publish now": re-read titles, products and settings without waiting for the
// 10-minute cache. Only reads public data and is rate limited, so it needs no sign-in.
app.post('/api/seo/refresh', async (_req, res) => {
  try {
    const before = pageFingerprints(await getCatalog());
    const c = await refreshNow();
    const after = pageFingerprints(c);
    const changed = [...after].filter(([u, fp]) => before.get(u) !== fp).map(([u]) => u);
    if (changed.length && changed.length < 500) submitUrls([...changed, `${SITE_URL}/cards`]); // tell Bing & co. (not awaited)
    res.json({ ok: true, refreshedAt: new Date(c.at).toISOString(), changed: changed.length });
  }
  catch (e) { res.status(500).json({ ok: false, error: e?.message || String(e) }); }
});

// Website orders: save the order to the API first, then forward it to Telegram, so an order
// that reaches Telegram is always in the admin panel too (see server/saveOrder.mjs).
async function sendInvoice(req, res, bridge) {
  try {
    const payload = req.body || {};
    const order = payload.order;
    const saved = order?.orderNumber ? await saveOrderOnServer(order, payload.invoiceNumber) : null;
    if (order?.alert && saved?.ok) {
      // The browser could not save it, but this server did: no alarm needed.
      return res.json({ ok: true, reason: 'saved-on-server' });
    }
    if (order && saved && !saved.ok && saved.status === 'failed' && !order.alert) {
      order.alert = `Could not confirm this order is saved in the admin panel (${saved.reason}). Please check Admin → Orders and add it if missing.`;
    }

    const result = await sendInvoiceHandler({
      httpMethod: 'POST',
      body: JSON.stringify(payload),
    });

    const headers = result?.headers || {};
    Object.entries(headers).forEach(([key, value]) => {
      if (value != null) {
        res.setHeader(key, value);
      }
    });

    const statusCode = Number(result?.statusCode) || 200;
    const body = typeof result?.body === 'string' ? result.body : JSON.stringify(result?.body ?? {});
    if (saved?.ok) {
      let parsed = null;
      try { parsed = JSON.parse(body); } catch { /* not JSON */ }
      recordTelegramOnServer(order.orderNumber, parsed || { ok: statusCode < 300 });
    }
    return res.status(statusCode).send(body);
  } catch (error) {
    console.error(`Local ${bridge} bridge failed:`, error);
    return res.status(500).json({
      ok: false,
      reason: `local-${bridge}-bridge-failed`,
      message: error?.message || String(error),
    });
  }
}

app.post('/.netlify/functions/send-invoice', (req, res) => sendInvoice(req, res, 'send-invoice'));
app.post('/api/send-invoice', (req, res) => sendInvoice(req, res, 'api/send-invoice'));

app.post('/api/send-invoice-email', async (req, res) => {
  try {
    const { email, invoiceNumber, pdfBase64 } = req.body || {};

    if (!email || !pdfBase64) {
      return res.status(400).json({ ok: false, reason: 'missing-email-or-pdf' });
    }

    const { host, port, secure, user, pass, fromAddress } = getSmtpConfig();

    if (!user || !pass) {
      return res.status(500).json({
        ok: false,
        reason: 'smtp-config-missing',
        message: 'EMAIL_USER / EMAIL_PASS (or SMTP_USER / SMTP_PASS) must be configured in the environment.',
        smtpHost: host,
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const invoiceName = invoiceNumber ? `Invoice-${String(invoiceNumber).replace('#', '-')}.pdf` : 'Invoice.pdf';

    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: `Your Zaro Digitz Invoice${invoiceNumber ? ` - ${invoiceNumber}` : ''}`,
      text: `Thank you for ordering with Zaro Digitz. Your invoice is attached below.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
          <h2 style="margin: 0 0 16px; color: #7A1F2B;">Zaro Digitz Invoice</h2>
          <p>Thank you for shopping with us. Your invoice is attached in this email.</p>
          <p style="margin-top: 16px;">Invoice number: <strong>${invoiceNumber || 'N/A'}</strong></p>
        </div>
      `,
      attachments: [{
        filename: invoiceName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    return res.json({ ok: true, sentTo: email, invoiceNumber: invoiceNumber || null });
  } catch (error) {
    console.error('Failed to send invoice email:', error);
    return res.status(500).json({
      ok: false,
      reason: 'invoice-email-failed',
      code: error?.code || null,
      message: error?.message || String(error),
    });
  }
});

// ── Pages ─────────────────────────────────────────────────────────────────
// 1. dist/<route>.html when the build pre-rendered it (needs Chrome at build time);
// 2. otherwise the app shell with per-URL title/description/canonical/JSON-LD written
//    in by server/seoHead.mjs (live catalog from Firestore), so crawlers and link
//    previews always see the right page even on hosts without Chrome;
// 3. real 404 for unknown pages and products (no soft 404s).
const indexHtml = path.join(distPath, 'index.html');
const shellHtml = path.join(distPath, '_shell.html'); // un-rendered shell saved by the pre-render step
const notFoundHtml = path.join(distPath, '404.html');
let shellCache = null;
function shell() {
  if (!shellCache) shellCache = fs.readFileSync(fs.existsSync(shellHtml) ? shellHtml : indexHtml, 'utf8');
  return shellCache;
}

app.get(/^(?!\/api|\/\.netlify\/functions).*/, async (req, res) => {
  const pathname = decodeURIComponent(req.path);
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const adminHtml = path.join(distPath, 'admin.html');
    if (fs.existsSync(adminHtml)) return res.sendFile(adminHtml);
  }

  try {
    const head = await headFor(pathname);
    // Pre-rendered pages are used unless the admin has changed this page's title or description.
    const prerendered = pathname === '/' ? null : path.join(distPath, `${pathname.replace(/^\//, '')}.html`);
    if (head.status === 301) { const q = req.originalUrl.indexOf('?'); return res.redirect(301, head.location + (q >= 0 ? req.originalUrl.slice(q) : '')); }
    if (head.status === 404) return res.status(404).sendFile(fs.existsSync(notFoundHtml) ? notFoundHtml : indexHtml);
    if (!head.overridden && prerendered && prerendered.startsWith(distPath) && fs.existsSync(prerendered)) return res.sendFile(prerendered);
    if (pathname === '/' && !head.overridden && fs.existsSync(shellHtml)) return res.sendFile(indexHtml); // pre-rendered home
    return res.type('html').send(injectHead(shell(), head));
  } catch (error) {
    console.warn('[seo] head injection failed for', pathname, error?.message || error);
    return res.sendFile(indexHtml);
  }
});

getCatalog().catch(() => {}); // warm the live catalog
// After each start (every deploy), send the whole sitemap to IndexNow once.
setTimeout(() => { buildSitemap(getRoutes()).then(submitSitemap).catch(() => {}); }, 60000).unref();

app.listen(port, '0.0.0.0', () => {
  console.log(`ZaroDigitz app running on http://0.0.0.0:${port}`);
});
