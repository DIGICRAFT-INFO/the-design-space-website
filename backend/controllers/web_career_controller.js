const path = require('path');
const fs = require('fs');
const multer = require('multer');

const WebCareerJob = require('../models/web_career_job');
const WebCareerApplication = require('../models/web_career_application');
const { createNotification } = require('../services/in_app_notification_service.js');

const resumesDir = path.join(__dirname, '..', 'uploads', 'website', 'resumes');
if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resumesDir),
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  },
});
exports.uploadResume = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF resumes are allowed.'));
  },
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

// ── Admin: Jobs ──────────────────────────────────────────────────────────

exports.list_jobs_admin = async (req, res) => {
  try {
    const jobs = await WebCareerJob.find().sort({ sort_order: 1, created_at: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create_job = async (req, res) => {
  try {
    const { title, department, location, employment_type, description, requirements, status, sort_order } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required.' });
    const job = await WebCareerJob.create({
      title,
      department: department || '',
      location: location || 'Mumbai, India',
      employment_type: employment_type || 'full_time',
      description: description || '',
      requirements: requirements || [],
      status: status || 'open',
      sort_order: sort_order || 0,
      created_by: req.user ? req.user._id : null,
    });
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.update_job = async (req, res) => {
  try {
    const job = await WebCareerJob.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    const fields = ['title', 'department', 'location', 'employment_type', 'description', 'requirements', 'status', 'sort_order'];
    fields.forEach((f) => { if (req.body[f] !== undefined) job[f] = req.body[f]; });
    await job.save();
    res.json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_job = async (req, res) => {
  try {
    const job = await WebCareerJob.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    await WebCareerJob.deleteOne({ _id: job._id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Admin: Applications (Applicant Tracker) ─────────────────────────────

exports.list_applications_admin = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.job) filter.job = req.query.job;
    const applications = await WebCareerApplication.find(filter).sort({ created_at: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update_application_status = async (req, res) => {
  try {
    const app = await WebCareerApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found.' });
    if (req.body.status) app.status = req.body.status;
    await app.save();
    res.json(app);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_application = async (req, res) => {
  try {
    const app = await WebCareerApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found.' });
    safeUnlink(app.resume_url);
    await WebCareerApplication.deleteOne({ _id: app._id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Public ───────────────────────────────────────────────────────────────

exports.list_jobs_public = async (req, res) => {
  try {
    const jobs = await WebCareerJob.find({ status: 'open' }).sort({ sort_order: 1, created_at: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/v1/public/careers/apply (multipart: fields + resume file)
exports.apply_to_job = async (req, res) => {
  try {
    const { job_id, job_title, name, email, phone, cover_note } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'name, email and phone are required.' });
    }
    if (!req.file) return res.status(400).json({ error: 'A PDF resume is required.' });

    let jobTitleSnapshot = job_title || '';
    if (job_id) {
      const job = await WebCareerJob.findById(job_id);
      if (job) jobTitleSnapshot = job.title;
    }

    const application = await WebCareerApplication.create({
      job: job_id || null,
      job_title_snapshot: jobTitleSnapshot,
      applicant_name: String(name).trim().slice(0, 200),
      email: String(email).trim().slice(0, 200),
      phone: String(phone).trim().slice(0, 20),
      cover_note: cover_note ? String(cover_note).trim().slice(0, 2000) : '',
      resume_url: `/uploads/website/resumes/${req.file.filename}`,
      resume_filename: req.file.originalname,
      status: 'new',
    });

    await createNotification({
      event_type: 'career_application_received',
      title: 'New Career Application',
      message: `${application.applicant_name} applied${jobTitleSnapshot ? ` for ${jobTitleSnapshot}` : ''}.`,
      reference_id: application._id,
      reference_type: 'career_application',
    });

    res.status(201).json({ message: 'Thank you — your application has been received.', id: application.id });
  } catch (error) {
    console.error('❌ apply_to_job error:', error);
    res.status(400).json({ error: error.message });
  }
};
