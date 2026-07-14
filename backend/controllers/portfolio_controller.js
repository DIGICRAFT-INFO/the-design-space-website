const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Portfolio = require('../models/Portfolio');
const pdfEngine = require('../services/pdf_engine_service');
const emailService = require('../services/email_service');
const whatsappService = require('../services/whatsapp_service');
const { createNotification, deleteNotificationsByReference } = require('../services/in_app_notification_service');

// ── Upload dir setup ──────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads', 'portfolio');
const docsDir    = path.join(__dirname, '..', 'uploads', 'portfolio_docs');
[uploadsDir, docsDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ── Image upload (20MB, images only) ─────────────────────────────────────────
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  }
});
exports.upload = multer({
  storage: imageStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|png|webp|avif)/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files (jpeg, png, webp, avif) are allowed.'));
  }
});

// ── PDF upload (25MB) ─────────────────────────────────────────────────────────
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docsDir),
  filename:    (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  }
});
exports.uploadDocs = multer({
  storage: docStorage,
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are allowed.'));
  }
});

// ── Helper: safe disk delete ──────────────────────────────────────────────────
function safeUnlink(relativePath) {
  try {
    const full = path.join(__dirname, '..', relativePath);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (err) {
    console.warn('safeUnlink failed:', err.message);
  }
}

// ── GET /  ────────────────────────────────────────────────────────────────────
exports.list_portfolios = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.project)  filter.project  = req.query.project;
    if (req.query.search)   filter.title    = { $regex: req.query.search, $options: 'i' };

    const portfolios = await Portfolio.find(filter)
      .populate({ path: 'project', populate: { path: 'client' } })
      .sort({ created_at: -1 });

    const formatted = portfolios.map(p => {
      const obj = p.toJSON();
      obj.project_name = p.project ? p.project.name : null;
      obj.client_name  = p.project && p.project.client ? p.project.client.full_name : null;
      return obj;
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /:id  ─────────────────────────────────────────────────────────────────
exports.get_portfolio_detail = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id)
      .populate({ path: 'project', populate: { path: 'client' } });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });

    const obj = portfolio.toJSON();
    obj.project_name = portfolio.project ? portfolio.project.name : null;
    obj.client_name  = portfolio.project && portfolio.project.client
      ? portfolio.project.client.full_name : null;

    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── POST /  ───────────────────────────────────────────────────────────────────
// BUG FIX: Was missing notification trigger
exports.create_portfolio = async (req, res) => {
  try {
    const { title, description, category, project, status, project_type, is_featured, sort_order, metrics, custom_categories } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const portfolio = await Portfolio.create({
      title,
      description: description || '',
      category:    category    || 'other',
      project:     project     || null,
      status:      status      || 'draft',
      created_by:  req.user ? req.user._id : null,
      project_type: project_type || 'other',
      is_featured: !!is_featured,
      sort_order:  sort_order || 0,
      metrics:     metrics || undefined,
      custom_categories: custom_categories || [],
    });

    // BUG FIX: Trigger notification
    await createNotification({
      event_type:     'portfolio_created',
      title:          'Portfolio Entry Created',
      message:        `Portfolio "${portfolio.title}" has been added`,
      reference_id:   portfolio._id,
      reference_type: 'portfolio'
    });

    res.status(201).json(portfolio);
  } catch (error) {
    let errorMsg = error.message;
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map(e => e.message);
      errorMsg = messages.join(', ') || error.message;
    }
    res.status(400).json({ error: errorMsg });
  }
};

// ── PUT/PATCH /:id  ───────────────────────────────────────────────────────────
// BUG FIX: Added PATCH support (same handler for both PUT and PATCH)
exports.update_portfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });

    const fields = ['title', 'description', 'category', 'project', 'status', 'project_type', 'is_featured', 'sort_order', 'metrics', 'custom_categories'];
    fields.forEach(f => { if (req.body[f] !== undefined) portfolio[f] = req.body[f]; });
    await portfolio.save();

    const updated = await Portfolio.findById(portfolio._id)
      .populate({ path: 'project', populate: { path: 'client' } });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ── DELETE /:id  ──────────────────────────────────────────────────────────────
// BUG FIX: Was returning { message } but frontend checks for 204 / success
exports.delete_portfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });

    // Clean up all files on disk
    (portfolio.images    || []).forEach(img => safeUnlink(img.file_url));
    (portfolio.documents || []).forEach(doc => safeUnlink(doc.file_url));

    await Portfolio.deleteOne({ _id: portfolio._id });
    await deleteNotificationsByReference(req.params.id, 'portfolio');

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── POST /:id/images  ─────────────────────────────────────────────────────────
exports.upload_images = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });

    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'No images uploaded.' });

    const captions   = Array.isArray(req.body.captions) ? req.body.captions : [];
    const startOrder = portfolio.images.length;

    const newImages = req.files.map((file, idx) => ({
      file_url:          `/uploads/portfolio/${file.filename}`,
      caption:           captions[idx] || '',
      file_size:         file.size,
      original_filename: file.originalname,
      sort_order:        startOrder + idx,
    }));

    portfolio.images.push(...newImages);
    await portfolio.save();

    res.status(201).json(portfolio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ── PATCH /:id/images/:imageId  — update caption ─────────────────────────────
exports.update_image_caption = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });

    const image = portfolio.images.id(req.params.imageId);
    if (!image) return res.status(404).json({ error: 'Image not found.' });

    if (req.body.caption !== undefined) image.caption = req.body.caption;
    await portfolio.save();
    res.json(portfolio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ── DELETE /:id/images/:imageId  ─────────────────────────────────────────────
exports.delete_image = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });

    // Try finding by _id (works for both ObjectId and string)
    const image = portfolio.images.find(
      (img) => img._id.toString() === req.params.imageId || img.id === req.params.imageId
    );
    if (!image) return res.status(404).json({ error: 'Image not found.' });

    safeUnlink(image.file_url);
    portfolio.images.pull({ _id: image._id });
    await portfolio.save();

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── POST /:id/documents  ──────────────────────────────────────────────────────
exports.upload_documents = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });

    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'No PDF files uploaded.' });

    const titles  = Array.isArray(req.body.titles) ? req.body.titles : [];
    const newDocs = req.files.map((file, idx) => ({
      file_url:          `/uploads/portfolio_docs/${file.filename}`,
      title:             titles[idx] || file.originalname,
      file_size:         file.size,
      original_filename: file.originalname,
    }));

    portfolio.documents.push(...newDocs);
    await portfolio.save();

    res.status(201).json(portfolio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ── DELETE /:id/documents/:docId  ────────────────────────────────────────────
exports.delete_document = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });

    const doc = portfolio.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    safeUnlink(doc.file_url);
    portfolio.documents.pull({ _id: req.params.docId });
    await portfolio.save();

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /:id/pdf  ─────────────────────────────────────────────────────────────
exports.get_portfolio_pdf = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id)
      .populate({ path: 'project', populate: { path: 'client' } });
    if (!portfolio) return res.status(404).json({ detail: 'Not found.' });

    const pdfBuffer = await pdfEngine.render_portfolio_pdf(portfolio);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${portfolio.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Portfolio PDF error:', error.message);
    res.status(500).json({
      detail: 'PDF generation failed. Chromium may not be available on this server.',
      error: error.message,
    });
  }
};

// ── POST /:id/send  ───────────────────────────────────────────────────────────
exports.send_portfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id)
      .populate({ path: 'project', populate: { path: 'client' } });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });

    const { channel, recipient_email, recipient_phone } = req.body;
    const client = portfolio.project && portfolio.project.client;

    if (channel === 'email') {
      const email = recipient_email || (client && client.email);
      if (!email) return res.status(400).json({ error: 'No recipient email available.' });
      const pdfBuffer = await pdfEngine.render_portfolio_pdf(portfolio);
      const result    = await emailService.send_portfolio_email(portfolio, email, pdfBuffer);
      if (!result.success) return res.status(502).json({ error: result.error });
      return res.json({ message: `Portfolio emailed to ${email}` });
    }

    if (channel === 'whatsapp') {
      const phone = recipient_phone || (client && client.phone);
      if (!phone) return res.status(400).json({ error: 'No recipient phone available.' });
      const result = await whatsappService.send_portfolio_whatsapp(portfolio, phone);
      if (!result.success) return res.status(502).json({ error: result.error });
      return res.json({ message: `Portfolio sent via WhatsApp to ${phone}` });
    }

    return res.status(400).json({ error: "channel must be 'email' or 'whatsapp'." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC WEBSITE ENDPOINTS (no auth) — used by thedesignspace.in /portfolio
// Only ever returns status:'published' entries, and hides internal fields
// (created_by, project/client refs, documents) from the public payload.
// ═══════════════════════════════════════════════════════════════════════════

function toPublicPortfolio(p) {
  const obj = p.toJSON ? p.toJSON() : p;
  return {
    id: obj.id,
    title: obj.title,
    description: obj.description,
    project_type: obj.project_type,
    custom_categories: obj.custom_categories || [],
    is_featured: obj.is_featured,
    sort_order: obj.sort_order,
    metrics: obj.metrics,
    images: (obj.images || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((img) => ({ id: img._id || img.id, file_url: img.file_url, caption: img.caption })),
    created_at: obj.created_at,
  };
}

// GET /api/v1/public/portfolio?project_type=residential&featured=true
exports.list_public_portfolios = async (req, res) => {
  try {
    const filter = { status: 'published' };
    if (req.query.project_type && req.query.project_type !== 'all') {
      filter.project_type = req.query.project_type;
    }
    if (req.query.featured === 'true') filter.is_featured = true;
    if (req.query.tag) filter.custom_categories = req.query.tag;

    const portfolios = await Portfolio.find(filter).sort({ sort_order: 1, created_at: -1 });
    res.json(portfolios.map(toPublicPortfolio));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/v1/public/portfolio/:id
exports.get_public_portfolio_detail = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, status: 'published' });
    if (!portfolio) return res.status(404).json({ error: 'Project not found.' });
    res.json(toPublicPortfolio(portfolio));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
