const axios = require('axios');
const NotificationLog = require('../models/notification_log');

// Helpers
const wa_url = () => `https://graph.facebook.com/v19.0/${process.env.WA_PHONE_NUMBER_ID}/messages`;

const headers = () => ({
  "Authorization": `Bearer ${process.env.WA_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
});

const clean_phone = (phone) => {
  let cleaned = phone.replace(/[\s\-\+\(\)]/g, "");
  if (cleaned.length === 10) cleaned = "91" + cleaned; // default India code
  return cleaned;
};

const clean_text = (text, max_len = 1024) => {
  if (!text) return "";
  let cleaned = text.replace(/•|—|–/g, "-").replace(/\n{3,}/g, "\n\n");
  return cleaned.substring(0, max_len); //
};

const log_notification = async (channel, doc_type, doc_id, recipient, status, error = "", wa_id = "") => {
  await NotificationLog.create({ channel, doc_type, doc_id, recipient, status, error, wa_message_id: wa_id }); //
};

const firm_name = () => "Interior Design Firm"; // Fallback like in your python code

// 1. Send Invoice
exports.send_invoice_whatsapp = async (invoice) => {
  const phone = clean_phone(invoice.project.client.phone);
  const pdf_url = `${process.env.BACKEND_URL}/api/v1/invoices/${invoice._id}/pdf/`;

  const body = clean_text(
    `*Invoice from ${firm_name()}*\n\n` +
    `Invoice No: *${invoice.invoice_number}*\n` +
    `Project: ${invoice.project.name}\n` +
    `Amount: *₹${invoice.grand_total}*\n` +
    `Due Date: ${invoice.due_date}\n` +
    `Status: ${invoice.status}\n\n` +
    `📄 Download PDF: ${pdf_url}\n\n` +
    `Please make payment by the due date. Thank you!`
  );

  try {
    const res = await axios.post(wa_url(), {
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body }
    }, { headers: headers() });

    const wa_id = res.data.messages?.[0]?.id || "";
    await log_notification("whatsapp", "invoice", invoice._id, phone, "sent", "", wa_id);
    return { success: true, wa_message_id: wa_id };
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    await log_notification("whatsapp", "invoice", invoice._id, phone, "failed", errorMsg);
    return { success: false, error: errorMsg };
  }
};

// 2. Send Proposal
exports.send_proposal_whatsapp = async (proposal) => {
  const phone = clean_phone(proposal.project.client.phone);
  const pdf_url = `${process.env.BACKEND_URL}/api/v1/proposals/${proposal._id}/pdf/`;

  const body = clean_text(
    `*Proposal from ${firm_name()}*\n\n` +
    `Proposal No: *${proposal.prop_number}*\n` +
    `Project: ${proposal.project.name}\n` +
    `Title: ${proposal.title}\n` +
    `Status: ${proposal.status}\n\n` +
    `📄 Download PDF: ${pdf_url}\n\n` +
    `Please review and let us know your confirmation. Thank you!`
  );

  try {
    const res = await axios.post(wa_url(), { messaging_product: "whatsapp", to: phone, type: "text", text: { body } }, { headers: headers() });
    const wa_id = res.data.messages?.[0]?.id || "";
    await log_notification("whatsapp", "proposal", proposal._id, phone, "sent", "", wa_id);
    return { success: true, wa_message_id: wa_id };
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    await log_notification("whatsapp", "proposal", proposal._id, phone, "failed", errorMsg);
    return { success: false, error: errorMsg };
  }
};

// 3. Send Quotation Approval (Interactive)
exports.send_quotation_approval = async (quotation) => {
  const phone = clean_phone(quotation.project.client.phone);
  const pdf_url = `${process.env.BACKEND_URL}/api/v1/quotations/${quotation._id}/pdf/`;

  const body_text = clean_text(
    `*Quotation from ${firm_name()}*\n\n` +
    `Quote No: *${quotation.quote_number}* (v${quotation.version})\n` +
    `Project: ${quotation.project.name}\n` +
    `Amount: *₹${quotation.grand_total}*\n\n` +
    `📄 View full quotation: ${pdf_url}\n\n` +
    `Please review and tap Approve or Reject below.`
  );

  try {
    const res = await axios.post(wa_url(), {
      messaging_product: "whatsapp",
      to: phone,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body_text },
        action: {
          buttons: [
            { type: "reply", reply: { id: `approve_quote::${quotation._id}`, title: "✅ Approve" } }, //
            { type: "reply", reply: { id: `reject_quote::${quotation._id}`, title: "❌ Reject" } } //
          ]
        }
      }
    }, { headers: headers() });

    const wa_id = res.data.messages?.[0]?.id || "";
    await log_notification("whatsapp", "quotation", quotation._id, phone, "sent", "", wa_id);
    return { success: true, wa_message_id: wa_id };
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    await log_notification("whatsapp", "quotation", quotation._id, phone, "failed", errorMsg);
    return { success: false, error: errorMsg };
  }
};

// 4. Send Payment Reminder
exports.send_payment_reminder_whatsapp = async (invoice) => {
  const phone = clean_phone(invoice.project.client.phone);
  const body = clean_text(
    `⚠️ *Payment Reminder — ${firm_name()}*\n\n` +
    `Invoice No: *${invoice.invoice_number}*\n` +
    `Amount Paid: ₹${invoice.amount_paid}\n` +
    `*Balance Due: ₹${invoice.balance_due}*\n` +
    `Due Date: ${invoice.due_date} *(OVERDUE)*\n\n` +
    `Please clear the outstanding amount at the earliest.\nThank you!`
  );

  try {
    const res = await axios.post(wa_url(), { messaging_product: "whatsapp", to: phone, type: "text", text: { body } }, { headers: headers() });
    const wa_id = res.data.messages?.[0]?.id || "";
    await log_notification("whatsapp", "reminder", invoice._id, phone, "sent", "", wa_id);
    return { success: true, wa_message_id: wa_id };
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    await log_notification("whatsapp", "reminder", invoice._id, phone, "failed", errorMsg);
    return { success: false, error: errorMsg };
  }
};

// 5. Send Portfolio (image gallery — sends cover image + caption, with PDF link)
exports.send_portfolio_whatsapp = async (portfolio, recipient_phone) => {
  const phone = clean_phone(recipient_phone);
  const base = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const pdf_url = `${base}/api/v1/portfolio/${portfolio._id}/pdf/`;
  const cover = portfolio.images && portfolio.images[0];
  const cover_url = cover ? (cover.file_url.startsWith('http') ? cover.file_url : `${base}${cover.file_url}`) : null;

  const caption = clean_text(
    `*${portfolio.title}* — ${firm_name()}\n\n` +
    `${portfolio.description ? portfolio.description + '\n\n' : ''}` +
    `📷 ${portfolio.images ? portfolio.images.length : 0} photo(s)\n` +
    `📄 Full portfolio (PDF): ${pdf_url}`
  );

  try {
    let res;
    if (cover_url) {
      res = await axios.post(wa_url(), {
        messaging_product: "whatsapp",
        to: phone,
        type: "image",
        image: { link: cover_url, caption },
      }, { headers: headers() });
    } else {
      res = await axios.post(wa_url(), {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: caption },
      }, { headers: headers() });
    }

    const wa_id = res.data.messages?.[0]?.id || "";
    await log_notification("whatsapp", "portfolio", portfolio._id, phone, "sent", "", wa_id);
    return { success: true, wa_message_id: wa_id };
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    await log_notification("whatsapp", "portfolio", portfolio._id, phone, "failed", errorMsg);
    return { success: false, error: errorMsg };
  }
};

// Webhook Process Response Helper
exports.process_quotation_response = async (quotation_id, approved) => {
  const Quotation = require('../models/quotation');
  try {
    const quotation = await Quotation.findById(quotation_id);
    if (quotation) {
      quotation.status = approved ? 'approved' : 'rejected';
      await quotation.save();
    }
  } catch (err) {
    console.error("Webhook processing error", err);
  }
};