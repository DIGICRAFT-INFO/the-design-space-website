const InAppNotification = require('../models/in_app_notification');

// GET / — List notifications (paginated, filterable)
exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { user: null },
        { user: req.user._id }
      ]
    };

    // BUG FIX: Accept both ?event_type= (direct) and ?type= (group prefix from frontend)
    const typeParam = req.query.event_type || req.query.type;
    if (typeParam) {
      const GROUP_PREFIXES = ['invoice', 'quotation', 'proposal', 'project', 'service', 'portfolio', 'enquiry'];
      if (GROUP_PREFIXES.includes(typeParam)) {
        // Group filter — match all event_types that start with the prefix
        filter.event_type = { $regex: `^${typeParam}`, $options: 'i' };
      } else {
        // Exact match (e.g. client_created, payment_received)
        filter.event_type = typeParam;
      }
    }

    if (req.query.is_read !== undefined) {
      filter.is_read = req.query.is_read === 'true';
    }

    const [notifications, total] = await Promise.all([
      InAppNotification.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      InAppNotification.countDocuments(filter)
    ]);

    res.json({
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await InAppNotification.countDocuments({
      $or: [{ user: null }, { user: req.user._id }],
      is_read: false
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PATCH /:pk/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await InAppNotification.findByIdAndUpdate(
      req.params.pk,
      { is_read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ detail: 'Not found.' });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PATCH /mark-all-read
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await InAppNotification.updateMany(
      {
        $or: [{ user: null }, { user: req.user._id }],
        is_read: false
      },
      { is_read: true }
    );
    res.json({ modified_count: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /:pk  (admin utility to delete single notification)
exports.deleteNotification = async (req, res) => {
  try {
    await InAppNotification.findByIdAndDelete(req.params.pk);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
