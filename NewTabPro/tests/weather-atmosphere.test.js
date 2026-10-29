/**
 * NewTab Pro - Live Weather Atmosphere Unit Tests
 */

import {
  resolveWeatherAtmosphere,
  applyWeatherAtmosphereToDOM,
  ATMOSPHERE_CONDITIONS
} from '../modules/weather-atmosphere.js';

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}`);
    failed++;
  }
}

console.log('\n--- Running Live Weather Atmosphere Tests ---');

// 1. Clear Sky (Day vs Night)
const clearDay = resolveWeatherAtmosphere({ weatherCode: 0, isDay: true });
assert(clearDay.id === 'clear-day', 'Weather code 0 (day) resolves to clear-day');
assert(clearDay.fxClass === 'fx-sunbeam', 'Clear day uses fx-sunbeam solar flare');
assert(clearDay.css.includes('radial-gradient'), 'Clear day generates radial gradient');

const clearNight = resolveWeatherAtmosphere({ weatherCode: 1, isDay: false });
assert(clearNight.id === 'clear-night', 'Weather code 1 (night) resolves to clear-night');
assert(clearNight.fxClass === 'fx-stars', 'Clear night uses fx-stars starlight effect');

// 2. Partly Cloudy
const cloudyDay = resolveWeatherAtmosphere({ weatherCode: 2, isDay: true });
assert(cloudyDay.id === 'cloudy-day', 'Weather code 2 (day) resolves to cloudy-day');

const cloudyNight = resolveWeatherAtmosphere({ weatherCode: 2, isDay: false });
assert(cloudyNight.id === 'cloudy-night', 'Weather code 2 (night) resolves to cloudy-night');

// 3. Overcast
const overcast = resolveWeatherAtmosphere({ weatherCode: 3 });
assert(overcast.id === 'overcast', 'Weather code 3 resolves to overcast');

// 4. Fog
const fog = resolveWeatherAtmosphere({ weatherCode: 45 });
assert(fog.id === 'fog', 'Weather code 45 resolves to fog');
assert(fog.fxClass === 'fx-fog', 'Fog uses fx-fog effect');

// 5. Rain & Drizzle
const drizzle = resolveWeatherAtmosphere({ weatherCode: 53 });
assert(drizzle.id === 'rain', 'Drizzle (53) resolves to rain');
assert(drizzle.fxClass === 'fx-rain', 'Rain uses fx-rain streaks effect');

const heavyRain = resolveWeatherAtmosphere({ weatherCode: 65 });
assert(heavyRain.id === 'rain', 'Heavy rain (65) resolves to rain');

const shower = resolveWeatherAtmosphere({ weatherCode: 81 });
assert(shower.id === 'rain', 'Rain showers (81) resolve to rain');

// 6. Snow
const snowfall = resolveWeatherAtmosphere({ weatherCode: 73 });
assert(snowfall.id === 'snow', 'Moderate snow (73) resolves to snow');
assert(snowfall.fxClass === 'fx-snow', 'Snow uses fx-snow particles effect');

// 7. Thunderstorm
const storm = resolveWeatherAtmosphere({ weatherCode: 95 });
assert(storm.id === 'thunderstorm', 'Thunderstorm (95) resolves to thunderstorm');
assert(storm.fxClass === 'fx-storm', 'Storm uses fx-storm pulse effect');

// 8. DOM Application Mock
const mockContainer = { style: {} };
const mockOverlay = {
  className: '',
  classList: {
    add(cls) { mockOverlay.className += ` ${cls}`; }
  }
};

const applied = applyWeatherAtmosphereToDOM({
  weatherCode: 61,
  isDay: true,
  container: mockContainer,
  overlay: mockOverlay
});

assert(applied.id === 'rain', 'Applies rain atmosphere');
assert(mockContainer.style.background.includes('radial-gradient'), 'Applies gradient to container background');
assert(mockOverlay.className.includes('fx-rain'), 'Applies fx-rain class to overlay layer');

console.log(`Weather Atmosphere Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
