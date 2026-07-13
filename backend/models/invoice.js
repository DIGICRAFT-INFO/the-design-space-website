const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const invoiceSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    project: { type: String, ref: 'Project', required: true },
    quotation: { type: String, ref: 'Quotation', default: null },
    invoice_number: { type: String, required: true, unique: true },
    invoice_type: { 
      type: String, 
      enum: ['full', 'advance', 'milestone', 'final'], 
      default: 'full' 
    },
    invoice_date: { type: Date, required: true },
    due_date: { type: Date, required: true },
    status: { 
      type: String, 
      // BUG FIX: Kept 'partial' as the canonical enum (not 'partially_paid')
      // Frontend STATUS_CONFIG now maps both 'partial' and 'partially_paid'
      enum: ['draft', 'issued', 'partial', 'paid', 'overdue', 'cancelled'], 
      default: 'draft' 
    },
    
    // Milestone billing
    milestone_label: { type: String, default: '' },
    milestone_percentage: { type: Number, default: 0 },

    // Financials
    subtotal: { type: Number, default: 0 },
    taxable_amount: { type: Number, default: 0 },
    cgst_amount: { type: Number, default: 0 },
    sgst_amount: { type: Number, default: 0 },
    igst_amount: { type: Number, default: 0 },
    total_tax: { type: Number, default: 0 },
    grand_total: { type: Number, default: 0 },
    amount_paid: { type: Number, default: 0 },
    balance_due: { type: Number, default: 0 },
    
    notes: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'invoices'
  }
);

// Virtual for items
invoiceSchema.virtual('items', {
  ref: 'InvoiceItem',
  localField: '_id',
  foreignField: 'invoice'
});

// ── BUG FIX: update_balance ───────────────────────────────────────────────────
// Original: this.save() inside update_balance() could trigger other save hooks
// and cause loops. Fixed with updateOne() to bypass hooks.
invoiceSchema.methods.update_balance = async function () {
  const PaymentRecord = mongoose.model('PaymentRecord');
  
  const result = await PaymentRecord.aggregate([
    { $match: { invoice: this._id } },
    { $group: { _id: null, total: { $sum: '$amount_paid' } } }
  ]);
  
  const paid = result.length > 0 ? result[0].total : 0;
  const balance = this.grand_total - paid;
  
  let newStatus = this.status;
  // Only auto-update status if invoice is in a payment-trackable state
  // Don't override 'cancelled' or 'draft'
  if (['issued', 'partial', 'paid', 'overdue'].includes(this.status)) {
    if (balance <= 0) {
      newStatus = 'paid';
    } else if (paid > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'issued';
    }
  }
  
  // BUG FIX: Use updateOne() instead of this.save() to avoid recursive hook triggers
  await mongoose.model('Invoice').updateOne(
    { _id: this._id },
    {
      $set: {
        amount_paid: paid,
        balance_due: Math.max(0, balance),
        status: newStatus,
      }
    }
  );

  // Keep local object in sync for callers that read properties after update_balance
  this.amount_paid = paid;
  this.balance_due = Math.max(0, balance);
  this.status = newStatus;
};

invoiceSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
