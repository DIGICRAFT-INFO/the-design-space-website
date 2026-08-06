const express = require('express');
const router = express.Router();
const controller = require('../controllers/portfolio_controller');
const { is_authenticated, is_manager_or_above, is_owner } = require('../middleware/permissions');
const handleUpload = require('../middleware/handleUpload');

// GET /  — list all portfolios
// POST / — create a new portfolio entry
router.route('/')
  .get(is_authenticated, controller.list_portfolios)
  .post(is_authenticated, is_manager_or_above, controller.create_portfolio);

// Image routes
router.post('/:id/images/', is_authenticated, is_manager_or_above, handleUpload(controller.upload.array('files', 20)), controller.upload_images);
// Add image by external URL (no file upload needed)
router.post('/:id/images/url/', is_authenticated, is_manager_or_above, controller.add_image_by_url);
// BUG FIX: Added PATCH for caption updates
router.patch('/:id/images/:imageId/', is_authenticated, is_manager_or_above, controller.update_image_caption);
router.delete('/:id/images/:imageId/', is_authenticated, is_manager_or_above, controller.delete_image);

// Document routes
router.post('/:id/documents/', is_authenticated, is_manager_or_above, handleUpload(controller.uploadDocs.array('files', 10)), controller.upload_documents);
router.delete('/:id/documents/:docId/', is_authenticated, is_manager_or_above, controller.delete_document);

// PDF download
router.get('/:id/pdf/', is_authenticated, controller.get_portfolio_pdf);

// Send to client
router.post('/:id/send/', is_authenticated, is_manager_or_above, controller.send_portfolio);

// GET/:id, PUT/:id, PATCH/:id, DELETE/:id
// BUG FIX: Added PATCH method (frontend uses PATCH for partial updates)
// BUG FIX: Changed DELETE permission from is_owner to is_manager_or_above for consistency
router.route('/:id/')
  .get(is_authenticated, controller.get_portfolio_detail)
  .put(is_authenticated, is_manager_or_above, controller.update_portfolio)
  .patch(is_authenticated, is_manager_or_above, controller.update_portfolio)
  .delete(is_authenticated, is_manager_or_above, controller.delete_portfolio);

// Without trailing slash variants (compatibility)
router.route('/:id')
  .get(is_authenticated, controller.get_portfolio_detail)
  .put(is_authenticated, is_manager_or_above, controller.update_portfolio)
  .patch(is_authenticated, is_manager_or_above, controller.update_portfolio)
  .delete(is_authenticated, is_manager_or_above, controller.delete_portfolio);

module.exports = router;
