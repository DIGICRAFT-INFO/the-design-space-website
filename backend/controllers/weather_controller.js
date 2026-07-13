const axios = require('axios');
require('dotenv').config();

// In-memory cache: key -> { data, timestamp }
const weatherCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Check if a cached entry is still valid.
 */
function getCached(key) {
  const entry = weatherCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    weatherCache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Store data in cache with current timestamp.
 */
function setCache(key, data) {
  weatherCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Transform OpenWeatherMap API response to our format.
 */
function transformWeatherData(apiData) {
  return {
    temperature: apiData.main.temp,
    condition: apiData.weather[0].description,
    location: apiData.name,
    icon: apiData.weather[0].icon,
    humidity: apiData.main.humidity,
    wind_speed: apiData.wind.speed,
  };
}

/**
 * GET /api/v1/weather?lat={lat}&lon={lon}
 * Fetch weather by latitude and longitude.
 */
exports.get_weather = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ detail: 'lat and lon query parameters are required.' });
    }

    const cacheKey = `${lat}_${lon}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const API_KEY = process.env.WEATHER_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ detail: 'Weather API key not configured.' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const response = await axios.get(url);

    const weatherData = transformWeatherData(response.data);
    setCache(cacheKey, weatherData);

    return res.status(200).json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json({ detail: error.response.data.message || 'Weather API error.' });
    }
    return res.status(500).json({ detail: 'Failed to fetch weather data.' });
  }
};

/**
 * GET /api/v1/weather/default
 * Fetch weather for the default city configured via DEFAULT_WEATHER_CITY env var.
 */
exports.get_default_weather = async (req, res) => {
  try {
    const cityName = process.env.DEFAULT_WEATHER_CITY || 'Mumbai';
    const cacheKey = `city_${cityName}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const API_KEY = process.env.WEATHER_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ detail: 'Weather API key not configured.' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=metric`;
    const response = await axios.get(url);

    const weatherData = transformWeatherData(response.data);
    setCache(cacheKey, weatherData);

    return res.status(200).json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json({ detail: error.response.data.message || 'Weather API error.' });
    }
    return res.status(500).json({ detail: 'Failed to fetch weather data.' });
  }
};
