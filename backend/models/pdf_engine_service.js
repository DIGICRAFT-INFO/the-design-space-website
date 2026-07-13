const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');

// Assuming you will create these Mongoose models based on settings_panel app imports
const BrandTheme = require('../models/brand_theme');
const BankDetails = require('../models/bank_details');
const TaxSettings = require('../models/tax_settings');

// Common PDF Generator Function (Replaces WeasyPrint HTML().write_pdf() logic)
const generate_pdf_from_html = async (html_string) => {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  // Set HTML content
  await page.setContent(html_string, { waitUntil: 'networkidle0' });
  
  // Generate PDF buffer
  const pdf_buffer = await page.pdf({ 
    format: 'A4', 
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });
  
  await browser.close();
  return pdf_buffer;
};

// 1. Render Invoice PDF
exports.render_invoice_pdf = async (invoice) => {
  const brand = await BrandTheme.findOne();
  const bank = await BankDetails.findOne();
  const tax_cfg = await TaxSettings.findOne();

  // Populate items if not already populated
  if (!invoice.populated('items')) {
    await invoice.populate('items');
  }

  // Load and render EJS template (Replaces Django's render_to_string)
  const templatePath = path.join(__dirname, '../templates/pdf/invoice.ejs'); // Assumes you rename .html to .ejs
  
  const html_string = await ejs.renderFile(templatePath, {
    invoice: invoice,
    items: invoice.items,
    brand: brand,
    bank: bank,
    tax_cfg: tax_cfg,
    base_url: process.env.BASE_DIR || __dirname //
  });

  return await generate_pdf_from_html(html_string);
};

// 2. Render Quotation PDF
exports.render_quotation_pdf = async (quotation) => {
  const brand = await BrandTheme.findOne();
  const tax_cfg = await TaxSettings.findOne();

  if (!quotation.populated('items')) {
    await quotation.populate('items');
  }

  const templatePath = path.join(__dirname, '../templates/pdf/quotation.ejs');
  
  const html_string = await ejs.renderFile(templatePath, {
    quotation: quotation,
    items: quotation.items,
    brand: brand,
    tax_cfg: tax_cfg
  });

  return await generate_pdf_from_html(html_string);
};

// 3. Render Proposal PDF
exports.render_proposal_pdf = async (proposal) => {
  const brand = await BrandTheme.findOne();

  const templatePath = path.join(__dirname, '../templates/pdf/proposal.ejs');
  
  const html_string = await ejs.renderFile(templatePath, {
    proposal: proposal,
    brand: brand
  });

  return await generate_pdf_from_html(html_string);
};