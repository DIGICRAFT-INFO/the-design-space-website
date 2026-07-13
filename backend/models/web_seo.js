const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const webSeoSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    route_path: { type: String, required: true, unique: true, maxLength: 300 }, // e.g. "/", "/about", "/blog/my-post"
    meta_title: { type: String, default: '', maxLength: 70 },
    meta_description: { type: String, default: '', maxLength: 200 },
    meta_keywords: [{ type: String, maxLength: 60 }],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'web_seo_entries',
  }
);

webSeoSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('WebSeo', webSeoSchema);
