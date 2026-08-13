const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const attachmentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    file_url: { type: String, required: true },
    original_filename: { type: String, default: '' },
    file_size: { type: Number, default: 0 },
    mime_type: { type: String, default: '' },
  },
  {
    _id: true,
    toJSON: {
      transform: (doc, ret) => { ret.id = ret._id; delete ret._id; },
    },
  }
);

const serviceInquirySchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    // Which service package triggered this inquiry
    service_name: { type: String, required: true, maxLength: 300 },
    service_id: { type: String, default: '' },

    // Contact details
    name: { type: String, required: true, maxLength: 200 },
    phone: { type: String, required: true, maxLength: 30 },
    email: { type: String, default: '', maxLength: 200 },

    // Inquiry content
    subject: { type: String, default: '', maxLength: 300 },
    description: { type: String, default: '', maxLength: 5000 },

    // Uploaded attachments (images, PDFs, JSON)
    attachments: [attachmentSchema],

    status: {
      type: String,
      enum: ['new', 'reviewed', 'in_progress', 'resolved', 'archived'],
      default: 'new',
    },

    // Admin note
    admin_note: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'service_inquiries',
  }
);

serviceInquirySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('ServiceInquiry', serviceInquirySchema);
