const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const masterServiceSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      maxLength: 200,
    },
    description: {
      type: String,
      required: [true, 'Service description is required'],
      maxLength: 2000,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    media: [{
      file_url: { type: String, required: true },
      file_type: { type: String, enum: ['image', 'video', 'pdf'], required: true },
      file_size: { type: Number, required: true },
      original_filename: { type: String, required: true },
      uploaded_at: { type: Date, default: Date.now },
    }],
    created_by: { type: String, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'master_services',
  }
);

masterServiceSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('MasterService', masterServiceSchema);
