const path = require('path');
const fs = require('fs');
const multer = require('multer');

const WebHome = require('../models/web_home');
const WebAbout = require('../models/web_about');
const WebServicePackage = require('../models/web_service_package');
const WebProduct = require('../models/web_product');
const WebSettings = require('../models/web_settings');
const WebPortfolioCategory = require('../models/web_portfolio_category');

// ── Upload dir setup (served statically from /uploads, same convention as
//    the rest of the backend — kept as one predictable folder for Hostinger
//    FTP deploys: uploads/website/images, uploads/website/videos) ───────────
const imagesDir = path.join(__dirname, '..', 'uploads', 'website', 'images');
const videosDir = path.join(__dirname, '..', 'uploads', 'website', 'videos');
[imagesDir, videosDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function safeUnlink(relativePath) {
  try {
    if (!relativePath) return;
    const full = path.join(__dirname, '..', relativePath);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (err) {
    console.warn('safeUnlink failed:', err.message);
  }
}

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imagesDir),
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  },
});
exports.uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|png|webp|avif)/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files (jpeg, png, webp, avif) are allowed.'));
  },
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videosDir),
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  },
});
exports.uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 150 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/video\/(mp4|webm)/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only mp4/webm video files are allowed.'));
  },
});

// Wraps a multer .single(field) middleware so file-type/size-limit errors
// come back as 400s (multer's fileFilter `cb(new Error(...))` otherwise falls
// through to the generic 500 handler, since it never sets `err.status`).
exports.handleUpload = require('../middleware/handleUpload');
// CMS forms (hero poster, bento card image, team avatar, product photo, etc.)
exports.upload_image = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
  res.status(201).json({
    file_url: `/uploads/website/images/${req.file.filename}`,
    original_filename: req.file.originalname,
    file_size: req.file.size,
  });
};

// POST /api/v1/web-cms/upload/video
exports.upload_video = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video uploaded.' });
  res.status(201).json({
    file_url: `/uploads/website/videos/${req.file.filename}`,
    original_filename: req.file.originalname,
    file_size: req.file.size,
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// HOME — singleton document, get-or-create + full replace
// ═══════════════════════════════════════════════════════════════════════════

async function getOrCreateHome() {
  let doc = await WebHome.findById('web_home_singleton');
  if (!doc) doc = await WebHome.create({ _id: 'web_home_singleton' });
  return doc;
}

exports.get_home = async (req, res) => {
  try {
    res.json(await getOrCreateHome());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update_home = async (req, res) => {
  try {
    const doc = await getOrCreateHome();
    const { hero, hero_slides, grid_matrix, process: processData, about_preview, careers_banner, section_visibility } = req.body;
    if (hero) doc.hero = { ...doc.hero.toObject(), ...hero };
    if (hero_slides !== undefined) doc.hero_slides = hero_slides;
    if (grid_matrix) doc.grid_matrix = grid_matrix;
    if (processData) doc.process = processData;
    if (about_preview) doc.about_preview = { ...doc.about_preview.toObject(), ...about_preview };
    if (careers_banner) doc.careers_banner = { ...doc.careers_banner.toObject(), ...careers_banner };
    if (section_visibility) doc.section_visibility = { ...doc.section_visibility.toObject(), ...section_visibility };
    doc.updated_by = req.user ? req.user._id : null;
    await doc.save();
    res.json(doc);
  } catch (error) {
    console.error('❌ update_home error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ABOUT — singleton + team member sub-CRUD
// ═══════════════════════════════════════════════════════════════════════════

async function getOrCreateAbout() {
  let doc = await WebAbout.findById('web_about_singleton');
  if (!doc) doc = await WebAbout.create({ _id: 'web_about_singleton' });
  return doc;
}

exports.get_about = async (req, res) => {
  try {
    res.json(await getOrCreateAbout());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update_about = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const { narrative, studio_gallery, studio_video_url } = req.body;
    if (narrative) doc.narrative = { ...doc.narrative.toObject(), ...narrative };
    if (studio_gallery) doc.studio_gallery = studio_gallery;
    if (studio_video_url !== undefined) doc.studio_video_url = studio_video_url;
    doc.updated_by = req.user ? req.user._id : null;
    await doc.save();
    res.json(doc);
  } catch (error) {
    console.error('❌ update_about error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.add_team_member = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const { name, designation, avatar_url, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required.' });
    doc.team_members.push({ name, designation: designation || '', avatar_url: avatar_url || '', sort_order: sort_order || doc.team_members.length });
    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.update_team_member = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const member = doc.team_members.id(req.params.memberId);
    if (!member) return res.status(404).json({ error: 'Team member not found.' });
    ['name', 'designation', 'avatar_url', 'sort_order'].forEach((f) => {
      if (req.body[f] !== undefined) member[f] = req.body[f];
    });
    await doc.save();
    res.json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_team_member = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const member = doc.team_members.id(req.params.memberId);
    if (!member) return res.status(404).json({ error: 'Team member not found.' });
    safeUnlink(member.avatar_url);
    doc.team_members.pull({ _id: req.params.memberId });
    await doc.save();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVICES — full CRUD list (public packages catalog)
// ═══════════════════════════════════════════════════════════════════════════

exports.list_services_admin = async (req, res) => {
  try {
    const services = await WebServicePackage.find().sort({ sort_order: 1, created_at: -1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create_service = async (req, res) => {
  try {
    const { package_name, scope_summary, tier_classification, price_estimation, cover_image, highlights, is_published, is_featured_home, sort_order } = req.body;
    if (!package_name) return res.status(400).json({ error: 'package_name is required.' });
    const service = await WebServicePackage.create({
      package_name,
      scope_summary: scope_summary || '',
      tier_classification: tier_classification || 'other',
      price_estimation: price_estimation || '',
      cover_image: cover_image || '',
      highlights: highlights || [],
      is_published: is_published !== undefined ? is_published : true,
      is_featured_home: !!is_featured_home,
      sort_order: sort_order || 0,
      created_by: req.user ? req.user._id : null,
    });
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.update_service = async (req, res) => {
  try {
    const service = await WebServicePackage.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service package not found.' });
    const fields = ['package_name', 'scope_summary', 'tier_classification', 'price_estimation', 'cover_image', 'highlights', 'is_published', 'is_featured_home', 'sort_order'];
    fields.forEach((f) => { if (req.body[f] !== undefined) service[f] = req.body[f]; });
    await service.save();
    res.json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_service = async (req, res) => {
  try {
    const service = await WebServicePackage.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service package not found.' });
    safeUnlink(service.cover_image);
    await WebServicePackage.deleteOne({ _id: service._id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Public — only published packages
exports.list_services_public = async (req, res) => {
  try {
    const filter = { is_published: true };
    if (req.query.tier && req.query.tier !== 'all') filter.tier_classification = req.query.tier;
    const services = await WebServicePackage.find(filter).sort({ sort_order: 1, created_at: -1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTS — full CRUD (bespoke furnishings catalog)
// ═══════════════════════════════════════════════════════════════════════════

exports.list_products_admin = async (req, res) => {
  try {
    const products = await WebProduct.find().sort({ sort_order: 1, created_at: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create_product = async (req, res) => {
  try {
    const { title, material_specs, dimensions, category_tag, description, item_images, is_in_stock, is_published, sort_order } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required.' });
    const product = await WebProduct.create({
      title,
      material_specs: material_specs || '',
      dimensions: dimensions || '',
      category_tag: category_tag || 'other',
      description: description || '',
      item_images: item_images || [],
      is_in_stock: is_in_stock !== undefined ? is_in_stock : true,
      is_published: is_published !== undefined ? is_published : true,
      sort_order: sort_order || 0,
      created_by: req.user ? req.user._id : null,
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.update_product = async (req, res) => {
  try {
    const product = await WebProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const fields = ['title', 'material_specs', 'dimensions', 'category_tag', 'description', 'item_images', 'is_in_stock', 'is_published', 'sort_order'];
    fields.forEach((f) => { if (req.body[f] !== undefined) product[f] = req.body[f]; });
    await product.save();
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_product = async (req, res) => {
  try {
    const product = await WebProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    (product.item_images || []).forEach((img) => safeUnlink(img.file_url));
    await WebProduct.deleteOne({ _id: product._id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Public — only published, in either category or "all"
exports.list_products_public = async (req, res) => {
  try {
    const filter = { is_published: true };
    if (req.query.category && req.query.category !== 'all') filter.category_tag = req.query.category;
    const products = await WebProduct.find(filter).sort({ sort_order: 1, created_at: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.get_product_public = async (req, res) => {
  try {
    const product = await WebProduct.findOne({ _id: req.params.id, is_published: true });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS — singleton (contact info, socials, footer, SEO defaults)
// ═══════════════════════════════════════════════════════════════════════════

async function getOrCreateSettings() {
  let doc = await WebSettings.findById('web_settings_singleton');
  if (!doc) doc = await WebSettings.create({ _id: 'web_settings_singleton' });
  return doc;
}

exports.get_settings = async (req, res) => {
  try {
    res.json(await getOrCreateSettings());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update_settings = async (req, res) => {
  try {
    const doc = await getOrCreateSettings();
    const { contact, social_links, footer_text, seo_default_title, seo_default_description, legal } = req.body;
    if (contact) doc.contact = { ...doc.contact.toObject(), ...contact };
    if (social_links) doc.social_links = { ...doc.social_links.toObject(), ...social_links };
    if (footer_text !== undefined) doc.footer_text = footer_text;
    if (seo_default_title !== undefined) doc.seo_default_title = seo_default_title;
    if (seo_default_description !== undefined) doc.seo_default_description = seo_default_description;
    if (legal) doc.legal = { ...doc.legal.toObject(), ...legal };
    doc.updated_by = req.user ? req.user._id : null;
    await doc.save();
    res.json(doc);
  } catch (error) {
    console.error('❌ update_settings error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.get_settings_public = async (req, res) => {
  try {
    res.json(await getOrCreateSettings());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PORTFOLIO CATEGORIES — admin-managed free-form tag list (e.g. "Modular
// Kitchens", "Luxury Villas") used to tag Portfolio entries and filter them
// publicly, independent of the fixed project_type enum.
// ═══════════════════════════════════════════════════════════════════════════

exports.list_portfolio_categories = async (req, res) => {
  try {
    const categories = await WebPortfolioCategory.find().sort({ sort_order: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create_portfolio_category = async (req, res) => {
  try {
    const { name, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required.' });
    const existing = await WebPortfolioCategory.findOne({ name });
    if (existing) return res.status(400).json({ error: 'That category already exists.' });
    const category = await WebPortfolioCategory.create({ name, sort_order: sort_order || 0 });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_portfolio_category = async (req, res) => {
  try {
    const category = await WebPortfolioCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found.' });
    await WebPortfolioCategory.deleteOne({ _id: category._id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
