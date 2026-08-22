const Invoice = require('../models/invoice');
const InvoiceItem = require('../models/invoice_item');
const Quotation = require('../models/quotation'); // Assumed quotation model
const mongoose = require('mongoose');

// Generate sequential invoice number
exports.generate_invoice_number = async () => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  const lastInvoice = await Invoice.findOne({ invoice_number: new RegExp(`^${prefix}`) })
    .sort({ invoice_number: -1 });

  let seq = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoice_number.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  
  return `${prefix}${String(seq).padStart(3, '0')}`;
};

// Generate invoice from quotation (Transactional)
exports.generate_invoice_from_quotation = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction(); // Django @transaction.atomic
  
  try {
    const { quotation_id, invoice_type = 'full', milestone_label = '', milestone_percentage = 100, invoice_date, due_days = 15, notes = '', billing_address = '', site_address = '' } = data;
    
    const quotation = await Quotation.findById(quotation_id).populate('items').session(session);
    if (!quotation) throw new Error('Quotation not found');
    
    if (quotation.status !== 'approved') {
      throw new Error('Only APPROVED quotations can generate invoices.'); //
    }

    // Guard: prevent duplicate invoices for the same quotation (non-cancelled)
    const existing = await Invoice.findOne({
      quotation: quotation_id,
      status: { $nin: ['cancelled'] }
    }).session(session);
    if (existing) {
      throw new Error(`An active invoice (${existing.invoice_number}) already exists for this quotation. Cancel it first or create a copy.`);
    }

    const today = invoice_date ? new Date(invoice_date) : new Date();
    const due_date = new Date(today);
    due_date.setDate(today.getDate() + due_days); //
    
    const percentage = milestone_percentage / 100; //

    // Scaled financials
    const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
    
    const subtotal = round2(quotation.subtotal * percentage);
    const taxable_amount = round2(quotation.taxable_amount * percentage);
    const cgst_amount = round2(quotation.cgst_amount * percentage);
    const sgst_amount = round2(quotation.sgst_amount * percentage);
    const igst_amount = round2(quotation.igst_amount * percentage);
    const total_tax = round2(cgst_amount + sgst_amount + igst_amount);
    const grand_total = round2(taxable_amount + total_tax);

    const invoice_number = await exports.generate_invoice_number();

    const invoice = await Invoice.create([{
      project: quotation.project,
      quotation: quotation._id,
      invoice_number,
      invoice_type,
      invoice_date: today,
      due_date,
      status: 'draft',
      milestone_label,
      milestone_percentage,
      subtotal, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_tax, grand_total, balance_due: grand_total,
      notes,
      billing_address: billing_address || quotation.billing_address || '',
      site_address:    site_address    || quotation.site_address    || '',
    }], { session });

    // Copy line items (scaled) — includes category field (was missing before)
    const invoiceItems = quotation.items.map(q_item => ({
      invoice: invoice[0]._id,
      description: q_item.description,
      category:    q_item.category || '',
      quantity: q_item.quantity,
      unit: q_item.unit,
      rate: round2(q_item.rate * percentage),
      amount: round2(q_item.amount * percentage)
    }));

    await InvoiceItem.insertMany(invoiceItems, { session });

    await session.commitTransaction();
    session.endSession();
    
    return invoice[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ── Direct invoice creation WITHOUT quotation ─────────────────────────────────
// Used when admin wants to create a manual invoice for a client/project
// without an existing quotation (e.g. ad-hoc billing, walk-in clients).
exports.create_direct_invoice = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      project_id,
      client_id,
      invoice_type = 'full',
      milestone_label = '',
      milestone_percentage = 100,
      invoice_date,
      due_days = 15,
      notes = '',
      items = [],
      cgst_rate = 0,
      sgst_rate = 0,
      igst_rate = 0,
      billing_address = '',
      site_address = '',
    } = data;

    if (!project_id && !client_id) {
      throw new Error('Either project_id or client_id is required for a direct invoice.');
    }

    // If only client_id, find or create a "default" project reference
    let projectId = project_id;
    if (!projectId && client_id) {
      // Find first project for this client
      const Project = require('../models/project');
      const proj = await Project.findOne({ client: client_id }).session(session);
      if (!proj) throw new Error('No project found for this client. Please create a project first.');
      projectId = proj._id;
    }

    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    // Calculate totals from items
    const subtotal = round2(items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), 0));
    const cgstAmt = round2(subtotal * (parseFloat(cgst_rate) || 0) / 100);
    const sgstAmt = round2(subtotal * (parseFloat(sgst_rate) || 0) / 100);
    const igstAmt = round2(subtotal * (parseFloat(igst_rate) || 0) / 100);
    const totalTax = round2(cgstAmt + sgstAmt + igstAmt);
    const grandTotal = round2(subtotal + totalTax);

    const today = invoice_date ? new Date(invoice_date) : new Date();
    const due_date = new Date(today);
    due_date.setDate(today.getDate() + (parseInt(due_days) || 15));

    const invoice_number = await exports.generate_invoice_number();

    const [invoice] = await Invoice.create([{
      project: projectId,
      quotation: null,
      invoice_number,
      invoice_type,
      invoice_date: today,
      due_date,
      status: 'draft',
      milestone_label,
      milestone_percentage,
      subtotal,
      taxable_amount: subtotal,
      cgst_amount: cgstAmt,
      sgst_amount: sgstAmt,
      igst_amount: igstAmt,
      total_tax: totalTax,
      grand_total: grandTotal,
      balance_due: grandTotal,
      notes,
      billing_address: billing_address || '',
      site_address:    site_address    || '',
    }], { session });

    if (items.length > 0) {
      const invoiceItems = items.map((it) => ({
        invoice: invoice._id,
        description: it.description || '',
        category: it.category || '',
        quantity: parseFloat(it.quantity) || 1,
        unit: it.unit || '',
        rate: parseFloat(it.rate) || 0,
        amount: round2((parseFloat(it.quantity) || 1) * (parseFloat(it.rate) || 0)),
      }));
      await InvoiceItem.insertMany(invoiceItems, { session });
    }

    await session.commitTransaction();
    session.endSession();
    return invoice;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};