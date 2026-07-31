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
const { is_authenticated, is_manager_or_above } = require('../middleware/permissions');

// My access — any authenticated user
router.get('/my-access/', is_authenticated, get_my_access);

// Pages list — manager or above
router.get('/pages/', is_authenticated, is_manager_or_above, get_all_pages);

// User management — manager or above
// (managers can create users, grant/revoke access, manage page permissions)
router.route('/users/')
  .get(is_authenticated, is_manager_or_above, list_managed_users)
  .post(is_authenticated, is_manager_or_above, create_managed_user);

router.route('/users/:userId/')
  .get(is_authenticated, is_manager_or_above, get_managed_user)
  .patch(is_authenticated, is_manager_or_above, update_managed_user)
  .delete(is_authenticated, is_manager_or_above, delete_managed_user);

// Grant / Revoke / Page-access — manager or above
router.post('/users/:userId/grant/',        is_authenticated, is_manager_or_above, grant_access);
router.post('/users/:userId/revoke/',       is_authenticated, is_manager_or_above, revoke_access);
router.patch('/users/:userId/page-access/', is_authenticated, is_manager_or_above, update_page_access);

module.exports = router;
