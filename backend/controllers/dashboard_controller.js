const Invoice = require('../models/invoice'); // Assuming these models exist
const PaymentRecord = require('../models/payment_record');
const Client = require('../models/client');
const Project = require('../models/project');
const Quotation = require('../models/quotation');

// DashboardSummaryView
exports.dashboard_summary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Auto-mark overdue invoices
    await Invoice.updateMany(
      { 
        due_date: { $lt: today }, 
        status: { $in: ['issued', 'partial'] } 
      },
      { $set: { status: 'overdue' } }
    );

    // Aggregations
    // Exclude cancelled invoices (e.g. the source of a "Copy & Edit") so a
    // copied invoice isn't counted twice — once as the original, once as
    // the new copy.
    const [total_invoiced_agg] = await Invoice.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, t: { $sum: '$grand_total' } } },
    ]);
    const [total_collected_agg] = await PaymentRecord.aggregate([{ $group: { _id: null, t: { $sum: '$amount_paid' } } }]);
    const [outstanding_agg] = await Invoice.aggregate([
      { $match: { status: { $in: ['issued', 'partial', 'overdue'] } } },
      { $group: { _id: null, t: { $sum: '$balance_due' } } }
    ]);

    const kpis = {
      total_invoiced: total_invoiced_agg ? parseFloat(total_invoiced_agg.t) : 0,
      total_collected: total_collected_agg ? parseFloat(total_collected_agg.t) : 0,
      outstanding: outstanding_agg ? parseFloat(outstanding_agg.t) : 0,
      overdue_count: await Invoice.countDocuments({ status: 'overdue' }),
      active_projects: await Project.countDocuments({ status: 'active' }),
      total_clients: await Client.countDocuments(),
      pending_quotations: await Quotation.countDocuments({ status: 'sent' })
    };

    // Recent 5 invoices
    const recent_invoices_raw = await Invoice.find()
      .sort({ created_at: -1 })
      .limit(5)
      .populate({
        path: 'project',
        populate: { path: 'client' }
      });

    // Formatting strictly to match Django's exact JSON keys
    const recent_invoices = recent_invoices_raw.map(inv => ({
      id: inv._id,
      invoice_number: inv.invoice_number,
      grand_total: inv.grand_total,
      status: inv.status,
      due_date: inv.due_date,
      project__name: inv.project ? inv.project.name : null,
      project__client__full_name: inv.project && inv.project.client ? inv.project.client.full_name : null
    }));

    res.json({ kpis, recent_invoices });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};