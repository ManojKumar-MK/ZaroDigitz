/* global process, Buffer */
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';


function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

// Free-text card details go into a Telegram HTML message, so escape them.
const escapeHtml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildOrderMessage(order) {
  const { form, cart, totalAmount, delivery, grandTotal } = order;
  const lines = [
    ...(order.alert ? [`⚠️ ${order.alert}`, ''] : []),
    '💌 New Order — ZARO Digitz',
    ...(order.orderNumber ? [`Order: ${order.orderNumber}`] : []),
    '',
    `Customer: ${form.fullName}`,
    `Mobile: ${form.mobile}${form.altMobile ? ` / ${form.altMobile}` : ''}`,
    `Address: ${form.address}, ${form.city}, ${form.district}, ${form.state}, ${form.country} - ${form.pincode}`,
    ...(form.eventFor ? [`Card for: ${escapeHtml(form.eventFor)}`] : []),
    ...(form.eventDate ? [`Event date: ${escapeHtml(form.eventDate)}`] : []),
    ...(form.eventNotes ? [`Notes: ${escapeHtml(form.eventNotes)}`] : []),
    '',
    'Items:',
    ...cart.flatMap((item) => [
      `• ${item.name} x${item.quantity} — ${formatCurrency(item.price * item.quantity)}`,
      ...((item.personalisation?.summary || []).map((s) => `   ${escapeHtml(s.label)}: ${escapeHtml(s.value)}`)),
    ]),
    '',
    `Subtotal: ${formatCurrency(totalAmount)}`,
    ...(order.charges || []).map((line) => `${line.label}: ${formatCurrency(line.amount)}`),
    `Total: ${formatCurrency(grandTotal)}`,
    ...(order.invoiceUrl ? ['', `Invoice PDF: ${order.invoiceUrl}`] : []),
  ];

  return lines.join('\n');
}

function base64ToUint8Array(base64) {
  const binary = Buffer.from(base64, 'base64');
  return new Uint8Array(binary);
}

function generateInvoicePdf(order, invoiceNumber) {
  const { form, cart, totalAmount, delivery, grandTotal } = order;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const rupee = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

  doc.setFillColor(28, 188, 232);
  doc.rect(0, 0, pageWidth, 120, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('ZARO DIGITZ', 40, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('No. 3U, Maruthu Pandiyar Mettu Street', 40, 54);
  doc.text('Sivakasi, Tamil Nadu - 626123 · GSTIN 33AAEFZ1822D1ZK', 40, 66);
  doc.text('Phone: +91 97877 02336  |  Email: zarodigitz@gmail.com', 40, 78);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('INVOICE', pageWidth - 40, 40, { align: 'right' });

  doc.setTextColor(30, 30, 30);
  let y = 150;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Bill To:', 40, y);
  doc.setFont('helvetica', 'normal');
  doc.text(form.fullName, 40, y + 15);
  doc.text(`Phone: ${form.mobile}${form.altMobile ? ' / ' + form.altMobile : ''}`, 40, y + 30);
  const addrLines = doc.splitTextToSize(
    `${form.address}, ${form.city}, ${form.district}, ${form.state} - ${form.pincode}`,
    260
  );
  doc.text(addrLines, 40, y + 45);

  doc.setFont('helvetica', 'bold');
  doc.text('Invoice No:', pageWidth - 200, y);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceNumber, pageWidth - 120, y);

  const rows = cart.map((item, i) => {
    const mrp = item.mrp ?? item.price;
    const total = item.price * item.quantity;
    return [i + 1, item.name, item.quantity, rupee(mrp), rupee(item.price), rupee(total)];
  });

  autoTable(doc, {
    startY: y + 70,
    margin: { left: 40, right: 40 },
    tableWidth: 'wrap',
    head: [['S.No', 'Product Name', 'Qty', 'MRP', 'Price', 'Total']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [28, 188, 232],
      textColor: 255,
      fontStyle: 'bold',
      lineColor: [255, 255, 255],
      lineWidth: 0.25,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 5,
      overflow: 'linebreak',
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 34 },
      1: { cellWidth: 190, overflow: 'linebreak' },
      2: { halign: 'center', cellWidth: 38 },
      3: { halign: 'right', cellWidth: 60 },
      4: { halign: 'right', cellWidth: 60 },
      5: { halign: 'right', cellWidth: 60 },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  let finalY = doc.lastAutoTable.finalY + 20;
  const mrpTotal = cart.reduce((sum, item) => sum + (item.mrp ?? item.price) * item.quantity, 0);
  const discount = mrpTotal - totalAmount;
  const totalsX = pageWidth - 200;

  const printTotalRow = (label, value, opts = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.bold ? 13 : 10);
    doc.text(label, totalsX, finalY);
    doc.text(value, pageWidth - 40, finalY, { align: 'right' });
    finalY += opts.bold ? 22 : 16;
  };


  printTotalRow('MRP Total', rupee(mrpTotal));
  if (discount > 0) printTotalRow('Discount', `- ${rupee(discount)}`);
  printTotalRow('Subtotal', rupee(totalAmount));
  (order.charges || []).forEach((line) => printTotalRow(line.label, rupee(line.amount)));

  const grandTotalY = finalY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Grand Total', totalsX, grandTotalY);
  doc.text(rupee(grandTotal), pageWidth - 40, grandTotalY, { align: 'right' });
  doc.setDrawColor(236, 0, 152);
  doc.setLineWidth(1.5);
  doc.line(totalsX, grandTotalY + 4, pageWidth - 40, grandTotalY + 4);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text('Thank you for shopping with us! Our team will call to confirm delivery.', 40, Math.min(pageHeight - 40, grandTotalY + 30));

  return doc;
}

/* ───────────────── Owner WhatsApp alert via CallMeBot (optional) ─────────────────
 * Free personal-notification service that messages YOUR OWN number; no Meta business
 * account involved. One-time setup per phone: save +34 644 27 31 86 as a contact, send
 * it "I allow callmebot to send me messages" on WhatsApp, and it replies with an API key.
 *   CALLMEBOT_RECIPIENTS="919787702336:APIKEY1,916369619148:APIKEY2"
 * Best effort only: failures are reported in the response but never fail the order.
 */
function getCallMeBotRecipients() {
  return String(process.env.CALLMEBOT_RECIPIENTS || '')
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [phone, apikey] = pair.split(':').map((v) => v.trim());
      return phone && apikey ? { phone: phone.replace(/\D/g, ''), apikey } : null;
    })
    .filter(Boolean);
}

async function notifyCallMeBot(recipients, text) {
  const body = text.replace(/<[^>]+>/g, '').slice(0, 1800);
  return Promise.all(
    recipients.map(async ({ phone, apikey }) => {
      try {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&apikey=${encodeURIComponent(apikey)}&text=${encodeURIComponent(body)}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        // CallMeBot answers 200 even on failure; the reason is in the page text, often after the echo.
        const reply = (await response.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const ok = response.ok && !/(invalid|error|not (yet )?activated|please create|wait|blocked|limit)/i.test(reply);
        const reason = reply.replace(/^.*?Text to send:.*?(?=APIKey|Error|Please|You |The )/i, '').slice(0, 160);
        return { phone, ok, reply: ok ? 'sent' : reason || reply.slice(-160) };
      } catch (error) {
        return { phone, ok: false, reply: error.message };
      }
    })
  );
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, reason: 'method-not-allowed' }),
    };
  }

  try {
    // Read at request time so values loaded by dotenv in server.js are picked up.
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    // Comma-separated list, e.g. "5452843174,-1001234567890" (personal chat + group).
    const TELEGRAM_CHAT_IDS = String(process.env.TELEGRAM_CHAT_ID || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const { order, invoiceNumber, pdfBase64 } = JSON.parse(event.body || '{}');

    const telegramConfigured = Boolean(TELEGRAM_BOT_TOKEN) && TELEGRAM_CHAT_IDS.length > 0;
    const callMeBot = getCallMeBotRecipients();
    if (!telegramConfigured && !callMeBot.length) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, reason: 'missing-telegram-config' }),
      };
    }

    if (!order?.form?.fullName || !invoiceNumber) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, reason: 'invalid-payload' }),
      };
    }

    const api = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    const message = buildOrderMessage(order);
    const caption = `${order.alert ? '⚠️ NOT SAVED IN ADMIN — ' : '💌 New order from '}${order.form.fullName}\nInvoice: ${invoiceNumber}${order.orderNumber ? `\nOrder: ${order.orderNumber}` : ''}`;
    const pdfDoc = pdfBase64 ? null : generateInvoicePdf(order, invoiceNumber);
    const pdfBytes = pdfBase64 ? base64ToUint8Array(pdfBase64) : new Uint8Array(pdfDoc.output('arraybuffer'));

    const sendToChat = async (chatId) => {
      const messageResponse = await fetch(`${api}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });
      const messageJson = await messageResponse.json();

      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('caption', caption);
      formData.append('document', new Blob([pdfBytes], { type: 'application/pdf' }), `Invoice-${String(invoiceNumber).replace(/[#/\\]+/g, '-')}.pdf`);

      const fileResponse = await fetch(`${api}/sendDocument`, {
        method: 'POST',
        body: formData,
      });
      const fileJson = await fileResponse.json();
      return { chatId, message: messageJson, document: fileJson };
    };

    const [results, whatsappAlerts] = await Promise.all([
      telegramConfigured
        ? Promise.all(
            TELEGRAM_CHAT_IDS.map((chatId) =>
              sendToChat(chatId).catch((error) => ({
                chatId,
                message: { ok: false },
                document: { ok: false, description: error.message },
              }))
            )
          )
        : Promise.resolve([]),
      callMeBot.length ? notifyCallMeBot(callMeBot, message) : Promise.resolve([]),
    ]);

    // Succeed if at least one chat received the invoice.
    const delivered = results.find((r) => r.document?.ok) || (whatsappAlerts.find((w) => w.ok) ? { message: null, document: null } : null);
    if (!delivered) {
      const failed = results[0] || { document: { description: whatsappAlerts[0]?.reply || 'send-failed' } };
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, reason: failed.document?.description || 'send-document-failed', message: failed.message, results, whatsappAlerts }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, message: delivered.message, document: delivered.document, results, whatsappAlerts }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, reason: error.message || 'unexpected-error' }),
    };
  }
}