const fs   = require('fs');
const MasterService = require('../models/master_service');
const ServiceAssignment = require('../models/service_assignment');
const Client = require('../models/client');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createNotification, deleteNotificationsByReference } = require('../services/in_app_notification_service');

// ─── File upload config ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path so it works on Hostinger too
    const dir = path.join(__dirname, '..', 'uploads', 'services');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only images and videos are allowed.'));
  }
});

exports.uploadMiddleware = upload.array('files', 10);

// ── GET /  ────────────────────────────────────────────────────────────────────
exports.get_services = async (req, res) => {
  try {
    let query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) query.name = { $regex: req.query.search, $options: 'i' };

    const services = await MasterService.find(query)
      .sort('-created_at');

    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /:id  ─────────────────────────────────────────────────────────────────
exports.get_service_detail = async (req, res) => {
  try {
    const service = await MasterService.findById(req.params.id);
    if (!service) return res.status(404).json({ detail: 'Not found.' });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── POST /  ───────────────────────────────────────────────────────────────────
exports.create_service = async (req, res) => {
  try {
    const service = await MasterService.create({
      name: req.body.name,
      description: req.body.description,
      status: req.body.status || 'active',
      created_by: req.user ? req.user._id : null
    });

    await createNotification({
      event_type: 'service_created',
      title: 'New Service Added',
      message: `Master service "${service.name}" has been created`,
      reference_id: service._id,
      reference_type: 'service'
    });

    const withMedia = await MasterService.findById(service._id);
    res.status(201).json(withMedia);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ── PUT /:id  — BUG FIX: Frontend was sending PATCH but route only had PUT
// Fixed: route file now supports both PUT and PATCH ─────────────────────────
exports.update_service = async (req, res) => {
  try {
    const service = await MasterService.findById(req.params.id);
    if (!service) return res.status(404).json({ detail: 'Not found.' });

    const allowed = ['name', 'description', 'status'];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) service[f] = req.body[f];
    });
    await service.save();

    const withMedia = await MasterService.findById(service._id);
    res.json(withMedia);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ── DELETE /:id  ──────────────────────────────────────────────────────────────
exports.delete_service = async (req, res) => {
  try {
    const service = await MasterService.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ detail: 'Not found.' });

    // media is embedded on the service document, so it's removed automatically
    await deleteNotificationsByReference(req.params.id, 'service');

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── POST /:id/media/  — Upload media files ───────────────────────────────────
exports.upload_media = async (req, res) => {
  try {
    const service = await MasterService.findById(req.params.id);
    if (!service) return res.status(404).json({ detail: 'Not found.' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const mediaRecords = req.files.map(file => ({
      file_url: `uploads/services/${file.filename}`,
      file_type: file.mimetype === 'application/pdf'
        ? 'pdf'
        : (file.mimetype.startsWith('video') ? 'video' : 'image'),
      file_size: file.size,
      original_filename: file.originalname
    }));

    service.media.push(...mediaRecords);
    await service.save();

    // Return just the newly added media entries (with their generated _ids)
    const added = service.media.slice(-mediaRecords.length);
    res.status(201).json(added);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── DELETE /:id/media/:mediaId/  — Remove a single media file ────────────────
exports.delete_media = async (req, res) => {
  try {
    const service = await MasterService.findById(req.params.id);
    if (!service) return res.status(404).json({ detail: 'Service not found.' });

    const mediaItem = service.media.id(req.params.mediaId);
    if (!mediaItem) return res.status(404).json({ detail: 'Media not found.' });

    mediaItem.deleteOne();
    await service.save();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /:id/assignments  — List clients assigned to a service ──────────────
exports.get_service_assignments = async (req, res) => {
  try {
    const service = await MasterService.findById(req.params.id);
    if (!service) return res.status(404).json({ detail: 'Service not found.' });

    const assignments = await ServiceAssignment.find({ service: req.params.id })
      .populate('client', 'full_name')
      .populate('assigned_by', 'name')
      .sort('-assigned_at');

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── POST /:id/assign  — Assign a client to a service ─────────────────────────
exports.assign_client = async (req, res) => {
  try {
    const service = await MasterService.findById(req.params.id);
    if (!service) return res.status(404).json({ detail: 'Service not found.' });

    const clientId = req.body.client_id || req.body.client;
    if (!clientId) return res.status(400).json({ error: 'client_id is required.' });

    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ detail: 'Client not found.' });

    const existing = await ServiceAssignment.findOne({ service: req.params.id, client: clientId });
    if (existing) return res.status(400).json({ error: 'Client is already assigned to this service.' });

    const assignment = await ServiceAssignment.create({
      service: req.params.id,
      client: clientId,
      assigned_by: req.user ? req.user._id : null
    });

    const populated = await ServiceAssignment.findById(assignment._id)
      .populate('client', 'full_name')
      .populate('assigned_by', 'name');

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Client is already assigned to this service.' });
    }
    res.status(500).json({ error: error.message });
  }
};

// ── DELETE /:id/assign/:assignmentId  — Remove a client assignment ───────────
exports.unassign_client = async (req, res) => {
  try {
    const assignment = await ServiceAssignment.findOneAndDelete({
      _id: req.params.assignmentId,
      service: req.params.id
    });
    if (!assignment) return res.status(404).json({ detail: 'Assignment not found.' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};