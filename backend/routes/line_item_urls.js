const express = require('express');
const router = express.Router();
const { 
  get_line_items, 
  create_line_item, 
  get_line_item_detail, 
  update_line_item, 
  delete_line_item 
} = require('../controllers/line_item_controller');

const { is_authenticated, is_manager_or_above } = require('../middleware/permissions'); // Note: Adjust path to your auth middleware

// -------------------------------------------------------------
// Django path: '' (LineItemLibraryListCreateView)
// GET: IsAuthenticated | POST: IsManagerOrAbove
// -------------------------------------------------------------
router.route('/')
  .get(is_authenticated, get_line_items)
  .post(is_authenticated, is_manager_or_above, create_line_item);

// -------------------------------------------------------------
// Django path: '<uuid:pk>/' (LineItemLibraryDetailView)
// All Methods (GET, PUT, PATCH, DELETE): IsManagerOrAbove
// -------------------------------------------------------------
router.route('/:pk/')
  .get(is_authenticated, is_manager_or_above, get_line_item_detail)
  .put(is_authenticated, is_manager_or_above, update_line_item)
  .patch(is_authenticated, is_manager_or_above, update_line_item)
  .delete(is_authenticated, is_manager_or_above, delete_line_item);

module.exports = router;