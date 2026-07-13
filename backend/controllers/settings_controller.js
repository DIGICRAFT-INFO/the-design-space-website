const { TaxSettings, BankDetails, BrandTheme, MilestoneTemplate, DocumentNumbering } = require('../models/settings');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ── Logo upload (multer config) ───────────────────────────────────────────────
const logo_storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'brand');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo${ext}`);
  },
});
const logo_upload = multer({
  storage: logo_storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed (png, jpg, jpeg, svg, webp)'));
  },
});
exports.logo_upload_middleware = logo_upload.single('logo');

// --- SINGLETON HELPER ---
const getSingleton = async (Model, res) => {
  try {
    const obj = await Model.findOne();
    res.json(obj || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateSingleton = async (Model, req, res) => {
  try {
    const obj = await Model.findOneAndUpdate({}, req.body, { 
      new: true, upsert: true, setDefaultsOnInsert: true 
    });
    res.json(obj);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// --- SINGLETON CONTROLLERS ---
exports.get_tax_settings = (req, res) => getSingleton(TaxSettings, res);
exports.update_tax_settings = (req, res) => updateSingleton(TaxSettings, req, res);

exports.get_bank_details = (req, res) => getSingleton(BankDetails, res);
exports.update_bank_details = (req, res) => updateSingleton(BankDetails, req, res);

exports.get_brand_theme = (req, res) => getSingleton(BrandTheme, res);
exports.update_brand_theme = (req, res) => updateSingleton(BrandTheme, req, res);

exports.get_document_numbering = (req, res) => getSingleton(DocumentNumbering, res);
exports.update_document_numbering = (req, res) => updateSingleton(DocumentNumbering, req, res);

// --- MILESTONE TEMPLATES (Standard CRUD) ---
exports.get_milestones = async (req, res) => {
  try {
    const milestones = await MilestoneTemplate.find().sort('sort_order');
    res.json(milestones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create_milestone = async (req, res) => {
  try {
    const milestone = await MilestoneTemplate.create(req.body);
    res.status(201).json(milestone);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.get_milestone_detail = async (req, res) => {
  try {
    const milestone = await MilestoneTemplate.findById(req.params.pk);
    if (!milestone) return res.status(404).json({ detail: 'Not found.' });
    res.json(milestone);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update_milestone = async (req, res) => {
  try {
    const milestone = await MilestoneTemplate.findByIdAndUpdate(req.params.pk, req.body, { new: true });
    if (!milestone) return res.status(404).json({ detail: 'Not found.' });
    res.json(milestone);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_milestone = async (req, res) => {
  try {
    const milestone = await MilestoneTemplate.findByIdAndDelete(req.params.pk);
    if (!milestone) return res.status(404).json({ detail: 'Not found.' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- LOGO UPLOAD ---
exports.upload_logo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    // Store relative path in DB (e.g. "uploads/brand/logo.png")
    const logo_path = `uploads/brand/${req.file.filename}`;

    const brand = await BrandTheme.findOneAndUpdate(
      {},
      { logo: logo_path },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ logo: logo_path, brand });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};