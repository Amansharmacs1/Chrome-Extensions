/**
 * ColorPeek - CSS & Palette Export Engine
 * Generates ready-to-use developer snippets: CSS Custom Properties, SCSS/SASS,
 * Tailwind configuration, JSON tokens, and multi-stop CSS gradients.
 */

import { parseColor, sanitizeCssVarName } from './color-converter.js';

/**
 * Normalizes a color entry name to a slug suitable for CSS/JS keys
 * @param {string} name
 * @param {number} index
 * @returns {string} e.g. "brand-primary" or "color-1"
 */
export function slugifyColorName(name, index = 0) {
  if (!name || typeof name !== 'string') return `color-${index + 1}`;
  let slug = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  slug = slug.replace(/^-|-$/g, '');
  return slug || `color-${index + 1}`;
}

/**
 * Exports a palette as plain HEX list
 * @param {Array<Object|string>} colors
 * @returns {string}
 */
export function exportToHexList(colors = []) {
  return colors
    .map(c => {
      const parsed = parseColor(typeof c === 'object' ? c.hex || c : c);
      return parsed ? (parsed.a < 1 ? parsed.hex8 : parsed.hex) : null;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Exports a palette as CSS custom property variables inside a :root block
 * @param {Array<Object|string>} colors
 * @param {string} [prefix='color']
 * @returns {string}
 */
export function exportToCssVariables(colors = [], prefix = 'color') {
  const declarations = colors
    .map((c, idx) => {
      const colorVal = typeof c === 'object' ? c.hex || c : c;
      const parsed = parseColor(colorVal);
      if (!parsed) return null;
      const colorName = typeof c === 'object' && c.name ? slugifyColorName(c.name, idx) : `${prefix}-${idx + 1}`;
      const val = parsed.a < 1 ? parsed.rgba : parsed.hex;
      return `  --${colorName}: ${val};`;
    })
    .filter(Boolean);

  return `:root {\n${declarations.join('\n')}\n}`;
}

/**
 * Exports a palette as SCSS / SASS variables
 * @param {Array<Object|string>} colors
 * @returns {string}
 */
export function exportToScssVariables(colors = []) {
  return colors
    .map((c, idx) => {
      const colorVal = typeof c === 'object' ? c.hex || c : c;
      const parsed = parseColor(colorVal);
      if (!parsed) return null;
      const colorName = typeof c === 'object' && c.name ? slugifyColorName(c.name, idx) : `color-${idx + 1}`;
      const val = parsed.a < 1 ? parsed.rgba : parsed.hex;
      return `$${colorName}: ${val};`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Exports a palette as a Tailwind CSS config colors extension snippet
 * @param {Array<Object|string>} colors
 * @param {string} [paletteName='brand']
 * @returns {string}
 */
export function exportToTailwindConfig(colors = [], paletteName = 'brand') {
  const colorEntries = colors
    .map((c, idx) => {
      const colorVal = typeof c === 'object' ? c.hex || c : c;
      const parsed = parseColor(colorVal);
      if (!parsed) return null;
      const key = typeof c === 'object' && c.name ? slugifyColorName(c.name, idx) : `${idx + 1}`;
      const val = parsed.a < 1 ? parsed.hex8 : parsed.hex;
      return `      '${key}': '${val}',`;
    })
    .filter(Boolean);

  const cleanPaletteKey = slugifyColorName(paletteName, 0) || 'brand';

  return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        '${cleanPaletteKey}': {\n${colorEntries.join('\n')}\n        }\n      }\n    }\n  }\n};`;
}

/**
 * Exports a palette as structured JSON
 * @param {Object} palette
 * @returns {string} Formatted JSON string
 */
export function exportToJson(palette) {
  if (!palette) return '{}';

  const clean = {
    name: palette.name || 'ColorPeek Palette',
    id: palette.id || 'palette-export',
    exportedAt: new Date().toISOString(),
    colors: (palette.colors || []).map((c, idx) => {
      const parsed = parseColor(typeof c === 'object' ? c.hex || c : c);
      if (!parsed) return null;
      return {
        name: typeof c === 'object' && c.name ? c.name : `Color ${idx + 1}`,
        hex: parsed.hex,
        hex8: parsed.hex8,
        rgb: parsed.rgb,
        rgba: parsed.rgba,
        hsl: parsed.hsl,
        hsla: parsed.hsla,
        note: typeof c === 'object' ? c.note || '' : ''
      };
    }).filter(Boolean)
  };

  return JSON.stringify(clean, null, 2);
}

/**
 * Generates CSS gradient declaration from color stops
 * @param {Array<string|Object>} colors
 * @param {'linear'|'radial'} [type='linear']
 * @param {number} [angle=90] in degrees for linear gradients
 * @returns {string}
 */
export function generateCssGradient(colors = [], type = 'linear', angle = 90) {
  const validColors = colors
    .map(c => parseColor(typeof c === 'object' ? c.hex || c : c))
    .filter(Boolean);

  if (validColors.length === 0) return 'none';
  if (validColors.length === 1) return validColors[0].hex;

  const count = validColors.length;
  const stops = validColors.map((col, idx) => {
    const percent = Math.round((idx / (count - 1)) * 100);
    const val = col.a < 1 ? col.rgba : col.hex;
    return `${val} ${percent}%`;
  }).join(', ');

  if (type === 'radial') {
    return `radial-gradient(circle, ${stops})`;
  }

  const clampedAngle = Math.round(((angle % 360) + 360) % 360);
  return `linear-gradient(${clampedAngle}deg, ${stops})`;
}
