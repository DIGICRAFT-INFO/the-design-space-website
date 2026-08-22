const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const quotationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 }, //
    project: { type: String, ref: 'Project', required: false, default: null }, //
    quote_number: { type: String, required: true }, //
    version: { type: Number, default: 1 }, //
    parent_quotation: { type: String, ref: 'Quotation', default: null }, //
    status: { 
      type: String, 
      enum: ['draft', 'sent', 'approved', 'rejected', 'superseded'], 
      default: 'draft' 
    }, //
    valid_until: { type: Date, default: null }, //

    // Financials
    subtotal: { type: Number, default: 0 },
    discount_type: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    discount_value: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    taxable_amount: { type: Number, default: 0 },
    cgst_rate: { type: Number, default: 9 },
    sgst_rate: { type: Number, default: 9 },
    igst_rate: { type: Number, default: 0 },
    cgst_amount: { type: Number, default: 0 },
    sgst_amount: { type: Number, default: 0 },
    igst_amount: { type: Number, default: 0 },
    total_tax: { type: Number, default: 0 },
    grand_total: { type: Number, default: 0 },

    notes: { type: String, default: '' }, //

    // Snapshot fields — stored at creation so they survive client/project deletion
    client_name_snapshot:  { type: String, default: '' },
    project_name_snapshot: { type: String, default: '' },

    // Address fields (auto-filled from client, editable per quotation)
    billing_address: { type: String, default: '' },
    site_address:    { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'quotations' //
  }
);

// Virtual for items mapping
quotationSchema.virtual('items', {
  ref: 'QuotationItem',
  localField: '_id',
  foreignField: 'quotation'
});

quotationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Quotation', quotationSchema);