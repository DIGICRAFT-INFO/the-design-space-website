const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const clientSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 }, // Django: id = models.UUIDField(...)
    full_name: { type: String, required: true, maxLength: 200 },
    email: { type: String, default: '' },
    phone: { type: String, required: true, maxLength: 15 },
    billing_address: { type: String, required: true },
    site_address: { type: String, default: '' },
    gstin: { type: String, default: '', maxLength: 15 },
    client_type: {
      type: String,
      enum: ['local', 'vendor', 'corporate', 'builder', 'architect', 'other', ''],
      default: ''
    },
    lead_source: {
      type: String,
      enum: ['instagram', 'facebook', 'google', 'website', 'walkin', 'referral', 'architect', 'builder', 'broker', 'portal', 'other', ''],
      default: ''
    },
    lead_source_other: { type: String, default: '', maxLength: 120 },
    city: { type: String, default: '', maxLength: 80 },
    state: { type: String, default: '', maxLength: 80 },
    country: { type: String, default: 'India', maxLength: 80 }, // Django: default="India"
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'clients' // Django: db_table = 'clients'
  }
);

// Virtual for Projects (Django ke related_name='projects' ki tarah)
clientSchema.virtual('projects', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'client'
});

// JSON Formatting
clientSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Client', clientSchema);