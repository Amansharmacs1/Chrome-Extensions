/**
 * NewTab Pro - Weather Engine
 * Privacy-first weather widget powered by Open-Meteo (No API key, zero tracking).
 * Manual city search, Celsius/Fahrenheit support, intelligent caching, and graceful offline handling.
 */

export const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * WMO Weather interpretation codes
 */
export const WMO_CODES = {
  0: { label: 'Clear Sky', icon: 'sun' },
  1: { label: 'Mainly Clear', icon: 'sun-cloud' },
  2: { label: 'Partly Cloudy', icon: 'cloud-sun' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Foggy', icon: 'fog' },
  48: { label: 'Depositing Rime Fog', icon: 'fog' },
  51: { label: 'Light Drizzle', icon: 'cloud-drizzle' },
  53: { label: 'Moderate Drizzle', icon: 'cloud-drizzle' },
  55: { label: 'Dense Drizzle', icon: 'cloud-drizzle' },
  61: { label: 'Slight Rain', icon: 'cloud-rain' },
  63: { label: 'Moderate Rain', icon: 'cloud-rain' },
  65: { label: 'Heavy Rain', icon: 'cloud-rain-heavy' },
  71: { label: 'Slight Snow', icon: 'snowflake' },
  73: { label: 'Moderate Snow', icon: 'snowflake' },
  75: { label: 'Heavy Snow', icon: 'snowflake' },
  77: { label: 'Snow Grains', icon: 'snowflake' },
  80: { label: 'Slight Rain Showers', icon: 'cloud-rain' },
  81: { label: 'Moderate Showers', icon: 'cloud-rain' },
  82: { label: 'Violent Showers', icon: 'cloud-rain-heavy' },
  85: { label: 'Slight Snow Showers', icon: 'snowflake' },
  86: { label: 'Heavy Snow Showers', icon: 'snowflake' },
  95: { label: 'Thunderstorm', icon: 'cloud-lightning' },
  96: { label: 'Thunderstorm with Hail', icon: 'cloud-lightning' },
  99: { label: 'Severe Thunderstorm', icon: 'cloud-lightning' }
};

export function getWeatherCondition(code = 0) {
  return WMO_CODES[code] || { label: 'Variable', icon: 'cloud-sun' };
}

/**
 * Geocodes city name using Open-Meteo Geocoding API
 * @param {string} cityName
 * @returns {Promise<{ name: string, country: string, latitude: number, longitude: number }|null>}
 */
export async function geocodeCity(cityName) {
  const clean = (cityName || '').trim();
  if (!clean) return null;

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geocoding failed with HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data && Array.isArray(data.results) && data.results.length > 0) {
    const top = data.results[0];
    return {
      name: top.name,
      country: top.country || '',
      latitude: top.latitude,
      longitude: top.longitude
    };
  }
  return null;
}

/**
 * Fetches current weather for given coordinates
 * @param {Object} options
 * @param {number} options.latitude
 * @param {number} options.longitude
 * @param {'c'|'f'} options.unit
 * @returns {Promise<Object>}
 */
export async function fetchCurrentWeather({ latitude, longitude, unit = 'c' }) {
  const tempUnit = unit === 'f' ? 'fahrenheit' : 'celsius';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&temperature_unit=${tempUnit}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather API failed with HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data || !data.current) {
    throw new Error('Weather data format invalid');
  }

  const current = data.current;
  const condition = getWeatherCondition(current.weather_code);

  return {
    temperature: Math.round(current.temperature_2m),
    unit: unit === 'f' ? '°F' : '°C',
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    weatherCode: current.weather_code,
    isDay: current.is_day !== undefined ? Boolean(current.is_day) : true,
    conditionLabel: condition.label,
    icon: condition.icon,
    fetchedAt: Date.now()
  };
}

/**
 * Weather Manager with built-in caching
 */
export class WeatherManager {
  /**
   * Evaluates weather state and fetches if cache expired
   * @param {Object} weatherConfig
   * @returns {Promise<{ status: 'disabled'|'unconfigured'|'cached'|'updated'|'error', data: Object|null, error: string|null }>}
   */
  static async loadWeather(weatherConfig) {
    if (!weatherConfig || !weatherConfig.enabled) {
      return { status: 'disabled', data: null, error: null };
    }

    if (!weatherConfig.latitude || !weatherConfig.longitude) {
      return { status: 'unconfigured', data: null, error: 'City not configured' };
    }

    const now = Date.now();
    const isCacheValid = (
      weatherConfig.cachedData &&
      weatherConfig.lastFetched &&
      (now - weatherConfig.lastFetched < CACHE_TTL_MS)
    );

    if (isCacheValid) {
      return { status: 'cached', data: weatherConfig.cachedData, error: null };
    }

    try {
      const data = await fetchCurrentWeather({
        latitude: weatherConfig.latitude,
        longitude: weatherConfig.longitude,
        unit: weatherConfig.unit || 'c'
      });

      return { status: 'updated', data, error: null };
    } catch (err) {
      console.warn('[NewTabPro Weather] Fetch failed:', err);
      // Fallback to cache if available even if slightly stale
      if (weatherConfig.cachedData) {
        return { status: 'cached', data: weatherConfig.cachedData, error: err.message };
      }
      return { status: 'error', data: null, error: err.message };
    }
  }
}
