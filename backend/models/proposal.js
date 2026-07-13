const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const proposalSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    project: { type: String, ref: 'Project', required: true }, //
    template: { type: String, ref: 'ProposalTemplate', default: null }, //
    prop_number: { type: String, required: true, unique: true }, //
    title: { type: String, required: true, maxLength: 300 }, //
    content: { type: String, default: '' }, // help_text: "Final rendered content..."
    status: { 
      type: String, 
      enum: ['draft', 'sent', 'accepted', 'rejected'], 
      default: 'draft' 
    }, //
    valid_until: { type: Date, default: null }, //
    notes: { type: String, default: '' }, //
    // Services attached to this proposal (for showcase in PDF)
    services: [{ type: String, ref: 'MasterService', default: [] }],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'proposals' // db_table
  }
);

proposalSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Proposal', proposalSchema);