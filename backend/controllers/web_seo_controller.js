const WebSeo = require('../models/web_seo');

exports.list_seo_admin = async (req, res) => {
  try {
    const entries = await WebSeo.find().sort({ route_path: 1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upsert by route_path — the CMS always works with "the SEO entry for this
// route", not entry ids, so create-or-update in one call is simplest.
exports.upsert_seo = async (req, res) => {
  try {
    const { route_path, meta_title, meta_description, meta_keywords } = req.body;
    if (!route_path) return res.status(400).json({ error: 'route_path is required.' });

    let entry = await WebSeo.findOne({ route_path });
    if (entry) {
      if (meta_title !== undefined) entry.meta_title = meta_title;
      if (meta_description !== undefined) entry.meta_description = meta_description;
      if (meta_keywords !== undefined) entry.meta_keywords = meta_keywords;
      await entry.save();
    } else {
      entry = await WebSeo.create({
        route_path,
        meta_title: meta_title || '',
        meta_description: meta_description || '',
        meta_keywords: meta_keywords || [],
      });
    }
    res.status(200).json(entry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_seo = async (req, res) => {
  try {
    const entry = await WebSeo.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'SEO entry not found.' });
    await WebSeo.deleteOne({ _id: entry._id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Public — bulk fetch, so the frontend can resolve metadata for any route
// with a single request rather than one per page during static generation.
exports.list_seo_public = async (req, res) => {
  try {
    const entries = await WebSeo.find();
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
