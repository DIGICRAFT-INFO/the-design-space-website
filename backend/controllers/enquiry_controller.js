const Enquiry = require('../models/enquiry_model.js');
const { createNotification } = require('../services/in_app_notification_service.js');

// GET /api/v1/enquiries/
exports.list_enquiries = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.source) filter.source = req.query.source;
    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { client_name: regex },
        { mobile_number: regex },
        { address: regex },
      ];
    }

    const enquiries = await Enquiry.find(filter)
      .populate('created_by', 'full_name email')
      .sort({ created_at: -1 });

    res.json(enquiries);
  } catch (error) {
    console.error('❌ list_enquiries error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/v1/enquiries/:id/
exports.get_enquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id).populate('created_by', 'full_name email');
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found.' });
    res.json(enquiry);
  } catch (error) {
    console.error('❌ get_enquiry error:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/v1/enquiries/
exports.create_enquiry = async (req, res) => {
  try {
    console.log('📥 create_enquiry body:', req.body);
    console.log('👤 req.user:', req.user ? { id: req.user._id, role: req.user.role } : 'undefined');

    const { client_name, mobile_number, address, enquiry_date, enquiry_time, notes, status } = req.body;

    if (!client_name || !mobile_number || !address || !enquiry_date || !enquiry_time) {
      return res.status(400).json({
        error: 'client_name, mobile_number, address, enquiry_date, and enquiry_time are required.',
      });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    const enquiry = await Enquiry.create({
      client_name,
      mobile_number,
      address,
      enquiry_date: new Date(enquiry_date),
      enquiry_time,
      notes: notes || '',
      status: status || 'new',
      created_by: req.user._id,
    });

    await enquiry.populate('created_by', 'full_name email');

    await createNotification({
      event_type: 'enquiry_received',
      title: 'New Enquiry Logged',
      message: `Enquiry from ${enquiry.client_name} was added to the CRM.`,
      reference_id: enquiry._id,
      reference_type: 'enquiry',
    });

    res.status(201).json(enquiry);
  } catch (error) {
    console.error('❌ create_enquiry error:', error);
    let errorMsg = error.message;
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map((e) => e.message);
      errorMsg = messages.join(', ') || error.message;
    }
    res.status(400).json({ error: errorMsg });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/public/enquiry  (no auth — public Contact form on the website)
// Drops straight into the same CRM Enquiries list, tagged source:'website',
// so staff work every lead — manual or online — from one inbox.
// ═══════════════════════════════════════════════════════════════════════════
exports.create_public_enquiry = async (req, res) => {
  try {
    const { name, phone, email, budget_range, message } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required.' });
    }
    // very light shape checks — keep the public endpoint forgiving, the CRM
    // team can correct/enrich details once the lead lands in the dashboard
    if (String(phone).replace(/\D/g, '').length < 7) {
      return res.status(400).json({ error: 'Please provide a valid phone number.' });
    }

    const now = new Date();
    const enquiry = await Enquiry.create({
      client_name: String(name).trim().slice(0, 200),
      mobile_number: String(phone).trim().slice(0, 20),
      email: email ? String(email).trim().slice(0, 200) : '',
      budget_range: budget_range ? String(budget_range).trim().slice(0, 100) : '',
      notes: message ? String(message).trim() : '',
      enquiry_date: now,
      enquiry_time: now.toTimeString().slice(0, 5),
      status: 'new',
      source: 'website',
      created_by: null,
    });

    await createNotification({
      event_type: 'enquiry_received',
      title: 'New Website Enquiry',
      message: `${enquiry.client_name} submitted the Contact form on thedesignspace.in`,
      reference_id: enquiry._id,
      reference_type: 'enquiry',
    });

    res.status(201).json({ message: 'Thank you — your enquiry has been received. Our team will reach out shortly.', id: enquiry.id });
  } catch (error) {
    console.error('❌ create_public_enquiry error:', error);
    let errorMsg = error.message;
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map((e) => e.message);
      errorMsg = messages.join(', ') || error.message;
    }
    res.status(400).json({ error: errorMsg });
  }
};

// PATCH /api/v1/enquiries/:id/
exports.update_enquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found.' });

    const { client_name, mobile_number, address, enquiry_date, enquiry_time, notes, status } = req.body;

    if (client_name !== undefined) enquiry.client_name = client_name;
    if (mobile_number !== undefined) enquiry.mobile_number = mobile_number;
    if (address !== undefined) enquiry.address = address;
    if (enquiry_date !== undefined) enquiry.enquiry_date = new Date(enquiry_date);
    if (enquiry_time !== undefined) enquiry.enquiry_time = enquiry_time;
    if (notes !== undefined) enquiry.notes = notes;
    if (status !== undefined) enquiry.status = status;

    await enquiry.save();
    await enquiry.populate('created_by', 'full_name email');
    res.json(enquiry);
  } catch (error) {
    console.error('❌ update_enquiry error:', error);
    let errorMsg = error.message;
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map((e) => e.message);
      errorMsg = messages.join(', ') || error.message;
    }
    res.status(400).json({ error: errorMsg });
  }
};

// DELETE /api/v1/enquiries/:id/
exports.delete_enquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found.' });

    await Enquiry.deleteOne({ _id: enquiry._id });
    res.status(204).send();
  } catch (error) {
    console.error('❌ delete_enquiry error:', error);
    res.status(500).json({ error: error.message });
  }
};