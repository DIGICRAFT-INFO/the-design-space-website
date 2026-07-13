const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const enquirySchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    client_name: { type: String, required: true, maxLength: 200 },
    mobile_number: { type: String, required: true, maxLength: 20 },
    // address/date/time stay required for MANUAL (CRM) entries — enforced in
    // the controller — but relaxed at the schema level so website leads
    // (which don't collect these) can be saved with sane defaults.
    address: { type: String, default: '' },
    enquiry_date: { type: Date, default: Date.now },
    enquiry_time: { type: String, default: '', maxLength: 10 },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['new', 'contacted', 'converted', 'lost'],
      default: 'new',
    },
    // Where this enquiry came from — lets the CRM Enquiries list distinguish
    // manual staff-logged calls from public website Contact-form submissions.
    source: { type: String, enum: ['manual', 'website'], default: 'manual' },
    email: { type: String, default: '', maxLength: 200 },
    budget_range: { type: String, default: '', maxLength: 100 },
    created_by: { type: String, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'enquiries',
  }
);

enquirySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('Enquiry', enquirySchema);