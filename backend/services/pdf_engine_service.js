/**
 * pdf_engine_service.js
 * Pure JavaScript PDF generation using PDFKit — no Chromium/Puppeteer needed.
 * Works on any Node.js host including Hostinger shared hosting.
 */

const PDFDocument = require('pdfkit');
const fs          = require('fs');
const path        = require('path');

const BrandTheme  = require('../models/brand_theme');
const BankDetails = require('../models/bank_details');
const TaxSettings = require('../models/tax_settings');

// ── Helpers ───────────────────────────────────────────────────────────────────

const INR = (n) =>
  'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const fmt_date = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const GOLD   = '#C8922A';
const DARK   = '#1C1C1C';
const GREY   = '#6B6259';
const LGREY  = '#EDE8DF';
const WHITE  = '#FFFFFF';
const GREEN  = '#10B981';
const RED    = '#EF4444';

const brand_color = (brand) => (brand && brand.primary_color) ? brand.primary_color : GOLD;

// Get logo buffer from disk or return null
const get_logo_buffer = (brand) => {
  if (brand && brand.logo) {
    const logo = brand.logo.trim();
    const local = path.isAbsolute(logo)
      ? logo
      : path.join(__dirname, '..', logo.replace(/^\//, ''));
    if (fs.existsSync(local)) {
      try { return fs.readFileSync(local); } catch (_) {}
    }
  }
  // fallback logo — stored in public/ folder (committed to git, available on all servers)
  const fallback = path.join(__dirname, '..', 'public', 'logo2.png');
  if (fs.existsSync(fallback)) {
    try { return fs.readFileSync(fallback); } catch (_) {}
  }
  // secondary fallback — uploads folder (local dev only)
  const fallback2 = path.join(__dirname, '..', 'uploads', 'logo2.png');
  if (fs.existsSync(fallback2)) {
    try { return fs.readFileSync(fallback2); } catch (_) {}
  }
  return null;
};

// Render PDF to Buffer
const to_buffer = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

// ── Shared header ─────────────────────────────────────────────────────────────
const draw_header = (doc, brand, doc_type, doc_number) => {
  const color = brand_color(brand);
  const firm  = (brand && brand.firm_name) || 'The Design Space';

  // Logo
  const logo_buf = get_logo_buffer(brand);
  if (logo_buf) {
    try {
      doc.image(logo_buf, 40, 40, { height: 50, fit: [120, 50] });
    } catch (_) {}
  }

  // Firm name + tagline
  doc.fontSize(18).fillColor(color).font('Helvetica-Bold')
     .text(firm, 170, 42);
  if (brand && brand.tagline) {
    doc.fontSize(9).fillColor(GREY).font('Helvetica')
       .text(brand.tagline, 170, 64);
  }

  // Doc type + number (right side)
  doc.fontSize(22).fillColor(DARK).font('Helvetica-Bold')
     .text(doc_type, 350, 42, { width: 200, align: 'right' });
  doc.fontSize(11).fillColor(GREY).font('Helvetica')
     .text(doc_number || '', 350, 68, { width: 200, align: 'right' });

  // Divider
  doc.moveTo(40, 100).lineTo(555, 100).lineWidth(2).strokeColor(color).stroke();

  return 115; // y position after header
};

// ── Shared footer ─────────────────────────────────────────────────────────────
const draw_footer = (doc, brand) => {
  const firm = (brand && brand.firm_name) || 'The Design Space';
  const y = doc.page.height - 50;
  doc.moveTo(40, y).lineTo(555, y).lineWidth(0.5).strokeColor(LGREY).stroke();
  doc.fontSize(8).fillColor(GREY).font('Helvetica')
     .text(`This is a computer-generated document. | ${firm}`, 40, y + 8, {
       width: 515, align: 'center',
     });
};

// ── Two-column info box ───────────────────────────────────────────────────────
const draw_info_boxes = (doc, left_title, left_lines, right_title, right_lines, y) => {
  const col1 = 40, col2 = 300;

  doc.fontSize(8).fillColor(GREY).font('Helvetica-Bold')
     .text(left_title.toUpperCase(), col1, y);
  doc.moveTo(col1, y + 11).lineTo(250, y + 11).lineWidth(0.5).strokeColor(LGREY).stroke();

  let ly = y + 16;
  left_lines.forEach(([label, value]) => {
    doc.fontSize(9).fillColor(GREY).font('Helvetica').text(label + ':', col1, ly, { continued: false });
    doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text(String(value || '—'), col1 + 80, ly);
    ly += 14;
  });

  doc.fontSize(8).fillColor(GREY).font('Helvetica-Bold')
     .text(right_title.toUpperCase(), col2, y);
  doc.moveTo(col2, y + 11).lineTo(555, y + 11).lineWidth(0.5).strokeColor(LGREY).stroke();

  let ry = y + 16;
  right_lines.forEach(([label, value]) => {
    doc.fontSize(9).fillColor(GREY).font('Helvetica').text(label + ':', col2, ry, { continued: false });
    doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text(String(value || '—'), col2 + 90, ry);
    ry += 14;
  });

  return Math.max(ly, ry) + 10;
};

// ── Table ─────────────────────────────────────────────────────────────────────
const draw_table = (doc, headers, rows, col_widths, y, color) => {
  const x_start = 40;
  const row_h   = 22;
  const head_h  = 24;

  // Header row
  doc.rect(x_start, y, 515, head_h).fill(color);
  let cx = x_start + 6;
  headers.forEach((h, i) => {
    const align = i >= 3 ? 'right' : 'left';
    doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold')
       .text(h, cx, y + 7, { width: col_widths[i] - 6, align });
    cx += col_widths[i];
  });

  let row_y = y + head_h;

  rows.forEach((row, ri) => {
    // Zebra
    if (ri % 2 === 1) {
      doc.rect(x_start, row_y, 515, row_h).fill('#FAF8F5');
    }
    let rx = x_start + 6;
    row.forEach((cell, ci) => {
      const align = ci >= 3 ? 'right' : 'left';
      doc.fontSize(9).fillColor(DARK).font('Helvetica')
         .text(String(cell || ''), rx, row_y + 6, { width: col_widths[ci] - 6, align });
      rx += col_widths[ci];
    });
    // bottom border
    doc.moveTo(x_start, row_y + row_h).lineTo(x_start + 515, row_y + row_h)
       .lineWidth(0.3).strokeColor(LGREY).stroke();
    row_y += row_h;
  });

  return row_y + 10;
};

// ── Totals block ──────────────────────────────────────────────────────────────
const draw_totals = (doc, lines, grand_total, y, color) => {
  const x = 320, w = 235;

  lines.forEach(([label, value]) => {
    doc.fontSize(10).fillColor(GREY).font('Helvetica')
       .text(label, x, y, { width: w - 80 });
    doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold')
       .text(value, x + w - 80, y, { width: 75, align: 'right' });
    doc.moveTo(x, y + 14).lineTo(x + w, y + 14).lineWidth(0.3).strokeColor(LGREY).stroke();
    y += 18;
  });

  // Grand total band
  doc.rect(x, y, w, 26).fill(color);
  doc.fontSize(12).fillColor(WHITE).font('Helvetica-Bold')
     .text('Grand Total', x + 6, y + 7, { width: w - 80 });
  doc.fontSize(12).fillColor(WHITE).font('Helvetica-Bold')
     .text(grand_total, x + w - 80, y + 7, { width: 75, align: 'right' });

  return y + 36;
};

// ── Notes box ─────────────────────────────────────────────────────────────────
const draw_notes = (doc, notes, y, color) => {
  if (!notes) return y;
  doc.rect(40, y, 4, 40).fill(color);
  doc.fontSize(8).fillColor(GREY).font('Helvetica-Bold').text('NOTES / TERMS', 52, y);
  doc.fontSize(9).fillColor(DARK).font('Helvetica').text(notes, 52, y + 12, { width: 500 });
  return y + 50;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. QUOTATION PDF  — Professional real-world format with service images
// ─────────────────────────────────────────────────────────────────────────────
exports.render_quotation_pdf = async (quotation) => {
  const brand   = await BrandTheme.findOne();
  const tax_cfg = await TaxSettings.findOne();
  // Always populate items — .populated() is not a valid Mongoose 9 method
  await quotation.populate('items');

  const color  = brand_color(brand);
  const client = quotation.project && quotation.project.client;
  const firm   = (brand && brand.firm_name) || 'The Design Space';

  const doc = new PDFDocument({ margin: 40, size: 'A4', autoFirstPage: true });
  const buf = to_buffer(doc);

  // ── PAGE 1: Cover / Summary ───────────────────────────────────────────────
  let y = draw_header(doc, brand, 'QUOTATION', `${quotation.quote_number} (v${quotation.version || 1})`);

  // Client + quotation info boxes
  const client_lines = [
    ['Client',  (client && client.full_name) || '—'],
    ['Email',   (client && client.email)     || '—'],
    ['Phone',   (client && client.phone)     || '—'],
    ['Project', (quotation.project && quotation.project.name) || '—'],
  ];
  const quote_lines = [
    ['Ref #',       quotation.quote_number],
    ['Date',        fmt_date(quotation.created_at)],
    ['Valid Until', fmt_date(quotation.valid_until)],
    ['Status',      (quotation.status || 'DRAFT').toUpperCase()],
  ];
  y = draw_info_boxes(doc, 'Prepared For', client_lines, 'Quotation Details', quote_lines, y);

  // ── Section: Line Items table (compact, with service name) ────────────────
  y += 10;
  doc.fontSize(10).fillColor(color).font('Helvetica-Bold').text('SCOPE OF WORK & PRICING', 40, y);
  doc.moveTo(40, y + 13).lineTo(555, y + 13).lineWidth(1).strokeColor(color).stroke();
  y += 20;

  const items = quotation.items || [];

  // Table columns: # | Service / Description | Category | Qty | Unit | Rate | Amount
  const col_w = [25, 165, 75, 38, 45, 82, 85];
  const headers_q = ['#', 'Description / Service', 'Category', 'Qty', 'Unit', 'Rate (₹)', 'Amount (₹)'];

  // Header row
  doc.rect(40, y, 515, 24).fill(color);
  let cx = 46;
  headers_q.forEach((h, i) => {
    doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold')
       .text(h, cx, y + 8, { width: col_w[i] - 4, align: i >= 3 ? 'right' : 'left' });
    cx += col_w[i];
  });
  y += 24;

  // Data rows (with multi-line description support)
  items.forEach((item, ri) => {
    const row_h = 22;
    if (ri % 2 === 1) doc.rect(40, y, 515, row_h).fill('#FAF8F5');

    let rx = 46;
    const cells = [
      String(ri + 1),
      item.description || '—',
      item.category || '—',
      String(item.quantity || 1),
      item.unit || '—',
      Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      Number(item.amount || (item.quantity * item.rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    ];
    cells.forEach((cell, ci) => {
      doc.fontSize(9).fillColor(DARK).font('Helvetica')
         .text(cell, rx, y + 6, { width: col_w[ci] - 4, align: ci >= 3 ? 'right' : 'left' });
      rx += col_w[ci];
    });
    doc.moveTo(40, y + row_h).lineTo(555, y + row_h).lineWidth(0.3).strokeColor(LGREY).stroke();
    y += row_h;
  });

  y += 10;

  // ── Totals ─────────────────────────────────────────────────────────────────
  const total_lines = [['Subtotal', INR(quotation.subtotal)]];
  if (quotation.discount_amount > 0)
    total_lines.push([`Discount (${quotation.discount_type === 'percentage' ? quotation.discount_value + '%' : 'Fixed'})`, `- ${INR(quotation.discount_amount)}`]);
  total_lines.push(['Taxable Amount', INR(quotation.taxable_amount)]);
  if (quotation.cgst_amount > 0)
    total_lines.push([`CGST @ ${quotation.cgst_rate}%`, INR(quotation.cgst_amount)]);
  if (quotation.sgst_amount > 0)
    total_lines.push([`SGST @ ${quotation.sgst_rate}%`, INR(quotation.sgst_amount)]);
  if (quotation.igst_amount > 0)
    total_lines.push([`IGST @ ${quotation.igst_rate}%`, INR(quotation.igst_amount)]);

  y = draw_totals(doc, total_lines, INR(quotation.grand_total), y, color);

  // Notes / terms
  if (quotation.notes) {
    y = draw_notes(doc, quotation.notes, y + 10, color);
  }

  // ── Standard terms block ──────────────────────────────────────────────────
  const terms = [
    '1. This quotation is valid until the date mentioned above.',
    '2. 50% advance payment required to commence work.',
    '3. Balance payment due before final handover.',
    '4. Any changes to scope may result in revised quotation.',
    '5. All prices are inclusive of taxes as applicable.',
  ];
  y += 14;
  if (y + 80 > doc.page.height - 60) { doc.addPage(); y = 50; }
  doc.rect(40, y, 4, terms.length * 14 + 10).fill(color);
  doc.fontSize(8).fillColor(GREY).font('Helvetica-Bold').text('TERMS & CONDITIONS', 52, y);
  y += 12;
  terms.forEach(t => {
    doc.fontSize(8).fillColor(DARK).font('Helvetica').text(t, 52, y, { width: 490 });
    y += 13;
  });

  draw_footer(doc, brand);

  // ── PAGE 2+: Service Showcase (one service per section with image) ─────────
  const items_with_images = items.filter(it => it.service_image_url);
  if (items_with_images.length > 0) {
    doc.addPage();
    y = 40;

    // Page heading
    doc.fontSize(16).fillColor(color).font('Helvetica-Bold')
       .text('SERVICE SHOWCASE', 40, y);
    doc.moveTo(40, y + 20).lineTo(555, y + 20).lineWidth(1.5).strokeColor(color).stroke();
    y += 35;

    for (const item of items_with_images) {
      // Check page space
      if (y + 200 > doc.page.height - 60) { doc.addPage(); y = 50; }

      // Service card background
      doc.rect(40, y, 515, 4).fill(color);
      y += 10;

      // Service name + description (left column)
      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold')
         .text(item.description || '—', 40, y, { width: 290 });
      y += 18;

      if (item.category) {
        doc.fontSize(9).fillColor(color).font('Helvetica-Bold')
           .text(item.category.toUpperCase(), 40, y);
        y += 14;
      }

      // Rate + qty info
      doc.fontSize(10).fillColor(GREY).font('Helvetica')
         .text(`Qty: ${item.quantity} ${item.unit || ''}   |   Rate: ${INR(item.rate)}   |   Amount: ${INR(item.amount || item.quantity * item.rate)}`, 40, y, { width: 290 });
      y += 16;

      // Try to draw the service image (right side, or below if it failed)
      const img_url = item.service_image_url;
      if (img_url) {
        const img_path = path.isAbsolute(img_url)
          ? img_url
          : path.join(__dirname, '..', img_url.replace(/^\//, ''));

        if (fs.existsSync(img_path)) {
          try {
            // Image on right column (x=345) aligned with card start
            const img_y = y - 50; // align with top of card
            doc.image(img_path, 345, img_y, { width: 200, height: 140, fit: [200, 140] });
          } catch (_) { /* skip if image unreadable */ }
        }
      }

      y += 20;
      doc.moveTo(40, y).lineTo(555, y).lineWidth(0.4).strokeColor(LGREY).stroke();
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
  const brand   = await BrandTheme.findOne();
  const bank    = await BankDetails.findOne();
  // Always populate items — .populated() is not a valid Mongoose 9 method
  await invoice.populate('items');

  const color  = brand_color(brand);
  const client = invoice.project && invoice.project.client;
  const doc    = new PDFDocument({ margin: 40, size: 'A4' });
  const buf    = to_buffer(doc);

  let y = draw_header(doc, brand, 'INVOICE', invoice.invoice_number);

  // Status badge
  const status_color = invoice.status === 'paid' ? GREEN : invoice.status === 'overdue' ? RED : color;
  doc.rect(430, 42, 80, 20).fill(status_color);
  doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold')
     .text((invoice.status || '').toUpperCase(), 430, 48, { width: 80, align: 'center' });

  y = draw_info_boxes(doc,
    'Bill To',
    [
      ['Client',  client && client.full_name],
      ['Email',   client && client.email],
      ['Phone',   client && client.phone],
      ['Project', invoice.project && invoice.project.name],
    ],
    'Invoice Details',
    [
      ['Invoice #',    invoice.invoice_number],
      ['Invoice Date', fmt_date(invoice.invoice_date)],
      ['Due Date',     fmt_date(invoice.due_date)],
      ['Status',       (invoice.status || '').toUpperCase()],
    ],
    y
  );

  const items = invoice.items || [];
  const rows  = items.map((item, i) => [
    i + 1,
    item.description || '—',
    item.quantity,
    item.unit || '—',
    INR(item.rate),
    INR(item.amount || item.quantity * item.rate),
  ]);

  y = draw_table(doc,
    ['#', 'Description', 'Qty', 'Unit', 'Rate', 'Amount'],
    rows,
    [25, 190, 50, 55, 95, 100],
    y, color
  );

  const total_lines = [['Subtotal', INR(invoice.subtotal)]];
  if (invoice.discount_amount > 0)
    total_lines.push(['Discount', `- ${INR(invoice.discount_amount)}`]);
  total_lines.push(['Taxable Amount', INR(invoice.taxable_amount)]);
  if (invoice.cgst_amount > 0)
    total_lines.push([`CGST @ ${invoice.cgst_rate}%`, INR(invoice.cgst_amount)]);
  if (invoice.sgst_amount > 0)
    total_lines.push([`SGST @ ${invoice.sgst_rate}%`, INR(invoice.sgst_amount)]);
  if (invoice.igst_amount > 0)
    total_lines.push([`IGST @ ${invoice.igst_rate}%`, INR(invoice.igst_amount)]);
  if (invoice.amount_paid > 0)
    total_lines.push(['Amount Paid', `- ${INR(invoice.amount_paid)}`]);

  y = draw_totals(doc, total_lines, INR(invoice.balance_due || invoice.grand_total), y, color);

  // Bank details
  if (bank && (bank.bank_name || bank.account_number)) {
    y += 10;
    doc.rect(40, y, 4, 70).fill(color);
    doc.fontSize(8).fillColor(GREY).font('Helvetica-Bold').text('BANK DETAILS', 52, y);
    y += 12;
    const bank_lines = [
      ['Bank', bank.bank_name],
      ['Account', bank.account_number],
      ['IFSC', bank.ifsc_code],
      ['UPI', bank.upi_id],
    ].filter(([, v]) => v);
    bank_lines.forEach(([label, value]) => {
      doc.fontSize(9).fillColor(GREY).font('Helvetica').text(`${label}:`, 52, y, { continued: false });
      doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text(value, 110, y);
      y += 13;
    });
  }

  y = draw_notes(doc, invoice.notes, y + 10, color);
  draw_footer(doc, brand);
  doc.end();
  return buf;
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROPOSAL PDF
// ─────────────────────────────────────────────────────────────────────────────
exports.render_proposal_pdf = async (proposal) => {
  const brand  = await BrandTheme.findOne();
  const color  = brand_color(brand);
  const client = proposal.project && proposal.project.client;
  const doc    = new PDFDocument({ margin: 40, size: 'A4' });
  const buf    = to_buffer(doc);

  let y = draw_header(doc, brand, 'PROPOSAL', proposal.prop_number || '');

  y = draw_info_boxes(doc,
    'Prepared For',
    [
      ['Client',  client && client.full_name],
      ['Email',   client && client.email],
      ['Phone',   client && client.phone],
      ['Project', proposal.project && proposal.project.name],
    ],
    'Proposal Details',
    [
      ['Ref #',   proposal.prop_number],
      ['Date',    fmt_date(proposal.created_at)],
      ['Status',  (proposal.status || '').toUpperCase()],
    ],
    y
  );

  // Title
  doc.fontSize(14).fillColor(color).font('Helvetica-Bold')
     .text(proposal.title || 'Proposal', 40, y + 10);
  y += 30;

  // Content
  if (proposal.content) {
    doc.fontSize(10).fillColor(DARK).font('Helvetica')
       .text(proposal.content, 40, y, { width: 515, lineGap: 4 });
    y = doc.y + 15;
  }

  if (proposal.notes) {
    y = draw_notes(doc, proposal.notes, y, color);
  }

  draw_footer(doc, brand);

  // ── Service Showcase Page (if services attached) ──────────────────────────
  const services = proposal.services || [];
  const services_with_images = services.filter(svc => svc && svc.media && svc.media.some(m => m.file_type === 'image'));

  if (services_with_images.length > 0) {
    doc.addPage();
    y = 40;

    doc.fontSize(16).fillColor(color).font('Helvetica-Bold')
       .text('OUR SERVICES', 40, y);
    doc.moveTo(40, y + 20).lineTo(555, y + 20).lineWidth(1.5).strokeColor(color).stroke();
    y += 35;

    for (const svc of services_with_images) {
      if (y + 180 > doc.page.height - 60) { doc.addPage(); y = 50; }

      doc.rect(40, y, 515, 4).fill(color);
      y += 10;

      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold')
         .text(svc.name || '—', 40, y, { width: 290 });
      y += 18;

      if (svc.description) {
        doc.fontSize(9).fillColor(GREY).font('Helvetica')
           .text(svc.description, 40, y, { width: 290 });
        y += 14;
      }

      // Draw first image from service media
      const first_img = svc.media.find(m => m.file_type === 'image');
      if (first_img && first_img.file_url) {
        const img_path = path.isAbsolute(first_img.file_url)
          ? first_img.file_url
          : path.join(__dirname, '..', first_img.file_url.replace(/^\//, ''));
        if (fs.existsSync(img_path)) {
          try {
            const img_y = y - 32;
            doc.image(img_path, 345, img_y, { width: 200, height: 130, fit: [200, 130] });
          } catch (_) {}
        }
      }

      y += 20;
      doc.moveTo(40, y).lineTo(555, y).lineWidth(0.4).strokeColor(LGREY).stroke();
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
  const doc    = new PDFDocument({ margin: 40, size: 'A4' });
  const buf    = to_buffer(doc);

  let y = draw_header(doc, brand, 'PORTFOLIO', portfolio.title || '');

  // Title + description
  doc.fontSize(16).fillColor(color).font('Helvetica-Bold')
     .text(portfolio.title || '', 40, y);
  y += 22;

  if (portfolio.description) {
    doc.fontSize(10).fillColor(GREY).font('Helvetica')
       .text(portfolio.description, 40, y, { width: 515, lineGap: 3 });
    y = doc.y + 15;
  }

  // Images (2 per row)
  const images = portfolio.images || [];
  const img_w  = 237;
  const img_h  = 160;
  let col = 0;

  for (const img of images) {
    const img_path = img.file_url
      ? path.join(__dirname, '..', img.file_url.replace(/^\//, ''))
      : null;
    if (!img_path || !fs.existsSync(img_path)) continue;

    try {
      const img_x = col === 0 ? 40 : 280;
      if (y + img_h > doc.page.height - 80) {
        doc.addPage();
        y = 40;
      }
      doc.image(img_path, img_x, y, { width: img_w, height: img_h, fit: [img_w, img_h] });
      col++;
      if (col >= 2) { col = 0; y += img_h + 10; }
    } catch (_) {}
  }

  draw_footer(doc, brand);
  doc.end();
  return buf;
};
