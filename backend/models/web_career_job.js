const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const webCareerJobSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    title: { type: String, required: true, maxLength: 200 },
    department: { type: String, default: '', maxLength: 100 },
    location: { type: String, default: 'Mumbai, India', maxLength: 150 },
    employment_type: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'internship'],
      default: 'full_time',
    },
    description: { type: String, default: '' },
    requirements: [{ type: String, maxLength: 300 }],
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    sort_order: { type: Number, default: 0 },
    created_by: { type: String, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'web_career_jobs',
  }
);

webCareerJobSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('WebCareerJob', webCareerJobSchema);
