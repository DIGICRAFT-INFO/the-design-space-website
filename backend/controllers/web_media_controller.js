const path = require('path');
const fs = require('fs');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

// Only these subfolders are exposed to the Media Library — keeps this
// generic browser from accidentally exposing something outside the
// website's own asset folders (e.g. invoice PDFs).
const BROWSABLE_FOLDERS = [
  'website/images',
  'website/videos',
  'website/resumes',
  'portfolio',
];

function isSafePath(relativePath) {
  const resolved = path.resolve(UPLOADS_ROOT, relativePath);
  return resolved.startsWith(UPLOADS_ROOT);
}

// GET /api/v1/web-cms/media  — lists every file across the browsable folders
exports.list_media = async (req, res) => {
  try {
    const files = [];
    BROWSABLE_FOLDERS.forEach((folder) => {
      const dir = path.join(UPLOADS_ROOT, folder);
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).forEach((filename) => {
        const fullPath = path.join(dir, filename);
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) return;
        files.push({
          filename,
          folder,
          file_url: `/uploads/${folder}/${filename}`,
          size_bytes: stat.size,
          modified_at: stat.mtime,
          type: /\.(jpe?g|png|webp|avif|gif)$/i.test(filename)
            ? 'image'
            : /\.(mp4|webm)$/i.test(filename)
            ? 'video'
            : /\.pdf$/i.test(filename)
            ? 'pdf'
            : 'other',
        });
      });
    });
    files.sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/v1/web-cms/media  — body: { folder, filename }
exports.delete_media = async (req, res) => {
  try {
    const { folder, filename } = req.body;
    if (!folder || !filename) return res.status(400).json({ error: 'folder and filename are required.' });
    if (!BROWSABLE_FOLDERS.includes(folder)) return res.status(400).json({ error: 'Invalid folder.' });

    const relativePath = path.join(folder, filename);
    if (!isSafePath(relativePath)) return res.status(400).json({ error: 'Invalid path.' });

    const fullPath = path.join(UPLOADS_ROOT, relativePath);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found.' });

    fs.unlinkSync(fullPath);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
