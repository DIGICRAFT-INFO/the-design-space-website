const User = require('../models/User');
const { createNotification } = require('../services/in_app_notification_service');

// ── All pages available for access control ────────────────────────────────────
const ALL_PAGES = [
  // CRM Dashboard
  'dashboard',
  'clients',
  'services',
  'projects',
  'proposals',
  'quotations',
  'invoices',
  'portfolio',
  'payments',
  'pending_users',
  'enquiries',
  'history',
  'notifications',
  // Website CMS
  'web_cms_overview',
  'web_cms_home',
  'web_cms_about',
  'web_cms_services',
  'web_cms_products',
  'web_cms_portfolio',
  'web_cms_blog',
  'web_cms_careers',
  'web_cms_leads',
  'web_cms_seo',
  'web_cms_media',
  'web_cms_legal',
  'web_cms_settings',
];

exports.get_all_pages = (req, res) => {
  res.json({ pages: ALL_PAGES });
};

// ── List all managed users (superadmin/owner only) ────────────────────────────
exports.list_managed_users = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id }, // exclude self
    })
      .sort({ created_at: -1 })
      .select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
};

// ── Create user directly (superadmin creates with instant access) ─────────────
exports.create_managed_user = async (req, res) => {
  try {
    const { email, full_name, password, role, page_access } = req.body;

    if (!email || !full_name || !password) {
      return res.status(400).json({ detail: 'email, full_name and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ detail: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ detail: 'User with this email already exists.' });
    }

    const user = await User.create({
      email,
      full_name,
      password,
      role: role || 'designer',
      is_active: true, // instantly active — superadmin created
      page_access: page_access || [],
      access_granted_by: req.user._id,
      access_granted_at: new Date(),
    });

    // In-app notification
    await createNotification({
      event_type: 'user_created',
      title: 'New User Added',
      message: `${req.user.full_name} created access for "${user.full_name}" (${user.email})`,
      reference_id: user._id,
      reference_type: 'user',
    });

    const userObj = user.toJSON();
    res.status(201).json(userObj);
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
};

// ── Get single managed user ───────────────────────────────────────────────────
exports.get_managed_user = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ detail: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
};

// ── Update user (name, email, role, page_access) ──────────────────────────────
exports.update_managed_user = async (req, res) => {
  try {
    const { full_name, email, role, page_access, new_password } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ detail: 'User not found.' });

    if (full_name !== undefined) user.full_name = full_name;
    if (role !== undefined) user.role = role;
    if (page_access !== undefined) user.page_access = page_access;

    if (email !== undefined && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ detail: 'Email already in use.' });
      user.email = email;
    }

    if (new_password) {
      if (new_password.length < 8) {
        return res.status(400).json({ detail: 'Password must be at least 8 characters.' });
      }
      user.password = new_password; // pre-save hook will hash it
    }

    await user.save();
    const userObj = user.toJSON();
    res.json(userObj);
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
};

// ── Grant access (activate + set page_access) ─────────────────────────────────
exports.grant_access = async (req, res) => {
  try {
    const { page_access, role } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ detail: 'User not found.' });

    user.is_active = true;
    user.page_access = page_access || user.page_access;
    if (role) user.role = role;
    user.access_granted_by = req.user._id;
    user.access_granted_at = new Date();
    await user.save();

    await createNotification({
      event_type: 'access_granted',
      title: 'Access Granted',
      message: `${req.user.full_name} granted access to "${user.full_name}"`,
      reference_id: user._id,
      reference_type: 'user',
    });

    res.json({ detail: `Access granted to ${user.full_name}.`, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
};

// ── Revoke access (deactivate + clear page_access) ────────────────────────────
// This is INSTANT — next API call by that user will get 401
exports.revoke_access = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ detail: 'User not found.' });

    user.is_active = false;
    user.page_access = [];
    await user.save();

    await createNotification({
      event_type: 'access_revoked',
      title: 'Access Revoked',
      message: `${req.user.full_name} revoked access for "${user.full_name}" (${user.email})`,
      reference_id: user._id,
      reference_type: 'user',
    });

    res.json({ detail: `Access revoked for ${user.full_name}. They cannot login anymore.` });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
};

// ── Delete user permanently ───────────────────────────────────────────────────
exports.delete_managed_user = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ detail: 'User not found.' });

    // Prevent deleting self
    if (user._id === req.user._id) {
      return res.status(400).json({ detail: 'You cannot delete your own account.' });
    }

    await User.findByIdAndDelete(req.params.userId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
};

// ── Update page_access only ───────────────────────────────────────────────────
exports.update_page_access = async (req, res) => {
  try {
    const { page_access } = req.body;
    if (!Array.isArray(page_access)) {
      return res.status(400).json({ detail: 'page_access must be an array.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { page_access, access_granted_by: req.user._id, access_granted_at: new Date() },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ detail: 'User not found.' });

    await createNotification({
      event_type: 'access_updated',
      title: 'Page Access Updated',
      message: `${req.user.full_name} updated page access for "${user.full_name}"`,
      reference_id: user._id,
      reference_type: 'user',
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
};

// ── Me endpoint: return page_access with user ─────────────────────────────────
exports.get_my_access = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ detail: 'Not found.' });
    res.json({
      id: user._id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      page_access: user.page_access || [],
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
};
