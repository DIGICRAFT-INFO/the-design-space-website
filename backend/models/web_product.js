const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const productImageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    file_url: { type: String, required: true },
    sort_order: { type: Number, default: 0 },
  },
  {
    _id: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

const webProductSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    title: { type: String, required: true, maxLength: 200 },
    material_specs: { type: String, default: '', maxLength: 500 },
    dimensions: { type: String, default: '', maxLength: 200 },
    category_tag: {
      type: String,
      enum: ['seating', 'lighting', 'kitchen_modules', 'decor', 'other'],
      default: 'other',
    },
    category_label: { type: String, default: '', maxLength: 100 }, // custom label when category is "other"
    published_date: { type: Date, default: null }, // manual date shown on public website
    description: { type: String, default: '', maxLength: 2000 },
    item_images: [productImageSchema],
    is_in_stock: { type: Boolean, default: true },
    is_published: { type: Boolean, default: true },
    sort_order: { type: Number, default: 0 },
    created_by: { type: String, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'web_products',
  }
);

webProductSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('WebProduct', webProductSchema);
