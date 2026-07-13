const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const serviceAssignmentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    service: { type: String, ref: 'MasterService', required: true },
    client: { type: String, ref: 'Client', required: true },
    assigned_by: { type: String, ref: 'User', required: true },
    assigned_at: { type: Date, default: Date.now },
  },
  {
    collection: 'service_assignments',
  }
);

// Compound unique index to prevent duplicate service-client assignments
serviceAssignmentSchema.index({ service: 1, client: 1 }, { unique: true });

serviceAssignmentSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('ServiceAssignment', serviceAssignmentSchema);
