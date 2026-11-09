// Server-side save of a website order, done in the same request that forwards it to
// Telegram. The customer's browser saves the order too, but a phone can lose the network
// or close the page right after Telegram was sent; this copy makes "on Telegram" mean
// "in the admin panel". Both use the order number as the document id, so they never
// create two orders: whichever arrives second is refused by the API (403) and that
// counts as "already saved".
import { buildOrderDocument, trackingDocFrom } from '../src/firebase/orderDoc.js';

const DATA_API_URL = String(process.env.DATA_API_URL || 'https://digitz-api.zarocrackers.com').replace(/\/+$/, '');
const SERVER_TS = { __sts: 1 };
const sentinels = { serverTimestamp: () => SERVER_TS };

async function write(ops) {
  const r = await fetch(`${DATA_API_URL}/v1/docs/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ops }),
    signal: AbortSignal.timeout(15000),
  });
  return r.status;
}

/**
 * order: the payload the checkout sends to /api/send-invoice ({ form, cart, ..., invoiceUrl, orderNumber }).
 * Returns { ok, status: 'saved' | 'exists' | 'skipped' | 'failed', reason? }. Never throws.
 */
export async function saveOrderOnServer(order, invoiceNumber) {
  if (!order?.orderNumber || !order?.form?.fullName || !Array.isArray(order.cart) || !order.cart.length) {
    return { ok: false, status: 'skipped' };
  }
  const { orderNumber, alert: _alert, ...snapshot } = order;
  const data = buildOrderDocument(snapshot, { invoiceNumber, orderNumber, telegram: { ok: false, reason: 'pending' } });
  const body = { ...data, savedBy: 'server', createdAt: SERVER_TS, updatedAt: SERVER_TS };
  const tracking = trackingDocFrom({ id: orderNumber, ...data }, sentinels);
  for (const wait of [0, 1000, 3000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      const status = await write([{ op: 'set', path: `orders/${orderNumber}`, data: body }]);
      if (status === 200 || status === 403) {
        // 403: the browser saved it first. The tracking record is best effort (the browser writes it too).
        write([{ op: 'set', path: `tracking/${data.trackingId}`, data: tracking }]).catch(() => {});
        return { ok: true, status: status === 200 ? 'saved' : 'exists' };
      }
      if (status === 400) return { ok: false, status: 'failed', reason: 'invalid order' };
    } catch { /* network or timeout: try again */ }
  }
  console.error('Order could not be saved on the server:', orderNumber);
  return { ok: false, status: 'failed', reason: 'api unreachable' };
}

/** Attach the Telegram outcome to the saved order (the only change the API allows the public to make). */
export async function recordTelegramOnServer(orderNumber, result) {
  try {
    await write([{ op: 'update', path: `orders/${orderNumber}`, data: { telegram: { ok: Boolean(result?.ok), reason: result?.reason || null }, updatedAt: SERVER_TS } }]);
  } catch { /* the order is saved; only the delivery note is missing */ }
}
