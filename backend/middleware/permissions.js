const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();
exports.is_authenticated = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return res.status(401).json({ detail: 'Not authorized.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findOne({ _id: decoded.id });
    if (!req.user || !req.user.is_active) {
       return res.status(401).json({ detail: 'User inactive or not found.' });
    }
    next();
  } catch (err) {
    res.status(401).json({ detail: 'Invalid or expired token.' });
  }
};


exports.is_owner = (req, res, next) => {
  if (req.user && req.user.is_owner) next();
  else res.status(403).json({ detail: 'You do not have permission to perform this action.' });
};



exports.is_manager_or_above = (req, res, next) => {
  if (req.user && req.user.is_manager_or_above) next();
  else res.status(403).json({ detail: 'You do not have permission.' });
};

exports.is_finance_or_above = (req, res, next) => {
  if (req.user && req.user.is_finance_or_above) next();
  else res.status(403).json({ detail: 'You do not have permission.' });
};