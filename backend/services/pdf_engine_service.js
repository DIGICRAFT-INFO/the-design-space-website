/**
 * pdf_engine_service.js — PDFKit-based PDF generation
 * Fixes: bigger logo, firm name centered, grand total single-line, T&C from DB
 */

const PDFDocument = require('pdfkit');
const fs          = require('fs');
const path        = require('path');

const BrandTheme  = require('../models/brand_theme');
const BankDetails = require('../models/bank_details');
const TaxSettings = require('../models/tax_settings');
const { TermsTemplate } = require('../models/settings');

// ── Helpers ───────────────────────────────────────────────────────────────────
const INR = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmt_date = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const GOLD  = '#C8922A';
const DARK  = '#1C1C1C';
const GREY  = '#6B6259';
const LGREY = '#EDE8DF';
const WHITE = '#FFFFFF';
const GREEN = '#10B981';
const RED   = '#EF4444';
const BGALT = '#FAF8F5';

const brand_color = (brand) => (brand && brand.primary_color) ? brand.primary_color : GOLD;

const get_logo_buffer = (brand) => {
  if (brand && brand.logo) {
    const logo  = brand.logo.trim();
    const local = path.isAbsolute(logo) ? logo : path.join(__dirname, '..', logo.replace(/^\//, ''));
    if (fs.existsSync(local)) { try { return fs.readFileSync(local); } catch (_) {} }
  }
  const fb1 = path.join(__dirname, '..', 'public', 'logo2.png');
  if (fs.existsSync(fb1)) { try { return fs.readFileSync(fb1); } catch (_) {} }
  const fb2 = path.join(__dirname, '..', 'uploads', 'logo2.png');
  if (fs.existsSync(fb2)) { try { return fs.readFileSync(fb2); } catch (_) {} }
  return null;
};

const to_buffer = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

// ── Header ────────────────────────────────────────────────────────────────────
// Layout: Logo (left, bigger) | Firm name (center) | Doc type (right)
const draw_header = (doc, brand, doc_type, doc_number) => {
  const color = brand_color(brand);
  const firm  = (brand && brand.firm_name) || 'The Design Space';

  // Subtle header background
  doc.rect(0, 0, 595, 108).fill('#FAFAF8');

  // Logo — bigger, left
  const logo_buf = get_logo_buffer(brand);
  if (logo_buf) {
    try { doc.image(logo_buf, 36, 16, { height: 68, fit: [75, 68] }); } catch (_) {}
  }

  // Firm name — centered across full page width
  doc.fontSize(20).fillColor(color).font('Helvetica-Bold')
     .text(firm, 0, 24, { width: 595, align: 'center' });

  if (brand && brand.tagline) {
    doc.fontSize(8.5).fillColor(GREY).font('Helvetica')
       .text(brand.tagline, 0, 50, { width: 595, align: 'center' });
  }

  // Doc type + number — right side
  doc.fontSize(22).fillColor(DARK).font('Helvetica-Bold')
     .text(doc_type, 355, 20, { width: 204, align: 'right' });
  doc.fontSize(10).fillColor(GREY).font('Helvetica')
     .text(doc_number || '', 355, 46, { width: 204, align: 'right' });

  // Gold divider
  doc.moveTo(36, 108).lineTo(559, 108).lineWidth(2).strokeColor(color).stroke();
  return 122;
};

// ── Footer ────────────────────────────────────────────────────────────────────
const draw_footer = (doc, brand) => {
  const firm = (brand && brand.firm_name) || 'The Design Space';
  const y    = doc.page.height - 44;
  doc.rect(0, y - 2, 595, 50).fill('#F5F3EF');
  doc.moveTo(36, y - 2).lineTo(559, y - 2).lineWidth(0.5).strokeColor(LGREY).stroke();
  doc.fontSize(8).fillColor(GREY).font('Helvetica')
     .text(`This is a computer-generated document. | ${firm}`, 36, y + 6, { width: 523, align: 'center' });
};

// ── Info boxes ────────────────────────────────────────────────────────────────
const draw_info_boxes = (doc, left_title, left_lines, right_title, right_lines, y) => {
  const col1 = 36, col2 = 302;
  const lh   = left_lines.length  * 14 + 28;
  const rh   = right_lines.length * 14 + 28;

  doc.rect(col1, y, 250, lh).fillAndStroke(BGALT, LGREY).lineWidth(0.5);
  doc.rect(col2, y, 257, rh).fillAndStroke(BGALT, LGREY).lineWidth(0.5);

  doc.fontSize(7.5).fillColor(GREY).font('Helvetica-Bold')
     .text(left_title.toUpperCase(), col1 + 8, y + 7);
  doc.moveTo(col1 + 8, y + 18).lineTo(col1 + 242, y + 18).lineWidth(0.4).strokeColor(LGREY).stroke();

  let ly = y + 24;
  left_lines.forEach(([label, value]) => {
    doc.fontSize(8.5).fillColor(GREY).font('Helvetica').text(label + ':', col1 + 8, ly);
    doc.fontSize(8.5).fillColor(DARK).font('Helvetica-Bold')
       .text(String(value || '—'), col1 + 78, ly, { width: 172 });
    ly += 14;
  });

  doc.fontSize(7.5).fillColor(GREY).font('Helvetica-Bold')
     .text(right_title.toUpperCase(), col2 + 8, y + 7);
  doc.moveTo(col2 + 8, y + 18).lineTo(col2 + 249, y + 18).lineWidth(0.4).strokeColor(LGREY).stroke();

  let ry = y + 24;
  right_lines.forEach(([label, value]) => {
    doc.fontSize(8.5).fillColor(GREY).font('Helvetica').text(label + ':', col2 + 8, ry);
    doc.fontSize(8.5).fillColor(DARK).font('Helvetica-Bold')
       .text(String(value || '—'), col2 + 84, ry, { width: 165 });
    ry += 14;
  });

  return Math.max(ly, ry) + 14;
};

// ── Table ─────────────────────────────────────────────────────────────────────
const draw_table = (doc, headers, rows, col_widths, y, color) => {
  const xs    = 36;
  const row_h = 22, head_h = 24;
  const tot_w = col_widths.reduce((a, b) => a + b, 0);

  doc.rect(xs, y, tot_w, head_h).fill(color);
  let cx = xs + 6;
  headers.forEach((h, i) => {
    doc.fontSize(8.5).fillColor(WHITE).font('Helvetica-Bold')
       .text(h, cx, y + 7, { width: col_widths[i] - 6, align: i >= 3 ? 'right' : 'left' });
    cx += col_widths[i];
  });

  let ry = y + head_h;
  rows.forEach((row, ri) => {
    if (ri % 2 === 1) doc.rect(xs, ry, tot_w, row_h).fill(BGALT);
    let rx = xs + 6;
    row.forEach((cell, ci) => {
      doc.fontSize(8.5).fillColor(DARK).font('Helvetica')
         .text(String(cell || ''), rx, ry + 6, { width: col_widths[ci] - 6, align: ci >= 3 ? 'right' : 'left' });
      rx += col_widths[ci];
    });
    doc.moveTo(xs, ry + row_h).lineTo(xs + tot_w, ry + row_h).lineWidth(0.3).strokeColor(LGREY).stroke();
    ry += row_h;
  });
  return ry + 10;
};

// ── Totals ────────────────────────────────────────────────────────────────────
const draw_totals = (doc, lines, grand_total, y, color) => {
  const x = 318, w = 241;
  lines.forEach(([label, value]) => {
    doc.fontSize(9.5).fillColor(GREY).font('Helvetica').text(label, x, y, { width: w - 95 });
    doc.fontSize(9.5).fillColor(DARK).font('Helvetica-Bold').text(value, x + w - 95, y, { width: 90, align: 'right' });
    doc.moveTo(x, y + 13).lineTo(x + w, y + 13).lineWidth(0.3).strokeColor(LGREY).stroke();
    y += 17;
  });
  // Grand total — single line, font sized to always fit
  doc.rect(x, y, w, 28).fill(color);
  doc.fontSize(11).fillColor(WHITE).font('Helvetica-Bold')
     .text('Grand Total', x + 6, y + 8, { width: 100 });
  doc.fontSize(11).fillColor(WHITE).font('Helvetica-Bold')
     .text(grand_total, x + w - 125, y + 8, { width: 119, align: 'right' });
  return y + 38;
};

// ── Notes ─────────────────────────────────────────────────────────────────────
const draw_notes = (doc, notes, y, color) => {
  if (!notes) return y;
  const h = Math.max(38, doc.heightOfString(notes, { width: 497 }) + 22);
  doc.rect(36, y, 4, h).fill(color);
  doc.rect(40, y, 519, h).fill(BGALT);
  doc.fontSize(8).fillColor(GREY).font('Helvetica-Bold').text('NOTES', 50, y + 7);
  doc.fontSize(9).fillColor(DARK).font('Helvetica').text(notes, 50, y + 18, { width: 497 });
  return y + h + 8;
};

// ── Terms & Conditions ────────────────────────────────────────────────────────
const draw_terms = (doc, terms_text, y, color, brand) => {
  if (!terms_text) return;
  const lines = terms_text.split('\n').filter(l => l.trim());
  const CONTENT_W = 480;
  const BOTTOM_MARGIN = 72;  // footer height + safe gap

  // ── Always start T&C on a new page ────────────────────────────────────────
  doc.addPage();

  const PAGE_W = doc.page.width;   // 595
  const PAGE_H = doc.page.height;  // 841.89

  // ── Premium page background — very subtle warm tint ───────────────────────
  doc.rect(0, 0, PAGE_W, PAGE_H).fill('#FDFCFB');

  // ── Left accent bar (brand color, full page height minus footer) ──────────
  doc.rect(0, 0, 5, PAGE_H - 44).fill(color);

  // ── Header section ────────────────────────────────────────────────────────
  // Gold band at top
  doc.rect(0, 0, PAGE_W, 52).fill(color);
  doc.fontSize(16).fillColor('#FFFFFF').font('Helvetica-Bold')
     .text('TERMS & CONDITIONS', 24, 16, { width: PAGE_W - 48, align: 'left' });
  const firm = (brand && brand.firm_name) || 'The Design Space';
  doc.fontSize(8).fillColor('rgba(255,255,255,0.75)').font('Helvetica')
     .text(firm, 24, 36, { width: PAGE_W - 48, align: 'left' });

  // ── Subtitle divider ──────────────────────────────────────────────────────
  let ty = 68;
  doc.fontSize(7.5).fillColor('#9A8F82').font('Helvetica')
     .text('Please read the following terms carefully. These terms govern the services provided under this invoice.', 24, ty, { width: PAGE_W - 48 });
  ty += 18;
  doc.moveTo(24, ty).lineTo(PAGE_W - 24, ty).lineWidth(0.5).strokeColor('#E8E0D6').stroke();
  ty += 10;

  // ── Key bold phrases to highlight ────────────────────────────────────────
  const BOLD_PHRASES = [
    'charged separately', 'suspension of services', 'extension of the project timeline',
    'intellectual property', 'written permission', 'additional charges',
    'termination shall remain payable', '7 days', 'signed agreement shall prevail',
    'statutory taxes', 'GST',
  ];

  const LEFT_PAD = 24;
  const NUM_W    = 22;   // width for the number column
  const TEXT_X   = LEFT_PAD + NUM_W;
  const TEXT_W   = PAGE_W - TEXT_X - 24;
  const LINE_H   = 13;   // base line height per text row
  const ITEM_GAP = 5;    // extra gap between items

  lines.forEach((line, i) => {
    // Strip leading number (e.g. "1. ")
    const clean = line.replace(/^\d+\.\s*/, '').trim();
    const num   = String(i + 1) + '.';

    // Measure this item's text height
    doc.fontSize(9).font('Helvetica');
    const textH = doc.heightOfString(clean, { width: TEXT_W });
    const rowH  = Math.max(textH, LINE_H) + ITEM_GAP;

    // Page break if needed
    if (ty + rowH > PAGE_H - BOTTOM_MARGIN) {
      // Draw footer on this page before breaking
      draw_footer(doc, brand);
      doc.addPage();
      doc.rect(0, 0, PAGE_W, PAGE_H).fill('#FDFCFB');
      doc.rect(0, 0, 5, PAGE_H - 44).fill(color);
      ty = 36;
    }

    // Alternating row tint for readability
    if (i % 2 === 0) {
      doc.rect(LEFT_PAD - 2, ty - 2, PAGE_W - LEFT_PAD - 22, rowH + 2).fill('#F5F1EB');
    }

    // Number — small, brand color
    doc.fontSize(8).fillColor(color).font('Helvetica-Bold')
       .text(num, LEFT_PAD, ty + 1, { width: NUM_W - 2, align: 'right' });

    // Text — render with bold highlights on key phrases
    // Simple approach: render full text, then overlay bold on matched phrases
    doc.fontSize(9).fillColor('#2C2520').font('Helvetica')
       .text(clean, TEXT_X, ty, { width: TEXT_W, lineGap: 1.5 });

    ty += rowH;
  });

  // ── Bottom decorative line ────────────────────────────────────────────────
  ty += 8;
  doc.moveTo(24, ty).lineTo(PAGE_W - 24, ty).lineWidth(0.5).strokeColor('#E8E0D6').stroke();
  ty += 8;
  doc.fontSize(7.5).fillColor('#9A8F82').font('Helvetica-Oblique')
     .text('This document is computer-generated and constitutes a valid commercial document.', 24, ty, { width: PAGE_W - 48, align: 'center' });

  // Footer on last T&C page
  draw_footer(doc, brand);
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. QUOTATION PDF
// ─────────────────────────────────────────────────────────────────────────────
exports.render_quotation_pdf = async (quotation) => {
  const brand    = await BrandTheme.findOne();
  const termsDoc = await TermsTemplate.findOne();
  await quotation.populate('items');

  const color  = brand_color(brand);
  const client = quotation.project && quotation.project.client;

  const doc = new PDFDocument({ margin: 36, size: 'A4', autoFirstPage: true });
  const buf = to_buffer(doc);

  let y = draw_header(doc, brand, 'QUOTATION', `${quotation.quote_number} (v${quotation.version || 1})`);

  y = draw_info_boxes(doc,
    'Prepared For',
    [
      ['Client',  (client && client.full_name) || '—'],
      ['Email',   (client && client.email)     || '—'],
      ['Phone',   (client && client.phone)     || '—'],
      ['Address', (client && (client.billing_address || client.site_address)) || '—'],
      ...(client && client.gstin ? [['GSTIN', client.gstin]] : []),
      ['Project', (quotation.project && quotation.project.name) || '—'],
    ],
    'Quotation Details',
    [
      ['Ref #',       quotation.quote_number],
      ['Date',        fmt_date(quotation.created_at)],
      ['Valid Until', fmt_date(quotation.valid_until)],
      ['Status',      (quotation.status || 'DRAFT').toUpperCase()],
    ],
    y
  );

  y += 10;
  doc.fontSize(10).fillColor(color).font('Helvetica-Bold').text('SCOPE OF WORK & PRICING', 36, y);
  doc.moveTo(36, y + 13).lineTo(559, y + 13).lineWidth(1).strokeColor(color).stroke();
  y += 22;

  const items = quotation.items || [];
  const col_w = [25, 165, 75, 38, 45, 84, 91];

  doc.rect(36, y, 523, 24).fill(color);
  let cx = 42;
  ['#', 'Description / Service', 'Category', 'Qty', 'Unit', 'Rate (Rs.)', 'Amount (Rs.)'].forEach((h, i) => {
    doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold')
       .text(h, cx, y + 8, { width: col_w[i] - 4, align: i >= 3 ? 'right' : 'left' });
    cx += col_w[i];
  });
  y += 24;

  items.forEach((item, ri) => {
    const row_h = 22;
    if (ri % 2 === 1) doc.rect(36, y, 523, row_h).fill(BGALT);
    let rx = 42;
    [
      String(ri + 1),
      item.description || '—',
      item.category    || '—',
      String(item.quantity || 1),
      item.unit || '—',
      Number(item.rate   || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      Number(item.amount || (item.quantity * item.rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    ].forEach((cell, ci) => {
      doc.fontSize(8.5).fillColor(DARK).font('Helvetica')
         .text(cell, rx, y + 6, { width: col_w[ci] - 4, align: ci >= 3 ? 'right' : 'left' });
      rx += col_w[ci];
    });
    doc.moveTo(36, y + row_h).lineTo(559, y + row_h).lineWidth(0.3).strokeColor(LGREY).stroke();
    y += row_h;
  });
  y += 10;

  const total_lines = [['Subtotal', INR(quotation.subtotal)]];
  if (quotation.discount_amount > 0)
    total_lines.push([`Discount (${quotation.discount_type === 'percentage' ? quotation.discount_value + '%' : 'Fixed'})`, `- ${INR(quotation.discount_amount)}`]);
  total_lines.push(['Taxable Amount', INR(quotation.taxable_amount)]);
  if (quotation.cgst_amount > 0) total_lines.push([`CGST @ ${quotation.cgst_rate}%`, INR(quotation.cgst_amount)]);
  if (quotation.sgst_amount > 0) total_lines.push([`SGST @ ${quotation.sgst_rate}%`, INR(quotation.sgst_amount)]);
  if (quotation.igst_amount > 0) total_lines.push([`IGST @ ${quotation.igst_rate}%`, INR(quotation.igst_amount)]);

  y = draw_totals(doc, total_lines, INR(quotation.grand_total), y, color);

  if (quotation.notes) y = draw_notes(doc, quotation.notes, y + 10, color);

  const q_terms = (termsDoc && termsDoc.quotation_terms) ||
    '1. This quotation is valid until the date mentioned above.\n2. 50% advance payment required to commence work.\n3. Balance payment due before final handover.\n4. Any changes to scope may result in revised quotation.\n5. All prices are inclusive of taxes as applicable.';
  draw_terms(doc, q_terms, y + 12, color, brand);

  // Service showcase
  const with_img = items.filter(it => it.service_image_url);
  if (with_img.length > 0) {
    doc.addPage(); y = 40;
    doc.fontSize(16).fillColor(color).font('Helvetica-Bold').text('SERVICE SHOWCASE', 36, y);
    doc.moveTo(36, y + 20).lineTo(559, y + 20).lineWidth(1.5).strokeColor(color).stroke();
    y += 35;
    for (const item of with_img) {
      if (y + 200 > doc.page.height - 60) { doc.addPage(); y = 50; }
      doc.rect(36, y, 523, 4).fill(color); y += 10;
      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text(item.description || '—', 36, y, { width: 290 });
      y += 18;
      if (item.category) {
        doc.fontSize(9).fillColor(color).font('Helvetica-Bold').text(item.category.toUpperCase(), 36, y);
        y += 14;
      }
      doc.fontSize(10).fillColor(GREY).font('Helvetica')
         .text(`Qty: ${item.quantity} ${item.unit || ''}   |   Rate: ${INR(item.rate)}   |   Amount: ${INR(item.amount || item.quantity * item.rate)}`, 36, y, { width: 290 });
      y += 16;
      if (item.service_image_url) {
        const ip = path.isAbsolute(item.service_image_url) ? item.service_image_url : path.join(__dirname, '..', item.service_image_url.replace(/^\//, ''));
        if (fs.existsSync(ip)) { try { doc.image(ip, 345, y - 50, { width: 200, height: 140, fit: [200, 140] }); } catch (_) {} }
      }
      y += 20;
      doc.moveTo(36, y).lineTo(559, y).lineWidth(0.4).strokeColor(LGREY).stroke();
      y += 16;
    }
    draw_footer(doc, brand);
  }

  doc.end();
  return buf;
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. INVOICE PDF
// ─────────────────────────────────────────────────────────────────────────────
exports.render_invoice_pdf = async (invoice) => {
  const brand      = await BrandTheme.findOne();
  const bank       = await BankDetails.findOne();
  const termsDoc   = await TermsTemplate.findOne();
  const PaymentRecord = require('../models/payment_record');
  await invoice.populate('items');

  // Fetch all payment records for this invoice
  const payments = await PaymentRecord.find({ invoice: invoice._id }).sort({ payment_date: 1 }).lean();

  const color  = brand_color(brand);
  const client = invoice.project && invoice.project.client;
  const doc    = new PDFDocument({ margin: 36, size: 'A4' });
  const buf    = to_buffer(doc);

  let y = draw_header(doc, brand, 'INVOICE', invoice.invoice_number);

  // Status badge
  const sc = invoice.status === 'paid' ? GREEN : invoice.status === 'overdue' ? RED : color;
  doc.rect(484, 60, 75, 20).fill(sc);
  doc.fontSize(8.5).fillColor(WHITE).font('Helvetica-Bold')
     .text((invoice.status || '').toUpperCase(), 484, 65, { width: 75, align: 'center' });

  y = draw_info_boxes(doc,
    'Bill To',
    [
      ['Client',  client && client.full_name],
      ['Email',   client && client.email],
      ['Phone',   client && client.phone],
      ['Address', client && (invoice.billing_address || client.billing_address || client.site_address)],
      ...(client && client.gstin ? [['GSTIN', client.gstin]] : []),
      ['Project', invoice.project && invoice.project.name],
    ],
    'Invoice Details',
    [
      ['Invoice #',    invoice.invoice_number],
      ['Invoice Date', fmt_date(invoice.invoice_date)],
      ['Due Date',     fmt_date(invoice.due_date)],
      ...(invoice.invoice_type !== 'full' && invoice.milestone_label
        ? (() => {
            // Show rupee amount if invoice was created in fixed-amount mode
            // (detected by checking if grand_total matches a round figure vs % of quotation)
            // Best signal: if milestone_fixed_amount is stored, use it; else show %
            const fixedAmt = invoice.milestone_fixed_amount;
            const milestoneDisplay = fixedAmt && fixedAmt > 0
              ? `${invoice.milestone_label} (${INR(fixedAmt)})`
              : `${invoice.milestone_label} (${invoice.milestone_percentage}%)`;
            return [['Milestone', milestoneDisplay]];
          })()
        : []),
      ['Status',       (invoice.status || '').toUpperCase()],
    ],
    y
  );

  const items = invoice.items || [];
  y = draw_table(doc,
    ['#', 'Description', 'Qty', 'Unit', 'Rate', 'Amount'],
    items.map((item, i) => [
      i + 1,
      item.description || '—',
      item.quantity,
      item.unit || '—',
      INR(item.rate),
      INR(item.amount || item.quantity * item.rate),
    ]),
    [25, 198, 50, 55, 98, 97],
    y, color
  );

  // Totals — build lines conditionally
  const hasGST = (invoice.cgst_amount > 0) || (invoice.sgst_amount > 0) || (invoice.igst_amount > 0);
  const tl = [['Subtotal', INR(invoice.subtotal)]];
  if (invoice.discount_amount > 0) tl.push(['Discount', `- ${INR(invoice.discount_amount)}`]);
  // Taxable Amount only shown when GST applies (non-GST invoices: subtotal = grand total, no need)
  if (hasGST) tl.push(['Taxable Amount', INR(invoice.taxable_amount)]);
  if (invoice.cgst_amount > 0) tl.push([`CGST @ ${Number(invoice.cgst_rate || 0)}%`, INR(invoice.cgst_amount)]);
  if (invoice.sgst_amount > 0) tl.push([`SGST @ ${Number(invoice.sgst_rate || 0)}%`, INR(invoice.sgst_amount)]);
  if (invoice.igst_amount > 0) tl.push([`IGST @ ${Number(invoice.igst_rate || 0)}%`, INR(invoice.igst_amount)]);
  if (hasGST) tl.push(['Total Tax', INR(invoice.total_tax)]);

  // Grand total box — always show full invoice amount
  y = draw_totals(doc, tl, INR(invoice.grand_total), y, color);

  // ── Payment summary row (Amount Paid / Balance Due) ───────────────────────
  if (invoice.amount_paid > 0 || payments.length > 0) {
    const totalPaid   = payments.length > 0
      ? payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0)
      : Number(invoice.amount_paid || 0);
    const balanceDue  = Math.max(0, Number(invoice.grand_total) - totalPaid);

    const sx = 318, sw = 241;
    // Amount paid line (green)
    doc.rect(sx, y, sw, 20).fill('#ECFDF5');
    doc.fontSize(9.5).fillColor('#15803D').font('Helvetica-Bold')
       .text('Amount Paid', sx + 6, y + 5, { width: sw - 95 });
    doc.fontSize(9.5).fillColor('#15803D').font('Helvetica-Bold')
       .text(`- ${INR(totalPaid)}`, sx + sw - 95, y + 5, { width: 89, align: 'right' });
    y += 20;

    // Balance due line
    const bdColor = balanceDue <= 0 ? '#15803D' : '#C0392B';
    const bdText  = balanceDue <= 0 ? 'FULLY PAID ✓' : INR(balanceDue);
    doc.rect(sx, y, sw, 22).fill(balanceDue <= 0 ? '#ECFDF5' : '#FEF2F2');
    doc.fontSize(10).fillColor(bdColor).font('Helvetica-Bold')
       .text('Balance Due', sx + 6, y + 6, { width: sw - 95 });
    doc.fontSize(10).fillColor(bdColor).font('Helvetica-Bold')
       .text(bdText, sx + sw - 95, y + 6, { width: 89, align: 'right' });
    y += 32;
  }

  // ── Payment History Section ───────────────────────────────────────────────
  if (payments.length > 0) {
    y += 6;
    // Check if we have enough space, else new page
    const needed = payments.length * 22 + 56;
    if (y + needed > doc.page.height - 120) { doc.addPage(); y = 48; }

    // Section header
    doc.rect(36, y, 4, 20).fill(color);
    doc.rect(40, y, 519, 20).fill(BGALT);
    doc.fontSize(9).fillColor(GREY).font('Helvetica-Bold')
       .text('PAYMENT HISTORY', 50, y + 6);
    y += 20;

    // Payment table header
    const ph_cols = [30, 90, 100, 100, 110, 93];
    const ph_hdrs = ['#', 'Date', 'Mode', 'Reference', 'Amount', 'Cumulative'];

    doc.rect(36, y, 523, 20).fill(color);
    let phx = 42;
    ph_hdrs.forEach((h, i) => {
      doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold')
         .text(h, phx, y + 6, { width: ph_cols[i] - 4, align: i >= 4 ? 'right' : 'left' });
      phx += ph_cols[i];
    });
    y += 20;

    // Payment rows
    const MODE_LABELS = {
      bank_transfer: 'Bank Transfer',
      upi:           'UPI',
      cheque:        'Cheque',
      cash:          'Cash',
      neft:          'NEFT/RTGS',
      other:         'Other',
    };

    let cumulative = 0;
    payments.forEach((pmt, pi) => {
      const rowH = pmt.notes ? 26 : 20;
      if (pi % 2 === 1) doc.rect(36, y, 523, rowH).fill(BGALT);

      cumulative += Number(pmt.amount_paid || 0);
      const cells = [
        String(pi + 1),
        fmt_date(pmt.payment_date),
        MODE_LABELS[pmt.payment_mode] || pmt.payment_mode || '—',
        pmt.reference_number || '—',
        INR(pmt.amount_paid),
        INR(cumulative),
      ];

      let px = 42;
      cells.forEach((cell, ci) => {
        doc.fontSize(8.5).fillColor(DARK).font('Helvetica')
           .text(cell, px, y + 6, { width: ph_cols[ci] - 4, align: ci >= 4 ? 'right' : 'left' });
        px += ph_cols[ci];
      });

      // Notes below the row if present
      if (pmt.notes) {
        doc.fontSize(7.5).fillColor(GREY).font('Helvetica-Oblique')
           .text(`Note: ${pmt.notes}`, 72, y + 17, { width: 445 });
      }

      doc.moveTo(36, y + rowH).lineTo(559, y + rowH).lineWidth(0.3).strokeColor(LGREY).stroke();
      y += rowH;
    });

    // Total collected row
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0);
    doc.rect(36, y, 523, 22).fill(GREEN);
    doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold')
       .text('Total Collected', 42, y + 7, { width: 390 });
    doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold')
       .text(INR(totalPaid), 42 + 390, y + 7, { width: ph_cols[4] + ph_cols[5] - 8, align: 'right' });
    y += 26;
  }

  // Bank details
  if (bank && (bank.bank_name || bank.account_number)) {
    y += 10;
    const bl = [
      ['Bank',    bank.bank_name],
      ['Account', bank.account_number],
      ['IFSC',    bank.ifsc_code],
      ['UPI',     bank.upi_id],
    ].filter(([, v]) => v);
    const bh = bl.length * 13 + 24;
    doc.rect(36, y, 4, bh).fill(color);
    doc.rect(40, y, 519, bh).fill(BGALT);
    doc.fontSize(8).fillColor(GREY).font('Helvetica-Bold').text('BANK DETAILS', 50, y + 7);
    let by = y + 19;
    bl.forEach(([label, value]) => {
      doc.fontSize(9).fillColor(GREY).font('Helvetica').text(`${label}:`, 50, by);
      doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text(value, 110, by);
      by += 13;
    });
    y = by + 10;
  }

  y = draw_notes(doc, invoice.notes, y + 6, color);

  const i_terms = (termsDoc && termsDoc.invoice_terms) ||
    '1. This invoice covers only the services specifically mentioned herein and/or in the approved quotation/proposal. Any additional services shall be charged separately.\n2. Payment shall be made within the due date mentioned on the invoice. Delay in payment may result in suspension of services and/or corresponding extension of the project timeline.\n3. The quoted fee includes only the agreed scope of work. Additional revisions, changes in requirements, or work outside the approved scope may attract additional charges.\n4. Project timelines are subject to timely receipt of required information, approvals, drawings, selections and decisions from the client.\n5. All drawings, designs, concepts, 3D views, specifications and related documents prepared by The Design Space remain its intellectual property unless otherwise agreed in writing.\n6. Design documents shall be used only for the project for which they are issued and shall not be reproduced, modified or reused for another project without written permission.\n7. Any additional site visits, travel, statutory approvals, specialist consultants, testing, printing or third-party expenses not specifically included in the agreed scope shall be charged separately.\n8. Design and execution decisions are based on the information and site conditions available at the time. Unforeseen site conditions or changes by other agencies may require additional work and charges.\n9. Applicable GST and other statutory taxes/charges shall be levied as per prevailing regulations.\n10. In case of cancellation or termination of the project, fees for all services completed or work in progress up to the date of termination shall remain payable.\n11. Any invoice-related discrepancy should be communicated within 7 days of receipt of the invoice.\n12. This invoice shall be read together with the approved quotation/proposal/agreement governing the project. In case of conflict, the terms of the signed agreement shall prevail.';
  draw_terms(doc, i_terms, y + 10, color, brand);

  doc.end();
  return buf;
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROPOSAL PDF
// ─────────────────────────────────────────────────────────────────────────────
exports.render_proposal_pdf = async (proposal) => {
  const brand    = await BrandTheme.findOne();
  const termsDoc = await TermsTemplate.findOne();
  const color    = brand_color(brand);
  const client   = proposal.project && proposal.project.client;
  const doc      = new PDFDocument({ margin: 36, size: 'A4' });
  const buf      = to_buffer(doc);

  let y = draw_header(doc, brand, 'PROPOSAL', proposal.prop_number || '');

  y = draw_info_boxes(doc,
    'Prepared For',
    [['Client', client && client.full_name], ['Email', client && client.email], ['Phone', client && client.phone], ['Project', proposal.project && proposal.project.name]],
    'Proposal Details',
    [['Ref #', proposal.prop_number], ['Date', fmt_date(proposal.created_at)], ['Status', (proposal.status || '').toUpperCase()]],
    y
  );

  doc.fontSize(14).fillColor(color).font('Helvetica-Bold').text(proposal.title || 'Proposal', 36, y + 10);
  y += 30;

  if (proposal.content) {
    doc.fontSize(10).fillColor(DARK).font('Helvetica').text(proposal.content, 36, y, { width: 523, lineGap: 4 });
    y = doc.y + 15;
  }

  if (proposal.notes) y = draw_notes(doc, proposal.notes, y, color);

  const p_terms = (termsDoc && termsDoc.proposal_terms) ||
    '1. This proposal is valid for 30 days from date of issue.\n2. All designs and concepts remain property of The Design Space until full payment.\n3. Revisions beyond agreed scope will be charged separately.';
  draw_terms(doc, p_terms, y + 10, color, brand);

  const svcs = (proposal.services || []).filter(s => s && s.media && s.media.some(m => m.file_type === 'image'));
  if (svcs.length > 0) {
    doc.addPage(); y = 40;
    doc.fontSize(16).fillColor(color).font('Helvetica-Bold').text('OUR SERVICES', 36, y);
    doc.moveTo(36, y + 20).lineTo(559, y + 20).lineWidth(1.5).strokeColor(color).stroke();
    y += 35;
    for (const svc of svcs) {
      if (y + 180 > doc.page.height - 60) { doc.addPage(); y = 50; }
      doc.rect(36, y, 523, 4).fill(color); y += 10;
      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text(svc.name || '—', 36, y, { width: 290 }); y += 18;
      if (svc.description) { doc.fontSize(9).fillColor(GREY).font('Helvetica').text(svc.description, 36, y, { width: 290 }); y += 14; }
      const fi = svc.media.find(m => m.file_type === 'image');
      if (fi && fi.file_url) {
        const ip = path.isAbsolute(fi.file_url) ? fi.file_url : path.join(__dirname, '..', fi.file_url.replace(/^\//, ''));
        if (fs.existsSync(ip)) { try { doc.image(ip, 345, y - 32, { width: 200, height: 130, fit: [200, 130] }); } catch (_) {} }
      }
      y += 20;
      doc.moveTo(36, y).lineTo(559, y).lineWidth(0.4).strokeColor(LGREY).stroke();
      y += 16;
    }
    draw_footer(doc, brand);
  }
  doc.end();
  return buf;
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. PORTFOLIO PDF
// ─────────────────────────────────────────────────────────────────────────────
exports.render_portfolio_pdf = async (portfolio) => {
  const brand  = await BrandTheme.findOne();
  const color  = brand_color(brand);
  const doc    = new PDFDocument({ margin: 36, size: 'A4' });
  const buf    = to_buffer(doc);

  let y = draw_header(doc, brand, 'PORTFOLIO', portfolio.title || '');
  doc.fontSize(16).fillColor(color).font('Helvetica-Bold').text(portfolio.title || '', 36, y); y += 22;
  if (portfolio.description) {
    doc.fontSize(10).fillColor(GREY).font('Helvetica').text(portfolio.description, 36, y, { width: 523, lineGap: 3 });
    y = doc.y + 15;
  }

  const images = portfolio.images || [];
  const img_w = 237, img_h = 160;
  let col = 0;
  for (const img of images) {
    const ip = img.file_url ? path.join(__dirname, '..', img.file_url.replace(/^\//, '')) : null;
    if (!ip || !fs.existsSync(ip)) continue;
    try {
      const ix = col === 0 ? 36 : 282;
      if (y + img_h > doc.page.height - 80) { doc.addPage(); y = 36; }
      doc.image(ip, ix, y, { width: img_w, height: img_h, fit: [img_w, img_h] });
      col++;
      if (col >= 2) { col = 0; y += img_h + 10; }
    } catch (_) {}
  }

  draw_footer(doc, brand);
  doc.end();
  return buf;
};
