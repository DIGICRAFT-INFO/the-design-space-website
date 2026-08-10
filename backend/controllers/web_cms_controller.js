const path = require('path');
const fs = require('fs');

const WebHome = require('../models/web_home');
const WebAbout = require('../models/web_about');
const WebServicePackage = require('../models/web_service_package');
const WebProduct = require('../models/web_product');
const WebSettings = require('../models/web_settings');
const WebPortfolioCategory = require('../models/web_portfolio_category');

// ── Cloudinary upload helpers ─────────────────────────────────────────────────
const { uploadImage: cloudinaryUploadImage, uploadVideo: cloudinaryUploadVideo, safeDelete } = require('../lib/cloudinary');

exports.uploadImage = cloudinaryUploadImage;
exports.uploadVideo = cloudinaryUploadVideo;

function safeUnlink(fileUrl) {
  // For Cloudinary URLs, delete from cloud; for legacy local paths, delete from disk
  if (!fileUrl) return;
  if (fileUrl.startsWith('http')) {
    safeDelete(fileUrl).catch(() => {});
  } else {
    try {
      const full = path.join(__dirname, '..', fileUrl);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    } catch (err) {
      console.warn('safeUnlink failed:', err.message);
    }
  }
}

exports.handleUpload = require('../middleware/handleUpload');

// POST /api/v1/web-cms/upload/image
exports.upload_image = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
  // Cloudinary: req.file.path is the secure_url; local: build path from filename
  const file_url = req.file.path || req.file.secure_url ||
    (req.file.filename ? `/uploads/website/images/${req.file.filename}` : null);
  if (!file_url) return res.status(500).json({ error: 'Upload failed — no URL returned.' });
  res.status(201).json({
    file_url,
    original_filename: req.file.originalname,
    file_size: req.file.size,
  });
};

// POST /api/v1/web-cms/upload/video
exports.upload_video = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video uploaded.' });
  const file_url = req.file.path || req.file.secure_url ||
    (req.file.filename ? `/uploads/website/videos/${req.file.filename}` : null);
  if (!file_url) return res.status(500).json({ error: 'Upload failed — no URL returned.' });
  res.status(201).json({
    file_url,
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

  // Seed default content for new sections if not yet filled
  let dirty = false;

  if (!doc.who_we_are || !doc.who_we_are.title) {
    doc.who_we_are = {
      title: 'Crafting Spaces That Speak',
      body: 'The Design Space is a full-service interior design studio rooted in the belief that great spaces are never accidental. We blend timeless aesthetics with purposeful functionality — creating homes and commercial environments that feel considered, personal, and enduring. Every project we take on is a dialogue: between your vision and ours, between structure and softness, between restraint and richness.',
      background_image: '',
    };
    dirty = true;
  }

  if (!doc.mission || !doc.mission.title) {
    doc.mission = {
      title: 'Design That Serves Life',
      body: 'Our mission is to transform spaces into experiences — environments that are not only visually compelling but deeply functional. We believe every square foot should serve a purpose, and every detail should carry intention. From first concept to final styling, we bring clarity, craft, and care to every decision we make on behalf of our clients.',
    };
    dirty = true;
  }

  if (!doc.vision || !doc.vision.title) {
    doc.vision = {
      title: 'A Future Where Beauty and Function Are Inseparable',
      body: 'We envision a world where thoughtfully designed spaces are accessible to everyone — where interior design is not a luxury reserved for the few, but a transformative tool available to all. The Design Space strives to lead that shift: raising the standard of design in India, one considered space at a time.',
    };
    dirty = true;
  }

  if (dirty) await doc.save();
  return doc;
}

exports.get_about = async (req, res) => {
  try {
    res.json(await getOrCreateAbout());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.get_about_public = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const obj = doc.toJSON();
    // Sort values by sort_order
    obj.values = (obj.values || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    // Filter industries to published only, then sort
    obj.industries = (obj.industries || [])
      .filter((ind) => ind.is_published)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update_about = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const { narrative, about_slides, studio_gallery, studio_video_url, who_we_are, mission, vision } = req.body;
    if (narrative) doc.narrative = { ...doc.narrative.toObject(), ...narrative };
    if (about_slides !== undefined) doc.about_slides = about_slides;
    if (studio_gallery) doc.studio_gallery = studio_gallery;
    if (studio_video_url !== undefined) doc.studio_video_url = studio_video_url;
    if (who_we_are) {
      // Preserve existing slider_images unless explicitly sent
      const existing = doc.who_we_are.toObject ? doc.who_we_are.toObject() : doc.who_we_are;
      doc.who_we_are = { ...existing, ...who_we_are };
    }
    if (mission) {
      const existing = doc.mission.toObject ? doc.mission.toObject() : doc.mission;
      doc.mission = { ...existing, ...mission };
    }
    if (vision) {
      const existing = doc.vision.toObject ? doc.vision.toObject() : doc.vision;
      doc.vision = { ...existing, ...vision };
    }
    doc.updated_by = req.user ? req.user._id : null;
    await doc.save();
    res.json(doc);
  } catch (error) {
    console.error('❌ update_about error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ── Section Slider Image CRUD ─────────────────────────────────────────────
// Shared logic: section = 'who_we_are' | 'mission' | 'vision'

const VALID_SECTIONS = ['who_we_are', 'mission', 'vision'];

function validateSection(section) {
  return VALID_SECTIONS.includes(section);
}

// POST /about/sections/:section/images  — add one image to slider
exports.add_section_image = async (req, res) => {
  const { section } = req.params;
  if (!validateSection(section)) return res.status(400).json({ error: 'Invalid section.' });
  try {
    const doc = await getOrCreateAbout();
    const { image_url, alt_text, sort_order } = req.body;
    if (!image_url) return res.status(400).json({ error: 'image_url is required.' });
    doc[section].slider_images.push({
      image_url,
      alt_text: alt_text || '',
      sort_order: sort_order !== undefined ? sort_order : doc[section].slider_images.length,
    });
    doc.markModified(section);
    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// PATCH /about/sections/:section/images/:imageId  — update one image
exports.update_section_image = async (req, res) => {
  const { section, imageId } = req.params;
  if (!validateSection(section)) return res.status(400).json({ error: 'Invalid section.' });
  try {
    const doc = await getOrCreateAbout();
    const img = doc[section].slider_images.id(imageId);
    if (!img) return res.status(404).json({ error: 'Image not found.' });
    ['image_url', 'alt_text', 'sort_order'].forEach((f) => {
      if (req.body[f] !== undefined) img[f] = req.body[f];
    });
    doc.markModified(section);
    await doc.save();
    res.json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// DELETE /about/sections/:section/images/:imageId  — remove one image
exports.delete_section_image = async (req, res) => {
  const { section, imageId } = req.params;
  if (!validateSection(section)) return res.status(400).json({ error: 'Invalid section.' });
  try {
    const doc = await getOrCreateAbout();
    const img = doc[section].slider_images.id(imageId);
    if (!img) return res.status(404).json({ error: 'Image not found.' });
    safeUnlink(img.image_url);
    doc[section].slider_images.pull({ _id: imageId });
    doc.markModified(section);
    await doc.save();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /about/sections/:section/images — replace entire slider image array
exports.replace_section_images = async (req, res) => {
  const { section } = req.params;
  if (!validateSection(section)) return res.status(400).json({ error: 'Invalid section.' });
  try {
    const doc = await getOrCreateAbout();
    const { images } = req.body; // [{ image_url, alt_text, sort_order }]
    if (!Array.isArray(images)) return res.status(400).json({ error: 'images array is required.' });
    doc[section].slider_images = images.map((img, i) => ({
      image_url: img.image_url || '',
      alt_text: img.alt_text || '',
      sort_order: img.sort_order !== undefined ? img.sort_order : i,
    }));
    doc.markModified(section);
    await doc.save();
    res.json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.add_team_member = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const { name, designation, avatar_url, sort_order, is_founder, bio, social_instagram, social_linkedin } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required.' });
    doc.team_members.push({
      name,
      designation: designation || '',
      avatar_url: avatar_url || '',
      sort_order: sort_order || doc.team_members.length,
      is_founder: !!is_founder,
      bio: bio || '',
      social_instagram: social_instagram || '',
      social_linkedin: social_linkedin || '',
    });
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
    ['name', 'designation', 'avatar_url', 'sort_order', 'is_founder', 'bio', 'social_instagram', 'social_linkedin'].forEach((f) => {
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

// ── Values CRUD ─────────────────────────────────────────────────────────────

exports.add_value = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const { icon, title, description, sort_order } = req.body;
    doc.values.push({
      icon: icon || '',
      title: title || '',
      description: description || '',
      sort_order: sort_order || 0,
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.update_value = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const item = doc.values.id(req.params.valueId);
    if (!item) return res.status(404).json({ error: 'Value item not found.' });
    ['icon', 'title', 'description', 'sort_order'].forEach((f) => {
      if (req.body[f] !== undefined) item[f] = req.body[f];
    });
    await doc.save();
    res.json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_value = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const item = doc.values.id(req.params.valueId);
    if (!item) return res.status(404).json({ error: 'Value item not found.' });
    doc.values.pull({ _id: req.params.valueId });
    await doc.save();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Industries CRUD ──────────────────────────────────────────────────────────

exports.add_industry = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const { name, icon_url, description, sort_order, is_published } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required.' });
    doc.industries.push({
      name,
      icon_url: icon_url || '',
      description: description || '',
      sort_order: sort_order || 0,
      is_published: !!is_published,
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.update_industry = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const item = doc.industries.id(req.params.industryId);
    if (!item) return res.status(404).json({ error: 'Industry not found.' });
    ['name', 'icon_url', 'description', 'sort_order', 'is_published'].forEach((f) => {
      if (req.body[f] !== undefined) item[f] = req.body[f];
    });
    await doc.save();
    res.json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_industry = async (req, res) => {
  try {
    const doc = await getOrCreateAbout();
    const item = doc.industries.id(req.params.industryId);
    if (!item) return res.status(404).json({ error: 'Industry not found.' });
    doc.industries.pull({ _id: req.params.industryId });
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

// Public — show all packages (published filter removed so CMS items always appear)
exports.list_services_public = async (req, res) => {
  try {
    const filter = {};
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

// Public — show all products regardless of is_published
exports.list_products_public = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== 'all') filter.category_tag = req.query.category;
    const products = await WebProduct.find(filter).sort({ sort_order: 1, created_at: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.get_product_public = async (req, res) => {
  try {
    const product = await WebProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS — singleton (contact info, socials, footer, SEO defaults)
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_PRIVACY_POLICY = `# Privacy Policy

**Effective Date:** January 1, 2024
**Last Updated:** July 2025

## 1. Introduction

The Design Space ("we", "our", or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you visit our website at thedesignspace.in or contact us for our interior design services.

## 2. Information We Collect

We may collect the following information:

- **Personal details** — Name, phone number, email address
- **Project details** — Location, budget range, requirements you share with us
- **Usage data** — Pages visited, time spent, browser/device information (via cookies)

## 3. How We Use Your Information

We use the information to:

- Respond to your enquiries and provide design consultation
- Prepare proposals, quotations, and project documentation
- Send relevant updates about your project
- Improve our website and services

We do **not** sell, rent, or trade your personal information to third parties.

## 4. Data Security

Your data is stored securely. We use industry-standard practices to protect your information from unauthorised access, disclosure, or misuse.

## 5. Cookies

Our website may use cookies to enhance your browsing experience. You can disable cookies in your browser settings at any time.

## 6. Third-Party Services

We may use trusted third-party services (e.g., Google Maps, email delivery) that have their own privacy policies. We are not responsible for their practices.

## 7. Your Rights

You have the right to:
- Request access to the personal data we hold about you
- Request correction or deletion of your data
- Withdraw consent at any time

To exercise these rights, contact us at **hello@thedesignspace.in** or call **+91 93001 20500**.

## 8. Changes to This Policy

We may update this policy periodically. The latest version will always be available on this page.

## 9. Contact Us

**The Design Space**
Raipur, Chhattisgarh 492001
 +91 93001 20500
 thedesignspace.in`;

const DEFAULT_COPYRIGHT_TERMS = `# Copyright & Terms of Use

**Effective Date:** January 1, 2024
**Last Updated:** July 2025

## 1. Ownership

All content on this website — including but not limited to text, images, photographs, design concepts, project portfolios, logos, and graphics — is the exclusive intellectual property of **The Design Space**, Raipur, Chhattisgarh, India, unless otherwise stated.

## 2. Copyright Notice

© 2024–2025 The Design Space. All rights reserved.

Unauthorised reproduction, distribution, or commercial use of any content from this website is strictly prohibited without prior written permission from The Design Space.

## 3. Portfolio & Project Images

All interior design projects, photographs, and rendered images displayed on this website are the original work of The Design Space. These images may not be reproduced, copied, or used without explicit written consent.

## 4. Website Usage

You are permitted to:
- Browse and view the website for personal, non-commercial use
- Share links to pages on our website

You are **not** permitted to:
- Copy or reproduce content for commercial purposes
- Scrape, download, or bulk-extract content from this website
- Misrepresent our work as your own

## 5. Design Services & Contracts

Engagement of our design services is governed by separate project agreements signed between the client and The Design Space. These terms of use do not constitute a service contract.

## 6. Disclaimer

The information on this website is provided in good faith. We do not guarantee that all content is always up to date. Pricing, availability, and project timelines are subject to change.

## 7. Governing Law

These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Raipur, Chhattisgarh.

## 8. Contact for Permissions

**The Design Space**
Raipur, Chhattisgarh 492001
 +91 93001 20500
thedesignspace.in`;

async function getOrCreateSettings() {
  let doc = await WebSettings.findById('web_settings_singleton');
  if (!doc) doc = await WebSettings.create({ _id: 'web_settings_singleton' });

  // Seed default legal content into existing documents that have empty fields
  let dirty = false;
  if (!doc.legal.privacy_policy) {
    doc.legal.privacy_policy = DEFAULT_PRIVACY_POLICY;
    dirty = true;
  }
  if (!doc.legal.copyright_terms) {
    doc.legal.copyright_terms = DEFAULT_COPYRIGHT_TERMS;
    dirty = true;
  }
  if (dirty) {
    doc.markModified('legal');
    await doc.save();
  }

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
    if (contact) {
      // Auto-convert Google Maps short URL or share URL to embed URL
      if (contact.map_embed_url) {
        const url = contact.map_embed_url.trim();
        // If it's already an embed URL, keep it
        if (!url.includes('/maps/embed')) {
          // Extract place from goo.gl short URL or maps.app.goo.gl or regular maps URL
          // Use the iframe embed format with the provided URL as a fallback pb query
          // Best approach: if user provides any google maps URL, convert to standard embed
          const pbMatch = url.match(/!1m[^?]*/);
          if (pbMatch) {
            contact.map_embed_url = `https://www.google.com/maps/embed?pb=${pbMatch[0]}`;
          }
          // If it's a short URL (goo.gl / maps.app.goo.gl), keep as-is — browser will handle redirect
          // The iframe will resolve it
        }
      }
      doc.contact = { ...doc.contact.toObject(), ...contact };
    }
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
