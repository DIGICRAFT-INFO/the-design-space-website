const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/quotation_controller');
const { is_authenticated, is_manager_or_above } = require('../middleware/permissions');

// -------------------------------------------------------------
// Django path: '' (QuotationListCreateView)
// GET: IsAuthenticated | POST: IsManagerOrAbove
// -------------------------------------------------------------
router.route('/')
  .get(is_authenticated, ctrl.get_quotations)
  .post(is_authenticated, is_manager_or_above, ctrl.create_quotation);

// -------------------------------------------------------------
// Action Routes (Placed before :pk to avoid ID conflicts)
// -------------------------------------------------------------
router.post('/:pk/approve/', is_authenticated, is_manager_or_above, ctrl.approve_quotation); //
router.post('/:pk/send/', is_authenticated, is_manager_or_above, ctrl.send_quotation);
router.post('/:pk/revise/', is_authenticated, is_manager_or_above, ctrl.revise_quotation); //
router.get('/:pk/versions/', is_authenticated, ctrl.get_version_history); //
router.get('/:pk/history/', is_authenticated, ctrl.get_quotation_history); // Edit history + diff (right-side panel)
router.get('/:pk/pdf/', is_authenticated, ctrl.get_quotation_pdf); //

// -------------------------------------------------------------
// Django path: '<uuid:pk>/' (QuotationDetailView)
// GET: IsAuthenticated | PUT, PATCH, DELETE: IsManagerOrAbove
// -------------------------------------------------------------
router.post('/:pk/copy/', is_authenticated, is_manager_or_above, ctrl.copy_quotation);
router.route('/:pk/')
  .get(is_authenticated, ctrl.get_quotation_detail)
  .put(is_authenticated, is_manager_or_above, ctrl.update_quotation)
  .patch(is_authenticated, is_manager_or_above, ctrl.update_quotation)
  .delete(is_authenticated, is_manager_or_above, ctrl.delete_quotation);

module.exports = router;