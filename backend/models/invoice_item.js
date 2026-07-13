const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const invoiceItemSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 }, //
    invoice: { type: String, ref: 'Invoice', required: true }, //
    description: { type: String, required: true, maxLength: 300 }, //
    category: { type: String, default: '' }, // e.g. 'Design', 'Civil', 'Furniture'
    quantity: { type: Number, default: 1 }, //
    unit: { type: String, default: '' }, //
    rate: { type: Number, required: true }, //
    amount: { type: Number }, //
  },
  { collection: 'invoice_items' } //
);

// Mongoose v9: async pre-save, no next() callback needed
invoiceItemSchema.pre('save', async function () {
  this.amount = this.quantity * this.rate;
});

invoiceItemSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('InvoiceItem', invoiceItemSchema);