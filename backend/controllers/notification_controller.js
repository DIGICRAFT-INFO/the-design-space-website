const Invoice = require('../models/invoice');
const Quotation = require('../models/quotation');
const Proposal = require('../models/proposal');
const NotificationLog = require('../models/notification_log');
const waService = require('../services/whatsapp_service');
const emailService = require('../services/email_service');

// WhatsApp Webhook View
exports.whatsapp_webhook_verify = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send("Verification failed");
};

exports.send_proposal_email = async (req, res) => {
  const proposal = await Proposal.findById(req.params.pk)
    .populate({ path: 'project', populate: { path: 'client' } });
  if (!proposal) return res.status(404).json({ detail: 'Proposal not found.' });

  const result = await emailService.send_proposal_email(proposal);
  if (result.success) return res.json({ detail: 'Proposal sent via Email.' });
  return res.status(400).json({ detail: result.error });
};

exports.whatsapp_webhook_receive = async (req, res) => {
  try {
    const data = req.body;
    const messages = data.entry?.[0]?.changes?.[0]?.value?.messages || [];
    
    if (messages.length > 0) {
      const message = messages[0];
      if (message.type === "interactive") {
        const button_id = message.interactive.button_reply.id;
        const [action, doc_id] = button_id.split("::");

        if (action === "approve_quote") await waService.process_quotation_response(doc_id, true);
        else if (action === "reject_quote") await waService.process_quotation_response(doc_id, false);
      }
    }
  } catch (error) {
    console.error("Webhook error:", error);
  }
  return res.status(200).send("ok");
};

// --- Send WhatsApp Controllers ---

exports.send_invoice_whatsapp = async (req, res) => {
  const invoice = await Invoice.findById(req.params.pk).populate({ path: 'project', populate: { path: 'client' } });
  if (!invoice) return res.status(404).json({ detail: 'Invoice not found.' });
  
  const result = await waService.send_invoice_whatsapp(invoice);
  if (result.success) return res.json({ detail: 'WhatsApp message sent successfully.', ...result });
  return res.status(400).json({ detail: result.error });
};

exports.send_quotation_whatsapp = async (req, res) => {
  const quotation = await Quotation.findById(req.params.pk).populate({ path: 'project', populate: { path: 'client' } });
  if (!quotation) return res.status(404).json({ detail: 'Quotation not found.' });
  
  const result = await waService.send_quotation_approval(quotation);
  if (result.success) return res.json({ detail: 'WhatsApp approval request sent.', ...result });
  return res.status(400).json({ detail: result.error });
};

exports.send_proposal_whatsapp = async (req, res) => {
  const proposal = await Proposal.findById(req.params.pk).populate({ path: 'project', populate: { path: 'client' } });
  if (!proposal) return res.status(404).json({ detail: 'Proposal not found.' });
  
  const result = await waService.send_proposal_whatsapp(proposal);
  if (result.success) return res.json({ detail: 'Proposal sent via WA.', ...result });
  return res.status(400).json({ detail: result.error });
};

// --- Email Controllers ---

exports.send_invoice_email = async (req, res) => {
  const invoice = await Invoice.findById(req.params.pk).populate({ path: 'project', populate: { path: 'client' } });
  if (!invoice) return res.status(404).json({ detail: 'Invoice not found.' });
  
  const result = await emailService.send_invoice_email(invoice);
  if (result.success) return res.json({ detail: 'Invoice sent via Email.' });
  return res.status(400).json({ detail: result.error });
};

exports.send_quotation_email = async (req, res) => {
  const quotation = await Quotation.findById(req.params.pk).populate({ path: 'project', populate: { path: 'client' } });
  if (!quotation) return res.status(404).json({ detail: 'Quotation not found.' });
  
  const result = await emailService.send_quotation_email(quotation);
  if (result.success) return res.json({ detail: 'Quotation sent via Email.' });
  return res.status(400).json({ detail: result.error });
};

// Send Both Reminders (WhatsApp + Email)
exports.send_both_reminders = async (req, res) => {
  const invoice = await Invoice.findById(req.params.pk).populate({ path: 'project', populate: { path: 'client' } });
  if (!invoice) return res.status(404).json({ detail: 'Invoice not found.' });

  const wa_result    = await waService.send_payment_reminder_whatsapp(invoice);
  const email_result = await emailService.send_payment_reminder_email(invoice);

  res.json({ whatsapp: wa_result, email: email_result });
};

// Single-channel reminder: WhatsApp
exports.send_reminder_whatsapp = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.pk)
      .populate({ path: 'project', populate: { path: 'client' } });
    if (!invoice) return res.status(404).json({ detail: 'Invoice not found.' });

    const result = await waService.send_payment_reminder_whatsapp(invoice);
    if (result.success) return res.json({ detail: 'WhatsApp reminder sent.', ...result });
    return res.status(502).json({ detail: result.error });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Single-channel reminder: Email
exports.send_reminder_email = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.pk)
      .populate({ path: 'project', populate: { path: 'client' } });
    if (!invoice) return res.status(404).json({ detail: 'Invoice not found.' });

    const result = await emailService.send_payment_reminder_email(invoice);
    if (result.success) return res.json({ detail: 'Email reminder sent.' });
    return res.status(502).json({ detail: result.error });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Notification Logs
exports.get_notification_logs = async (req, res) => {
  let query = {};
  if (req.query.channel) query.channel = req.query.channel;
  if (req.query.doc_type) query.doc_type = req.query.doc_type;
  if (req.query.doc_id) query.doc_id = req.query.doc_id;

  const logs = await NotificationLog.find(query).sort('-created_at');
  res.json(logs);
};