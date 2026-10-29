/**
 * NewTab Pro - Live Weather Atmosphere Engine
 * Dynamically resolves atmospheric background gradients, accent lighting,
 * and ambient particle effects matching the live weather of the user's location.
 */

export const ATMOSPHERE_CONDITIONS = {
  clearDay: {
    id: 'clear-day',
    label: 'Clear & Sunny',
    css: 'radial-gradient(ellipse at 50% -10%, #38bdf8 0%, #0284c7 35%, #0369a1 70%, #0c4a6e 100%)',
    accent: '#F59E0B',
    accentCyan: '#38BDF8',
    fxClass: 'fx-sunbeam'
  },
  clearNight: {
    id: 'clear-night',
    label: 'Clear Starlit Night',
    css: 'radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #090d16 55%, #020617 100%)',
    accent: '#818CF8',
    accentCyan: '#38BDF8',
    fxClass: 'fx-stars'
  },
  cloudyDay: {
    id: 'cloudy-day',
    label: 'Partly Cloudy',
    css: 'linear-gradient(180deg, #38bdf8 0%, #64748b 45%, #334155 85%, #1e293b 100%)',
    accent: '#06B6D4',
    accentCyan: '#94A3B8',
    fxClass: 'fx-clouds'
  },
  cloudyNight: {
    id: 'cloudy-night',
    label: 'Cloudy Night',
    css: 'linear-gradient(180deg, #1e293b 0%, #0f172a 60%, #020617 100%)',
    accent: '#64748B',
    accentCyan: '#38BDF8',
    fxClass: 'fx-clouds-night'
  },
  overcast: {
    id: 'overcast',
    label: 'Overcast & Gloomy',
    css: 'linear-gradient(180deg, #475569 0%, #334155 50%, #1e293b 100%)',
    accent: '#94A3B8',
    accentCyan: '#64748B',
    fxClass: 'fx-overcast'
  },
  rain: {
    id: 'rain',
    label: 'Rainy Atmosphere',
    css: 'radial-gradient(circle at 50% 10%, #0369a1 0%, #0f172a 50%, #020617 100%)',
    accent: '#38BDF8',
    accentCyan: '#06B6D4',
    fxClass: 'fx-rain'
  },
  thunderstorm: {
    id: 'thunderstorm',
    label: 'Thunderstorm & Tempest',
    css: 'radial-gradient(circle at 60% 15%, #4338ca 0%, #1e1b4b 35%, #090d16 85%)',
    accent: '#A855F7',
    accentCyan: '#38BDF8',
    fxClass: 'fx-storm'
  },
  snow: {
    id: 'snow',
    label: 'Frost & Snowfall',
    css: 'linear-gradient(180deg, #1e293b 0%, #334155 35%, #60a5fa 75%, #dbeafe 100%)',
    accent: '#93C5FD',
    accentCyan: '#E0F2FE',
    fxClass: 'fx-snow'
  },
  fog: {
    id: 'fog',
    label: 'Misty Fog',
    css: 'linear-gradient(180deg, #334155 0%, #475569 45%, #64748b 100%)',
    accent: '#CBD5E1',
    accentCyan: '#94A3B8',
    fxClass: 'fx-fog'
  }
};

/**
 * Resolves atmosphere details based on WMO weather code and day/night status
 * @param {Object} options
 * @param {number} [options.weatherCode=0]
 * @param {boolean} [options.isDay=true]
 * @returns {Object}
 */
export function resolveWeatherAtmosphere({ weatherCode = 0, isDay = true } = {}) {
  // 1. Clear Skies (0, 1)
  if (weatherCode === 0 || weatherCode === 1) {
    return isDay ? ATMOSPHERE_CONDITIONS.clearDay : ATMOSPHERE_CONDITIONS.clearNight;
  }

  // 2. Partly Cloudy (2)
  if (weatherCode === 2) {
    return isDay ? ATMOSPHERE_CONDITIONS.cloudyDay : ATMOSPHERE_CONDITIONS.cloudyNight;
  }

  // 3. Overcast (3)
  if (weatherCode === 3) {
    return ATMOSPHERE_CONDITIONS.overcast;
  }

  // 4. Fog (45, 48)
  if (weatherCode === 45 || weatherCode === 48) {
    return ATMOSPHERE_CONDITIONS.fog;
  }

  // 5. Rain & Drizzle (51, 53, 55, 61, 63, 65, 80, 81, 82)
  if (
    (weatherCode >= 51 && weatherCode <= 65) ||
    (weatherCode >= 80 && weatherCode <= 82)
  ) {
    return ATMOSPHERE_CONDITIONS.rain;
  }

  // 6. Snow (71, 73, 75, 77, 85, 86)
  if (
    (weatherCode >= 71 && weatherCode <= 77) ||
    weatherCode === 85 || weatherCode === 86
  ) {
    return ATMOSPHERE_CONDITIONS.snow;
  }

  // 7. Thunderstorm (95, 96, 99)
  if (weatherCode >= 95 && weatherCode <= 99) {
    return ATMOSPHERE_CONDITIONS.thunderstorm;
  }

  // Default fallback
  return isDay ? ATMOSPHERE_CONDITIONS.clearDay : ATMOSPHERE_CONDITIONS.clearNight;
}

/**
 * Applies weather atmosphere to the dashboard DOM elements
 * @param {Object} options
 * @param {number} options.weatherCode
 * @param {boolean} options.isDay
 * @param {HTMLElement} [options.container]
 * @param {HTMLElement} [options.overlay]
 */
export function applyWeatherAtmosphereToDOM({ weatherCode = 0, isDay = true, container, overlay } = {}) {
  const atmosphere = resolveWeatherAtmosphere({ weatherCode, isDay });

  if (container) {
    container.style.background = atmosphere.css;
  }

  if (overlay) {
    // Remove previous fx classes
    overlay.className = 'weather-atmosphere-layer';
    if (atmosphere.fxClass) {
      overlay.classList.add(atmosphere.fxClass);
    }
  }

  // Update dynamic CSS custom variables for accent lighting
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--accent-primary', atmosphere.accent);
    document.documentElement.style.setProperty('--accent-cyan', atmosphere.accentCyan);
  }

  return atmosphere;
}
