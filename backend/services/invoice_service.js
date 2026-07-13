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
    const { quotation_id, invoice_type = 'full', milestone_label = '', milestone_percentage = 100, invoice_date, due_days = 15, notes = '' } = data;
    
    const quotation = await Quotation.findById(quotation_id).populate('items').session(session);
    if (!quotation) throw new Error('Quotation not found');
    
    if (quotation.status !== 'approved') {
      throw new Error('Only APPROVED quotations can generate invoices.'); //
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
      notes
    }], { session });

    // Copy line items (scaled)
    const invoiceItems = quotation.items.map(q_item => ({
      invoice: invoice[0]._id,
      description: q_item.description,
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