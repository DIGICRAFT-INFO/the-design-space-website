const Quotation = require('../models/quotation');
const QuotationItem = require('../models/quotation_item');
const mongoose = require('mongoose');

// Helper for exact 2 decimal places rounding (like Django's quantize Decimal('0.01'))
const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// 1. Generate Quote Number
exports.generate_quote_number = async () => {
  const year = new Date().getFullYear();
  const prefix = `QUOTE-${year}-`;
  
  const lastQuote = await Quotation.findOne({ quote_number: new RegExp(`^${prefix}`) })
    .sort({ quote_number: -1 });

  let seq = 1;
  if (lastQuote) {
    const parts = lastQuote.quote_number.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  
  return `${prefix}${String(seq).padStart(3, '0')}`;
};

// 2. Recalculate Totals
exports.recalculate_totals = async (quotation) => {
  const items = await QuotationItem.find({ quotation: quotation._id });
  let subtotal = 0;
  items.forEach(item => subtotal += item.amount);

  let discount_amount = 0;
  if (quotation.discount_type === 'percentage') {
    discount_amount = round2(subtotal * quotation.discount_value / 100);
  } else {
    discount_amount = quotation.discount_value;
  }

  const taxable_amount = subtotal - discount_amount;

  let cgst_amount = 0, sgst_amount = 0, igst_amount = 0;

  if (quotation.igst_rate > 0) {
    igst_amount = round2(taxable_amount * quotation.igst_rate / 100);
  } else {
    cgst_amount = round2(taxable_amount * quotation.cgst_rate / 100);
    sgst_amount = round2(taxable_amount * quotation.sgst_rate / 100);
  }

  const total_tax = cgst_amount + sgst_amount + igst_amount;
  const grand_total = taxable_amount + total_tax;

  quotation.subtotal = subtotal;
  quotation.discount_amount = discount_amount;
  quotation.taxable_amount = taxable_amount;
  quotation.cgst_amount = cgst_amount;
  quotation.sgst_amount = sgst_amount;
  quotation.igst_amount = igst_amount;
  quotation.total_tax = total_tax;
  quotation.grand_total = grand_total;

  await quotation.save();
  return quotation;
};

// 3. Create Revision
exports.create_revision = async (quotation) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const old_items = await QuotationItem.find({ quotation: quotation._id }).session(session);

    // Supersede old version
    quotation.status = 'superseded';
    await quotation.save({ session });

    // New quotation — same fields, incremented version
    const quote_number = await exports.generate_quote_number();
    
    const new_quote = await Quotation.create([{
      project: quotation.project,
      quote_number: quote_number,
      version: quotation.version + 1,
      parent_quotation: quotation._id,
      status: 'draft',
      valid_until: quotation.valid_until,
      discount_type: quotation.discount_type,
      discount_value: quotation.discount_value,
      cgst_rate: quotation.cgst_rate,
      sgst_rate: quotation.sgst_rate,
      igst_rate: quotation.igst_rate,
      notes: quotation.notes,
    }], { session });

    const newQuoteInstance = new_quote[0];

    // Copy line items
    const newItems = old_items.map(item => ({
      quotation: newQuoteInstance._id,
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      amount: item.amount,
      sort_order: item.sort_order,
    }));

    await QuotationItem.insertMany(newItems, { session });

    await session.commitTransaction();
    session.endSession();

    // Recalculate outside transaction to trigger normal hooks
    return await exports.recalculate_totals(newQuoteInstance);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};