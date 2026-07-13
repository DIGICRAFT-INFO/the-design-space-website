const Client = require('../models/client');
const { createNotification, deleteNotificationsByReference } = require('../services/in_app_notification_service');

// ClientListCreateView -> GET
exports.get_clients = async (req, res) => {
  try {
    // Mongoose Aggregation to get 'project_count' mimicking lightweight ClientListSerializer
    const clients = await Client.aggregate([
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: 'client',
          as: 'projects'
        }
      },
      {
        $project: {
          id: '$_id',
          full_name: 1,
          email: 1,
          phone: 1,
          gstin: 1,
          billing_address: 1,
          site_address: 1,
          lead_source: 1,
          lead_source_other: 1,
          client_type: 1,
          client_type_other: 1,
          city: 1,
          state: 1,
          country: 1,
          created_at: 1,
          project_count: { $size: '$projects' }, // source='projects.count'
          all_projects_completed: {
            $and: [
              { $gt: [{ $size: '$projects' }, 0] },
              {
                $allElementsTrue: {
                  $map: {
                    input: '$projects',
                    as: 'p',
                    in: { $eq: ['$$p.status', 'completed'] }
                  }
                }
              }
            ]
          }
        }
      },
      { $sort: { full_name: 1, created_at: 1 } } // ordering_fields
    ]);
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ClientListCreateView -> POST
exports.create_client = async (req, res) => {
  try {
    const client = await Client.create(req.body);

    await createNotification({
      event_type: 'client_created',
      title: 'New Client Added',
      message: `Client "${client.full_name || client.name}" has been added`,
      reference_id: client._id,
      reference_type: 'client'
    });

    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ClientDetailView -> GET
exports.get_client_detail = async (req, res) => {
  try {
    // findById ke saath findOne bhi try karo
    const client = await Client.findOne({ 
      $or: [
        { _id: req.params.pk },
        { id: req.params.pk }
      ]
    }).populate('projects');
    
    if (!client) return res.status(404).json({ detail: 'Not found.' });
    
    const clientObj = client.toJSON();
    clientObj.project_count = client.projects.length;
    res.json(clientObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ClientDetailView -> PUT/PATCH/DELETE
exports.update_client = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.pk, req.body, { new: true, runValidators: true });
    if (!client) return res.status(404).json({ detail: 'Not found.' });
    res.json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_client = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.pk);
    if (!client) return res.status(404).json({ detail: 'Not found.' });
    await deleteNotificationsByReference(req.params.pk, 'client');
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};