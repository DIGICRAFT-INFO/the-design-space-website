const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const webPortfolioCategorySchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true, unique: true, maxLength: 100 },
    sort_order: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'web_portfolio_categories',
  }
);

webPortfolioCategorySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('WebPortfolioCategory', webPortfolioCategorySchema);
