/**
 * FontLens - Typography Presets & System Styles
 * Built-in typography presets, preset validation, and schema builders.
 */

export const DEFAULT_PRESETS = [
  {
    id: 'preset_editorial_serif',
    name: 'Editorial Serif',
    category: 'editorial',
    description: 'Classic literary typography inspired by longform journals and publications.',
    properties: {
      fontFamily: 'Merriweather, Georgia, "Times New Roman", serif',
      fontSize: '18px',
      fontWeight: '400',
      fontStyle: 'normal',
      lineHeight: '1.75',
      letterSpacing: '0px',
      color: '#1f2937',
      textAlign: 'left'
    },
    isBuiltIn: true,
    createdAt: 1700000000000
  },
  {
    id: 'preset_modern_tech_sans',
    name: 'Modern Tech Sans',
    category: 'tech',
    description: 'Clean, high-legibility geometric sans-serif for developer dashboards and modern web apps.',
    properties: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '16px',
      fontWeight: '500',
      fontStyle: 'normal',
      lineHeight: '1.5',
      letterSpacing: '-0.2px',
      color: '#0f172a',
      textAlign: 'left'
    },
    isBuiltIn: true,
    createdAt: 1700000000000
  },
  {
    id: 'preset_dense_data_mono',
    name: 'Dense Data Mono',
    category: 'code',
    description: 'Crisp technical monospace for code blocks, terminal outputs, and data tables.',
    properties: {
      fontFamily: '"Fira Code", "JetBrains Mono", Menlo, Consolas, monospace',
      fontSize: '14px',
      fontWeight: '400',
      fontStyle: 'normal',
      lineHeight: '1.6',
      letterSpacing: '0px',
      color: '#334155',
      textAlign: 'left'
    },
    isBuiltIn: true,
    createdAt: 1700000000000
  },
  {
    id: 'preset_bold_display_headline',
    name: 'Bold Display Headline',
    category: 'display',
    description: 'Punchy, commanding headline typography for landing page hero sections and marketing banners.',
    properties: {
      fontFamily: '"Montserrat", "Oswald", -apple-system, sans-serif',
      fontSize: '36px',
      fontWeight: '800',
      fontStyle: 'normal',
      lineHeight: '1.15',
      letterSpacing: '-0.8px',
      color: '#09090b',
      textAlign: 'left',
      textTransform: 'none'
    },
    isBuiltIn: true,
    createdAt: 1700000000000
  },
  {
    id: 'preset_compact_button',
    name: 'UI Interactive Button',
    category: 'ui',
    description: 'Balanced medium-weight font styling for buttons, pills, tabs, and action links.',
    properties: {
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      fontSize: '14px',
      fontWeight: '600',
      fontStyle: 'normal',
      lineHeight: '1.2',
      letterSpacing: '0.2px',
      color: '#ffffff',
      textAlign: 'center'
    },
    isBuiltIn: true,
    createdAt: 1700000000000
  }
];

/**
 * Validates whether an imported preset structure meets requirements
 * @param {any} preset
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePreset(preset) {
  if (!preset || typeof preset !== 'object') {
    return { valid: false, error: 'Preset must be an object.' };
  }
  if (!preset.name || typeof preset.name !== 'string' || preset.name.trim().length === 0) {
    return { valid: false, error: 'Preset name is required.' };
  }
  if (!preset.properties || typeof preset.properties !== 'object') {
    return { valid: false, error: 'Preset must contain a properties dictionary.' };
  }
  if (!preset.properties.fontFamily) {
    return { valid: false, error: 'Preset properties must include a fontFamily.' };
  }
  return { valid: true };
}

/**
 * Creates a new preset object
 * @param {string} name
 * @param {object} properties
 * @param {string} [category='custom']
 * @param {string} [description='']
 * @returns {object}
 */
export function createPreset(name, properties = {}, category = 'custom', description = '') {
  return {
    id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    category,
    description: description.trim(),
    properties: { ...properties },
    isBuiltIn: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}
