const express = require('express');
const router = express.Router();
const templateCtrl = require('../controllers/proposal_template_controller');
const proposalCtrl = require('../controllers/proposal_controller');

const { is_authenticated, is_manager_or_above } = require('../middleware/permissions');

// Templates Routes — GET accessible to all authenticated, write requires manager+
router.route('/templates/')
  .get(is_authenticated, templateCtrl.get_templates)
  .post(is_authenticated, is_manager_or_above, templateCtrl.create_template);

router.route('/templates/:pk/')
  .get(is_authenticated, templateCtrl.get_template_detail)
  .put(is_authenticated, is_manager_or_above, templateCtrl.update_template)
  .patch(is_authenticated, is_manager_or_above, templateCtrl.update_template)
  .delete(is_authenticated, is_manager_or_above, templateCtrl.delete_template);

// -------------------------------------------------------------
// Proposals Routes
// GET: IsAuthenticated, Write Methods: IsManagerOrAbove
// -------------------------------------------------------------
router.route('/')
  .get(is_authenticated, proposalCtrl.get_proposals)
  .post(is_authenticated, is_manager_or_above, proposalCtrl.create_proposal);

router.route('/:pk/')
  .get(is_authenticated, proposalCtrl.get_proposal_detail)
  .put(is_authenticated, is_manager_or_above, proposalCtrl.update_proposal)
  .patch(is_authenticated, is_manager_or_above, proposalCtrl.update_proposal)
  .delete(is_authenticated, is_manager_or_above, proposalCtrl.delete_proposal);

router.patch('/:pk/status/', is_authenticated, is_manager_or_above, proposalCtrl.update_status); //
router.get('/:pk/pdf/', is_authenticated, proposalCtrl.get_proposal_pdf); //

module.exports = router;