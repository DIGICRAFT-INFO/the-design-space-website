const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/in_app_notification_controller');
const { is_authenticated } = require('../middleware/permissions');

// GET  /                → list with pagination + filters
router.get('/', is_authenticated, ctrl.getNotifications);

// GET  /unread-count    → badge number
router.get('/unread-count/', is_authenticated, ctrl.getUnreadCount);

// PATCH /mark-all-read  → mark every notification as read (must be before /:pk)
router.patch('/mark-all-read/', is_authenticated, ctrl.markAllAsRead);

// PATCH /:pk/read       → mark single as read
router.patch('/:pk/read/', is_authenticated, ctrl.markAsRead);

// DELETE /:pk           → delete single notification
router.delete('/:pk/', is_authenticated, ctrl.deleteNotification);

module.exports = router;
