const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const webCareerApplicationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    job: { type: String, ref: 'WebCareerJob', default: null },
    job_title_snapshot: { type: String, default: '', maxLength: 200 }, // survives job deletion
    applicant_name: { type: String, required: true, maxLength: 200 },
    email: { type: String, required: true, maxLength: 200 },
    phone: { type: String, required: true, maxLength: 20 },
    cover_note: { type: String, default: '', maxLength: 2000 },
    resume_url: { type: String, default: '' },
    resume_filename: { type: String, default: '' },
    status: { type: String, enum: ['new', 'reviewed', 'archived'], default: 'new' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'web_career_applications',
  }
);

webCareerApplicationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('WebCareerApplication', webCareerApplicationSchema);
