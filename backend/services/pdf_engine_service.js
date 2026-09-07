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
     .text(`This is a computer-generated document. | ${firm}`, 36, y + 6, { width: 523, align: 'center', lineBreak: false });
  // Reset Y cursor to avoid PDFKit adding a blank extra page after footer
  doc.y = y;
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
  const BOTTOM_SAFE = doc.page.height - 72; // leave room for footer

  // Helper: draw header row
  const draw_header_row = (at_y) => {
    doc.rect(xs, at_y, tot_w, head_h).fill(color);
    let cx = xs + 6;
    headers.forEach((h, i) => {
      doc.fontSize(8.5).fillColor(WHITE).font('Helvetica-Bold')
         .text(h, cx, at_y + 7, { width: col_widths[i] - 6, align: i >= 3 ? 'right' : 'left' });
      cx += col_widths[i];
    });
    return at_y + head_h;
  };

  y = draw_header_row(y);

  rows.forEach((row, ri) => {
    // Page break before row if it won't fit
    if (y + row_h > BOTTOM_SAFE) {
      doc.addPage();
      y = draw_header_row(48); // redraw header on new page
    }
    if (ri % 2 === 1) doc.rect(xs, y, tot_w, row_h).fill(BGALT);
    let rx = xs + 6;
    row.forEach((cell, ci) => {
      doc.fontSize(8.5).fillColor(DARK).font('Helvetica')
         .text(String(cell || ''), rx, y + 6, { width: col_widths[ci] - 6, align: ci >= 3 ? 'right' : 'left' });
      rx += col_widths[ci];
    });
    doc.moveTo(xs, y + row_h).lineTo(xs + tot_w, y + row_h).lineWidth(0.3).strokeColor(LGREY).stroke();
    y += row_h;
  });
  return y + 10;
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

  // ── Draw footer on current (bill) page, then start T&C on new page ────────
  draw_footer(doc, brand);
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
// 1. QUOTATION PDF  — Professional A4, max 2 pages
// ─────────────────────────────────────────────────────────────────────────────
exports.render_quotation_pdf = async (quotation) => {
  const brand    = await BrandTheme.findOne();
  const termsDoc = await TermsTemplate.findOne();
  await quotation.populate('items');

  const color  = brand_color(brand);
  const client = quotation.project && quotation.project.client;
  const items  = quotation.items || [];

  const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
  const buf = to_buffer(doc);

  const PW = 595, PH = 841.89;
  const ML = 36, MR = 36, MT = 0; // margins
  const CW = PW - ML - MR;        // content width = 523

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  const safe_text = (v) => (v === null || v === undefined || v === '') ? '—' : String(v);

  // Draw page 1 footer at fixed position — no cursor side-effects
  const draw_page_footer = (page_of) => {
    const fy = PH - 36;
    const firm = (brand && brand.firm_name) || 'The Design Space';
    doc.rect(0, fy - 4, PW, 40).fill('#F5F3EF');
    doc.moveTo(ML, fy - 4).lineTo(PW - MR, fy - 4).lineWidth(0.4).strokeColor(LGREY).stroke();
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
       .text(`This is a computer-generated document. | ${firm}`, ML, fy + 4,
             { width: CW - 60, align: 'center', lineBreak: false });
    if (page_of) {
      doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
         .text(page_of, PW - MR - 55, fy + 4, { width: 55, align: 'right', lineBreak: false });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 1 — HEADER
  // ─────────────────────────────────────────────────────────────────────────
  // Header band
  doc.rect(0, 0, PW, 100).fill('#FAFAF8');
  const logo_buf = get_logo_buffer(brand);
  if (logo_buf) {
    try { doc.image(logo_buf, ML, 14, { height: 64, fit: [70, 64] }); } catch (_) {}
  }
  const firm_name = (brand && brand.firm_name) || 'The Design Space';
  doc.fontSize(19).fillColor(color).font('Helvetica-Bold')
     .text(firm_name, 0, 22, { width: PW, align: 'center' });
  if (brand && brand.tagline) {
    doc.fontSize(8).fillColor(GREY).font('Helvetica')
       .text(brand.tagline, 0, 46, { width: PW, align: 'center' });
  }
  // Right: doc type
  doc.fontSize(22).fillColor(DARK).font('Helvetica-Bold')
     .text('QUOTATION', 360, 18, { width: 199, align: 'right' });
  doc.fontSize(9).fillColor(GREY).font('Helvetica')
     .text(`${quotation.quote_number}  v${quotation.version || 1}`, 360, 44, { width: 199, align: 'right' });

  // Status badge
  const status_str = (quotation.status || 'draft').toUpperCase();
  const status_color = quotation.status === 'approved' ? '#15803D'
                     : quotation.status === 'sent'     ? '#1D4ED8'
                     : quotation.status === 'rejected' ? '#B91C1C'
                     : color;
  doc.rect(360, 58, 199, 18).fill(status_color);
  doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold')
     .text(status_str, 360, 62, { width: 199, align: 'center' });

  // Gold divider
  doc.moveTo(ML, 100).lineTo(PW - MR, 100).lineWidth(1.5).strokeColor(color).stroke();

  let y = 110;

  // ─────────────────────────────────────────────────────────────────────────
  // INFO BOXES — Prepared For | Quotation Details
  // ─────────────────────────────────────────────────────────────────────────
  const BOX_LEFT_W = 248, BOX_RIGHT_W = 259;
  const BOX_LEFT_X = ML, BOX_RIGHT_X = ML + BOX_LEFT_W + 16;

  // Build left lines
  const left_data = [
    ['Client',   safe_text(client && client.full_name)],
    ['Email',    safe_text(client && client.email)],
    ['Phone',    safe_text(client && client.phone)],
    ['Address',  safe_text(client && (quotation.billing_address || client.billing_address || client.site_address))],
  ];
  if (client && client.gstin) left_data.push(['GSTIN', client.gstin]);
  left_data.push(['Project', safe_text(quotation.project && quotation.project.name)]);
  if (quotation.site_address && quotation.site_address !== (quotation.billing_address || '')) {
    left_data.push(['Site Addr', quotation.site_address]);
  }

  const right_data = [
    ['Ref #',       quotation.quote_number],
    ['Date',        fmt_date(quotation.created_at)],
    ['Valid Until', quotation.valid_until ? fmt_date(quotation.valid_until) : 'On request'],
    ['Version',     `v${quotation.version || 1}`],
    ['Status',      status_str],
  ];

  const ROW_H = 14;

  // Pre-calculate dynamic row heights for left box (multiline support for Address & Project)
  const left_row_heights_q = left_data.map(([, value]) => {
    doc.fontSize(7.5).font('Helvetica-Bold');
    const h = doc.heightOfString(String(value || '—'), { width: BOX_LEFT_W - 72 });
    return Math.max(ROW_H, h + 4);
  });
  const left_box_h_dyn  = left_row_heights_q.reduce((a, b) => a + b, 0) + 26;
  const right_box_h_dyn = right_data.length * ROW_H + 26;
  const box_h = Math.max(left_box_h_dyn, right_box_h_dyn);

  // Left box
  doc.rect(BOX_LEFT_X, y, BOX_LEFT_W, box_h).fillAndStroke(BGALT, LGREY).lineWidth(0.4);
  doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold')
     .text('PREPARED FOR', BOX_LEFT_X + 8, y + 7);
  doc.moveTo(BOX_LEFT_X + 8, y + 17).lineTo(BOX_LEFT_X + BOX_LEFT_W - 8, y + 17)
     .lineWidth(0.3).strokeColor(LGREY).stroke();
  let ly = y + 23;
  left_data.forEach(([label, value], idx) => {
    const rh = left_row_heights_q[idx];
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica').text(label + ':', BOX_LEFT_X + 8, ly, { width: 52 });
    doc.fontSize(7.5).fillColor(DARK).font('Helvetica-Bold')
       .text(value, BOX_LEFT_X + 64, ly, { width: BOX_LEFT_W - 72, lineBreak: true });
    ly += rh;
  });

  // Right box
  doc.rect(BOX_RIGHT_X, y, BOX_RIGHT_W, box_h).fillAndStroke(BGALT, LGREY).lineWidth(0.4);
  doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold')
     .text('QUOTATION DETAILS', BOX_RIGHT_X + 8, y + 7);
  doc.moveTo(BOX_RIGHT_X + 8, y + 17).lineTo(BOX_RIGHT_X + BOX_RIGHT_W - 8, y + 17)
     .lineWidth(0.3).strokeColor(LGREY).stroke();
  let ry = y + 23;
  right_data.forEach(([label, value]) => {
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica').text(label + ':', BOX_RIGHT_X + 8, ry, { width: 64 });
    doc.fontSize(7.5).fillColor(DARK).font('Helvetica-Bold')
       .text(safe_text(value), BOX_RIGHT_X + 76, ry, { width: BOX_RIGHT_W - 84, lineBreak: false });
    ry += ROW_H;
  });

  y += box_h + 12;

  // ─────────────────────────────────────────────────────────────────────────
  // SCOPE OF WORK TABLE
  // ─────────────────────────────────────────────────────────────────────────
  doc.fontSize(9).fillColor(color).font('Helvetica-Bold')
     .text('SCOPE OF WORK & PRICING', ML, y);
  doc.moveTo(ML, y + 12).lineTo(PW - MR, y + 12).lineWidth(0.8).strokeColor(color).stroke();
  y += 18;

  // Col widths — total = 523: # | Description | Category | Qty | Unit | Rate | Amount
  const CW_COLS = [22, 190, 70, 32, 38, 82, 89];
  const COL_HDR = ['#', 'Description / Service', 'Category', 'Qty', 'Unit', 'Rate (₹)', 'Amount (₹)'];

  const draw_table_header = (at_y) => {
    doc.rect(ML, at_y, CW, 20).fill(color);
    let cx = ML + 4;
    COL_HDR.forEach((h, i) => {
      doc.fontSize(7.5).fillColor(WHITE).font('Helvetica-Bold')
         .text(h, cx, at_y + 6, { width: CW_COLS[i] - 4, align: i >= 3 ? 'right' : 'left' });
      cx += CW_COLS[i];
    });
    return at_y + 20;
  };

  y = draw_table_header(y);

  const ITEM_ROW_H = 20;
  const FOOTER_SAFE = PH - 48; // don't cross into footer zone

  items.forEach((item, ri) => {
    if (y + ITEM_ROW_H > FOOTER_SAFE - 80) {
      draw_page_footer('Page 1 of 2');
      doc.addPage();
      y = 48;
      y = draw_table_header(y);
    }
    if (ri % 2 === 1) doc.rect(ML, y, CW, ITEM_ROW_H).fill(BGALT);
    let rx = ML + 4;
    const cells = [
      String(ri + 1),
      item.description || '—',
      item.category    || '',
      String(item.quantity || 1),
      item.unit || '',
      Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      Number(item.amount || (item.quantity * item.rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    ];
    cells.forEach((cell, ci) => {
      doc.fontSize(8).fillColor(DARK).font('Helvetica')
         .text(cell, rx, y + 6, { width: CW_COLS[ci] - 4, align: ci >= 3 ? 'right' : 'left',
                                   lineBreak: false, ellipsis: ci === 1 ? true : false });
      rx += CW_COLS[ci];
    });
    doc.moveTo(ML, y + ITEM_ROW_H).lineTo(PW - MR, y + ITEM_ROW_H)
       .lineWidth(0.25).strokeColor(LGREY).stroke();
    y += ITEM_ROW_H;
  });
  y += 6;

  // ─────────────────────────────────────────────────────────────────────────
  // TOTALS — right-aligned block (width 230)
  // ─────────────────────────────────────────────────────────────────────────
  const hasGST = (quotation.cgst_amount > 0) || (quotation.sgst_amount > 0) || (quotation.igst_amount > 0);
  const t_rows = [];
  t_rows.push(['Subtotal', INR(quotation.subtotal)]);
  if (quotation.discount_amount > 0) {
    const d_label = quotation.discount_type === 'percentage'
      ? `Discount (${quotation.discount_value}%)`
      : 'Discount';
    t_rows.push([d_label, `- ${INR(quotation.discount_amount)}`]);
  }
  if (hasGST) t_rows.push(['Taxable Amount', INR(quotation.taxable_amount)]);
  if (quotation.cgst_amount > 0) t_rows.push([`CGST @ ${quotation.cgst_rate}%`, INR(quotation.cgst_amount)]);
  if (quotation.sgst_amount > 0) t_rows.push([`SGST @ ${quotation.sgst_rate}%`, INR(quotation.sgst_amount)]);
  if (quotation.igst_amount > 0) t_rows.push([`IGST @ ${quotation.igst_rate}%`, INR(quotation.igst_amount)]);

  const T_X = ML + CW - 230, T_W = 230;
  const T_ROW_H = 16;
  const grand_box_h = 24;
  const totals_block_h = t_rows.length * T_ROW_H + grand_box_h + 4;

  // Ensure totals fit on this page
  if (y + totals_block_h > FOOTER_SAFE - 10) {
    draw_page_footer('Page 1 of 2');
    doc.addPage();
    y = 48;
  }

  let ty = y;
  t_rows.forEach(([label, value]) => {
    doc.fontSize(8.5).fillColor(GREY).font('Helvetica')
       .text(label, T_X, ty, { width: T_W - 90 });
    doc.fontSize(8.5).fillColor(DARK).font('Helvetica-Bold')
       .text(value, T_X + T_W - 90, ty, { width: 86, align: 'right' });
    doc.moveTo(T_X, ty + T_ROW_H - 2).lineTo(T_X + T_W, ty + T_ROW_H - 2)
       .lineWidth(0.25).strokeColor(LGREY).stroke();
    ty += T_ROW_H;
  });
  // Grand total bar
  doc.rect(T_X, ty, T_W, grand_box_h).fill(color);
  doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
     .text('Grand Total', T_X + 6, ty + 7, { width: T_W - 90 });
  doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
     .text(INR(quotation.grand_total), T_X + T_W - 90, ty + 7, { width: 84, align: 'right' });
  y = ty + grand_box_h + 10;

  // ─────────────────────────────────────────────────────────────────────────
  // NOTES (if any)
  // ─────────────────────────────────────────────────────────────────────────
  if (quotation.notes) {
    const notes_h = Math.max(32, doc.heightOfString(quotation.notes, { width: CW - 16 }) + 18);
    if (y + notes_h < FOOTER_SAFE - 10) {
      doc.rect(ML, y, 3, notes_h).fill(color);
      doc.rect(ML + 3, y, CW - 3, notes_h).fill(BGALT);
      doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold').text('NOTES', ML + 10, y + 6);
      doc.fontSize(8).fillColor(DARK).font('Helvetica')
         .text(quotation.notes, ML + 10, y + 16, { width: CW - 18 });
      y += notes_h + 8;
    }
  }

  // Determine total pages BEFORE drawing any footer
  const with_img = (quotation.items || []).filter(it => it.service_image_url);
  const total_pages = with_img.length > 0 ? 3 : 2;

  // Footer on page 1
  draw_page_footer(`Page 1 of ${total_pages}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 2 — TERMS & CONDITIONS (premium design)
  // ─────────────────────────────────────────────────────────────────────────
  doc.addPage();

  const q_terms_text = (termsDoc && termsDoc.quotation_terms)
    || '1. This quotation is valid until the date mentioned above.\n2. 50% advance payment required to commence work.\n3. Balance payment due before final handover.\n4. Any changes to scope may result in revised quotation.\n5. All prices are inclusive of taxes as applicable.';

  const q_lines = q_terms_text.split('\n').filter(l => l.trim());

  // Page background
  doc.rect(0, 0, PW, PH).fill('#FDFCFB');
  // Left accent bar
  doc.rect(0, 0, 5, PH - 40).fill(color);
  // Header band
  doc.rect(0, 0, PW, 50).fill(color);
  doc.fontSize(15).fillColor(WHITE).font('Helvetica-Bold')
     .text('TERMS & CONDITIONS', 22, 15, { width: PW - 44 });
  doc.fontSize(7.5).fillColor('rgba(255,255,255,0.75)').font('Helvetica')
     .text(firm_name, 22, 34, { width: PW - 44 });

  let ty2 = 62;
  doc.fontSize(7.5).fillColor('#9A8F82').font('Helvetica-Oblique')
     .text('Please read the following terms carefully. These terms govern the services provided under this quotation.', 22, ty2, { width: PW - 44 });
  ty2 += 16;
  doc.moveTo(22, ty2).lineTo(PW - 22, ty2).lineWidth(0.4).strokeColor('#E0D8CE').stroke();
  ty2 += 8;

  const TERM_TXT_X = 22 + 20, TERM_TXT_W = PW - TERM_TXT_X - 22;
  const TERM_BOTTOM = PH - 90; // leave room for acceptance section + footer

  q_lines.forEach((line, i) => {
    const clean = line.replace(/^\d+\.\s*/, '').trim();
    const num   = String(i + 1) + '.';
    doc.fontSize(8).font('Helvetica');
    const textH = doc.heightOfString(clean, { width: TERM_TXT_W });
    const rowH  = Math.max(textH, 11) + 4;

    if (ty2 + rowH > TERM_BOTTOM) {
      // If overflow, just stop — all 12 terms fit on A4 with 8pt font
      return;
    }

    if (i % 2 === 0) {
      doc.rect(20, ty2 - 1, PW - 42, rowH + 2).fill('#F5F1EB');
    }
    doc.fontSize(7.5).fillColor(color).font('Helvetica-Bold')
       .text(num, 22, ty2 + 1, { width: 16, align: 'right' });
    doc.fontSize(8).fillColor('#2C2520').font('Helvetica')
       .text(clean, TERM_TXT_X, ty2, { width: TERM_TXT_W, lineGap: 1 });
    ty2 += rowH;
  });

  // ── Acceptance / Approval section ────────────────────────────────────────
  ty2 = Math.max(ty2 + 12, PH - 155);

  doc.moveTo(22, ty2).lineTo(PW - 22, ty2).lineWidth(0.4).strokeColor('#E0D8CE').stroke();
  ty2 += 10;

  doc.fontSize(8.5).fillColor(color).font('Helvetica-Bold')
     .text('ACCEPTANCE & AUTHORISATION', 22, ty2);
  ty2 += 14;
  doc.fontSize(8).fillColor(GREY).font('Helvetica')
     .text('By signing below, the client confirms acceptance of all terms, scope and pricing mentioned in this quotation.', 22, ty2, { width: PW - 44 });
  ty2 += 18;

  // Signature boxes
  const SIG_W = 220, SIG_H = 44;
  const sig1_x = 22, sig2_x = PW - 22 - SIG_W;

  [[sig1_x, 'Client Signature / Stamp'], [sig2_x, 'Authorised Signatory']].forEach(([sx, label]) => {
    doc.rect(sx, ty2, SIG_W, SIG_H).fillAndStroke('#FAFAF8', LGREY).lineWidth(0.4);
    doc.fontSize(7).fillColor(GREY).font('Helvetica').text(label, sx + 6, ty2 + 4);
    // Signature line
    doc.moveTo(sx + 10, ty2 + SIG_H - 8).lineTo(sx + SIG_W - 10, ty2 + SIG_H - 8)
       .lineWidth(0.4).strokeColor(LGREY).stroke();
  });

  // Date line below signature boxes
  doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
     .text('Date: ___________________________', 22, ty2 + SIG_H + 6);
  doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
     .text(`Ref: ${quotation.quote_number}  |  Generated: ${fmt_date(new Date())}`,
           PW - 22 - 200, ty2 + SIG_H + 6, { width: 200, align: 'right' });

  // Footer on page 2
  const fy2 = PH - 36;
  doc.rect(0, fy2 - 4, PW, 40).fill('#F5F3EF');
  doc.moveTo(ML, fy2 - 4).lineTo(PW - MR, fy2 - 4).lineWidth(0.4).strokeColor(LGREY).stroke();
  doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
     .text(`This is a computer-generated document. | ${firm_name}`,
           ML, fy2 + 4, { width: CW - 60, align: 'center', lineBreak: false });
  doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
     .text(`Page 2 of ${total_pages}`, PW - MR - 55, fy2 + 4, { width: 55, align: 'right', lineBreak: false });

  // ─────────────────────────────────────────────────────────────────────────
  // SERVICE SHOWCASE (page 3+ only if service images exist)
  // ─────────────────────────────────────────────────────────────────────────
  if (with_img.length > 0) {
    doc.addPage();
    let sy = 40;
    let showcase_page = 3;
    doc.fontSize(14).fillColor(color).font('Helvetica-Bold').text('SERVICE SHOWCASE', ML, sy);
    doc.moveTo(ML, sy + 18).lineTo(PW - MR, sy + 18).lineWidth(1).strokeColor(color).stroke();
    sy += 28;
    for (const item of with_img) {
      if (sy + 180 > PH - 60) {
        // Footer before adding new page
        const sfy_break = PH - 36;
        doc.rect(0, sfy_break - 4, PW, 40).fill('#F5F3EF');
        doc.moveTo(ML, sfy_break - 4).lineTo(PW - MR, sfy_break - 4).lineWidth(0.4).strokeColor(LGREY).stroke();
        doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
           .text(`This is a computer-generated document. | ${firm_name}`,
                 ML, sfy_break + 4, { width: CW, align: 'center', lineBreak: false });
        doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
           .text(`Page ${showcase_page} of ${total_pages + (showcase_page - 3)}`, PW - MR - 55, sfy_break + 4, { width: 55, align: 'right', lineBreak: false });
        doc.addPage();
        showcase_page++;
        sy = 50;
      }
      doc.rect(ML, sy, CW, 3).fill(color); sy += 8;
      doc.fontSize(12).fillColor(DARK).font('Helvetica-Bold')
         .text(item.description || '—', ML, sy, { width: 280 }); sy += 16;
      if (item.category) {
        doc.fontSize(8).fillColor(color).font('Helvetica-Bold')
           .text(item.category.toUpperCase(), ML, sy); sy += 12;
      }
      doc.fontSize(9).fillColor(GREY).font('Helvetica')
         .text(`Qty: ${item.quantity} ${item.unit || ''}  |  Rate: ${INR(item.rate)}  |  Amount: ${INR(item.amount || item.quantity * item.rate)}`, ML, sy, { width: 280 });
      sy += 14;
      if (item.service_image_url) {
        // Support both absolute paths and relative paths (uploads/services/...)
        const raw = item.service_image_url;
        const ip = path.isAbsolute(raw)
          ? raw
          : path.join(__dirname, '..', raw.replace(/^\//, ''));
        if (fs.existsSync(ip)) {
          try { doc.image(ip, 330, sy - 42, { width: 193, height: 120, fit: [193, 120] }); } catch (_) {}
        }
      }
      sy += 18;
      doc.moveTo(ML, sy).lineTo(PW - MR, sy).lineWidth(0.3).strokeColor(LGREY).stroke();
      sy += 14;
    }
    // Footer on last showcase page
    const sfy = PH - 36;
    doc.rect(0, sfy - 4, PW, 40).fill('#F5F3EF');
    doc.moveTo(ML, sfy - 4).lineTo(PW - MR, sfy - 4).lineWidth(0.4).strokeColor(LGREY).stroke();
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
       .text(`This is a computer-generated document. | ${firm_name}`,
             ML, sfy + 4, { width: CW, align: 'center', lineBreak: false });
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
       .text(`Page ${showcase_page} of ${showcase_page}`, PW - MR - 55, sfy + 4, { width: 55, align: 'right', lineBreak: false });
  }

  doc.end();
  return buf;
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. INVOICE PDF  — Professional A4, max 2 pages
// ─────────────────────────────────────────────────────────────────────────────
exports.render_invoice_pdf = async (invoice) => {
  const brand      = await BrandTheme.findOne();
  const bank       = await BankDetails.findOne();
  const termsDoc   = await TermsTemplate.findOne();
  const PaymentRecord = require('../models/payment_record');
  await invoice.populate('items');

  // Fetch payment records
  const payments = await PaymentRecord.find({ invoice: invoice._id }).sort({ payment_date: 1 }).lean();

  const color = brand_color(brand);
  const firm_name = (brand && brand.firm_name) || 'The Design Space';

  // ── Resolve client — may be on invoice.project.client or snapshot ────────
  const client = invoice.project && invoice.project.client
                 ? invoice.project.client
                 : null;
  const client_name    = (client && client.full_name)  || invoice.client_name_snapshot  || '—';
  const client_email   = (client && client.email)      || '—';
  const client_phone   = (client && client.phone)      || '—';
  const client_address = invoice.billing_address
                      || (client && (client.billing_address || client.site_address))
                      || '—';
  const client_gstin   = client && client.gstin ? client.gstin : null;
  const project_name   = (invoice.project && invoice.project.name)
                      || invoice.project_name_snapshot || '—';

  // ── Page constants ────────────────────────────────────────────────────────
  const PW = 595, PH = 841.89;
  const ML = 36, MR = 36;
  const CW = PW - ML - MR; // 523

  const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
  const buf = to_buffer(doc);

  // ── Page-number aware footer ───────────────────────────────────────────────
  let _page_num = 1;
  const draw_inv_footer = (page_of) => {
    const fy = PH - 36;
    doc.rect(0, fy - 4, PW, 40).fill('#F5F3EF');
    doc.moveTo(ML, fy - 4).lineTo(PW - MR, fy - 4).lineWidth(0.4).strokeColor(LGREY).stroke();
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
       .text(`This is a computer-generated document. | ${firm_name}`,
             ML, fy + 4, { width: CW - 60, align: 'center', lineBreak: false });
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
       .text(page_of, PW - MR - 55, fy + 4, { width: 55, align: 'right', lineBreak: false });
    doc.y = fy;
  };

  const FOOTER_SAFE = PH - 48;

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 1 — HEADER
  // ─────────────────────────────────────────────────────────────────────────
  doc.rect(0, 0, PW, 100).fill('#FAFAF8');

  const logo_buf = get_logo_buffer(brand);
  if (logo_buf) {
    try { doc.image(logo_buf, ML, 14, { height: 64, fit: [70, 64] }); } catch (_) {}
  }
  doc.fontSize(19).fillColor(color).font('Helvetica-Bold')
     .text(firm_name, 0, 22, { width: PW, align: 'center' });
  if (brand && brand.tagline) {
    doc.fontSize(8).fillColor(GREY).font('Helvetica')
       .text(brand.tagline, 0, 46, { width: PW, align: 'center' });
  }
  doc.fontSize(22).fillColor(DARK).font('Helvetica-Bold')
     .text('INVOICE', 360, 18, { width: 199, align: 'right' });
  doc.fontSize(9).fillColor(GREY).font('Helvetica')
     .text(invoice.invoice_number || '', 360, 44, { width: 199, align: 'right' });

  // Status badge
  const status_str = (invoice.status || 'draft').toUpperCase();
  const sc = invoice.status === 'paid'     ? '#15803D'
           : invoice.status === 'overdue'  ? '#B91C1C'
           : invoice.status === 'issued'   ? '#1D4ED8'
           : invoice.status === 'partial'  ? '#92400E'
           : color;
  doc.rect(360, 58, 199, 18).fill(sc);
  doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold')
     .text(status_str, 360, 62, { width: 199, align: 'center' });

  doc.moveTo(ML, 100).lineTo(PW - MR, 100).lineWidth(1.5).strokeColor(color).stroke();
  let y = 110;

  // ─────────────────────────────────────────────────────────────────────────
  // INFO BOXES — Bill To | Invoice Details
  // ─────────────────────────────────────────────────────────────────────────
  const BOX_L_W = 248, BOX_R_W = 259;
  const BOX_L_X = ML,  BOX_R_X = ML + BOX_L_W + 16;
  const ROW_H = 14;

  const left_rows = [
    ['Client',  client_name],
    ['Email',   client_email],
    ['Phone',   client_phone],
    ['Address', client_address],
  ];
  if (client_gstin) left_rows.push(['GSTIN', client_gstin]);
  left_rows.push(['Project', project_name]);

  // Invoice detail rows (right box)
  const milestone_label_str = (() => {
    if (invoice.invoice_type === 'full') return null;
    if (!invoice.milestone_label) return null;
    const fixedAmt = invoice.milestone_fixed_amount;
    return fixedAmt && fixedAmt > 0
      ? `${invoice.milestone_label} (${INR(fixedAmt)})`
      : `${invoice.milestone_label} (${invoice.milestone_percentage}%)`;
  })();

  const right_rows = [
    ['Invoice #',    invoice.invoice_number],
    ['Invoice Date', fmt_date(invoice.invoice_date)],
    ['Due Date',     fmt_date(invoice.due_date)],
    ['Type',         (invoice.invoice_type || 'full').toUpperCase()],
  ];
  if (milestone_label_str) right_rows.push(['Milestone', milestone_label_str]);
  right_rows.push(['Status', status_str]);

  // Pre-calculate dynamic row heights for left box (multiline support for Address & Project)
  const left_row_heights_inv = left_rows.map(([, value]) => {
    doc.fontSize(7.5).font('Helvetica-Bold');
    const h = doc.heightOfString(String(value || '—'), { width: BOX_L_W - 72 });
    return Math.max(ROW_H, h + 4);
  });
  const left_box_h_dyn  = left_row_heights_inv.reduce((a, b) => a + b, 0) + 26;
  const right_box_h_dyn = right_rows.length * ROW_H + 26;
  const box_h = Math.max(left_box_h_dyn, right_box_h_dyn);

  // Draw left box
  doc.rect(BOX_L_X, y, BOX_L_W, box_h).fillAndStroke(BGALT, LGREY).lineWidth(0.4);
  doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold')
     .text('BILL TO', BOX_L_X + 8, y + 7);
  doc.moveTo(BOX_L_X + 8, y + 17).lineTo(BOX_L_X + BOX_L_W - 8, y + 17)
     .lineWidth(0.3).strokeColor(LGREY).stroke();
  let ly = y + 23;
  left_rows.forEach(([label, value], idx) => {
    const rh = left_row_heights_inv[idx];
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica').text(label + ':', BOX_L_X + 8, ly, { width: 52 });
    doc.fontSize(7.5).fillColor(DARK).font('Helvetica-Bold')
       .text(String(value || '—'), BOX_L_X + 64, ly, { width: BOX_L_W - 72, lineBreak: true });
    ly += rh;
  });

  // Draw right box
  doc.rect(BOX_R_X, y, BOX_R_W, box_h).fillAndStroke(BGALT, LGREY).lineWidth(0.4);
  doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold')
     .text('INVOICE DETAILS', BOX_R_X + 8, y + 7);
  doc.moveTo(BOX_R_X + 8, y + 17).lineTo(BOX_R_X + BOX_R_W - 8, y + 17)
     .lineWidth(0.3).strokeColor(LGREY).stroke();
  let ry = y + 23;
  right_rows.forEach(([label, value]) => {
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica').text(label + ':', BOX_R_X + 8, ry, { width: 70 });
    doc.fontSize(7.5).fillColor(DARK).font('Helvetica-Bold')
       .text(String(value || '—'), BOX_R_X + 82, ry, { width: BOX_R_W - 90, lineBreak: false });
    ry += ROW_H;
  });

  y += box_h + 12;

  // ─────────────────────────────────────────────────────────────────────────
  // LINE ITEMS TABLE
  // ─────────────────────────────────────────────────────────────────────────
  const items = invoice.items || [];
  const is_milestone = invoice.invoice_type !== 'full'
                    && invoice.milestone_percentage > 0
                    && invoice.milestone_percentage < 100;

  // Col layout
  const is_direct = !invoice.quotation; // direct invoice has no quotation link
  const COL_W = is_milestone
    ? [22, 270, 50, 55, 126]    // milestone: # | Description | Qty | Unit | Amount Due
    : [22, 200, 50, 55, 98, 98]; // standard:  # | Description | Qty | Unit | Rate | Amount

  const COL_H_labels = is_milestone
    ? ['#', 'Description', 'Qty', 'Unit', 'Amount Due']
    : ['#', 'Description', 'Qty', 'Unit', 'Rate', 'Amount'];

  doc.fontSize(9).fillColor(color).font('Helvetica-Bold').text('LINE ITEMS', ML, y);
  doc.moveTo(ML, y + 12).lineTo(PW - MR, y + 12).lineWidth(0.8).strokeColor(color).stroke();
  y += 18;

  const TROW_H = 20;

  const draw_tbl_header = (at_y) => {
    doc.rect(ML, at_y, CW, 20).fill(color);
    let cx = ML + 4;
    COL_H_labels.forEach((h, i) => {
      const align = i >= (is_milestone ? 2 : 2) ? 'right' : 'left';
      doc.fontSize(7.5).fillColor(WHITE).font('Helvetica-Bold')
         .text(h, cx, at_y + 6, { width: COL_W[i] - 4, align: i < 2 ? 'left' : 'right' });
      cx += COL_W[i];
    });
    return at_y + 20;
  };

  y = draw_tbl_header(y);

  items.forEach((item, ri) => {
    if (y + TROW_H > FOOTER_SAFE - 80) {
      draw_inv_footer('Page 1 of 2');
      doc.addPage();
      y = 48;
      y = draw_tbl_header(y);
    }
    if (ri % 2 === 1) doc.rect(ML, y, CW, TROW_H).fill(BGALT);

    let rx = ML + 4;
    const cells = is_milestone
      ? [
          String(ri + 1),
          item.description || '—',
          String(item.quantity || 1),
          item.unit || '',
          Number(item.amount || item.quantity * item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        ]
      : [
          String(ri + 1),
          item.description || '—',
          String(item.quantity || 1),
          item.unit || '',
          Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          Number(item.amount || item.quantity * item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        ];

    cells.forEach((cell, ci) => {
      doc.fontSize(8).fillColor(DARK).font('Helvetica')
         .text(cell, rx, y + 6,
               { width: COL_W[ci] - 4, align: ci < 2 ? 'left' : 'right',
                 lineBreak: false, ellipsis: ci === 1 });
      rx += COL_W[ci];
    });
    doc.moveTo(ML, y + TROW_H).lineTo(PW - MR, y + TROW_H)
       .lineWidth(0.25).strokeColor(LGREY).stroke();
    y += TROW_H;
  });

  // ── Milestone breakdown note ──────────────────────────────────────────────
  if (is_milestone) {
    y += 4;
    const quot_total = invoice.subtotal && invoice.milestone_percentage > 0
      ? Math.round((invoice.subtotal / (invoice.milestone_percentage / 100)) * 100) / 100
      : 0;
    const breakdown_lines = [
      `Total Project Value: ${INR(quot_total > 0 ? quot_total : invoice.subtotal)}`,
      `This Invoice: ${invoice.milestone_label || invoice.invoice_type} @ ${invoice.milestone_percentage}%`,
      `Amount Due This Invoice: ${INR(invoice.grand_total)}`,
    ];
    const bh = 16 + breakdown_lines.length * 13;
    doc.rect(ML, y, 4, bh).fill(color);
    doc.rect(ML + 4, y, CW - 4, bh).fill('#FDF3E3');
    doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold').text('MILESTONE BREAKDOWN', ML + 10, y + 5);
    breakdown_lines.forEach((line, li) => {
      doc.fontSize(8).fillColor(DARK).font('Helvetica').text(line, ML + 10, y + 16 + li * 13);
    });
    y += bh + 6;
  }

  y += 4;

  // ─────────────────────────────────────────────────────────────────────────
  // TOTALS — right-aligned
  // ─────────────────────────────────────────────────────────────────────────
  const hasGST = (invoice.cgst_amount > 0) || (invoice.sgst_amount > 0) || (invoice.igst_amount > 0);
  const tl = [['Subtotal', INR(invoice.subtotal)]];
  if (invoice.discount_amount > 0) tl.push(['Discount', `- ${INR(invoice.discount_amount)}`]);
  if (hasGST) tl.push(['Taxable Amount', INR(invoice.taxable_amount)]);
  if (invoice.cgst_amount > 0) tl.push([`CGST @ ${Number(invoice.cgst_rate || 0)}%`, INR(invoice.cgst_amount)]);
  if (invoice.sgst_amount > 0) tl.push([`SGST @ ${Number(invoice.sgst_rate || 0)}%`, INR(invoice.sgst_amount)]);
  if (invoice.igst_amount > 0) tl.push([`IGST @ ${Number(invoice.igst_rate || 0)}%`, INR(invoice.igst_amount)]);
  if (hasGST) tl.push(['Total Tax', INR(invoice.total_tax)]);

  const T_X = ML + CW - 230, T_W = 230, T_ROW_H = 16, GT_H = 24;
  const totals_h = tl.length * T_ROW_H + GT_H + 4;

  if (y + totals_h > FOOTER_SAFE - 20) {
    draw_inv_footer('Page 1 of 2');
    doc.addPage();
    y = 48;
  }

  let ty = y;
  tl.forEach(([label, value]) => {
    doc.fontSize(8.5).fillColor(GREY).font('Helvetica').text(label, T_X, ty, { width: T_W - 90 });
    doc.fontSize(8.5).fillColor(DARK).font('Helvetica-Bold')
       .text(value, T_X + T_W - 90, ty, { width: 86, align: 'right' });
    doc.moveTo(T_X, ty + T_ROW_H - 2).lineTo(T_X + T_W, ty + T_ROW_H - 2)
       .lineWidth(0.25).strokeColor(LGREY).stroke();
    ty += T_ROW_H;
  });
  doc.rect(T_X, ty, T_W, GT_H).fill(color);
  doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
     .text('Grand Total', T_X + 6, ty + 7, { width: T_W - 90 });
  doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
     .text(INR(invoice.grand_total), T_X + T_W - 90, ty + 7, { width: 84, align: 'right' });
  y = ty + GT_H + 6;

  // ── Amount Paid / Balance Due ─────────────────────────────────────────────
  if (invoice.amount_paid > 0 || payments.length > 0) {
    const totalPaid  = payments.length > 0
      ? payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0)
      : Number(invoice.amount_paid || 0);
    const balanceDue = Math.max(0, Number(invoice.grand_total) - totalPaid);
    const bdColor    = balanceDue <= 0 ? '#15803D' : '#C0392B';

    doc.rect(T_X, y, T_W, 18).fill('#ECFDF5');
    doc.fontSize(8.5).fillColor('#15803D').font('Helvetica-Bold')
       .text('Amount Paid', T_X + 6, y + 4, { width: T_W - 90 });
    doc.fontSize(8.5).fillColor('#15803D').font('Helvetica-Bold')
       .text(`- ${INR(totalPaid)}`, T_X + T_W - 90, y + 4, { width: 84, align: 'right' });
    y += 18;

    doc.rect(T_X, y, T_W, 20).fill(balanceDue <= 0 ? '#ECFDF5' : '#FEF2F2');
    doc.fontSize(9).fillColor(bdColor).font('Helvetica-Bold')
       .text('Balance Due', T_X + 6, y + 5, { width: T_W - 90 });
    doc.fontSize(9).fillColor(bdColor).font('Helvetica-Bold')
       .text(balanceDue <= 0 ? 'FULLY PAID ✓' : INR(balanceDue),
             T_X + T_W - 90, y + 5, { width: 84, align: 'right' });
    y += 24;
  }

  // ── Payment History ───────────────────────────────────────────────────────
  if (payments.length > 0) {
    y += 6;
    const needed = payments.length * 20 + 52;
    if (y + needed > FOOTER_SAFE - 20) {
      draw_inv_footer('Page 1 of 2');
      doc.addPage();
      y = 48;
    }
    doc.rect(ML, y, 4, 18).fill(color);
    doc.rect(ML + 4, y, CW - 4, 18).fill(BGALT);
    doc.fontSize(8.5).fillColor(GREY).font('Helvetica-Bold').text('PAYMENT HISTORY', ML + 10, y + 5);
    y += 18;

    const ph_cols = [28, 88, 96, 96, 108, 107];
    const ph_hdrs = ['#', 'Date', 'Mode', 'Reference', 'Amount', 'Cumulative'];
    doc.rect(ML, y, CW, 18).fill(color);
    let phx = ML + 4;
    ph_hdrs.forEach((h, i) => {
      doc.fontSize(7.5).fillColor(WHITE).font('Helvetica-Bold')
         .text(h, phx, y + 5, { width: ph_cols[i] - 4, align: i >= 4 ? 'right' : 'left' });
      phx += ph_cols[i];
    });
    y += 18;

    const MODE_LABELS = { bank_transfer:'Bank Transfer', upi:'UPI', cheque:'Cheque', cash:'Cash', neft:'NEFT/RTGS', other:'Other' };
    let cumulative = 0;
    payments.forEach((pmt, pi) => {
      const rowH = 18;
      if (pi % 2 === 1) doc.rect(ML, y, CW, rowH).fill(BGALT);
      cumulative += Number(pmt.amount_paid || 0);
      const cells = [
        String(pi + 1), fmt_date(pmt.payment_date),
        MODE_LABELS[pmt.payment_mode] || pmt.payment_mode || '—',
        pmt.reference_number || '—',
        INR(pmt.amount_paid), INR(cumulative),
      ];
      let px = ML + 4;
      cells.forEach((cell, ci) => {
        doc.fontSize(8).fillColor(DARK).font('Helvetica')
           .text(cell, px, y + 4, { width: ph_cols[ci] - 4, align: ci >= 4 ? 'right' : 'left', lineBreak: false });
        px += ph_cols[ci];
      });
      doc.moveTo(ML, y + rowH).lineTo(PW - MR, y + rowH).lineWidth(0.25).strokeColor(LGREY).stroke();
      y += rowH;
    });
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0);
    doc.rect(ML, y, CW, 20).fill(GREEN);
    doc.fontSize(8.5).fillColor(WHITE).font('Helvetica-Bold').text('Total Collected', ML + 8, y + 6, { width: 380 });
    doc.fontSize(8.5).fillColor(WHITE).font('Helvetica-Bold')
       .text(INR(totalPaid), ML + 388, y + 6, { width: CW - 396, align: 'right' });
    y += 22;
  }

  // ── Bank Details ──────────────────────────────────────────────────────────
  if (bank && (bank.bank_name || bank.account_number)) {
    y += 8;
    const bl = [['Bank', bank.bank_name], ['Account', bank.account_number],
                ['IFSC', bank.ifsc_code],  ['UPI', bank.upi_id]].filter(([, v]) => v);
    const bh = bl.length * 13 + 22;
    if (y + bh > FOOTER_SAFE - 20) {
      draw_inv_footer('Page 1 of 2');
      doc.addPage();
      y = 48;
    }
    doc.rect(ML, y, 4, bh).fill(color);
    doc.rect(ML + 4, y, CW - 4, bh).fill(BGALT);
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica-Bold').text('BANK DETAILS', ML + 10, y + 6);
    let by = y + 18;
    bl.forEach(([label, value]) => {
      doc.fontSize(8.5).fillColor(GREY).font('Helvetica').text(`${label}:`, ML + 10, by);
      doc.fontSize(8.5).fillColor(DARK).font('Helvetica-Bold').text(value, ML + 75, by);
      by += 13;
    });
    y = by + 8;
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    const nh = Math.max(30, doc.heightOfString(invoice.notes, { width: CW - 14 }) + 18);
    if (y + nh < FOOTER_SAFE - 10) {
      doc.rect(ML, y, 3, nh).fill(color);
      doc.rect(ML + 3, y, CW - 3, nh).fill(BGALT);
      doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold').text('NOTES', ML + 9, y + 6);
      doc.fontSize(8).fillColor(DARK).font('Helvetica')
         .text(invoice.notes, ML + 9, y + 16, { width: CW - 14 });
      y += nh + 6;
    }
  }

  // Footer on page 1
  draw_inv_footer('Page 1 of 2');

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 2 — TERMS & CONDITIONS
  // ─────────────────────────────────────────────────────────────────────────
  doc.addPage();

  const i_terms = (termsDoc && termsDoc.invoice_terms) ||
    '1. This invoice covers only the services specifically mentioned herein and/or in the approved quotation/proposal. Any additional services shall be charged separately.\n2. Payment shall be made within the due date mentioned on the invoice. Delay in payment may result in suspension of services and/or corresponding extension of the project timeline.\n3. The quoted fee includes only the agreed scope of work. Additional revisions, changes in requirements, or work outside the approved scope may attract additional charges.\n4. Project timelines are subject to timely receipt of required information, approvals, drawings, selections and decisions from the client.\n5. All drawings, designs, concepts, 3D views, specifications and related documents prepared by The Design Space remain its intellectual property unless otherwise agreed in writing.\n6. Design documents shall be used only for the project for which they are issued and shall not be reproduced, modified or reused for another project without written permission.\n7. Any additional site visits, travel, statutory approvals, specialist consultants, testing, printing or third-party expenses not specifically included in the agreed scope shall be charged separately.\n8. Design and execution decisions are based on the information and site conditions available at the time. Unforeseen site conditions or changes by other agencies may require additional work and charges.\n9. Applicable GST and other statutory taxes/charges shall be levied as per prevailing regulations.\n10. In case of cancellation or termination of the project, fees for all services completed or work in progress up to the date of termination shall remain payable.\n11. Any invoice-related discrepancy should be communicated within 7 days of receipt of the invoice.\n12. This invoice shall be read together with the approved quotation/proposal/agreement governing the project. In case of conflict, the terms of the signed agreement shall prevail.';

  const t_lines = i_terms.split('\n').filter(l => l.trim());

  // Page background
  doc.rect(0, 0, PW, PH).fill('#FDFCFB');
  doc.rect(0, 0, 5, PH - 40).fill(color);
  doc.rect(0, 0, PW, 50).fill(color);
  doc.fontSize(15).fillColor(WHITE).font('Helvetica-Bold')
     .text('TERMS & CONDITIONS', 22, 15, { width: PW - 44 });
  doc.fontSize(7.5).fillColor('rgba(255,255,255,0.75)').font('Helvetica')
     .text(firm_name, 22, 34, { width: PW - 44 });

  let ty2 = 62;
  doc.fontSize(7.5).fillColor('#9A8F82').font('Helvetica-Oblique')
     .text('Please read the following terms carefully. These terms govern the services provided under this invoice.',
           22, ty2, { width: PW - 44 });
  ty2 += 16;
  doc.moveTo(22, ty2).lineTo(PW - 22, ty2).lineWidth(0.4).strokeColor('#E0D8CE').stroke();
  ty2 += 8;

  const TERM_X = 22 + 20, TERM_W = PW - TERM_X - 22;
  const TERM_BOTTOM = PH - 50;

  t_lines.forEach((line, i) => {
    const clean = line.replace(/^\d+\.\s*/, '').trim();
    const num   = String(i + 1) + '.';
    doc.fontSize(8).font('Helvetica');
    const textH = doc.heightOfString(clean, { width: TERM_W });
    const rowH  = Math.max(textH, 11) + 4;
    if (ty2 + rowH > TERM_BOTTOM) return; // skip if overflow (all 12 fit at 8pt)
    if (i % 2 === 0) doc.rect(20, ty2 - 1, PW - 42, rowH + 2).fill('#F5F1EB');
    doc.fontSize(7.5).fillColor(color).font('Helvetica-Bold')
       .text(num, 22, ty2 + 1, { width: 16, align: 'right' });
    doc.fontSize(8).fillColor('#2C2520').font('Helvetica')
       .text(clean, TERM_X, ty2, { width: TERM_W, lineGap: 1 });
    ty2 += rowH;
  });

  ty2 += 8;
  doc.moveTo(22, ty2).lineTo(PW - 22, ty2).lineWidth(0.4).strokeColor('#E0D8CE').stroke();
  ty2 += 6;
  doc.fontSize(7.5).fillColor('#9A8F82').font('Helvetica-Oblique')
     .text('This document is computer-generated and constitutes a valid commercial document.',
           22, ty2, { width: PW - 44, align: 'center' });

  // Footer page 2
  draw_inv_footer('Page 2 of 2');

  doc.end();
  return buf;
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROPOSAL PDF  — Professional A4, max 2 pages, consistent with Invoice/Quotation
// ─────────────────────────────────────────────────────────────────────────────
exports.render_proposal_pdf = async (proposal) => {
  const brand    = await BrandTheme.findOne();
  const termsDoc = await TermsTemplate.findOne();
  const color    = brand_color(brand);
  const firm_name = (brand && brand.firm_name) || 'The Design Space';

  const client = proposal.project && proposal.project.client;
  const client_name    = (client && client.full_name)  || '—';
  const client_email   = (client && client.email)      || '—';
  const client_phone   = (client && client.phone)      || '—';
  const client_address = (client && (client.billing_address || client.site_address)) || '—';
  const project_name   = (proposal.project && proposal.project.name) || '—';

  // Valid until: use stored value or created_at + 30 days
  const valid_until_date = proposal.valid_until
    ? new Date(proposal.valid_until)
    : (() => { const d = new Date(proposal.created_at || Date.now()); d.setDate(d.getDate() + 30); return d; })();

  // Status color
  const status_str = (proposal.status || 'draft').toUpperCase();
  const status_color = proposal.status === 'accepted' ? '#15803D'
                     : proposal.status === 'sent'     ? '#1D4ED8'
                     : proposal.status === 'rejected' ? '#B91C1C'
                     : color;

  const PW = 595, PH = 841.89;
  const ML = 36, MR = 36;
  const CW = PW - ML - MR; // 523
  const FOOTER_SAFE = PH - 48;

  const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
  const buf = to_buffer(doc);

  // ── Page-number-aware footer ───────────────────────────────────────────────
  const draw_prop_footer = (page_of) => {
    const fy = PH - 36;
    doc.rect(0, fy - 4, PW, 40).fill('#F5F3EF');
    doc.moveTo(ML, fy - 4).lineTo(PW - MR, fy - 4).lineWidth(0.4).strokeColor(LGREY).stroke();
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
       .text(`This is a computer-generated document. | ${firm_name}`,
             ML, fy + 4, { width: CW - 60, align: 'center', lineBreak: false });
    if (page_of) {
      doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
         .text(page_of, PW - MR - 55, fy + 4, { width: 55, align: 'right', lineBreak: false });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 1 — HEADER
  // ─────────────────────────────────────────────────────────────────────────
  doc.rect(0, 0, PW, 100).fill('#FAFAF8');
  const logo_buf = get_logo_buffer(brand);
  if (logo_buf) {
    try { doc.image(logo_buf, ML, 14, { height: 64, fit: [70, 64] }); } catch (_) {}
  }
  doc.fontSize(19).fillColor(color).font('Helvetica-Bold')
     .text(firm_name, 0, 22, { width: PW, align: 'center' });
  if (brand && brand.tagline) {
    doc.fontSize(8).fillColor(GREY).font('Helvetica')
       .text(brand.tagline, 0, 46, { width: PW, align: 'center' });
  }
  doc.fontSize(22).fillColor(DARK).font('Helvetica-Bold')
     .text('PROPOSAL', 360, 18, { width: 199, align: 'right' });
  doc.fontSize(9).fillColor(GREY).font('Helvetica')
     .text(proposal.prop_number || '', 360, 44, { width: 199, align: 'right' });
  doc.rect(360, 58, 199, 18).fill(status_color);
  doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold')
     .text(status_str, 360, 62, { width: 199, align: 'center' });
  doc.moveTo(ML, 100).lineTo(PW - MR, 100).lineWidth(1.5).strokeColor(color).stroke();

  let y = 110;

  // ─────────────────────────────────────────────────────────────────────────
  // INFO BOXES — Prepared For | Proposal Details
  // ─────────────────────────────────────────────────────────────────────────
  const BOX_L_W = 248, BOX_R_W = 259;
  const BOX_L_X = ML,  BOX_R_X = ML + BOX_L_W + 16;
  const ROW_H = 14;

  const left_rows = [
    ['Client',  client_name],
    ['Email',   client_email],
    ['Phone',   client_phone],
    ['Address', client_address],
    ['Project', project_name],
  ];

  const right_rows = [
    ['Ref #',       proposal.prop_number || '—'],
    ['Date',        fmt_date(proposal.created_at)],
    ['Valid Until', fmt_date(valid_until_date)],
    ['Status',      status_str],
  ];

  // Pre-calculate dynamic row heights for left box (multiline support for Address & Project)
  const left_row_heights = left_rows.map(([, value]) => {
    doc.fontSize(7.5).font('Helvetica-Bold');
    const h = doc.heightOfString(String(value || '—'), { width: BOX_L_W - 72 });
    return Math.max(ROW_H, h + 4);
  });
  const left_box_h_dyn  = left_row_heights.reduce((a, b) => a + b, 0) + 26;
  const right_box_h_dyn = right_rows.length * ROW_H + 26;
  const box_h = Math.max(left_box_h_dyn, right_box_h_dyn);

  // Left box
  doc.rect(BOX_L_X, y, BOX_L_W, box_h).fillAndStroke(BGALT, LGREY).lineWidth(0.4);
  doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold').text('PREPARED FOR', BOX_L_X + 8, y + 7);
  doc.moveTo(BOX_L_X + 8, y + 17).lineTo(BOX_L_X + BOX_L_W - 8, y + 17)
     .lineWidth(0.3).strokeColor(LGREY).stroke();
  let ly = y + 23;
  left_rows.forEach(([label, value], idx) => {
    const rh = left_row_heights[idx];
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica').text(label + ':', BOX_L_X + 8, ly, { width: 52 });
    doc.fontSize(7.5).fillColor(DARK).font('Helvetica-Bold')
       .text(String(value || '—'), BOX_L_X + 64, ly, { width: BOX_L_W - 72, lineBreak: true });
    ly += rh;
  });

  // Right box
  doc.rect(BOX_R_X, y, BOX_R_W, box_h).fillAndStroke(BGALT, LGREY).lineWidth(0.4);
  doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold').text('PROPOSAL DETAILS', BOX_R_X + 8, y + 7);
  doc.moveTo(BOX_R_X + 8, y + 17).lineTo(BOX_R_X + BOX_R_W - 8, y + 17)
     .lineWidth(0.3).strokeColor(LGREY).stroke();
  let ry = y + 23;
  right_rows.forEach(([label, value]) => {
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica').text(label + ':', BOX_R_X + 8, ry, { width: 70 });
    doc.fontSize(7.5).fillColor(DARK).font('Helvetica-Bold')
       .text(String(value || '—'), BOX_R_X + 82, ry, { width: BOX_R_W - 90, lineBreak: false });
    ry += ROW_H;
  });

  y += box_h + 12;

  // ─────────────────────────────────────────────────────────────────────────
  // PROPOSAL TITLE
  // ─────────────────────────────────────────────────────────────────────────
  if (proposal.title && proposal.title.trim()) {
    doc.fontSize(12).fillColor(color).font('Helvetica-Bold')
       .text(proposal.title.trim(), ML, y);
    doc.moveTo(ML, y + 15).lineTo(PW - MR, y + 15).lineWidth(0.8).strokeColor(color).stroke();
    y += 22;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCOPE OF SERVICES — structured section
  // ─────────────────────────────────────────────────────────────────────────
  doc.fontSize(9).fillColor(color).font('Helvetica-Bold').text('SCOPE OF SERVICES', ML, y);
  doc.moveTo(ML, y + 12).lineTo(PW - MR, y + 12).lineWidth(0.8).strokeColor(color).stroke();
  y += 18;

  // Header row for services
  const SVC_COLS = [22, 390, 111];
  const SVC_HDRS = ['#', 'Service / Deliverable', 'Remarks'];

  doc.rect(ML, y, CW, 20).fill(color);
  let shx = ML + 4;
  SVC_HDRS.forEach((h, i) => {
    doc.fontSize(7.5).fillColor(WHITE).font('Helvetica-Bold')
       .text(h, shx, y + 6, { width: SVC_COLS[i] - 4, align: 'left' });
    shx += SVC_COLS[i];
  });
  y += 20;

  // Service rows — populated or placeholder
  const svcs = Array.isArray(proposal.services) && proposal.services.length > 0
    ? proposal.services
    : [];

  if (svcs.length === 0) {
    // Show a placeholder row when no services are attached
    doc.rect(ML, y, CW, 20).fill(BGALT);
    doc.fontSize(8).fillColor(GREY).font('Helvetica-Oblique')
       .text('No services listed — attach services from the proposal editor.', ML + 26, y + 6, { width: CW - 30 });
    doc.moveTo(ML, y + 20).lineTo(PW - MR, y + 20).lineWidth(0.25).strokeColor(LGREY).stroke();
    y += 20;
  } else {
    svcs.forEach((svc, ri) => {
      const svc_name = (typeof svc === 'object' ? svc.name : null) || '—';
      const svc_desc = (typeof svc === 'object' ? svc.description : null) || '';
      const row_h = 20;
      if (y + row_h > FOOTER_SAFE - 80) {
        draw_prop_footer('Page 1 of 2');
        doc.addPage();
        y = 48;
        // Redraw scope header
        doc.rect(ML, y, CW, 20).fill(color);
        let rhx = ML + 4;
        SVC_HDRS.forEach((h, i) => {
          doc.fontSize(7.5).fillColor(WHITE).font('Helvetica-Bold')
             .text(h, rhx, y + 6, { width: SVC_COLS[i] - 4, align: 'left' });
          rhx += SVC_COLS[i];
        });
        y += 20;
      }
      if (ri % 2 === 1) doc.rect(ML, y, CW, row_h).fill(BGALT);
      doc.fontSize(8).fillColor(DARK).font('Helvetica-Bold')
         .text(String(ri + 1), ML + 4, y + 6, { width: SVC_COLS[0] - 4 });
      doc.fontSize(8).fillColor(DARK).font('Helvetica')
         .text(svc_name + (svc_desc ? ` — ${svc_desc}` : ''), ML + 4 + SVC_COLS[0], y + 6,
               { width: SVC_COLS[1] - 8, lineBreak: false, ellipsis: true });
      doc.moveTo(ML, y + row_h).lineTo(PW - MR, y + row_h).lineWidth(0.25).strokeColor(LGREY).stroke();
      y += row_h;
    });
  }
  y += 6;

  // ─────────────────────────────────────────────────────────────────────────
  // PROPOSAL CONTENT (free text scope/notes)
  // ─────────────────────────────────────────────────────────────────────────
  if (proposal.content && proposal.content.trim()) {
    doc.fontSize(9).fillColor(color).font('Helvetica-Bold').text('SCOPE DETAILS', ML, y);
    doc.moveTo(ML, y + 12).lineTo(PW - MR, y + 12).lineWidth(0.6).strokeColor(color).stroke();
    y += 16;

    // Measure content height
    doc.fontSize(9).font('Helvetica');
    const contentH = doc.heightOfString(proposal.content.trim(), { width: CW, lineGap: 3 });

    if (y + contentH > FOOTER_SAFE - 20) {
      draw_prop_footer('Page 1 of 2');
      doc.addPage();
      y = 48;
    }
    doc.fontSize(9).fillColor(DARK).font('Helvetica')
       .text(proposal.content.trim(), ML, y, { width: CW, lineGap: 3 });
    y = doc.y + 10;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NOTES
  // ─────────────────────────────────────────────────────────────────────────
  if (proposal.notes && proposal.notes.trim()) {
    const nh = Math.max(30, doc.heightOfString(proposal.notes.trim(), { width: CW - 14 }) + 18);
    if (y + nh < FOOTER_SAFE - 10) {
      doc.rect(ML, y, 3, nh).fill(color);
      doc.rect(ML + 3, y, CW - 3, nh).fill(BGALT);
      doc.fontSize(7).fillColor(GREY).font('Helvetica-Bold').text('NOTES', ML + 9, y + 6);
      doc.fontSize(8).fillColor(DARK).font('Helvetica')
         .text(proposal.notes.trim(), ML + 9, y + 16, { width: CW - 14 });
      y += nh + 6;
    }
  }

  // Footer page 1
  draw_prop_footer('Page 1 of 2');

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 2 — TERMS & CONDITIONS
  // ─────────────────────────────────────────────────────────────────────────
  doc.addPage();

  const p_terms = (termsDoc && termsDoc.proposal_terms) ||
    '1. This proposal is valid for 30 days from date of issue.\n2. All designs and concepts remain property of The Design Space until full payment.\n3. Revisions beyond agreed scope will be charged separately.\n4. 50% advance payment required to commence work.\n5. Balance payment due before final handover.\n6. Any changes to scope may result in a revised proposal and additional charges.\n7. All prices are exclusive of GST unless otherwise stated.\n8. Project timelines are subject to timely receipt of approvals and decisions from the client.';

  const p_lines = p_terms.split('\n').filter(l => l.trim());

  doc.rect(0, 0, PW, PH).fill('#FDFCFB');
  doc.rect(0, 0, 5, PH - 40).fill(color);
  doc.rect(0, 0, PW, 50).fill(color);
  doc.fontSize(15).fillColor(WHITE).font('Helvetica-Bold')
     .text('TERMS & CONDITIONS', 22, 15, { width: PW - 44 });
  doc.fontSize(7.5).fillColor('rgba(255,255,255,0.75)').font('Helvetica')
     .text(firm_name, 22, 34, { width: PW - 44 });

  let ty2 = 62;
  doc.fontSize(7.5).fillColor('#9A8F82').font('Helvetica-Oblique')
     .text('Please read the following terms carefully. These terms govern the services provided under this proposal.',
           22, ty2, { width: PW - 44 });
  ty2 += 16;
  doc.moveTo(22, ty2).lineTo(PW - 22, ty2).lineWidth(0.4).strokeColor('#E0D8CE').stroke();
  ty2 += 8;

  const TERM_X2 = 22 + 20, TERM_W2 = PW - TERM_X2 - 22;
  const TERM_BOTTOM2 = PH - 50;

  p_lines.forEach((line, i) => {
    const clean = line.replace(/^\d+\.\s*/, '').trim();
    const num   = String(i + 1) + '.';
    doc.fontSize(8).font('Helvetica');
    const textH = doc.heightOfString(clean, { width: TERM_W2 });
    const rowH  = Math.max(textH, 11) + 4;
    if (ty2 + rowH > TERM_BOTTOM2) return;
    if (i % 2 === 0) doc.rect(20, ty2 - 1, PW - 42, rowH + 2).fill('#F5F1EB');
    doc.fontSize(7.5).fillColor(color).font('Helvetica-Bold')
       .text(num, 22, ty2 + 1, { width: 16, align: 'right' });
    doc.fontSize(8).fillColor('#2C2520').font('Helvetica')
       .text(clean, TERM_X2, ty2, { width: TERM_W2, lineGap: 1 });
    ty2 += rowH;
  });

  ty2 += 8;
  doc.moveTo(22, ty2).lineTo(PW - 22, ty2).lineWidth(0.4).strokeColor('#E0D8CE').stroke();
  ty2 += 6;
  doc.fontSize(7.5).fillColor('#9A8F82').font('Helvetica-Oblique')
     .text('This document is computer-generated and constitutes a valid commercial document.',
           22, ty2, { width: PW - 44, align: 'center' });

  // Footer page 2
  draw_prop_footer('Page 2 of 2');

  // ─────────────────────────────────────────────────────────────────────────
  // SERVICE SHOWCASE (page 3+ only if services have images)
  // ─────────────────────────────────────────────────────────────────────────
  const svcs_with_img = (proposal.services || []).filter(s => s && s.media && s.media.some(m => m.file_type === 'image'));
  if (svcs_with_img.length > 0) {
    doc.addPage();
    let sy = 40;
    doc.fontSize(14).fillColor(color).font('Helvetica-Bold').text('SERVICE SHOWCASE', ML, sy);
    doc.moveTo(ML, sy + 18).lineTo(PW - MR, sy + 18).lineWidth(1).strokeColor(color).stroke();
    sy += 28;
    for (const svc of svcs_with_img) {
      if (sy + 180 > PH - 60) { doc.addPage(); sy = 50; }
      doc.rect(ML, sy, CW, 3).fill(color); sy += 8;
      doc.fontSize(12).fillColor(DARK).font('Helvetica-Bold')
         .text(svc.name || '—', ML, sy, { width: 280 }); sy += 16;
      if (svc.description) {
        doc.fontSize(8.5).fillColor(GREY).font('Helvetica')
           .text(svc.description, ML, sy, { width: 280 }); sy += 12;
      }
      const fi = svc.media.find(m => m.file_type === 'image');
      if (fi && fi.file_url) {
        const ip = path.isAbsolute(fi.file_url) ? fi.file_url
                 : path.join(__dirname, '..', fi.file_url.replace(/^\//, ''));
        if (fs.existsSync(ip)) {
          try { doc.image(ip, 330, sy - 28, { width: 193, height: 120, fit: [193, 120] }); } catch (_) {}
        }
      }
      sy += 18;
      doc.moveTo(ML, sy).lineTo(PW - MR, sy).lineWidth(0.3).strokeColor(LGREY).stroke();
      sy += 14;
    }
    const sfy = PH - 36;
    doc.rect(0, sfy - 4, PW, 40).fill('#F5F3EF');
    doc.moveTo(ML, sfy - 4).lineTo(PW - MR, sfy - 4).lineWidth(0.4).strokeColor(LGREY).stroke();
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica')
       .text(`This is a computer-generated document. | ${firm_name}`,
             ML, sfy + 4, { width: CW, align: 'center', lineBreak: false });
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
