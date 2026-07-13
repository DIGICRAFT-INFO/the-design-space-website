const ProposalTemplate = require('../models/proposal_template');

// ProposalTemplateListCreateView -> GET/POST
exports.get_templates = async (req, res) => {
  try {
    const templates = await ProposalTemplate.find({ is_active: true }).sort('name'); // queryset logic
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create_template = async (req, res) => {
  try {
    const template = await ProposalTemplate.create(req.body);
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ProposalTemplateDetailView -> GET/PUT/DELETE
exports.get_template_detail = async (req, res) => {
  try {
    const template = await ProposalTemplate.findById(req.params.pk);
    if (!template) return res.status(404).json({ detail: 'Not found.' });
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update_template = async (req, res) => {
  try {
    const template = await ProposalTemplate.findByIdAndUpdate(req.params.pk, req.body, { new: true });
    if (!template) return res.status(404).json({ detail: 'Not found.' });
    res.json(template);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_template = async (req, res) => {
  try {
    const template = await ProposalTemplate.findByIdAndDelete(req.params.pk);
    if (!template) return res.status(404).json({ detail: 'Not found.' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};