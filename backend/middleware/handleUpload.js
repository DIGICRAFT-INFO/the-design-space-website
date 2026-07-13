// Wraps a multer middleware (`.single()`, `.array()`, etc.) so file-type or
// size-limit rejections from fileFilter/limits come back as a proper 400
// instead of falling through to the generic 500 handler — multer's
// `cb(new Error(...))` never sets `err.status`, so without this wrapper
// Express's default error handler treats it as a server crash.
module.exports = function handleUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed.' });
      next();
    });
  };
};
