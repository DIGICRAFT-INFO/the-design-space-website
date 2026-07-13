const nodemailer = require('nodemailer');
const NotificationLog = require('../models/notification_log');
const pdfEngine = require('./pdf_engine_service');

// Lazy transporter — created only when first email is sent
// This prevents startup crash when EMAIL_HOST_PASSWORD is not set
let _transporter = null;
const get_transporter = () => {
  if (_transporter) return _transporter;

  const user = process.env.EMAIL_HOST_USER;
  const pass = process.env.EMAIL_HOST_PASSWORD;

  if (!user || !pass) {
    throw new Error('Missing credentials for "PLAIN" — EMAIL_HOST_USER or EMAIL_HOST_PASSWORD not set in environment variables.');
  }

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  return _transporter;
};

const log_notification = async (channel, doc_type, doc_id, recipient, status, error = '') => {
  try {
    await NotificationLog.create({ channel, doc_type, doc_id, recipient, status, error });
  } catch (_) { /* non-fatal */ }
};

// Safe "from" address — always valid
const from_address = () => {
  const user = process.env.EMAIL_HOST_USER || '';
  const name = process.env.FIRM_NAME || 'The Design Space';
  return `"${name}" <${user}>`;
};

const backend_url = () =>
  process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

// Safely embed plain-text content inside HTML email bodies.
// Escapes HTML special characters (so stray < > & don't break the markup,
// the same bug that previously truncated PDF content) and converts
// newlines to <br> so paragraph breaks the client typed are preserved.
const escape_html_for_email = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
};

// ── 1. Invoice Email (with real PDF attachment) ───────────────────────────────
exports.send_invoice_email = async (invoice) => {
  const client = invoice.project && invoice.project.client;
  if (!client || !client.email) return { success: false, error: 'Client email not set' };

  try {
    // Generate real PDF
    let pdf_buffer = null;
    try {
      pdf_buffer = await pdfEngine.render_invoice_pdf(invoice);
    } catch (pdfErr) {
      console.warn('Invoice PDF generation failed for email:', pdfErr.message);
    }

    const attachments = pdf_buffer
      ? [{ filename: `${invoice.invoice_number}.pdf`, content: pdf_buffer }]
      : [];

    await get_transporter().sendMail({
      from: from_address(),
      to: client.email,
      subject: `Invoice ${invoice.invoice_number} — Payment Due`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#C8922A;">Invoice ${invoice.invoice_number}</h2>
          <p>Dear <strong>${client.full_name || 'Client'}</strong>,</p>
          <p>Please find your invoice attached. Below are the details:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr style="background:#FAF8F5;">
              <td style="padding:8px 12px;font-weight:bold;">Invoice #</td>
              <td style="padding:8px 12px;">${invoice.invoice_number}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;font-weight:bold;">Project</td>
              <td style="padding:8px 12px;">${invoice.project.name || ''}</td>
            </tr>
            <tr style="background:#FAF8F5;">
              <td style="padding:8px 12px;font-weight:bold;">Grand Total</td>
              <td style="padding:8px 12px;color:#C8922A;font-weight:bold;">₹${Number(invoice.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;font-weight:bold;">Balance Due</td>
              <td style="padding:8px 12px;color:#EF4444;font-weight:bold;">₹${Number(invoice.balance_due || invoice.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
          <p style="color:#666;font-size:13px;">Please make payment before the due date. If you have any questions, feel free to contact us.</p>
          <hr style="border:none;border-top:1px solid #EDE8DF;margin:20px 0;">
          <p style="color:#999;font-size:11px;">This is a computer-generated email. | ${process.env.FIRM_NAME || 'The Design Space'}</p>
        </div>
      `,
      attachments,
    });

    await log_notification('email', 'invoice', invoice._id, client.email, 'sent');
    return { success: true };
  } catch (error) {
    await log_notification('email', 'invoice', invoice._id, client.email, 'failed', error.message);
    return { success: false, error: error.message };
  }
};

// ── 2. Quotation Email (with real PDF attachment) ─────────────────────────────
exports.send_quotation_email = async (quotation) => {
  const client = quotation.project && quotation.project.client;
  if (!client || !client.email) return { success: false, error: 'Client email not set' };

  try {
    let pdf_buffer = null;
    try {
      pdf_buffer = await pdfEngine.render_quotation_pdf(quotation);
    } catch (pdfErr) {
      console.warn('Quotation PDF generation failed for email:', pdfErr.message);
    }

    const attachments = pdf_buffer
      ? [{ filename: `${quotation.quote_number}.pdf`, content: pdf_buffer }]
      : [];

    await get_transporter().sendMail({
      from: from_address(),
      to: client.email,
      subject: `Quotation ${quotation.quote_number} — ${quotation.project.name || ''}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#C8922A;">Quotation ${quotation.quote_number}</h2>
          <p>Dear <strong>${client.full_name || 'Client'}</strong>,</p>
          <p>Please find your quotation attached. Grand Total: <strong style="color:#C8922A;">₹${Number(quotation.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></p>
          <p style="color:#666;font-size:13px;">Kindly review and let us know your approval.</p>
          <hr style="border:none;border-top:1px solid #EDE8DF;margin:20px 0;">
          <p style="color:#999;font-size:11px;">This is a computer-generated email. | ${process.env.FIRM_NAME || 'The Design Space'}</p>
        </div>
      `,
      attachments,
    });

    await log_notification('email', 'quotation', quotation._id, client.email, 'sent');
    return { success: true };
  } catch (error) {
    await log_notification('email', 'quotation', quotation._id, client.email, 'failed', error.message);
    return { success: false, error: error.message };
  }
};

// ── 3. Proposal Email (with real PDF attachment) ──────────────────────────────
exports.send_proposal_email = async (proposal) => {
  const client = proposal.project && proposal.project.client;
  if (!client || !client.email) return { success: false, error: 'Client email not set' };

  try {
    let pdf_buffer = null;
    try {
      pdf_buffer = await pdfEngine.render_proposal_pdf(proposal);
    } catch (pdfErr) {
      console.warn('Proposal PDF generation failed for email:', pdfErr.message);
    }

    const attachments = pdf_buffer
      ? [{ filename: `${proposal.prop_number || 'proposal'}.pdf`, content: pdf_buffer }]
      : [];

    await get_transporter().sendMail({
      from: from_address(),
      to: client.email,
      subject: `Proposal: ${proposal.title} — The Design Space`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#C8922A;">${proposal.title}</h2>
          <p>Dear <strong>${client.full_name || 'Client'}</strong>,</p>
          <p>Please find your proposal details below${pdf_buffer ? ' (and attached as a PDF for your records)' : ''}.</p>
          <div style="margin:18px 0;padding:16px 18px;background:#FAF8F5;border-left:3px solid #C8922A;border-radius:4px;font-size:13px;color:#333;line-height:1.6;white-space:normal;">
            ${proposal.content && proposal.content.trim() !== '' ? escape_html_for_email(proposal.content) : '<span style="color:#999;">No content provided.</span>'}
          </div>
          ${proposal.notes ? `<p style="color:#666;font-size:12px;"><strong>Notes:</strong> ${escape_html_for_email(proposal.notes)}</p>` : ''}
          <p style="color:#666;font-size:13px;">Kindly review and let us know if you have any questions.</p>
          <hr style="border:none;border-top:1px solid #EDE8DF;margin:20px 0;">
          <p style="color:#999;font-size:11px;">This is a computer-generated email. | ${process.env.FIRM_NAME || 'The Design Space'}</p>
        </div>
      `,
      attachments,
    });

    await log_notification('email', 'proposal', proposal._id, client.email, 'sent');
    return { success: true };
  } catch (error) {
    await log_notification('email', 'proposal', proposal._id, client.email, 'failed', error.message);
    return { success: false, error: error.message };
  }
};

// ── 4. Payment Reminder Email ─────────────────────────────────────────────────
exports.send_payment_reminder_email = async (invoice) => {
  const client = invoice.project && invoice.project.client;
  if (!client || !client.email) return { success: false, error: 'Client email not set' };

  try {
    const balance = Number(invoice.balance_due || invoice.grand_total || 0);

    await get_transporter().sendMail({
      from: from_address(),
      to: client.email,
      subject: `Payment Reminder — Invoice ${invoice.invoice_number}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#EF4444;">Payment Reminder</h2>
          <p>Dear <strong>${client.full_name || 'Client'}</strong>,</p>
          <p>This is a friendly reminder that the following invoice is pending payment:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr style="background:#FAF8F5;">
              <td style="padding:8px 12px;font-weight:bold;">Invoice #</td>
              <td style="padding:8px 12px;">${invoice.invoice_number}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;font-weight:bold;">Balance Due</td>
              <td style="padding:8px 12px;color:#EF4444;font-weight:bold;">₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
          <p style="color:#666;font-size:13px;">Please make payment at your earliest convenience. Contact us if you have any questions.</p>
          <hr style="border:none;border-top:1px solid #EDE8DF;margin:20px 0;">
          <p style="color:#999;font-size:11px;">This is a computer-generated email. | ${process.env.FIRM_NAME || 'The Design Space'}</p>
        </div>
      `,
    });

    await log_notification('email', 'reminder', invoice._id, client.email, 'sent');
    return { success: true };
  } catch (error) {
    await log_notification('email', 'reminder', invoice._id, client.email, 'failed', error.message);
    return { success: false, error: error.message };
  }
};

// ── 5. Portfolio Email (with PDF attachment) ──────────────────────────────────
exports.send_portfolio_email = async (portfolio, recipient_email, pdf_buffer) => {
  if (!recipient_email) return { success: false, error: 'Recipient email not set' };

  try {
    const base = backend_url();
    const image_links = (portfolio.images || [])
      .slice(0, 6) // max 6 inline images in email
      .map((img) => {
        const src = img.file_url.startsWith('http') ? img.file_url : `${base}${img.file_url}`;
        return `<img src="${src}" width="260" style="margin:6px;border-radius:8px;max-width:100%;" />`;
      })
      .join('');

    const client = portfolio.project && portfolio.project.client;
    const client_name = client ? client.full_name : 'Client';

    await get_transporter().sendMail({
      from: from_address(),
      to: recipient_email,
      subject: `Portfolio: ${portfolio.title} — ${process.env.FIRM_NAME || 'The Design Space'}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#C8922A;">${portfolio.title}</h2>
          <p>Dear <strong>${client_name}</strong>,</p>
          <p>We are pleased to share a portfolio showcase of our work.</p>
          ${portfolio.description ? `<p style="color:#555;">${portfolio.description}</p>` : ''}
          ${image_links ? `<div style="margin:16px 0;">${image_links}</div>` : ''}
          <p style="color:#666;font-size:13px;">A complete PDF version is attached for your reference.</p>
          <hr style="border:none;border-top:1px solid #EDE8DF;margin:20px 0;">
          <p style="color:#999;font-size:11px;">This is a computer-generated email. | ${process.env.FIRM_NAME || 'The Design Space'}</p>
        </div>
      `,
      attachments: pdf_buffer
        ? [{ filename: `${portfolio.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`, content: pdf_buffer }]
        : [],
    });

    await log_notification('email', 'portfolio', portfolio._id, recipient_email, 'sent');
    return { success: true };
  } catch (error) {
    await log_notification('email', 'portfolio', portfolio._id, recipient_email, 'failed', error.message);
    return { success: false, error: error.message };
  }
};
