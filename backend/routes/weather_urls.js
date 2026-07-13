const express = require('express');
const router = express.Router();
const { is_authenticated } = require('../middleware/permissions');
const { get_weather, get_default_weather } = require('../controllers/weather_controller');

// GET /api/v1/weather — fetch weather by lat/lon
router.get('/', is_authenticated, get_weather);

// GET /api/v1/weather/default — fetch weather for default city
router.get('/default', is_authenticated, get_default_weather);

module.exports = router;
