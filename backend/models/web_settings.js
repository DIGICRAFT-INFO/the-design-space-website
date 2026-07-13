const mongoose = require('mongoose');

// Singleton — website-wide info (distinct from models/settings.js which
// holds invoicing/tax/bank settings for the CRM's PDF documents).

const webSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'web_settings_singleton' },

    contact: {
      office_address: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      working_hours: { type: String, default: 'Mon – Sat, 10:00 AM – 7:00 PM' },
      map_embed_url: { type: String, default: '' },
    },

    social_links: {
      instagram: { type: String, default: '' },
      pinterest: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      facebook: { type: String, default: '' },
    },

    footer_text: { type: String, default: '' },
    seo_default_title: { type: String, default: 'The Design Space — Luxury Interior Design' },
    seo_default_description: { type: String, default: '' },

    legal: {
      privacy_policy: { type: String, default: '' },
      copyright_terms: { type: String, default: '' },
    },

    updated_by: { type: String, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'web_settings',
  }
);

webSettingsSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('WebSettings', webSettingsSchema);
