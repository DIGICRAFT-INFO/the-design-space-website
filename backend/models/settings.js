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
  invoice_terms: { type: String, default: '1. This invoice covers only the services specifically mentioned herein and/or in the approved quotation/proposal. Any additional services shall be charged separately.\n2. Payment shall be made within the due date mentioned on the invoice. Delay in payment may result in suspension of services and/or corresponding extension of the project timeline.\n3. The quoted fee includes only the agreed scope of work. Additional revisions, changes in requirements, or work outside the approved scope may attract additional charges.\n4. Project timelines are subject to timely receipt of required information, approvals, drawings, selections and decisions from the client.\n5. All drawings, designs, concepts, 3D views, specifications and related documents prepared by The Design Space remain its intellectual property unless otherwise agreed in writing.\n6. Design documents shall be used only for the project for which they are issued and shall not be reproduced, modified or reused for another project without written permission.\n7. Any additional site visits, travel, statutory approvals, specialist consultants, testing, printing or third-party expenses not specifically included in the agreed scope shall be charged separately.\n8. Design and execution decisions are based on the information and site conditions available at the time. Unforeseen site conditions or changes by other agencies may require additional work and charges.\n9. Applicable GST and other statutory taxes/charges shall be levied as per prevailing regulations.\n10. In case of cancellation or termination of the project, fees for all services completed or work in progress up to the date of termination shall remain payable.\n11. Any invoice-related discrepancy should be communicated within 7 days of receipt of the invoice.\n12. This invoice shall be read together with the approved quotation/proposal/agreement governing the project. In case of conflict, the terms of the signed agreement shall prevail.' },
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