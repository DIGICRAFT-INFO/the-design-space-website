const PaymentRecord = require('../models/payment_record');
const Invoice = require('../models/invoice');
const { createNotification, deleteNotificationsByReference } = require('../services/in_app_notification_service');

// ── BUG FIX #1: get_payments ─────────────────────────────────────────────────
// FIXED: matchStage was applied AFTER $unwind, but when filtering by invoice
// the $match must happen BEFORE lookup OR after with proper field name.
// Also, search on invoice_data fields only works post-lookup — split into two stages.
exports.get_payments = async (req, res) => {
  try {
    // Pre-match: filter by invoice (fast, on base collection)
    let preMatch = {};
    if (req.query.invoice) {
      preMatch.invoice = req.query.invoice; // invoice is stored as String (uuid)
    }

    // Ordering logic
    let sortStage = { payment_date: -1 };
    if (req.query.ordering) {
      sortStage = {};
      const fields = req.query.ordering.split(',');
      fields.forEach(field => {
        if (field.startsWith('-')) {
          sortStage[field.substring(1)] = -1;
        } else {
          sortStage[field] = 1;
        }
      });
    }

    // Post-lookup match: search across joined fields
    let postMatch = {};
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      postMatch.$or = [
        { reference_number: searchRegex },
        { 'invoice_data.invoice_number': searchRegex },
        { 'client_data.full_name': searchRegex }
      ];
    }

    const pipeline = [
      // FIXED: Pre-match before expensive lookups
      ...(Object.keys(preMatch).length > 0 ? [{ $match: preMatch }] : []),
      {
        $lookup: {
          from: 'invoices',
          localField: 'invoice',
          foreignField: '_id',
          as: 'invoice_data'
        }
      },
      { $unwind: { path: '$invoice_data', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'projects',
          localField: 'invoice_data.project',
          foreignField: '_id',
          as: 'project_data'
        }
      },
      { $unwind: { path: '$project_data', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'clients',
          localField: 'project_data.client',
          foreignField: '_id',
          as: 'client_data'
        }
      },
      { $unwind: { path: '$client_data', preserveNullAndEmptyArrays: true } },
      // Post-lookup search match
      ...(Object.keys(postMatch).length > 0 ? [{ $match: postMatch }] : []),
      { $sort: sortStage },
      {
        $project: {
          id: '$_id',
          _id: 0,
          invoice: 1,
          amount_paid: 1,
          payment_date: 1,
          payment_mode: 1,
          reference_number: 1,
          notes: 1,
          created_at: 1,
          invoice_number: '$invoice_data.invoice_number',
          client_name: '$client_data.full_name'
        }
      }
    ];

    const payments = await PaymentRecord.aggregate(pipeline);
    res.json(payments);
  } catch (error) {
    console.error('get_payments error:', error);
    res.status(500).json({ error: error.message });
  }
};

// PaymentListCreateView -> POST
exports.create_payment = async (req, res) => {
  try {
    const payment = await PaymentRecord.create(req.body);
    // post('save') hook on PaymentRecord triggers invoice.update_balance() automatically

    await createNotification({
      event_type: 'payment_received',
      title: 'Payment Received',
      message: `Payment of ₹${payment.amount_paid} recorded`,
      reference_id: payment._id,
      reference_type: 'payment'
    });

    // Return the full payment object with id field
    const obj = payment.toJSON();
    res.status(201).json(obj);
  } catch (error) {
    console.error('create_payment error:', error);
    res.status(400).json({ error: error.message });
  }
};

// PaymentDetailView -> GET
exports.get_payment_detail = async (req, res) => {
  try {
    const payment = await PaymentRecord.findById(req.params.pk)
      .populate({
        path: 'invoice',
        select: 'invoice_number project',
        populate: {
          path: 'project',
          select: 'client',
          populate: { path: 'client', select: 'full_name' }
        }
      });

    if (!payment) return res.status(404).json({ detail: 'Not found.' });

    const obj = payment.toJSON();
    obj.invoice_number = payment.invoice ? payment.invoice.invoice_number : null;
    obj.client_name = payment.invoice && payment.invoice.project && payment.invoice.project.client
      ? payment.invoice.project.client.full_name : null;

    // Keep invoice as just the ID (flat output)
    obj.invoice = payment.invoice ? payment.invoice._id : null;

    res.json(obj);
  } catch (error) {
    console.error('get_payment_detail error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── BUG FIX #2: update_payment ───────────────────────────────────────────────
// FIXED: Previously Object.assign + save() did not reliably trigger the
// post('save') hook for balance recalculation when amount_paid changes.
// Now we explicitly call invoice.update_balance() after saving.
exports.update_payment = async (req, res) => {
  try {
    const payment = await PaymentRecord.findById(req.params.pk);
    if (!payment) return res.status(404).json({ detail: 'Not found.' });

    const oldInvoiceId = payment.invoice;

    // Update allowed fields
    const allowed = ['amount_paid', 'payment_date', 'payment_mode', 'reference_number', 'notes'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        payment[field] = req.body[field];
      }
    });

    await payment.save();
    // post('save') hook fires automatically — but call explicitly as safety net
    // in case mongoose hook doesn't fire on update path
    const invoice = await Invoice.findById(oldInvoiceId);
    if (invoice) {
      await invoice.update_balance();
    }

    // If invoice changed, recalculate new invoice too
    if (req.body.invoice && req.body.invoice !== oldInvoiceId) {
      const newInvoice = await Invoice.findById(req.body.invoice);
      if (newInvoice) await newInvoice.update_balance();
    }

    res.json(payment.toJSON());
  } catch (error) {
    console.error('update_payment error:', error);
    res.status(400).json({ error: error.message });
  }
};

// PaymentDetailView -> DELETE
exports.delete_payment = async (req, res) => {
  try {
    const payment = await PaymentRecord.findOneAndDelete({ _id: req.params.pk });
    if (!payment) return res.status(404).json({ detail: 'Not found.' });

    // post('findOneAndDelete') hook fires automatically for balance update
    // Explicit safety call:
    const invoice = await Invoice.findById(payment.invoice);
    if (invoice) await invoice.update_balance();

    await deleteNotificationsByReference(req.params.pk, 'payment');
    res.status(204).send();
  } catch (error) {
    console.error('delete_payment error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── Payment Summary: category-wise breakdown ──────────────────────────────────
// GET /api/v1/payments/summary/
// Returns totals grouped by payment_mode, plus per-status invoice counts/amounts
// Optional: ?invoice= to scope to a single invoice
exports.get_payment_summary = async (req, res) => {
  try {
    let invoiceMatch = {};
    if (req.query.invoice) {
      invoiceMatch = { invoice: req.query.invoice };
    }

    // ── 1. Category-wise (payment_mode) totals ────────────────────────────
    const byMode = await PaymentRecord.aggregate([
      { $match: invoiceMatch },
      {
        $group: {
          _id: '$payment_mode',
          total_amount: { $sum: '$amount_paid' },
          count: { $sum: 1 },
        }
      },
      { $sort: { total_amount: -1 } }
    ]);

    // ── 2. Overall totals ─────────────────────────────────────────────────
    const overall = await PaymentRecord.aggregate([
      { $match: invoiceMatch },
      {
        $group: {
          _id: null,
          total_collected: { $sum: '$amount_paid' },
          payment_count: { $sum: 1 },
        }
      }
    ]);

    // ── 3. Invoice status counts (not scoped to a single invoice) ─────────
    let invoiceStats = null;
    if (!req.query.invoice) {
      const statusGroups = await Invoice.aggregate([
        {
          $match: {
            status: { $in: ['issued', 'partial', 'paid', 'overdue'] }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total_grand: { $sum: '$grand_total' },
            total_paid: { $sum: '$amount_paid' },
            total_balance: { $sum: '$balance_due' },
          }
        }
      ]);

      invoiceStats = {};
      statusGroups.forEach(g => {
        invoiceStats[g._id] = {
          count: g.count,
          total_grand: g.total_grand,
          total_paid: g.total_paid,
          total_balance: g.total_balance,
        };
      });
    }

    res.json({
      by_payment_mode: byMode.map(b => ({
        payment_mode: b._id,
        total_amount: b.total_amount,
        count: b.count,
      })),
      overall: overall.length > 0
        ? { total_collected: overall[0].total_collected, payment_count: overall[0].payment_count }
        : { total_collected: 0, payment_count: 0 },
      by_invoice_status: invoiceStats,
    });
  } catch (error) {
    console.error('get_payment_summary error:', error);
    res.status(500).json({ error: error.message });
  }
};
