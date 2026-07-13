const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const inAppNotificationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    user: { type: String, ref: 'User', default: null },
    event_type: {
      type: String,
      enum: [
        // Client
        'client_created',
        // Invoice
        'invoice_created',
        'invoice_sent',
        'invoice_paid',
        // Quotation
        'quotation_created',
        'quotation_approved',
        'quotation_rejected',
        // Payment
        'payment_received',
        // Proposal
        'proposal_created',
        'proposal_sent',
        'proposal_accepted',
        'proposal_rejected',
        // Project (BUG FIX: was missing)
        'project_created',
        'project_status_changed',
        // Master Service (BUG FIX: was missing)
        'service_created',
        // Portfolio (BUG FIX: was missing)
        'portfolio_created',
        // Enquiry
        'enquiry_received',
        'career_application_received',
      ],
      required: true
    },
    title: { type: String, required: true, maxLength: 200 },
    message: { type: String, required: true, maxLength: 500 },
    reference_id: { type: String, default: null },
    reference_type: { type: String, default: null },
    is_read: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
  },
  {
    collection: 'in_app_notifications'
  }
);

inAppNotificationSchema.index({ user: 1, is_read: 1, created_at: -1 });

inAppNotificationSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('InAppNotification', inAppNotificationSchema);
