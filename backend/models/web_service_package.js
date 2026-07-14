const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Public "Services" catalog — Residential Masterclass, Commercial Identity,
// Premium Turnkey Solutions, etc. This is intentionally separate from
// MasterService (models/master_service.js), which is the internal service
// catalogue used when building quotations for a specific client project.

const webServicePackageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    package_name: { type: String, required: true, maxLength: 200 },
    scope_summary: { type: String, default: '', maxLength: 2000 },
    tier_classification: {
      type: String,
      enum: ['residential', 'commercial', 'consultation', 'turnkey', 'other'],
      default: 'other',
    },
    tier_label: { type: String, default: '', maxLength: 100 }, // custom label when tier is "other"
    published_date: { type: Date, default: null }, // manual date shown on public website
    price_estimation: { type: String, default: '', maxLength: 100 }, // e.g. "Starting ₹1,800/sqft"
    cover_image: { type: String, default: '' },
    highlights: [{ type: String, maxLength: 200 }], // bullet list inside the accordion/tab
    is_published: { type: Boolean, default: true },
    is_featured_home: { type: Boolean, default: false }, // shown in Home "Services Quick Grid"
    sort_order: { type: Number, default: 0 },
    created_by: { type: String, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'web_service_packages',
  }
);

webServicePackageSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('WebServicePackage', webServicePackageSchema);
