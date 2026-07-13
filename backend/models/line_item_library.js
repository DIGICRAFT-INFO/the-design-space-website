const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const lineItemLibrarySchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 }, //
    category: { type: String, required: true, maxLength: 100 }, // e.g. Civil, Electrical
    name: { type: String, required: true, maxLength: 300 }, // e.g. Modular Kitchen
    description: { type: String, default: '' }, //
    default_rate: { type: Number, default: 0 }, //
    unit: { type: String, default: '', maxLength: 50 }, // sqft, nos, lot
    is_active: { type: Boolean, default: true }, //
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'line_item_library', // db_table
  }
);

// Formatter to map _id to id and hide __v
lineItemLibrarySchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('LineItemLibrary', lineItemLibrarySchema);