const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/master_service_controller');
const { is_authenticated, is_manager_or_above, is_finance_or_above } = require('../middleware/permissions');

// GET /            → list all services (any authenticated user)
// POST /           → create service (manager+)
router.route('/')
  .get(is_authenticated, ctrl.get_services)
  .post(is_authenticated, is_manager_or_above, ctrl.create_service);

// POST /:id/media/       → upload media files
router.post('/:id/media/', is_authenticated, is_manager_or_above, ctrl.uploadMiddleware, ctrl.upload_media);

// DELETE /:id/media/:mediaId/ → delete a media file
router.delete('/:id/media/:mediaId/', is_authenticated, is_manager_or_above, ctrl.delete_media);

// GET /:id/assignments   → list clients assigned to a service (any authenticated user)
router.get('/:id/assignments', is_authenticated, ctrl.get_service_assignments);

// POST /:id/assign       → assign a client to a service (manager+)
router.post('/:id/assign', is_authenticated, is_manager_or_above, ctrl.assign_client);

// DELETE /:id/assign/:assignmentId → remove a client assignment (manager+)
router.delete('/:id/assign/:assignmentId', is_authenticated, is_manager_or_above, ctrl.unassign_client);

// GET /:id         → service detail
// PUT /:id         → full update (manager+)
// BUG FIX: Added PATCH support — frontend sends PATCH but old routes only had PUT
// PATCH /:id       → partial update (manager+)
// DELETE /:id      → delete (manager+)
router.route('/:id')
  .get(is_authenticated, ctrl.get_service_detail)
  .put(is_authenticated, is_manager_or_above, ctrl.update_service)
  .patch(is_authenticated, is_manager_or_above, ctrl.update_service)
  .delete(is_authenticated, is_manager_or_above, ctrl.delete_service);

// BUG FIX: Also support trailing slash variants (Next.js/Axios may append /)
router.route('/:id/')
  .get(is_authenticated, ctrl.get_service_detail)
  .put(is_authenticated, is_manager_or_above, ctrl.update_service)
  .patch(is_authenticated, is_manager_or_above, ctrl.update_service)
  .delete(is_authenticated, is_manager_or_above, ctrl.delete_service);

module.exports = router;