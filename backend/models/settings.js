const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const toJSONConfig = {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
};

// 1. Tax Settings (Singleton)
const taxSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  firm_gstin: { type: String, required: true, maxLength: 15 },
  default_cgst: { type: Number, default: 9 },
  default_sgst: { type: Number, default: 9 },
  default_igst: { type: Number, default: 0 },
  place_of_supply: { type: String, default: '', maxLength: 100 },
  sac_code: { type: String, default: '', maxLength: 10 },
  gst_enabled: { type: Boolean, default: false },
}, { timestamps: { createdAt: false, updatedAt: 'updated_at' }, collection: 'tax_settings' });
taxSettingsSchema.set('toJSON', toJSONConfig);

// 2. Bank Details (Singleton)
const bankDetailsSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  bank_name: { type: String, required: true, maxLength: 200 },
  account_number: { type: String, required: true, maxLength: 50 },
  ifsc_code: { type: String, required: true, maxLength: 20 },
  account_name: { type: String, required: true, maxLength: 200 },
  upi_id: { type: String, default: '', maxLength: 100 },
  upi_qr_code: { type: String, default: null },
}, { timestamps: { createdAt: false, updatedAt: 'updated_at' }, collection: 'bank_details' });
bankDetailsSchema.set('toJSON', toJSONConfig);

// 3. Brand Theme (Singleton)
const brandThemeSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  firm_name: { type: String, required: true, maxLength: 200 },
  firm_address: { type: String, required: true },
  firm_phone: { type: String, default: '', maxLength: 20 },
  firm_email: { type: String, default: '' },
  logo: { type: String, default: null },
  primary_color: { type: String, default: '#2C3E50', maxLength: 7 },
  signature: { type: String, default: null },
  footer_text: { type: String, default: '' },
}, { timestamps: { createdAt: false, updatedAt: 'updated_at' }, collection: 'brand_theme' });
brandThemeSchema.set('toJSON', toJSONConfig);

// 4. Milestone Template (Multiple rows)
const milestoneTemplateSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  label: { type: String, required: true, maxLength: 200 },
  percentage: { type: Number, required: true },
  sort_order: { type: Number, default: 0 },
}, { collection: 'milestone_templates' });
milestoneTemplateSchema.set('toJSON', toJSONConfig);

// 5. Document Numbering (Singleton)
const documentNumberingSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  quote_prefix: { type: String, default: 'QUOTE', maxLength: 20 },
  invoice_prefix: { type: String, default: 'INV', maxLength: 20 },
  reset_yearly: { type: Boolean, default: true },
}, { timestamps: { createdAt: false, updatedAt: 'updated_at' }, collection: 'document_numbering' });
documentNumberingSchema.set('toJSON', toJSONConfig);

// 6. Terms & Conditions Templates (Singleton — one doc per document type)
const termsTemplateSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  quotation_terms: { type: String, default: '1. This quotation is valid until the date mentioned above.\n2. 50% advance payment required to commence work.\n3. Balance payment due before final handover.\n4. Any changes to scope may result in revised quotation.\n5. All prices are inclusive of taxes as applicable.' },
  invoice_terms:   { type: String, default: '1. Payment is due within 15 days of invoice date.\n2. Late payments may attract interest at 2% per month.\n3. Please quote invoice number in all payments.\n4. Cheques to be drawn in favour of The Design Space.' },
  proposal_terms:  { type: String, default: '1. This proposal is valid for 30 days from date of issue.\n2. All designs and concepts remain property of The Design Space until full payment.\n3. Revisions beyond agreed scope will be charged separately.' },
}, { timestamps: { createdAt: false, updatedAt: 'updated_at' }, collection: 'terms_templates' });
termsTemplateSchema.set('toJSON', toJSONConfig);

module.exports = {
  TaxSettings: mongoose.model('TaxSettings', taxSettingsSchema),
  BankDetails: mongoose.model('BankDetails', bankDetailsSchema),
  BrandTheme: mongoose.model('BrandTheme', brandThemeSchema),
  MilestoneTemplate: mongoose.model('MilestoneTemplate', milestoneTemplateSchema),
  DocumentNumbering: mongoose.model('DocumentNumbering', documentNumberingSchema),
  TermsTemplate: mongoose.model('TermsTemplate', termsTemplateSchema),
};