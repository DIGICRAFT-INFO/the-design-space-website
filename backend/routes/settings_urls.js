const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/settings_controller');
const { is_authenticated, is_manager_or_above } = require('../middleware/permissions');

// Apply auth for all routes
router.use(is_authenticated);

// -------------------------------------------------------------
// Singleton Routes (Restricted to Owner/Manager)
// -------------------------------------------------------------
router.route('/tax/')
  .get(ctrl.get_tax_settings)
  .put(is_manager_or_above, ctrl.update_tax_settings);

router.route('/bank/')
  .get(ctrl.get_bank_details)
  .put(is_manager_or_above, ctrl.update_bank_details);

router.route('/brand/')
  .get(ctrl.get_brand_theme)
  .put(is_manager_or_above, ctrl.update_brand_theme);

router.route('/numbering/')
  .get(ctrl.get_document_numbering)
  .put(is_manager_or_above, ctrl.update_document_numbering);

// Logo upload
router.post('/brand/logo/', is_manager_or_above, ctrl.logo_upload_middleware, ctrl.upload_logo);

// -------------------------------------------------------------
// Milestones Routes
// -------------------------------------------------------------
router.route('/milestones/')
  .get(ctrl.get_milestones)
  .post(is_manager_or_above, ctrl.create_milestone);

router.route('/milestones/:pk/')
  .get(ctrl.get_milestone_detail)
  .put(is_manager_or_above, ctrl.update_milestone)
  .patch(is_manager_or_above, ctrl.update_milestone)
  .delete(is_manager_or_above, ctrl.delete_milestone);

module.exports = router;