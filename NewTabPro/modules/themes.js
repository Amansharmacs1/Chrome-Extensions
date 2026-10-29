/**
 * NewTab Pro - Theme & Personalization Engine
 * Manages themes, color variables, and background presets.
 */

export const THEMES = {
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    accent: '#3B82F6',
    accentHover: '#2563EB',
    accentCyan: '#06B6D4',
    bgDefault: 'mesh-midnight'
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Deep',
    mode: 'dark',
    accent: '#00A6FB',
    accentHover: '#0077B6',
    accentCyan: '#00F5D4',
    bgDefault: 'deep-space'
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora Borealis',
    mode: 'dark',
    accent: '#10B981',
    accentHover: '#059669',
    accentCyan: '#06B6D4',
    bgDefault: 'mesh-midnight'
  },
  light: {
    id: 'light',
    name: 'Clean Light',
    mode: 'light',
    accent: '#2563EB',
    accentHover: '#1D4ED8',
    accentCyan: '#0284C7',
    bgDefault: 'light-clean'
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Mono',
    mode: 'dark',
    accent: '#FFFFFF',
    accentHover: '#E2E8F0',
    accentCyan: '#94A3B8',
    bgDefault: 'pure-dark'
  },
  atmosphere: {
    id: 'atmosphere',
    name: 'Live Atmosphere (Weather)',
    mode: 'dark',
    accent: '#38BDF8',
    accentHover: '#0284C7',
    accentCyan: '#F59E0B',
    bgDefault: 'live-weather'
  }
};

export const BACKGROUND_PRESETS = {
  'live-weather': {
    name: 'Live Weather Dynamic',
    css: 'radial-gradient(ellipse at 50% -10%, #38bdf8 0%, #0284c7 35%, #0f172a 75%, #020617 100%)'
  },
  'mesh-midnight': {
    name: 'Midnight Radial',
    css: 'radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #0f172a 50%, #090d16 100%)'
  },
  'deep-space': {
    name: 'Deep Space',
    css: 'radial-gradient(circle at 80% 20%, #0c4a6e 0%, #082f49 25%, #051923 70%, #020617 100%)'
  },
  'sunset-glow': {
    name: 'Dusk Violet',
    css: 'radial-gradient(ellipse at top, #4c1d95 0%, #311042 35%, #090d16 85%)'
  },
  'clean-slate': {
    name: 'Clean Slate',
    css: 'linear-gradient(180deg, #1e293b 0%, #0f172a 60%, #020617 100%)'
  },
  'pure-dark': {
    name: 'Pure Charcoal',
    css: '#0a0e17'
  },
  'light-clean': {
    name: 'Pure Dawn',
    css: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)'
  }
};

/**
 * Validates and applies theme and background to the document element
 * @param {Object} options
 * @param {string} options.themeId
 * @param {string} options.bgPreset
 * @param {string} [options.customBg]
 */
export function applyTheme({ themeId = 'midnight', bgPreset = 'mesh-midnight', customBg = '' }) {
  if (typeof document === 'undefined') return;

  const validTheme = THEMES[themeId] ? themeId : 'midnight';
  document.documentElement.setAttribute('data-theme', validTheme);

  // Background resolution
  let bgStyle = '';
  if (customBg && typeof customBg === 'string' && customBg.trim()) {
    bgStyle = customBg.trim();
  } else {
    const preset = BACKGROUND_PRESETS[bgPreset] || BACKGROUND_PRESETS['mesh-midnight'];
    bgStyle = preset.css;
  }

  const bgContainer = document.getElementById('dashboardBackground') || document.body;
  if (bgContainer) {
    if (bgStyle.startsWith('#') || bgStyle.startsWith('rgb')) {
      bgContainer.style.background = bgStyle;
      bgContainer.style.backgroundColor = bgStyle;
    } else {
      bgContainer.style.background = bgStyle;
    }
  }
}
