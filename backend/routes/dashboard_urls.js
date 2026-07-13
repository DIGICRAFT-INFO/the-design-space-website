const express = require('express');
const router = express.Router();
const { dashboard_summary } = require('../controllers/dashboard_controller');
const { is_authenticated } = require('../middleware/permissions');

router.get('/summary/', is_authenticated, dashboard_summary);

module.exports = router;