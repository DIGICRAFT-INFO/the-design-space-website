const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// One document per "update_quotation" call where something actually changed.
// Stores the field-level diff (old_value -> new_value) so the frontend can
// render a chronological list with red/green change highlighting.
const quotationHistorySchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    quotation: { type: String, ref: 'Quotation', required: true, index: true },
    version_snapshot: { type: Number, default: 1 }, // quotation.version at the time of this edit

    // [{ field: 'Discount Value', old_value: 5000, new_value: 7500 }, ...]
    changes: [
      {
        field: { type: String, required: true },
        old_value: { type: mongoose.Schema.Types.Mixed, default: null },
        new_value: { type: mongoose.Schema.Types.Mixed, default: null },
      },
    ],

    // Full pre-update snapshot (incl. items) — kept for reference / future restore.
    snapshot: { type: mongoose.Schema.Types.Mixed, default: null },

    changed_by: { type: String, ref: 'User', default: null },
    changed_by_name: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'quotation_history',
  }
);

quotationHistorySchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('QuotationHistory', quotationHistorySchema);