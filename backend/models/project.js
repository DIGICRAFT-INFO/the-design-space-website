const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const projectSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    client: { type: String, ref: 'Client', required: true }, // Foreign key mapping
    name: { type: String, required: true, maxLength: 200 },
    property_type: { 
      type: String, 
      enum: ['apartment', 'villa', 'office', 'commercial'], 
      required: true 
    },
    style_category: { 
      type: String, 
      enum: ['modern', 'traditional', 'minimalist', 'contemporary', ''], 
      default: '' 
    },
    area_sqft: { type: Number, default: null }, // DecimalField mapped to Number
    budget_range: { type: String, default: '' },
    start_date: { type: Date, default: null },
    expected_end_date: { type: Date, default: null },
    status: { 
      type: String, 
      enum: ['active', 'on_hold', 'completed'], 
      default: 'active' 
    },
    notes: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'projects' // Django: db_table = 'projects'
  }
);

projectSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Project', projectSchema);