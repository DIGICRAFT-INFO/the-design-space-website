const Invoice = require('../models/invoice');
const InvoiceItem = require('../models/invoice_item');
const invoiceService = require('../services/invoice_service');
const pdfEngine = require('../services/pdf_engine_service');
const { createNotification, deleteNotificationsByReference } = require('../services/in_app_notification_service');

exports.get_invoice_pdf = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.pk)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('items');
    if (!invoice) return res.status(404).json({ detail: 'Not found.' });

    const pdfBuffer = await pdfEngine.render_invoice_pdf(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Invoice PDF error:', error.message);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      detail: 'PDF generation failed.',
      error: error.message,
    });
  }
};

// InvoiceListCreateView -> GET
exports.get_invoices = async (req, res) => {
  try {
    let query = {};

    // Support single or multiple ?status= values
    // e.g. ?status=issued  OR  ?status=issued&status=partial&status=overdue
    if (req.query.status) {
      const statuses = Array.isArray(req.query.status)
        ? req.query.status
        : [req.query.status];
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    // Populate project+client first to allow client-level filtering
    const invoices = await Invoice.find(query)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('quotation')
      .populate('items')
      .sort('-created_at');

    // Filter by client if ?client= param provided
    let filtered = invoices;
    if (req.query.client) {
      filtered = invoices.filter(inv =>
        inv.project && inv.project.client &&
        String(inv.project.client._id) === String(req.query.client)
      );
    }

    const formatted = filtered.map(inv => {
      const obj = inv.toJSON();
      obj.project_name = inv.project ? inv.project.name : null;
      obj.client_name  = inv.project && inv.project.client ? inv.project.client.full_name : null;
      return obj;
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// InvoiceListCreateView -> POST
exports.create_invoice = async (req, res) => {
  try {
    const invoice = await Invoice.create(req.body);

    await createNotification({
      event_type: 'invoice_created',
      title: 'Invoice Generated',
      message: `Invoice ${invoice.invoice_number} created for ₹${invoice.grand_total}`,
      reference_id: invoice._id,
      reference_type: 'invoice'
    });

    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Invoice send (mark as issued)
exports.send_invoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.pk);
    if (!invoice) return res.status(404).json({ detail: 'Not found.' });
    if (invoice.status !== 'draft') {
      return res.status(400).json({ detail: `Cannot send invoice with status: ${invoice.status}` });
    }
    invoice.status = 'issued';
    await invoice.save();

    await createNotification({
      event_type: 'invoice_sent',
      title: 'Invoice Sent',
      message: `Invoice ${invoice.invoice_number} sent to client`,
      reference_id: invoice._id,
      reference_type: 'invoice'
    });

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Invoice mark as paid
exports.mark_invoice_paid = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.pk);
    if (!invoice) return res.status(404).json({ detail: 'Not found.' });
    invoice.status = 'paid';
    await invoice.save();

    await createNotification({
      event_type: 'invoice_paid',
      title: 'Payment Complete',
      message: `Invoice ${invoice.invoice_number} marked as paid`,
      reference_id: invoice._id,
      reference_type: 'invoice'
    });

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// InvoiceDetailView -> GET, PUT, DELETE
exports.get_invoice_detail = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.pk)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('quotation')
      .populate('items'); // prefetch_related('items')
      
    if (!invoice) return res.status(404).json({ detail: 'Not found.' });
    
    const obj = invoice.toJSON();
    obj.project_name = invoice.project ? invoice.project.name : null; //
    obj.client_name = invoice.project && invoice.project.client ? invoice.project.client.full_name : null; //
    
    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update_invoice = async (req, res) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();
  try {
    const { items, ...invoiceFields } = req.body;
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    // Fetch invoice BEFORE update to get quotation reference & existing totals
    const existingInv = await Invoice.findById(req.params.pk)
      .populate('quotation')
      .session(session);
    if (!existingInv) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ detail: 'Not found.' });
    }

    // ── Resolve tax rates ──────────────────────────────────────────────────
    // Priority: req.body > linked quotation > TaxSettings defaults
    let cgstRate = 0, sgstRate = 0, igstRate = 0;

    if (invoiceFields.cgst_rate !== undefined) {
      cgstRate = parseFloat(invoiceFields.cgst_rate) || 0;
      sgstRate = parseFloat(invoiceFields.sgst_rate) || 0;
      igstRate = parseFloat(invoiceFields.igst_rate) || 0;
    } else if (existingInv.quotation && existingInv.quotation.cgst_rate !== undefined) {
      cgstRate = parseFloat(existingInv.quotation.cgst_rate) || 0;
      sgstRate = parseFloat(existingInv.quotation.sgst_rate) || 0;
      igstRate = parseFloat(existingInv.quotation.igst_rate) || 0;
    } else {
      // Fallback: read TaxSettings
      try {
        const { TaxSettings } = require('../models/settings');
        const taxDoc = await TaxSettings.findOne().session(session);
        if (taxDoc) {
          cgstRate = parseFloat(taxDoc.default_cgst) || 0;
          sgstRate = parseFloat(taxDoc.default_sgst) || 0;
          igstRate = parseFloat(taxDoc.default_igst) || 0;
        }
      } catch (e) { /* use 0 if settings missing */ }
    }

    // ── Replace line items if provided ────────────────────────────────────
    let subtotal = 0;
    if (Array.isArray(items)) {
      const InvoiceItem = require('../models/invoice_item');
      await InvoiceItem.deleteMany({ invoice: req.params.pk }, { session });

      if (items.length > 0) {
        const newItems = items.map(it => {
          const qty  = parseFloat(it.quantity) || 0;
          const rate = parseFloat(it.rate)     || 0;
          const amt  = round2(qty * rate);
          subtotal  += amt;
          return {
            invoice:     req.params.pk,
            description: it.description || '',
            category:    it.category    || '',
            quantity:    qty,
            unit:        it.unit        || '',
            rate,
            amount:      amt,
          };
        });
        await InvoiceItem.insertMany(newItems, { session });
      }

      // ── Recalculate totals with correct tax rates ──────────────────────
      subtotal = round2(subtotal);
      const cgstAmt   = round2(subtotal * cgstRate / 100);
      const sgstAmt   = round2(subtotal * sgstRate / 100);
      const igstAmt   = round2(subtotal * igstRate / 100);
      const totalTax  = round2(cgstAmt + sgstAmt + igstAmt);
      const grandTotal = round2(subtotal + totalTax);

      Object.assign(invoiceFields, {
        subtotal,
        taxable_amount: subtotal,
        cgst_amount:    cgstAmt,
        sgst_amount:    sgstAmt,
        igst_amount:    igstAmt,
        total_tax:      totalTax,
        grand_total:    grandTotal,
        balance_due:    grandTotal,
      });
    }

    // ── Update invoice fields + recalculated totals in one shot ───────────
    await Invoice.findByIdAndUpdate(req.params.pk, invoiceFields, { session });

    await session.commitTransaction();
    session.endSession();

    // ── Return fully populated invoice ────────────────────────────────────
    const populated = await Invoice.findById(req.params.pk)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('quotation')
      .populate('items');
    const obj = populated.toJSON();
    obj.project_name = populated.project ? populated.project.name : null;
    obj.client_name  = populated.project?.client?.full_name ?? null;
    // Expose tax rates for frontend display
    obj.cgst_rate = cgstRate;
    obj.sgst_rate = sgstRate;
    obj.igst_rate = igstRate;
    res.json(obj);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: error.message });
  }
};

exports.delete_invoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.pk);
    if (!invoice) return res.status(404).json({ detail: 'Not found.' });
    await deleteNotificationsByReference(req.params.pk, 'invoice');
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GenerateInvoiceView -> POST (from quotation)
exports.generate_invoice = async (req, res) => {
  try {
    const invoice = await invoiceService.generate_invoice_from_quotation(req.body);
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
};

// DirectInvoiceView -> POST (without quotation — manual/ad-hoc billing)
exports.create_direct_invoice = async (req, res) => {
  try {
    const invoice = await invoiceService.create_direct_invoice(req.body);

    // Populate for response
    const populated = await require('../models/invoice').findById(invoice._id)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('items');
    const obj = populated.toJSON();
    obj.project_name = populated.project ? populated.project.name : null;
    obj.client_name  = populated.project && populated.project.client ? populated.project.client.full_name : null;

    await createNotification({
      event_type: 'invoice_created',
      title: 'Invoice Generated',
      message: `Direct invoice ${obj.invoice_number} created for ₹${obj.grand_total}`,
      reference_id: obj.id,
      reference_type: 'invoice',
    });

    res.status(201).json(obj);
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
};
// ─── Copy Invoice (POST /:pk/copy/) ───────────────────────────────────────────
// Creates a new draft invoice cloned from the source, with copy-suffix logic:
// INV-2025-001 → INV-2025-001-C1 → INV-2025-001-C1-C2 (chained copies)
// Items are also deep-cloned. Source invoice is NOT mutated.
exports.copy_invoice = async (req, res) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();
  try {
    const source = await Invoice.findById(req.params.pk)
      .populate('items')
      .session(session);
    if (!source) return res.status(404).json({ detail: 'Not found.' });

    // ── Block copying an invoice that already has payments ─────────────────
    // A copy is meant to replace the source outright (it gets auto-
    // cancelled below). If money has already been collected against it,
    // cancelling would hide that collected amount from reports, so we
    // refuse the copy entirely rather than silently doing the wrong thing.
    if (['paid', 'partial'].includes(source.status) || parseFloat(source.amount_paid || 0) > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        detail: 'This invoice already has payments recorded and cannot be copied. Please create a new invoice instead.',
      });
    }

    // ── Determine next copy suffix ──────────────────────────────────────────
    // Find all invoices whose number starts with source.invoice_number + '-C'
    const baseNumber = source.invoice_number;
    const escapedBase = baseNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const copyPattern = new RegExp(`^${escapedBase}-C(\\d+)$`);

    const existingCopies = await Invoice.find({
      invoice_number: copyPattern,
    }).session(session);

    let nextCopyNum = 1;
    if (existingCopies.length > 0) {
      const nums = existingCopies.map(inv => {
        const m = inv.invoice_number.match(/-C(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      });
      nextCopyNum = Math.max(...nums) + 1;
    }

    const newInvoiceNumber = `${baseNumber}-C${nextCopyNum}`;

    // ── Clone invoice ────────────────────────────────────────────────────────
    const today = new Date();
    const due = new Date(today);
    due.setDate(today.getDate() + 15);

    const [newInvoice] = await Invoice.create([{
      project:            source.project,
      quotation:          source.quotation,
      invoice_number:     newInvoiceNumber,
      invoice_type:       source.invoice_type,
      invoice_date:       req.body.invoice_date ? new Date(req.body.invoice_date) : today,
      due_date:           req.body.due_date     ? new Date(req.body.due_date)     : due,
      status:             'draft',
      milestone_label:    source.milestone_label,
      milestone_percentage: source.milestone_percentage,
      subtotal:           source.subtotal,
      taxable_amount:     source.taxable_amount,
      cgst_amount:        source.cgst_amount,
      sgst_amount:        source.sgst_amount,
      igst_amount:        source.igst_amount,
      total_tax:          source.total_tax,
      grand_total:        source.grand_total,
      balance_due:        source.grand_total,
      amount_paid:        0,
      notes:              req.body.notes !== undefined ? req.body.notes : source.notes,
    }], { session });

    // ── Clone line items (with any edits from req.body.items) ───────────────
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const itemOverrides = req.body.items || [];
    const sourceItems = source.items || [];

    // Build final items list — use overrides if provided, else source values
    const allItems = itemOverrides.length > 0
      ? itemOverrides.map(it => ({
          invoice:     newInvoice._id,
          description: it.description || '',
          category:    it.category    || '',
          quantity:    parseFloat(it.quantity) || 0,
          unit:        it.unit        || '',
          rate:        parseFloat(it.rate)     || 0,
          amount:      round2((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0)),
        }))
      : sourceItems.map(it => ({
          invoice:     newInvoice._id,
          description: it.description,
          category:    it.category || '',
          quantity:    it.quantity,
          unit:        it.unit,
          rate:        it.rate,
          amount:      round2(it.quantity * it.rate),
        }));

    const InvoiceItem = require('../models/invoice_item');
    await InvoiceItem.insertMany(allItems, { session });

    // ── Recalculate totals from actual items ───────────────────────────────
    // Tax rates: from linked quotation → TaxSettings → 0
    let cgstRate = 0, sgstRate = 0, igstRate = 0;
    if (source.quotation) {
      const Quotation = require('../models/quotation');
      const quot = await Quotation.findById(
        typeof source.quotation === 'object' ? source.quotation._id : source.quotation
      ).session(session);
      if (quot) {
        cgstRate = parseFloat(quot.cgst_rate) || 0;
        sgstRate = parseFloat(quot.sgst_rate) || 0;
        igstRate = parseFloat(quot.igst_rate) || 0;
      }
    }
    if (cgstRate === 0 && sgstRate === 0 && igstRate === 0) {
      try {
        const { TaxSettings } = require('../models/settings');
        const taxDoc = await TaxSettings.findOne().session(session);
        if (taxDoc) {
          cgstRate = parseFloat(taxDoc.default_cgst) || 0;
          sgstRate = parseFloat(taxDoc.default_sgst) || 0;
          igstRate = parseFloat(taxDoc.default_igst) || 0;
        }
      } catch(e) { /* keep 0 */ }
    }

    const newSubtotal  = round2(allItems.reduce((s, it) => s + it.amount, 0));
    const cgstAmt      = round2(newSubtotal * cgstRate / 100);
    const sgstAmt      = round2(newSubtotal * sgstRate / 100);
    const igstAmt      = round2(newSubtotal * igstRate / 100);
    const totalTax     = round2(cgstAmt + sgstAmt + igstAmt);
    const newGrandTotal = round2(newSubtotal + totalTax);

    await Invoice.findByIdAndUpdate(newInvoice._id, {
      subtotal:       newSubtotal,
      taxable_amount: newSubtotal,
      cgst_amount:    cgstAmt,
      sgst_amount:    sgstAmt,
      igst_amount:    igstAmt,
      total_tax:      totalTax,
      grand_total:    newGrandTotal,
      balance_due:    newGrandTotal,
    }, { session });

    // ── Cancel the source invoice so it stops counting toward totals ────────
    // A copy is meant to *replace* the source (client asked for changes to
    // the same bill), not add a second live invoice alongside it. Without
    // this, both the source and the copy have status other than 'cancelled'
    // and both get summed into dashboard/client "Total Invoiced" figures,
    // effectively double-counting the same amount.
    // Safety: never auto-cancel an invoice that already has payments
    // recorded against it — that would silently hide real collected money.
    if (parseFloat(source.amount_paid || 0) === 0 && source.status !== 'cancelled') {
      await Invoice.findByIdAndUpdate(
        source._id,
        { status: 'cancelled', balance_due: 0 },
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    // ── Return full populated copy ───────────────────────────────────────────
    const populated = await Invoice.findById(newInvoice._id)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('items');

    const obj = populated.toJSON();
    obj.project_name = populated.project ? populated.project.name : null;
    obj.client_name  = populated.project?.client?.full_name ?? null;

    const { createNotification } = require('../services/in_app_notification_service');
    await createNotification({
      event_type:     'invoice_created',
      title:          'Invoice Copied',
      message:        `Invoice ${newInvoiceNumber} created as copy of ${baseNumber}`,
      reference_id:   newInvoice._id,
      reference_type: 'invoice',
    });

    res.status(201).json(obj);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: error.message });
  }
};