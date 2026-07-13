const cron = require('node-cron');
const Invoice = require('../models/invoice');
const waService = require('../services/whatsapp_service');
const emailService = require('../services/email_service');

const send_overdue_reminders = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Auto-mark overdue
  await Invoice.updateMany(
    { due_date: { $lt: today }, status: { $in: ['issued', 'partial'] } },
    { $set: { status: 'overdue' } }
  );

  // Find overdue invoices
  const overdue_invoices = await Invoice.find({ status: 'overdue' })
    .populate({ path: 'project', populate: { path: 'client' } });

  const results = [];
  for (const invoice of overdue_invoices) {
    const client = invoice.project.client;
    let wa_result = { skipped: true };
    let email_result = { skipped: true };

    if (client.phone) wa_result = await waService.send_payment_reminder_whatsapp(invoice); //
    if (client.email) email_result = await emailService.send_payment_reminder_email(invoice); //

    results.push({
      invoice: invoice.invoice_number,
      client: client.full_name,
      whatsapp: wa_result,
      email: email_result
    });
  }
  
  console.log("Scheduled Task: Reminders Sent", results);
  return results;
};

// Setup cron to run at 9:00 AM every day
cron.schedule('0 9 * * *', () => {
  console.log('Running daily overdue reminders check...');
  send_overdue_reminders();
});