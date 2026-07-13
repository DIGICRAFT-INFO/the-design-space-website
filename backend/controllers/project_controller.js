const Project = require('../models/project');

// ProjectListCreateView -> GET (Nested under Client)
exports.get_client_projects = async (req, res) => {
  try {
    const projects = await Project.find({ client: req.params.client_pk })
      .populate('client', 'full_name'); // client_name mapping
      
    // Format JSON string strictly to include client_name
    const formatted = projects.map(p => ({
      ...p.toJSON(),
      client_name: p.client ? p.client.full_name : null
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ProjectListCreateView -> POST (Nested under Client)
exports.create_client_project = async (req, res) => {
  try {
    // Inject client_id equivalent from URL
    const projectData = { ...req.body, client: req.params.client_pk };
    const project = await Project.create(projectData);
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ProjectDetailView -> GET/PUT/DELETE (Nested)
exports.get_project_detail = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.pk, client: req.params.client_pk }).populate('client', 'full_name');
    if (!project) return res.status(404).json({ detail: 'Not found.' });
    
    const projectObj = project.toJSON();
    projectObj.client_name = project.client.full_name;
    res.json(projectObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update_project = async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.pk, client: req.params.client_pk }, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ detail: 'Not found.' });
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_project = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.pk, client: req.params.client_pk });
    if (!project) return res.status(404).json({ detail: 'Not found.' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ProjectAllListView -> GET
exports.get_all_projects = async (req, res) => {
  try {
    // select_related('client') in mongoose is populate
    const projects = await Project.find().sort('-created_at').populate('client', 'full_name email phone');
    
    const formatted = projects.map(p => ({
      ...p.toJSON(),
      client_name: p.client ? p.client.full_name : null
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};