const express = require('express');
const router = express.Router();
const {
  get_all_pages,
  list_managed_users,
  create_managed_user,
  get_managed_user,
  update_managed_user,
  grant_access,
  revoke_access,
  delete_managed_user,
  update_page_access,
  get_my_access,
} = require('../controllers/rbac_controller');
const { is_authenticated, is_owner } = require('../middleware/permissions');

// My access — any authenticated user
router.get('/my-access/', is_authenticated, get_my_access);

// Pages list — owner only
router.get('/pages/', is_authenticated, is_owner, get_all_pages);

// User management — owner only
router.route('/users/')
  .get(is_authenticated, is_owner, list_managed_users)
  .post(is_authenticated, is_owner, create_managed_user);

router.route('/users/:userId/')
  .get(is_authenticated, is_owner, get_managed_user)
  .patch(is_authenticated, is_owner, update_managed_user)
  .delete(is_authenticated, is_owner, delete_managed_user);

// Access control
router.post('/users/:userId/grant/', is_authenticated, is_owner, grant_access);
router.post('/users/:userId/revoke/', is_authenticated, is_owner, revoke_access);
router.patch('/users/:userId/page-access/', is_authenticated, is_owner, update_page_access);

module.exports = router;
