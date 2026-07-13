const express = require('express');
const router = express.Router();
const controller = require('../controllers/enquiry_controller.js');
const { is_authenticated, is_manager_or_above } = require('../middleware/permissions.js');

// GET /api/v1/enquiries/       — list all (any authenticated user)
// POST /api/v1/enquiries/      — create new (manager or above)
router.route('/')
  .get(is_authenticated, controller.list_enquiries)
  .post(is_authenticated, is_manager_or_above, controller.create_enquiry);

// GET    /api/v1/enquiries/:id/  — get single
// PATCH  /api/v1/enquiries/:id/  — update
// DELETE /api/v1/enquiries/:id/  — delete (manager or above)
router.route('/:id/')
  .get(is_authenticated, controller.get_enquiry)
  .patch(is_authenticated, is_manager_or_above, controller.update_enquiry)
  .delete(is_authenticated, is_manager_or_above, controller.delete_enquiry);

module.exports = router;