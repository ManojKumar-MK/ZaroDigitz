import { generateInvoicePDF } from '../utils/generateInvoicePDF';

/** Print the invoice PDF in its exact format via a hidden iframe. */
/**
 * Print an order's invoice: opens it in a new tab (the browser's PDF viewer has Print and
 * Save). The tab is opened straight away, inside the click, so pop-up blockers allow it.
 */
export async function printInvoice(order) {
  const win = window.open('', '_blank');
  if (win) win.document.write('<p style="font:16px sans-serif;padding:24px">Preparing the invoice…</p>');
  try {
    const { doc } = await generateInvoicePDF(order.snapshot, order.invoiceNumber || order.orderNumber);
    const url = URL.createObjectURL(doc.output('blob'));
    if (win) win.location.href = url;
    else window.location.assign(url);
  } catch (e) {
    if (win) win.document.body.innerHTML = `<p style="font:16px sans-serif;padding:24px">Could not make the invoice: ${String(e?.message || e)}</p>`;
    throw e;
  }
}

export const FLOW = ['new', 'confirmed', 'packed', 'shipped', 'delivered'];
