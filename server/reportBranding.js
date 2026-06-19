const BRAND = {
  product: 'Financial Checkup',
  company: 'OperOne LLC',
  supportEmail: process.env.SUPPORT_EMAIL || 'info@operone2i.com',
  website: (process.env.CLIENT_URL || 'https://financialcheckup.app').split(',')[0].trim(),
  accent: '#2563eb',
  accentDark: '#1e3a8a',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
};

function reportRef(prefix = 'FC') {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rnd}`;
}

function pdfSafeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pageContentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function drawBrandHeader(doc, { documentTitle, documentSubtitle, metaLines = [] }) {
  const left = doc.page.margins.left;
  const width = pageContentWidth(doc);

  doc.save();
  doc.rect(0, 0, doc.page.width, 78).fill(BRAND.accent);
  doc.fillColor('#ffffff');
  doc.font('Helvetica-Bold').fontSize(17).text(BRAND.product, left, 20, { width });
  doc.font('Helvetica').fontSize(9).text(`${BRAND.company} · ${BRAND.website}`, left, 42, { width });
  doc.fontSize(8).text(`Support: ${BRAND.supportEmail}`, left, 56, { width });
  doc.restore();

  doc.y = 92;
  doc.fillColor(BRAND.text).font('Helvetica-Bold').fontSize(20).text(pdfSafeText(documentTitle), left, doc.y, { width });
  doc.moveDown(0.15);
  if (documentSubtitle) {
    doc.font('Helvetica').fontSize(11).fillColor(BRAND.muted).text(pdfSafeText(documentSubtitle), left, doc.y, { width });
    doc.moveDown(0.5);
  }

  if (metaLines.length) {
    doc.font('Helvetica').fontSize(9).fillColor(BRAND.text);
    metaLines.forEach((line) => {
      doc.text(pdfSafeText(line), left, doc.y, { width });
    });
    doc.moveDown(0.35);
  }

  doc
    .font('Helvetica-Oblique')
    .fontSize(8)
    .fillColor(BRAND.muted)
    .text(
      'CONFIDENTIAL — For the named account holder only. Unauthorized distribution is prohibited.',
      left,
      doc.y,
      { width },
    );
  doc.moveDown(0.9);
}

function drawSectionTitle(doc, title) {
  const left = doc.page.margins.left;
  const width = pageContentWidth(doc);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND.text).text(pdfSafeText(title), left, doc.y, { width });
  doc.moveDown(0.15);
  const y = doc.y;
  doc.moveTo(left, y).lineTo(left + width, y).strokeColor(BRAND.border).lineWidth(1).stroke();
  doc.moveDown(0.45);
}

function drawKeyValueTable(doc, rows) {
  const left = doc.page.margins.left;
  const width = pageContentWidth(doc);
  const labelWidth = Math.min(220, width * 0.45);

  rows.forEach(([label, value]) => {
    doc.font('Helvetica').fontSize(10).fillColor(BRAND.text);
    doc.text(pdfSafeText(label), left, doc.y, { width: labelWidth, continued: true });
    doc.font('Helvetica-Bold').text(pdfSafeText(value), { width: width - labelWidth });
  });
  doc.moveDown(0.35);
}

function drawDataTable(doc, { headers, rows, colWidths }) {
  const left = doc.page.margins.left;
  const width = pageContentWidth(doc);
  const cols = colWidths || headers.map(() => width / headers.length);
  const rowHeight = 18;
  let y = doc.y;

  function ensureSpace(needed) {
    const bottom = doc.page.height - doc.page.margins.bottom - 40;
    if (y + needed > bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }
  }

  ensureSpace(rowHeight + 4);
  doc.save();
  doc.rect(left, y, width, rowHeight).fill('#F3F4F6');
  doc.fillColor(BRAND.text).font('Helvetica-Bold').fontSize(9);
  let x = left + 6;
  headers.forEach((h, i) => {
    doc.text(pdfSafeText(h), x, y + 5, { width: cols[i] - 12, lineBreak: false });
    x += cols[i];
  });
  doc.restore();
  y += rowHeight;

  rows.forEach((row) => {
    ensureSpace(rowHeight);
    doc.font('Helvetica').fontSize(9).fillColor(BRAND.text);
    x = left + 6;
    row.forEach((cell, i) => {
      doc.text(pdfSafeText(cell), x, y + 4, { width: cols[i] - 12, lineBreak: false });
      x += cols[i];
    });
    y += rowHeight;
    doc.moveTo(left, y).lineTo(left + width, y).strokeColor(BRAND.border).lineWidth(0.5).stroke();
  });

  doc.y = y + 8;
}

function drawLegalDisclosure(doc, { reportType }) {
  const left = doc.page.margins.left;
  const width = pageContentWidth(doc);

  drawSectionTitle(doc, 'Important disclosures & limitations');

  const paragraphs = [
    `${BRAND.product} is a financial wellness and planning tool operated by ${BRAND.company}. This ${reportType} is generated automatically from information entered by the account holder and is provided for informational and educational purposes only.`,
    'This document does not constitute investment advice, tax advice, legal advice, accounting advice, or a recommendation to buy or sell any security or financial product. Numbers shown are estimates based on user-supplied ledger entries and may not reflect accrual-basis accounting, tax adjustments, or off-ledger obligations.',
    'Business statements herein use cash-basis proxies derived from income and expense categories. They are not audited financial statements and should not be filed with regulators, lenders, or tax authorities without review by a qualified CPA or attorney.',
    `The account holder is solely responsible for the accuracy of underlying data. ${BRAND.company} makes no warranty, express or implied, regarding completeness or fitness for a particular purpose. To the maximum extent permitted by law, ${BRAND.company} disclaims liability for decisions made based on this report.`,
    `Questions regarding this report: ${BRAND.supportEmail} · ${BRAND.website}`,
  ];

  doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.muted);
  paragraphs.forEach((p, i) => {
    doc.text(p, left, doc.y, { width, align: 'justify' });
    if (i < paragraphs.length - 1) doc.moveDown(0.35);
  });

  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND.text).text(
    `Document generated by ${BRAND.product} · ${new Date().toISOString()}`,
    left,
    doc.y,
    { width },
  );
}

module.exports = {
  BRAND,
  reportRef,
  pdfSafeText,
  money,
  drawBrandHeader,
  drawSectionTitle,
  drawKeyValueTable,
  drawDataTable,
  drawLegalDisclosure,
};
