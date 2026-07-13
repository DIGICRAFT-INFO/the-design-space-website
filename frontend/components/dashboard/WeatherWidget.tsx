"use client";

import { useState, useEffect, useCallback } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets } from "lucide-react";

interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  icon: string;
  humidity: number;
  wind_speed: number;
  timestamp: number;
}

const CACHE_KEY = "weatherCache";
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

function getCachedWeather(): WeatherData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached) as WeatherData;
    // Invalidate cache after 30 min
    if (Date.now() - data.timestamp > REFRESH_INTERVAL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCachedWeather(data: WeatherData) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function getWeatherIcon(code: number) {
  if (code <= 1) return <Sun size={28} className="text-yellow-500" />;
  if (code <= 3) return <Cloud size={28} className="text-gray-400" />;
  if (code >= 61 && code <= 67) return <CloudRain size={28} className="text-blue-400" />;
  if (code >= 71 && code <= 77) return <CloudSnow size={28} className="text-blue-200" />;
  if (code >= 95) return <CloudLightning size={28} className="text-yellow-600" />;
  return <Cloud size={28} className="text-gray-400" />;
}

function getConditionText(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rainy";
  if (code === 66 || code === 67) return "Freezing rain";
  if (code >= 71 && code <= 75) return "Snowing";
  if (code === 77) return "Snow grains";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weatherCode, setWeatherCode] = useState(0);

  const fetchWeather = useCallback(async (lat: number, lon: number, cityName?: string) => {
    try {
      // Using Open-Meteo API for weather
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather fetch failed");

      const data = await res.json();
      const current = data.current;
      const code = current.weather_code || 0;

      setWeatherCode(code);

      // Fetch actual city name using BigDataCloud free API instead of timezone
      let locationName = cityName || "Your Location";
      if (!cityName) {
        try {
          const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          const geoData = await geoRes.json();
          locationName = geoData.city || geoData.locality || "Your Location";
        } catch (err) {
          console.error("City fetch failed", err);
        }
      }

      const weatherData: WeatherData = {
        temperature: Math.round(current.temperature_2m),
        condition: getConditionText(code),
        location: locationName,
        icon: String(code),
        humidity: current.relative_humidity_2m,
        wind_speed: Math.round(current.wind_speed_10m),
        timestamp: Date.now(),
      };

      setWeather(weatherData);
      setCachedWeather(weatherData);
    } catch {
      const cached = getCachedWeather();
      if (cached) {
        setWeather(cached);
        setWeatherCode(parseInt(cached.icon) || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDefaultWeather = useCallback(async () => {
    // Default: Raipur coordinates 
    await fetchWeather(21.2514, 81.6296, "Raipur");
  }, [fetchWeather]);

  useEffect(() => {
    const cached = getCachedWeather();
    if (cached) {
      setWeather(cached);
      setWeatherCode(parseInt(cached.icon) || 0);
      setLoading(false);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchDefaultWeather(),
        { timeout: 8000 }
      );
    } else {
      fetchDefaultWeather();
    }

    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
          () => fetchDefaultWeather(),
          { timeout: 8000 }
        );
      } else {
        fetchDefaultWeather();
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchWeather, fetchDefaultWeather]);

  if (loading && !weather) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl border border-blue-100 p-4 flex items-center justify-center min-w-[180px] min-h-[80px]">
        <div className="animate-spin w-5 h-5 border-2 border-[#C8922A] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl border border-blue-100 p-4 min-w-[180px]">
      <div className="flex items-center gap-3">
        {getWeatherIcon(weatherCode)}
        <div>
          <p className="text-[22px] font-extrabold text-[#1C1C1C] leading-tight">
            {weather.temperature}°C
          </p>
          <p className="text-[11px] text-[#6B6259] capitalize font-medium">
            {weather.condition}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-[#9A8F82]">
        <span className="flex items-center gap-1"><Droplets size={10} />{weather.humidity}%</span>
        <span className="flex items-center gap-1"><Wind size={10} />{weather.wind_speed} km/h</span>
      </div>
      <p className="text-[10px] text-[#9A8F82] mt-1 font-medium">{weather.location}</p>
    </div>
  );
}