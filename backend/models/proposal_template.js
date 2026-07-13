const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const proposalTemplateSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 }, //
    name: { 
      type: String, 
      required: true, 
      maxLength: 200 
    }, // help_text: "e.g. 'Residential Standard', 'Office Fitout'"
    description: { type: String, default: '' }, //
    content: { type: String, required: true }, // help_text: "Template body — use {{client_name}}..."
    is_active: { type: Boolean, default: true }, //
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'proposal_templates' // db_table
  }
);

proposalTemplateSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('ProposalTemplate', proposalTemplateSchema);