import { generateInvoicePDF } from '../utils/generateInvoicePDF';

/** Print the invoice PDF in its exact format via a hidden iframe. */
export async function printInvoice(order) {
  const { doc } = await generateInvoicePDF(order.snapshot, order.invoiceNumber || order.orderNumber);
  const url = URL.createObjectURL(doc.output('blob'));
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  frame.src = url;
  document.body.appendChild(frame);
  frame.onload = () => {
    try { frame.contentWindow.focus(); frame.contentWindow.print(); }
    catch { window.open(url, '_blank'); }
    setTimeout(() => { document.body.removeChild(frame); URL.revokeObjectURL(url); }, 60000);
  };
}

export const FLOW = ['new', 'confirmed', 'packed', 'shipped', 'delivered'];
