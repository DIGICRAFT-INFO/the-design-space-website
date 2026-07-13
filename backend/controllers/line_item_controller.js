const LineItemLibrary = require('../models/line_item_library');

// GET /line-items/
// FIX: Added ?all=true param so the Settings page can fetch ALL items (including inactive)
// Without this, toggling an item inactive immediately hides it from the list
exports.get_line_items = async (req, res) => {
  try {
    let query = {};

    // Default: only active items (for quotation dropdowns)
    // Settings page passes ?all=true to see inactive items too
    if (req.query.all !== 'true') {
      query.is_active = true;
    }

    if (req.query.category) {
      query.category = { $regex: req.query.category, $options: 'i' };
    }

    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
      ];
    }

    let sortObj = { category: 1, name: 1 };
    if (req.query.ordering) {
      sortObj = {};
      const fields = req.query.ordering.split(',');
      fields.forEach(field => {
        if (field.startsWith('-')) sortObj[field.substring(1)] = -1;
        else sortObj[field] = 1;
      });
    }

    const items = await LineItemLibrary.find(query).sort(sortObj);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /line-items/
exports.create_line_item = async (req, res) => {
  try {
    const item = await LineItemLibrary.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// GET /line-items/:pk/
exports.get_line_item_detail = async (req, res) => {
  try {
    const item = await LineItemLibrary.findById(req.params.pk);
    if (!item) return res.status(404).json({ detail: 'Not found.' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT/PATCH /line-items/:pk/
exports.update_line_item = async (req, res) => {
  try {
    const item = await LineItemLibrary.findByIdAndUpdate(req.params.pk, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ detail: 'Not found.' });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// DELETE /line-items/:pk/
exports.delete_line_item = async (req, res) => {
  try {
    const item = await LineItemLibrary.findByIdAndDelete(req.params.pk);
    if (!item) return res.status(404).json({ detail: 'Not found.' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};