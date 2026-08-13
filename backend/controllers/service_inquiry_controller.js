const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const fs = require('fs');
const ServiceInquiry = require('../models/service_inquiry');
const { cloudinary, hasCloudinary, safeDelete } = require('../lib/cloudinary');

// ── Multer storage for inquiry attachments ────────────────────────────────
// Accepts: images (jpg/png/webp/gif/svg), PDFs, JSON files
const localAttachDir = path.join(__dirname, '..', 'uploads', 'service_inquiries');
if (!fs.existsSync(localAttachDir)) fs.mkdirSync(localAttachDir, { recursive: true });

const localAttachStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, localAttachDir),
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const cloudinaryAttachStorage = hasCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: (req, file) => {
        const isImage = file.mimetype.startsWith('image/');
        return {
          folder: 'thedesignspace/service_inquiries',
          resource_type: isImage ? 'image' : 'raw',
          allowed_formats: isImage
            ? ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif']
            : ['pdf', 'json'],
          public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`,
        };
      },
    })
  : null;

const attachmentUpload = multer({
  storage: hasCloudinary ? cloudinaryAttachStorage : localAttachStorage,
  limits: { fileSize: 25 * 1024 * 1024, files: 10 }, // 25MB per file, max 10 files
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'image/svg+xml', 'image/avif', 'image/bmp', 'image/tiff',
      'application/pdf',
      'application/json', 'text/json',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

exports.attachmentUpload = attachmentUpload;

// ── POST /api/v1/public/service-inquiry ──────────────────────────────────
// Public endpoint — no auth required
exports.create_inquiry = async (req, res) => {
  try {
    const { service_name, service_id, name, phone, email, subject, description } = req.body;

    if (!service_name || !name || !phone) {
      return res.status(400).json({ error: 'service_name, name, and phone are required.' });
    }

    const attachments = (req.files || []).map((f) => ({
      file_url: f.path || f.secure_url || (f.filename ? `/uploads/service_inquiries/${f.filename}` : ''),
      original_filename: f.originalname || '',
      file_size: f.size || 0,
      mime_type: f.mimetype || '',
    }));

    const inquiry = await ServiceInquiry.create({
      service_name,
      service_id: service_id || '',
      name,
      phone,
      email: email || '',
      subject: subject || '',
      description: description || '',
      attachments,
    });

    res.status(201).json(inquiry);
  } catch (error) {
    console.error('❌ create_inquiry error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ── GET /api/v1/web-cms/service-inquiries ────────────────────────────────
// Admin — list all inquiries, newest first, with optional status filter
exports.list_inquiries = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const inquiries = await ServiceInquiry.find(filter).sort({ created_at: -1 });
    res.json(inquiries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/v1/web-cms/service-inquiries/:id ───────────────────────────
exports.get_inquiry = async (req, res) => {
  try {
    const inquiry = await ServiceInquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
    res.json(inquiry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── PATCH /api/v1/web-cms/service-inquiries/:id ─────────────────────────
// Update status and/or admin_note
exports.update_inquiry = async (req, res) => {
  try {
    const inquiry = await ServiceInquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
    const { status, admin_note } = req.body;
    if (status) inquiry.status = status;
    if (admin_note !== undefined) inquiry.admin_note = admin_note;
    await inquiry.save();
    res.json(inquiry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ── DELETE /api/v1/web-cms/service-inquiries/:id ────────────────────────
exports.delete_inquiry = async (req, res) => {
  try {
    const inquiry = await ServiceInquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
    // Delete uploaded attachments
    for (const att of inquiry.attachments || []) {
      await safeDelete(att.file_url, att.mime_type?.startsWith('image/') ? 'image' : 'raw').catch(() => {});
    }
    await ServiceInquiry.deleteOne({ _id: inquiry._id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── DELETE /api/v1/web-cms/service-inquiries — bulk delete ──────────────
exports.bulk_delete_inquiries = async (req, res) => {
  try {
    const { ids } = req.body; // array of inquiry IDs
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required.' });
    }
    const inquiries = await ServiceInquiry.find({ _id: { $in: ids } });
    for (const inquiry of inquiries) {
      for (const att of inquiry.attachments || []) {
        await safeDelete(att.file_url, att.mime_type?.startsWith('image/') ? 'image' : 'raw').catch(() => {});
      }
    }
    await ServiceInquiry.deleteMany({ _id: { $in: ids } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
