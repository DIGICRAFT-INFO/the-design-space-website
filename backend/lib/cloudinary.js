const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Check if Cloudinary is configured ────────────────────────────────────────
const hasCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn('⚠️  Cloudinary not configured — falling back to local disk storage for images.');
}

// ── Local fallback storage ────────────────────────────────────────────────────
const localImagesDir = path.join(__dirname, '..', 'uploads', 'website', 'images');
const localPortfolioDir = path.join(__dirname, '..', 'uploads', 'portfolio');
[localImagesDir, localPortfolioDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const localImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = req.baseUrl?.includes('portfolio') ? localPortfolioDir : localImagesDir;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

// ── Image storage — Cloudinary if configured, else local disk ─────────────────
const imageStorage = hasCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'thedesignspace/website/images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
    })
  : localImageStorage;

// ── Video storage — Cloudinary if configured, else local disk ─────────────────
const localVideosDir = path.join(__dirname, '..', 'uploads', 'website', 'videos');
if (!fs.existsSync(localVideosDir)) fs.mkdirSync(localVideosDir, { recursive: true });

const localVideoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, localVideosDir),
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const videoStorage = hasCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'thedesignspace/website/videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'webm'],
      },
    })
  : localVideoStorage;

exports.uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
});

exports.uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 150 * 1024 * 1024, files: 1 },
});

exports.cloudinary = cloudinary;
exports.hasCloudinary = hasCloudinary;

/**
 * Delete a file from Cloudinary by its public_id or full URL.
 * Falls back to local disk delete for non-Cloudinary URLs.
 */
exports.safeDelete = async (urlOrPublicId, resourceType = 'image') => {
  if (!urlOrPublicId) return;
  try {
    if (!hasCloudinary || !urlOrPublicId.startsWith('http') || !urlOrPublicId.includes('cloudinary')) {
      // Local file
      const localPath = path.join(__dirname, '..', urlOrPublicId.replace(/^\//, ''));
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      return;
    }
    // Cloudinary URL — extract public_id
    const match = urlOrPublicId.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
    const publicId = match ? match[1] : urlOrPublicId;
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn('safeDelete failed:', err.message);
  }
};
