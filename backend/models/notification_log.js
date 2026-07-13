const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const notificationLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 }, //
    channel: { 
      type: String, 
      enum: ['whatsapp', 'email'], 
      required: true 
    }, //
    doc_type: { 
      type: String, 
      enum: ['invoice', 'quotation', 'reminder', 'proposal'], // Added proposal from your views
      required: true 
    }, //
    doc_id: { type: String, required: true }, // UUID string
    recipient: { type: String, required: true, maxLength: 200 }, //
    status: { 
      type: String, 
      enum: ['sent', 'failed', 'pending'], 
      default: 'pending' 
    }, //
    error: { type: String, default: '' }, //
    wa_message_id: { type: String, default: '', maxLength: 200 }, //
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false }, // Only created_at is in Django model
    collection: 'notification_logs' // db_table
  }
);

// Formatting for list views
notificationLogSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('NotificationLog', notificationLogSchema);