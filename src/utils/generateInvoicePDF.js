import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ------------------------------------------------------------------ *
 *  EDIT THESE to match your business — pulled out so you don't have
 *  to touch the layout code below to rebrand this.
 * ------------------------------------------------------------------ */
const COMPANY = {
  name: 'ZARO Digitz',
  addressLines: ['Sivakasi to Sattur Bypass Road', 'Sivakasi, Tamil Nadu - 626189'],
  phone: '+91 70109 35230',
  email: 'zarocrackers@gmail.com',
};

// Set show:true and fill these in to print a "BANK INFO" panel like the
// reference invoice's second page. Left off by default.
const BANK_INFO = {
  show: false,
  name: 'Account Holder Name',
  bank: 'Bank Name',
  accountNo: 'XXXXXXXXXXXX',
  ifsc: 'XXXX0000000',
  branch: 'Branch Name',
  upiIds: ['yourupi@bank'],
};

const BRAND_COLOR = [122, 31, 43]; // Zaro Digitz maroon
const LOGO_COLORS = {
  cyan: [28, 188, 232],
  pink: [236, 0, 152],
  yellow: [245, 214, 28],
  black: [17, 17, 17],
  white: [255, 255, 255],
};
/* ------------------------------------------------------------------ */

function loadLogoImage() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load logo image'));
    img.src = '/zaro-logo.png';
  });
}

/**
 * Next shop-wide invoice number ("2026#43") from the API, which counts for the whole shop.
 * (It used to count in each visitor's browser, so every first-time customer got "#0".)
 * If the API can't be reached, a time-based number keeps invoices distinct.
 */
async function generateInvoiceNumber() {
  try {
    const { apiRequest } = await import('../firebase/apiStore.js');
    const r = await apiRequest('POST', '/v1/invoice-number', {});
    if (r?.invoiceNumber) return r.invoiceNumber;
  } catch { /* offline: fall back below */ }
  // Same financial-year format as the API (ZD/26-27/…), marked T so it never collides.
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  const start = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
  const fy = `${String(start % 100).padStart(2, '0')}-${String((start + 1) % 100).padStart(2, '0')}`;
  return `ZD/${fy}/T${String(Date.now()).slice(-6)}`;
}

function formatDateTime(date) {
  return date
    .toLocaleString('en-IN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
    .replace(',', '');
}

/**
 * order = {
 *   form: { fullName, mobile, altMobile, address, city, district, state, pincode },
 *   cart: [{ name, quantity, price, mrp }],   // mrp optional per item
 *   totalAmount, delivery, grandTotal,
 * }
 *
 * Note: jsPDF's built-in fonts don't include the ₹ glyph reliably across
 * viewers, so amounts are printed as "Rs. 1,234". If you want a real ₹
 * symbol, embed a Unicode font (e.g. Noto Sans) via doc.addFont and swap
 * setFont calls below.
 */
export async function generateInvoicePDF(order, invoiceNumberOverride) {
  const { form, cart, totalAmount, delivery, grandTotal } = order;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const invoiceNo = invoiceNumberOverride || (await generateInvoiceNumber());
  const dateStr = formatDateTime(new Date());
  const rupee = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

  let logoImage = null;
  try {
    logoImage = await loadLogoImage();
  } catch (error) {
    console.warn('Logo image could not be loaded for PDF export:', error);
  }

  // ---- Header ribbon ----
  doc.setFillColor(...LOGO_COLORS.cyan);
  doc.rect(0, 0, pageWidth, 120, 'F');

  if (logoImage) {
    doc.addImage(logoImage, 'PNG', 30, 12, 60, 60);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('ZARO DIGITZ', 110, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  COMPANY.addressLines.forEach((line, i) => doc.text(line, 110, 54 + i * 12));
  doc.text(
    `Phone: ${COMPANY.phone}  |  Email: ${COMPANY.email}`,
    110,
    54 + COMPANY.addressLines.length * 12
  );
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('INVOICE', pageWidth - 40, 40, { align: 'right' });

  doc.setTextColor(30, 30, 30);

  // ---- Bill To / meta ----
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
  doc.text(invoiceNo, pageWidth - 120, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth - 200, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, pageWidth - 120, y + 15);

  // ---- Items table ----
  const rows = cart.map((item, i) => {
    const mrp = item.mrp ?? item.price;
    const total = item.price * item.quantity;
    return [i + 1, item.name, item.quantity, rupee(mrp), rupee(item.price), rupee(total)];
  });

  const tableStartY = Math.max(y + 70, y + 45 + addrLines.length * 13 + 18);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 40, right: 40 },
    tableWidth: 'wrap',
    head: [['S.No', 'Product Name', 'Qty', 'MRP', 'Price', 'Total']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: BRAND_COLOR,
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

  let finalY = doc.lastAutoTable.finalY + 22;
  const spacerBeforeTotals = 30;

  const mrpTotal = cart.reduce((sum, item) => sum + (item.mrp ?? item.price) * item.quantity, 0);
  const discount = mrpTotal - totalAmount;
  const totalsX = pageWidth - 250;
  const totalsValueX = pageWidth - 40;

  if (finalY + 140 > pageHeight - 80) {
    doc.addPage();
    finalY = 70;
  }

  finalY += spacerBeforeTotals;

  const printTotalRow = (label, value, opts = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.bold ? 13 : 10);
    doc.text(label, totalsX, finalY);
    doc.text(value, totalsValueX, finalY, { align: 'right' });
    finalY += opts.bold ? 26 : 20;
  };


  printTotalRow('MRP Total', rupee(mrpTotal));
  if (discount > 0) printTotalRow('Discount', `- ${rupee(discount)}`);
  printTotalRow('Subtotal', rupee(totalAmount));
  (order.charges || []).forEach((line) => printTotalRow(line.label, rupee(line.amount)));

  const grandTotalY = finalY + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Grand Total', totalsX, grandTotalY);
  doc.text(rupee(grandTotal), totalsValueX, grandTotalY, { align: 'right' });
  doc.setDrawColor(...LOGO_COLORS.pink);
  doc.setLineWidth(1.5);
  doc.line(totalsX, grandTotalY + 4, totalsValueX, grandTotalY + 4);

  // ---- Thank-you note ----
  finalY = grandTotalY + 40;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text('Thank you for shopping with us! Our team will call to confirm delivery.', 40, finalY);

  // ---- Bank info (optional) ----
  if (BANK_INFO.show) {
    finalY += 30;
    doc.setDrawColor(200, 200, 200);
    doc.rect(40, finalY, pageWidth - 80, 100);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('BANK INFO', 55, finalY + 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    [
      `Name: ${BANK_INFO.name}`,
      `Bank: ${BANK_INFO.bank}`,
      `A/C No: ${BANK_INFO.accountNo}`,
      `IFSC: ${BANK_INFO.ifsc}`,
      `Branch: ${BANK_INFO.branch}`,
      `UPI: ${BANK_INFO.upiIds.join(', ')}`,
    ].forEach((line, i) => doc.text(line, 55, finalY + 38 + i * 12));
  }

  // ---- Footer ribbon ----
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(COMPANY.name.toUpperCase(), pageWidth - 40, pageHeight - 7, { align: 'right' });

  return { doc, invoiceNo };
}

/** Generates the PDF and triggers a browser download. Returns the invoice
 * object, which also contains the jsPDF document used for Telegram forwarding.
 */
export async function downloadInvoicePDF(order, invoiceNoOverride) {
  const { doc, invoiceNo } = await generateInvoicePDF(order, invoiceNoOverride);
  doc.save(`Invoice-${String(invoiceNo).replace(/[#/\\]+/g, '-')}.pdf`);
  return { doc, invoiceNo };
}
