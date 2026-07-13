const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const quotationItemSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 }, //
    quotation: { type: String, ref: 'Quotation', required: true }, //
    service: { type: String, ref: 'MasterService', default: null }, // linked service (optional)
    service_image_url: { type: String, default: null }, // first image from service, stored at save time
    description: { type: String, required: true, maxLength: 500 }, //
    category: { type: String, default: '', maxLength: 100 }, //
    quantity: { type: Number, default: 1 }, //
    unit: { type: String, default: '', maxLength: 50 }, //
    rate: { type: Number, required: true }, //
    amount: { type: Number }, // Computed field
    sort_order: { type: Number, default: 0 }, //
  },
  { 
    collection: 'quotation_items' //
  }
);

// Mongoose v9: async pre-save, no next() callback needed
quotationItemSchema.pre('save', async function () {
  this.amount = this.quantity * this.rate;
});

quotationItemSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('QuotationItem', quotationItemSchema);