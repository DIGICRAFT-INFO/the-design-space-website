const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notification_controller');
const { is_authenticated, is_manager_or_above, is_finance_or_above } = require('../middleware/permissions');

// -------------------------------------------------------------
// WhatsApp Webhook (Meta calls this — no auth)
// -------------------------------------------------------------
router.route('/whatsapp/webhook/')
  .get(ctrl.whatsapp_webhook_verify)
  .post(ctrl.whatsapp_webhook_receive);

// -------------------------------------------------------------
// Send via Email
// -------------------------------------------------------------
router.post('/email/invoice/:pk/send/',    is_authenticated, is_finance_or_above,  ctrl.send_invoice_email);
router.post('/email/quotation/:pk/send/',  is_authenticated, is_manager_or_above,  ctrl.send_quotation_email);
router.post('/email/proposal/:pk/send/',   is_authenticated, is_manager_or_above,  ctrl.send_proposal_email);

// -------------------------------------------------------------
// Send via WhatsApp
// -------------------------------------------------------------
router.post('/whatsapp/invoice/:pk/send/',    is_authenticated, is_finance_or_above,  ctrl.send_invoice_whatsapp);
router.post('/whatsapp/quotation/:pk/send/',  is_authenticated, is_manager_or_above,  ctrl.send_quotation_whatsapp);
router.post('/whatsapp/proposal/:pk/send/',   is_authenticated, is_manager_or_above,  ctrl.send_proposal_whatsapp);

// -------------------------------------------------------------
// Payment Reminders (single channel)
// -------------------------------------------------------------
router.post('/whatsapp/reminder/:pk/', is_authenticated, is_finance_or_above, ctrl.send_reminder_whatsapp);
router.post('/email/reminder/:pk/',    is_authenticated, is_finance_or_above, ctrl.send_reminder_email);

// -------------------------------------------------------------
// Send Both Reminders (WhatsApp + Email) at once
// -------------------------------------------------------------
router.post('/reminder/:pk/send-all/', is_authenticated, is_finance_or_above, ctrl.send_both_reminders);

// -------------------------------------------------------------
// Logs — accessible to all authenticated users
// -------------------------------------------------------------
router.get('/logs/', is_authenticated, ctrl.get_notification_logs);

module.exports = router;
