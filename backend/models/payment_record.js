const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentRecordSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    invoice: { type: String, ref: 'Invoice', required: true },
    
    amount_paid: { 
      type: Number, 
      required: true,
      min: [0.01, 'Payment amount must be greater than zero.'] 
    },
    
    payment_date: { type: Date, required: true },
    
    payment_mode: { 
      type: String, 
      enum: ['bank_transfer', 'cheque', 'cash', 'upi', 'neft', 'other'], 
      default: 'bank_transfer' 
    },
    
    reference_number: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'payment_records'
  }
);

// ── BUG FIX: Invoice balance recalculation ────────────────────────────────────
// post('save') fires after create() and payment.save() calls.
// We use a shared helper to avoid duplicating the aggregation logic.
async function recalculateInvoiceBalance(invoiceId) {
  if (!invoiceId) return;
  try {
    const Invoice = mongoose.model('Invoice');
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      await invoice.update_balance();
    }
  } catch (err) {
    console.error('recalculateInvoiceBalance error:', err.message);
  }
}

paymentRecordSchema.post('save', async function (doc) {
  await recalculateInvoiceBalance(doc.invoice);
});

// BUG FIX: findOneAndDelete hook — 'doc' is the deleted document
paymentRecordSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await recalculateInvoiceBalance(doc.invoice);
  }
});

// JSON Output Formatting
paymentRecordSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('PaymentRecord', paymentRecordSchema);
