const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const webBlogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    title: { type: String, required: true, maxLength: 250 },
    slug: { type: String, required: true, unique: true, maxLength: 250, lowercase: true, trim: true },
    cover_image: { type: String, default: '' },
    excerpt: { type: String, default: '', maxLength: 400 },
    content: { type: String, default: '' }, // markdown
    category: { type: String, default: '', maxLength: 100 },
    tags: [{ type: String, maxLength: 50 }],
    author_name: { type: String, default: 'The Design Space', maxLength: 200 },
    read_time_minutes: { type: Number, default: 4 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    published_at: { type: Date, default: null },
    created_by: { type: String, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'web_blog_posts',
  }
);

webBlogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('WebBlog', webBlogSchema);
