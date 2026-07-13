const Quotation = require('../models/quotation');
const QuotationItem = require('../models/quotation_item');
const QuotationHistory = require('../models/quotation_history');
const quoteService = require('../services/quotation_service');
const pdfEngine = require('../services/pdf_engine_service'); // From previous setup
const { createNotification, deleteNotificationsByReference } = require('../services/in_app_notification_service');

const formatQuotation = (q) => {
  const obj = q.toJSON();
  obj.project_name = q.project ? q.project.name : null; //
  obj.client_name = q.project && q.project.client ? q.project.client.full_name : null; //
  return obj;
};

// ── Version history / diff helpers ──────────────────────────────────────────
// Scalar fields tracked for the right-side "what changed" panel.
const TRACKED_FIELDS = [
  { key: 'status', label: 'Status' },
  { key: 'valid_until', label: 'Valid Until' },
  { key: 'discount_type', label: 'Discount Type' },
  { key: 'discount_value', label: 'Discount Value' },
  { key: 'cgst_rate', label: 'CGST Rate' },
  { key: 'sgst_rate', label: 'SGST Rate' },
  { key: 'igst_rate', label: 'IGST Rate' },
  { key: 'notes', label: 'Notes' },
];

const normalize = (val) => {
  if (val === undefined || val === null) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val);
};

const simplifyItems = (items) =>
  (items || []).map((i) => ({
    description: i.description || '',
    category: i.category || '',
    quantity: Number(i.quantity) || 0,
    unit: i.unit || '',
    rate: Number(i.rate) || 0,
    amount: (Number(i.quantity) || 0) * (Number(i.rate) || 0),
  }));

// Builds the diff between the quotation's current (pre-save) state and the
// incoming PUT payload. Only fields actually present in the payload are compared.
const buildFieldChanges = (oldDoc, newData) => {
  const changes = [];
  for (const { key, label } of TRACKED_FIELDS) {
    if (newData[key] === undefined) continue;
    const oldVal = oldDoc[key];
    const newVal = newData[key];
    if (normalize(oldVal) !== normalize(newVal)) {
      changes.push({ field: label, old_value: oldVal ?? null, new_value: newVal ?? null });
    }
  }
  return changes;
};

// QuotationListCreateView -> GET
exports.get_quotations = async (req, res) => {
  try {
    let matchStage = {};
    if (req.query.status) matchStage.status = req.query.status; //
    if (req.query.project) matchStage.project = req.query.project; //

    const quotations = await Quotation.find(matchStage)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('items')
      .sort('-created_at'); //

    // Filter by client if ?client= param provided (quotations don't store client directly,
    // it's reached via project.client, so this must be done post-query)
    let filtered = quotations;
    if (req.query.client) {
      filtered = quotations.filter(q =>
        q.project && q.project.client &&
        String(q.project.client._id) === String(req.query.client)
      );
    }

    res.json(filtered.map(formatQuotation));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create_quotation = async (req, res) => {
  try {
    const data = { ...req.body };
    const items_data = data.items || [];
    delete data.items;

    // project is now optional — remove it only if empty string
    if (!data.project) {
      data.project = null;
    }

    // Clean up valid_until — remove empty strings so Mongoose uses default (null)
    if (!data.valid_until) {
      delete data.valid_until;
    }

    // Generate number first
    const generatedNumber = await quoteService.generate_quote_number();
    data.quote_number = generatedNumber;

    // Create the parent
    const quotation = await Quotation.create(data);

    // Create children — resolve service images + calculate amount
    if (items_data.length > 0) {
      const MasterService = require('../models/master_service');
      const itemsWithQuoteId = await Promise.all(items_data.map(async item => {
        let service_image_url = item.service_image_url || null;
        // If service linked, pull first image from it
        if (item.service && !service_image_url) {
          const svc = await MasterService.findById(item.service);
          if (svc && svc.media && svc.media.length > 0) {
            const firstImg = svc.media.find(m => m.file_type === 'image') || svc.media[0];
            service_image_url = firstImg ? firstImg.file_url : null;
          }
        }
        return {
          ...item,
          quotation: quotation._id,
          service_image_url,
          amount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)
        };
      }));
      await QuotationItem.insertMany(itemsWithQuoteId);
    }

    // Final calculation
    const finalQuote = await quoteService.recalculate_totals(quotation);

    await createNotification({
      event_type: 'quotation_created',
      title: 'Quotation Created',
      message: `Quotation ${finalQuote.quote_number} created`,
      reference_id: finalQuote._id,
      reference_type: 'quotation'
    });

    res.status(201).json(finalQuote);
  } catch (error) {
    console.error("Create Quotation Error:", error.name, error.message);
    if (error.errors) console.error("Validation details:", JSON.stringify(error.errors, null, 2));
    let errorMsg = error.message;
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map(e => e.message);
      errorMsg = messages.join(', ') || error.message;
    }
    res.status(400).json({ error: errorMsg || 'Failed to create quotation.' });
  }
};

// QuotationDetailView -> GET, PUT, DELETE
exports.get_quotation_detail = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.pk)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('items'); //
    if (!quotation) return res.status(404).json({ detail: 'Not found.' });
    
    res.json(formatQuotation(quotation));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update_quotation = async (req, res) => {
  try {
    let data = { ...req.body };
    const items_data = data.items;
    delete data.items;

    // project is optional — allow null/empty
    if (data.project === '') data.project = null;

    // Clean up valid_until — remove empty strings so Mongoose uses default (null)
    if (data.valid_until === '' || data.valid_until === undefined) {
      data.valid_until = null;
    }

    let quotation = await Quotation.findById(req.params.pk);
    if (!quotation) return res.status(404).json({ detail: 'Not found.' });

    const oldItemsDocs = await QuotationItem.find({ quotation: quotation._id }).sort('sort_order');
    const oldItemsSimple = simplifyItems(oldItemsDocs);
    const fieldChanges = buildFieldChanges(quotation.toObject(), data);

    if (items_data !== undefined) {
      const newItemsSimple = simplifyItems(items_data);
      const itemsChanged = JSON.stringify(oldItemsSimple) !== JSON.stringify(newItemsSimple);
      if (itemsChanged) {
        fieldChanges.push({ field: 'Line Items', old_value: oldItemsSimple, new_value: newItemsSimple });
      }
    }

    if (fieldChanges.length > 0) {
      await QuotationHistory.create({
        quotation: quotation._id,
        version_snapshot: quotation.version,
        changes: fieldChanges,
        snapshot: { ...quotation.toObject(), items: oldItemsSimple },
        changed_by: req.user ? req.user._id : null,
        changed_by_name: req.user ? req.user.full_name : '',
      });
    }

    Object.assign(quotation, data);
    await quotation.save();

    if (items_data !== undefined) {
      await QuotationItem.deleteMany({ quotation: quotation._id });
      const MasterService = require('../models/master_service');
      for (const item of items_data) {
        let service_image_url = item.service_image_url || null;
        if (item.service && !service_image_url) {
          const svc = await MasterService.findById(item.service);
          if (svc && svc.media && svc.media.length > 0) {
            const firstImg = svc.media.find(m => m.file_type === 'image') || svc.media[0];
            service_image_url = firstImg ? firstImg.file_url : null;
          }
        }
        await QuotationItem.create({ ...item, quotation: quotation._id, service_image_url });
      }
    }

    quotation = await quoteService.recalculate_totals(quotation);
    res.json(quotation);
  } catch (error) {
    let errorMsg = error.message;
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map(e => e.message);
      errorMsg = messages.join(', ') || error.message;
    }
    res.status(400).json({ error: errorMsg || 'Failed to update quotation.' });
  }
};

exports.delete_quotation = async (req, res) => {
  try {
    await Quotation.findByIdAndDelete(req.params.pk);
    await deleteNotificationsByReference(req.params.pk, 'quotation');
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ApproveQuotationView -> POST
exports.approve_quotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.pk);
    if (!quotation) return res.status(404).json({ detail: 'Not found.' });

    if (!['draft', 'sent'].includes(quotation.status)) {
      return res.status(400).json({ detail: `Cannot approve a quotation with status: ${quotation.status}` }); //
    }

    quotation.status = 'approved'; //
    await quotation.save();

    await createNotification({
      event_type: 'quotation_approved',
      title: 'Quotation Approved',
      message: `Quotation ${quotation.quote_number} has been approved`,
      reference_id: quotation._id,
      reference_type: 'quotation'
    });

    res.json(quotation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ReviseQuotationView -> POST
exports.revise_quotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.pk);
    if (!quotation) return res.status(404).json({ detail: 'Not found.' });

    const new_version = await quoteService.create_revision(quotation); //
    res.status(201).json(new_version);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// QuotationVersionHistoryView -> GET
exports.get_version_history = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.pk);
    if (!quotation) return res.json([]);

    // Walk back to root
    let root = quotation;
    while (root.parent_quotation) {
      const parent = await Quotation.findById(root.parent_quotation);
      if (!parent) break;
      root = parent;
    }

    // Collect entire chain recursively (Node.js style tree traversal)
    let chain = [root];
    let current = root;
    while (true) {
      const child = await Quotation.findOne({ parent_quotation: current._id });
      if (!child) break;
      chain.push(child);
      current = child;
    }

    res.json(chain);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// QuotationEditHistoryView -> GET (right-side panel: list + diff per update)
exports.get_quotation_history = async (req, res) => {
  try {
    const exists = await Quotation.exists({ _id: req.params.pk });
    if (!exists) return res.status(404).json({ detail: 'Not found.' });

    const history = await QuotationHistory.find({ quotation: req.params.pk })
      .sort('-created_at'); // most recent edit first

    res.json(history.map(h => h.toJSON()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.send_quotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.pk);
    if (!quotation) return res.status(404).json({ detail: 'Not found.' });
    quotation.status = 'sent';
    await quotation.save();
    res.json(quotation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// QuotationPDFView -> GET
exports.get_quotation_pdf = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.pk)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('items');

    if (!quotation) return res.status(404).json({ detail: 'Not found.' });

    const pdfBuffer = await pdfEngine.render_quotation_pdf(quotation);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quotation.quote_number}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Quotation PDF error:', error.message);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      detail: 'PDF generation failed.',
      error: error.message,
    });
  }
};
// ── Copy Quotation ────────────────────────────────────────────────────────────
exports.copy_quotation = async (req, res) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();
  try {
    const source = await Quotation.findById(req.params.pk)
      .populate('items')
      .session(session);
    if (!source) return res.status(404).json({ detail: 'Not found.' });

    // ── Determine next copy suffix ──────────────────────────────────────────
    const baseNumber = source.quote_number;
    const escapedBase = baseNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const copyPattern = new RegExp(`^${escapedBase}-C(\\d+)$`);

    const existingCopies = await Quotation.find({
      quote_number: copyPattern,
    }).session(session);

    let nextCopyNum = 1;
    if (existingCopies.length > 0) {
      const nums = existingCopies.map(q => {
        const m = q.quote_number.match(/-C(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      });
      nextCopyNum = Math.max(...nums) + 1;
    }

    const newQuoteNumber = `${baseNumber}-C${nextCopyNum}`;

    // ── Clone quotation ─────────────────────────────────────────────────────
    const today = new Date();
    const validUntil = req.body.valid_until ? new Date(req.body.valid_until) : source.valid_until;

    const [newQuotation] = await Quotation.create([{
      project:        source.project,
      quote_number:   newQuoteNumber,
      version:        1,
      status:         'draft',
      valid_until:    validUntil,
      discount_type:  source.discount_type,
      discount_value: source.discount_value,
      cgst_rate:      source.cgst_rate,
      sgst_rate:      source.sgst_rate,
      igst_rate:      source.igst_rate,
      notes:          req.body.notes !== undefined ? req.body.notes : source.notes,
    }], { session });

    // ── Clone line items (with any edits from req.body.items) ───────────────
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const itemOverrides = req.body.items || [];
    const sourceItems = source.items || [];

    const allItems = itemOverrides.length > 0
      ? itemOverrides.map((it, idx) => ({
          quotation:   newQuotation._id,
          description: it.description || '',
          category:    it.category    || '',
          quantity:    parseFloat(it.quantity) || 0,
          unit:        it.unit        || '',
          rate:        parseFloat(it.rate)     || 0,
          amount:      round2((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0)),
          sort_order:  idx + 1,
        }))
      : sourceItems.map(it => ({
          quotation:   newQuotation._id,
          description: it.description,
          category:    it.category || '',
          quantity:    it.quantity,
          unit:        it.unit,
          rate:        it.rate,
          amount:      round2(it.quantity * it.rate),
          sort_order:  it.sort_order,
        }));

    await QuotationItem.insertMany(allItems, { session });

    // ── Supersede the source quotation ───────────────────────────────────────
    // Mirrors what "Revise" already does for versioned quotations: the old
    // one should stop being treated as an active quote once a copy replaces
    // it, otherwise both remain "live" and any totals/reporting that sums
    // quotations double-count the same underlying deal.
    if (source.status !== 'superseded') {
      await Quotation.findByIdAndUpdate(
        source._id,
        { status: 'superseded' },
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    // ── Recalculate totals ──────────────────────────────────────────────────
    const populated = await quoteService.recalculate_totals(
      await Quotation.findById(newQuotation._id).populate('items')
    );

    // ── Return full populated copy ──────────────────────────────────────────
    const result = await Quotation.findById(newQuotation._id)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('items');

    const obj = result.toJSON();
    obj.project_name = result.project ? result.project.name : null;
    obj.client_name  = result.project?.client?.full_name ?? null;

    await createNotification({
      event_type: 'quotation_created',
      title:      'Quotation Copied',
      message:    `Quotation ${newQuoteNumber} created as copy of ${baseNumber}`,
      reference_type: 'quotation',
      reference_id:   String(newQuotation._id),
    });

    return res.status(201).json(obj);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('copy_quotation error:', err);
    return res.status(500).json({ detail: err.message || 'Copy failed.' });
  }
};