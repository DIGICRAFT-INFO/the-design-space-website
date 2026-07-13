const express = require('express');
const router = express.Router();
const { 
  token_obtain_pair, 
  token_refresh,
  register, 
  me,
  update_profile,
  change_password, 
  logout, 
  user_list,
  upload_avatar,
  delete_avatar,
  avatar_upload_middleware,
  get_pending_users,
  get_all_active_users,
  approve_user,
  reject_user,
  deactivate_user
} = require('../controllers/auth_controller');

const { 
  is_authenticated, 
  is_owner, 
  is_manager_or_above // 🚀 ADDED: Manager protection middleware
} = require('../middleware/permissions');

// ==========================================
// 1. PUBLIC ROUTES
// ==========================================
router.post('/login/', token_obtain_pair);
router.post('/token/refresh/', token_refresh);
router.post('/register/', register);

// ==========================================
// 2. PROTECTED ROUTES (Logged-in Users)
// ==========================================
router.get('/me/', is_authenticated, me);
router.patch('/me/', is_authenticated, update_profile);
router.post('/me/change-password/', is_authenticated, change_password);
router.post('/me/avatar/', is_authenticated, avatar_upload_middleware, upload_avatar);
router.delete('/me/avatar/', is_authenticated, delete_avatar);
router.post('/logout/', is_authenticated, logout);
router.get('/users/', is_authenticated, is_owner, user_list);

// ==========================================
// 3. 👑 MANAGER APPROVAL ROUTES (Protected)
// ==========================================
// Pending users ki list dekhne ke liye
router.get('/manager/pending-users/', is_authenticated, is_manager_or_above, get_pending_users);

// All active/approved users ki list dekhne ke liye
router.get('/manager/all-users/', is_authenticated, is_manager_or_above, get_all_active_users);

// User ko approve karne ke liye (is_active = true)
router.put('/manager/approve/:userId/', is_authenticated, is_manager_or_above, approve_user);

// User registration request reject/delete karne ke liye
router.delete('/manager/reject/:userId/', is_authenticated, is_manager_or_above, reject_user);

// User access revoke/deactivate karne ke liye (is_active = false)
router.put('/manager/deactivate/:userId/', is_authenticated, is_manager_or_above, deactivate_user);

module.exports = router;