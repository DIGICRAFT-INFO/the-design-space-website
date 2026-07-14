const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const portfolioImageSchema = new mongoose.Schema(
  {
    file_url: { type: String, required: true },
    caption: { type: String, default: '', maxLength: 200 },
    file_size: { type: Number, default: 0 },
    original_filename: { type: String, default: '' },
    sort_order: { type: Number, default: 0 },
    uploaded_at: { type: Date, default: Date.now },
  },
  {
    _id: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
      },
    },
  }
);

const portfolioDocumentSchema = new mongoose.Schema(
  {
    file_url: { type: String, required: true },
    title: { type: String, default: '', maxLength: 200 },
    file_size: { type: Number, default: 0 },
    original_filename: { type: String, default: '' },
    uploaded_at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const portfolioSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    project: { type: String, ref: 'Project', default: null }, // optional — portfolio can be standalone
    title: { type: String, required: true, maxLength: 200 },
    category: {
      type: String,
      enum: ['living_room', 'bedroom', 'kitchen', 'bathroom', 'office', 'full_home', 'other'],
      default: 'other',
    },
    description: { type: String, default: '', maxLength: 2000 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    images: [portfolioImageSchema],
    documents: [portfolioDocumentSchema],
    created_by: { type: String, ref: 'User', default: null },

    // ── Public website fields (Portfolio page on thedesignspace.in) ──────────
    // NOTE: `category` above is the internal room-type taxonomy used by the CRM.
    // `project_type` is the separate, public-facing filter shown on the website
    // (Residential / Commercial / Renovation) — kept distinct on purpose so the
    // existing CRM category behaviour is never disturbed.
    project_type: {
      type: String,
      enum: ['residential', 'commercial', 'renovation', 'other'],
      default: 'other',
    },
    project_type_label: { type: String, default: '', maxLength: 100 }, // custom label when project_type is "other"
    // Free-form, admin-managed categories (e.g. "Modular Kitchens", "Luxury
    // Villas") — separate from project_type, which is the fixed public filter.
    custom_categories: [{ type: String, maxLength: 100 }],
    is_featured: { type: Boolean, default: false }, // shown in Home bento grid
    sort_order: { type: Number, default: 0 },
    metrics: {
      location: { type: String, default: '', maxLength: 200 },
      area_sqft: { type: Number, default: null },
      scope_duration: { type: String, default: '', maxLength: 100 },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'portfolios',
  }
);

portfolioSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('Portfolio', portfolioSchema);