import nodemailer from 'nodemailer';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

function getSmtpConfig() {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const secure =
    String(process.env.EMAIL_SECURE ?? process.env.SMTP_SECURE ?? (port === 465 ? 'true' : 'false')).toLowerCase() === 'true';
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const fromName = process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'Zaro Digitz';
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || (user ? `${fromName} <${user}>` : 'Zaro Digitz <zarodigitz@gmail.com>');

  return { host, port, secure, user, pass, fromAddress };
}

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, reason: 'method-not-allowed' });
  }

  try {
    const { email, invoiceNumber, pdfBase64 } = JSON.parse(event.body || '{}');

    if (!email || !pdfBase64) {
      return json(400, { ok: false, reason: 'missing-email-or-pdf' });
    }

    const { host, port, secure, user, pass, fromAddress } = getSmtpConfig();

    if (!user || !pass) {
      return json(500, { ok: false, reason: 'smtp-config-missing' });
    }

    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

    const invoiceName = invoiceNumber ? `Invoice-${String(invoiceNumber).replace(/[#/\\]+/g, '-')}.pdf` : 'Invoice.pdf';

    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: `Your Zaro Digitz Invoice${invoiceNumber ? ` - ${invoiceNumber}` : ''}`,
      text: 'Thank you for shopping with Zaro Digitz. Your invoice is attached below.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
          <h2 style="margin: 0 0 16px; color: #7A1F2B;">Zaro Digitz Invoice</h2>
          <p>Thank you for shopping with us. Your invoice is attached in this email.</p>
          <p style="margin-top: 16px;">Invoice number: <strong>${escapeHtml(invoiceNumber || 'N/A')}</strong></p>
        </div>
      `,
      attachments: [
        {
          filename: invoiceName,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf',
        },
      ],
    });

    return json(200, { ok: true, sentTo: email, invoiceNumber: invoiceNumber || null });
  } catch (error) {
    console.error('Failed to send invoice email:', error);
    return json(500, {
      ok: false,
      reason: 'invoice-email-failed',
      code: error?.code || null,
      message: error?.message || String(error),
    });
  }
}
