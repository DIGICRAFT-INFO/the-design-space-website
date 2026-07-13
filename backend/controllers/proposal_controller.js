const Proposal = require('../models/proposal');
const ProposalTemplate = require('../models/proposal_template');
const Project = require('../models/project');
const proposalService = require('../services/proposal_service');
const pdfEngine = require('../services/pdf_engine_service'); // Imported from previous PDF service
const { createNotification, deleteNotificationsByReference } = require('../services/in_app_notification_service');

// Helper format strictly matching ProposalSerializer output
const formatProposal = (prop) => {
  const obj = prop.toJSON();
  const client = prop.project && prop.project.client ? prop.project.client : {};
  
  return {
    ...obj,
    project_name: prop.project ? prop.project.name : null,
    client_id: client._id || null, //
    client_name: client.full_name || null, //
    client_email: client.email || null, //
    client_phone: client.phone || null, //
    template_name: prop.template ? prop.template.name : null //
  };
};

// ProposalListCreateView -> GET
exports.get_proposals = async (req, res) => {
  try {
    let matchStage = {};
    if (req.query.status) matchStage.status = req.query.status; // status_f filter

    // Searching and Sorting logic omitted for brevity but applies exactly like previous controllers
    const proposals = await Proposal.find(matchStage)
      .sort('-created_at')
      .populate({ path: 'project', populate: { path: 'client' } }) // select_related
      .populate('template')
      .populate('services');

    // Filter by client if ?client= param provided (proposals don't store client directly,
    // it's reached via project.client, so this must be done post-query)
    let filtered = proposals;
    if (req.query.client) {
      filtered = proposals.filter(prop =>
        prop.project && prop.project.client &&
        String(prop.project.client._id) === String(req.query.client)
      );
    }

    res.json(filtered.map(formatProposal));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ProposalListCreateView -> POST
exports.create_proposal = async (req, res) => {
  try {
    let data = { ...req.body };
    data.prop_number = await proposalService.generate_proposal_number(); //

    const use_template_id = data.use_template; // write-only extraction
    delete data.use_template;

    if (use_template_id) {
      const template = await ProposalTemplate.findById(use_template_id);
      const project = await Project.findById(data.project).populate('client');
      
      if (template && project) {
        data.template = template._id; //
        data.content = await proposalService.render_template_content(template, project); //
      }
    }

    const proposal = await Proposal.create(data);

    await createNotification({
      event_type: 'proposal_created',
      title: 'Proposal Created',
      message: `Proposal "${proposal.title}" created`,
      reference_id: proposal._id,
      reference_type: 'proposal'
    });

    res.status(201).json(proposal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ProposalDetailView -> GET, PUT, DELETE
exports.get_proposal_detail = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.pk)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('template')
      .populate('services');
    if (!proposal) return res.status(404).json({ detail: 'Not found.' });
    res.json(formatProposal(proposal));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update_proposal = async (req, res) => {
  try {
    let data = { ...req.body };
    const use_template_id = data.use_template; //
    delete data.use_template;

    if (use_template_id) {
      const template = await ProposalTemplate.findById(use_template_id);
      // Need project to render, fetch current if not in update body
      const proposalRef = await Proposal.findById(req.params.pk);
      const projectId = data.project || proposalRef.project;
      const project = await Project.findById(projectId).populate('client');

      if (template && project) {
        data.template = template._id;
        data.content = await proposalService.render_template_content(template, project); //
      }
    }

    const proposal = await Proposal.findByIdAndUpdate(req.params.pk, data, { new: true });
    if (!proposal) return res.status(404).json({ detail: 'Not found.' });
    res.json(proposal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_proposal = async (req, res) => {
  try {
    const proposal = await Proposal.findByIdAndDelete(req.params.pk);
    if (!proposal) return res.status(404).json({ detail: 'Not found.' });
    await deleteNotificationsByReference(req.params.pk, 'proposal');
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ProposalStatusView -> PATCH
exports.update_status = async (req, res) => {
  try {
    const validStatuses = ['draft', 'sent', 'accepted', 'rejected'];
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({ detail: 'Invalid status.' }); //
    }

    const proposal = await Proposal.findByIdAndUpdate(
      req.params.pk, 
      { status: req.body.status }, 
      { new: true }
    ).populate({ path: 'project', populate: { path: 'client' } }).populate('template');

    if (!proposal) return res.status(404).json({ detail: 'Not found.' });

    // Emit notifications for sent/accepted/rejected status changes
    const statusNotificationMap = {
      sent: { event_type: 'proposal_sent', title: 'Proposal Sent', message: `Proposal "${proposal.title}" has been sent` },
      accepted: { event_type: 'proposal_accepted', title: 'Proposal Accepted', message: `Proposal "${proposal.title}" has been accepted` },
      rejected: { event_type: 'proposal_rejected', title: 'Proposal Rejected', message: `Proposal "${proposal.title}" has been rejected` }
    };

    if (statusNotificationMap[req.body.status]) {
      const notif = statusNotificationMap[req.body.status];
      await createNotification({
        event_type: notif.event_type,
        title: notif.title,
        message: notif.message,
        reference_id: proposal._id,
        reference_type: 'proposal'
      });
    }

    res.json(formatProposal(proposal)); //
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ProposalPDFView -> GET
exports.get_proposal_pdf = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.pk)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('template');

    if (!proposal) return res.status(404).json({ detail: 'Not found.' });

    const pdfBuffer = await pdfEngine.render_proposal_pdf(proposal);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${proposal.prop_number || 'proposal'}.pdf"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error.message);
    // Always return JSON with proper status so CORS header is included
    res.status(500).json({
      detail: 'PDF generation failed. Chromium may not be available on this server.',
      error: error.message,
    });
  }
};