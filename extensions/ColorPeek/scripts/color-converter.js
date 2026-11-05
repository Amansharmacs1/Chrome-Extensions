/**
 * ColorPeek - Color Conversion & Canonical Color Engine
 * Parses, validates, and converts colors bidirectionally between HEX, RGB, RGBA, HSL, and HSLA.
 * Preserves numeric accuracy and prevents round-trip drift.
 */

/**
 * Named standard CSS colors mapping for common web colors
 */
export const NAMED_COLORS = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  black: { r: 0, g: 0, b: 0, a: 1 },
  white: { r: 255, g: 255, b: 255, a: 1 },
  red: { r: 255, g: 0, b: 0, a: 1 },
  green: { r: 0, g: 128, b: 0, a: 1 },
  blue: { r: 0, g: 0, b: 255, a: 1 },
  yellow: { r: 255, g: 255, b: 0, a: 1 },
  cyan: { r: 0, g: 255, b: 255, a: 1 },
  magenta: { r: 255, g: 0, b: 255, a: 1 },
  gray: { r: 128, g: 128, b: 128, a: 1 },
  grey: { r: 128, g: 128, b: 128, a: 1 },
  orange: { r: 255, g: 165, b: 0, a: 1 },
  purple: { r: 128, g: 0, b: 128, a: 1 }
};

/**
 * Clamps a number between min and max
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  if (typeof val !== 'number' || isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}

/**
 * Rounds a number to a specified number of decimal places
 * @param {number} val
 * @param {number} [decimals=0]
 * @returns {number}
 */
export function round(val, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Converts 0-255 number to 2-character hex string
 * @param {number} n
 * @returns {string}
 */
function toHex2(n) {
  const clamped = Math.round(clamp(n, 0, 255));
  return clamped.toString(16).padStart(2, '0').toUpperCase();
}

/**
 * Converts RGB components to 6-character or 8-character uppercase HEX string
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @param {number} [a=1] 0-1
 * @param {boolean} [includeAlpha=false]
 * @returns {string} e.g. '#3B82F6' or '#3B82F6CC'
 */
export function rgbToHex(r, g, b, a = 1, includeAlpha = false) {
  const hex6 = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  if (includeAlpha || (typeof a === 'number' && a < 0.999)) {
    const alphaByte = Math.round(clamp(a, 0, 1) * 255);
    return `${hex6}${toHex2(alphaByte)}`;
  }
  return hex6;
}

/**
 * Parses a HEX string into {r, g, b, a}
 * Supports 3, 4, 6, and 8 digit hex with or without leading '#'
 * @param {string} hexStr
 * @returns {{r: number, g: number, b: number, a: number}|null}
 */
export function hexToRgb(hexStr) {
  if (typeof hexStr !== 'string') return null;
  let raw = hexStr.trim().replace(/^#/, '');

  if (!/^[0-9a-fA-F]+$/.test(raw)) return null;

  let r, g, b, a = 1;

  if (raw.length === 3) {
    // #RGB -> #RRGGBB
    r = parseInt(raw[0] + raw[0], 16);
    g = parseInt(raw[1] + raw[1], 16);
    b = parseInt(raw[2] + raw[2], 16);
  } else if (raw.length === 4) {
    // #RGBA -> #RRGGBBAA
    r = parseInt(raw[0] + raw[0], 16);
    g = parseInt(raw[1] + raw[1], 16);
    b = parseInt(raw[2] + raw[2], 16);
    a = round(parseInt(raw[3] + raw[3], 16) / 255, 3);
  } else if (raw.length === 6) {
    // #RRGGBB
    r = parseInt(raw.slice(0, 2), 16);
    g = parseInt(raw.slice(2, 4), 16);
    b = parseInt(raw.slice(4, 6), 16);
  } else if (raw.length === 8) {
    // #RRGGBBAA
    r = parseInt(raw.slice(0, 2), 16);
    g = parseInt(raw.slice(2, 4), 16);
    b = parseInt(raw.slice(4, 6), 16);
    a = round(parseInt(raw.slice(6, 8), 16) / 255, 3);
  } else {
    return null;
  }

  return { r, g, b, a };
}

/**
 * Converts RGB to HSL
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {{h: number, s: number, l: number}} h: 0-360, s: 0-100, l: 0-100
 */
export function rgbToHsl(r, g, b) {
  const normR = clamp(r, 0, 255) / 255;
  const normG = clamp(g, 0, 255) / 255;
  const normB = clamp(b, 0, 255) / 255;

  const max = Math.max(normR, normG, normB);
  const min = Math.min(normR, normG, normB);
  const delta = max - min;

  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case normR:
        h = ((normG - normB) / delta + (normG < normB ? 6 : 0)) * 60;
        break;
      case normG:
        h = ((normB - normR) / delta + 2) * 60;
        break;
      case normB:
        h = ((normR - normG) / delta + 4) * 60;
        break;
    }
  }

  return {
    h: Math.round(h) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Converts HSL to RGB
 * @param {number} h 0-360
 * @param {number} s 0-100
 * @param {number} l 0-100
 * @returns {{r: number, g: number, b: number}} r, g, b: 0-255
 */
export function hslToRgb(h, s, l) {
  const normH = ((h % 360) + 360) % 360 / 360;
  const normS = clamp(s, 0, 100) / 100;
  const normL = clamp(l, 0, 100) / 100;

  if (normS === 0) {
    const gray = Math.round(normL * 255);
    return { r: gray, g: gray, b: gray };
  }

  const hue2rgb = (p, q, t) => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  const q = normL < 0.5 ? normL * (1 + normS) : normL + normS - normL * normS;
  const p = 2 * normL - q;

  const r = Math.round(hue2rgb(p, q, normH + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, normH) * 255);
  const b = Math.round(hue2rgb(p, q, normH - 1 / 3) * 255);

  return { r, g, b };
}

/**
 * Parses an arbitrary color input string (HEX, RGB, RGBA, HSL, HSLA, named) into canonical color representation
 * @param {string|Object} input
 * @returns {CanonicalColor|null}
 *
 * @typedef {Object} CanonicalColor
 * @property {number} r - Red channel (0-255)
 * @property {number} g - Green channel (0-255)
 * @property {number} b - Blue channel (0-255)
 * @property {number} a - Alpha channel (0-1)
 * @property {number} h - Hue (0-360)
 * @property {number} s - Saturation (0-100)
 * @property {number} l - Lightness (0-100)
 * @property {string} hex - 6-digit hex (e.g. '#3B82F6')
 * @property {string} hex8 - 8-digit hex with alpha
 * @property {string} rgb - e.g. 'rgb(59, 130, 246)'
 * @property {string} rgba - e.g. 'rgba(59, 130, 246, 0.85)'
 * @property {string} hsl - e.g. 'hsl(217, 91%, 60%)'
 * @property {string} hsla - e.g. 'hsla(217, 91%, 60%, 0.85)'
 */
export function parseColor(input) {
  if (!input) return null;

  // If already a canonical color object, clone and re-verify
  if (typeof input === 'object' && input.r !== undefined && input.g !== undefined && input.b !== undefined) {
    return buildCanonical(input.r, input.g, input.b, input.a !== undefined ? input.a : 1);
  }

  if (typeof input !== 'string') return null;
  const str = input.trim();

  // 1. Check named colors
  const lower = str.toLowerCase();
  if (NAMED_COLORS[lower]) {
    const { r, g, b, a } = NAMED_COLORS[lower];
    return buildCanonical(r, g, b, a);
  }

  // 2. Try HEX (#RGB, #RGBA, #RRGGBB, #RRGGBBAA or bare hex)
  if (/^#?[0-9a-fA-F]{3,8}$/.test(str)) {
    const rgbRes = hexToRgb(str);
    if (rgbRes) {
      return buildCanonical(rgbRes.r, rgbRes.g, rgbRes.b, rgbRes.a);
    }
  }

  // 3. Try RGB / RGBA: rgb(r, g, b), rgba(r, g, b, a), modern rgb(r g b / a)
  const rgbMatch = str.match(/^rgba?\s*\(\s*([+-]?[0-9.]+)\s*[, ]\s*([+-]?[0-9.]+)\s*[, ]\s*([+-]?[0-9.]+)(?:\s*[,/]\s*([+-]?[0-9.]+%?))?\s*\)$/i);
  if (rgbMatch) {
    const r = parseFloat(rgbMatch[1]);
    const g = parseFloat(rgbMatch[2]);
    const b = parseFloat(rgbMatch[3]);
    let a = 1;
    if (rgbMatch[4]) {
      const aRaw = rgbMatch[4].trim();
      a = aRaw.endsWith('%') ? parseFloat(aRaw) / 100 : parseFloat(aRaw);
    }
    if (!isNaN(r) && !isNaN(g) && !isNaN(b) && !isNaN(a)) {
      return buildCanonical(r, g, b, a);
    }
  }

  // 4. Try HSL / HSLA: hsl(h, s%, l%), hsla(h, s%, l%, a), modern hsl(h s% l% / a)
  const hslMatch = str.match(/^hsla?\s*\(\s*([+-]?[0-9.]+)(?:deg)?\s*[, ]\s*([+-]?[0-9.]+)%\s*[, ]\s*([+-]?[0-9.]+)%(?:\s*[,/]\s*([+-]?[0-9.]+%?))?\s*\)$/i);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]);
    const s = parseFloat(hslMatch[2]);
    const l = parseFloat(hslMatch[3]);
    let a = 1;
    if (hslMatch[4]) {
      const aRaw = hslMatch[4].trim();
      a = aRaw.endsWith('%') ? parseFloat(aRaw) / 100 : parseFloat(aRaw);
    }
    if (!isNaN(h) && !isNaN(s) && !isNaN(l) && !isNaN(a)) {
      const rgb = hslToRgb(h, s, l);
      return buildCanonical(rgb.r, rgb.g, rgb.b, a);
    }
  }

  return null;
}

/**
 * Builds canonical color object with normalized values and pre-rendered string representations
 * @param {number} rawR
 * @param {number} rawG
 * @param {number} rawB
 * @param {number} [rawA=1]
 * @returns {CanonicalColor}
 */
export function buildCanonical(rawR, rawG, rawB, rawA = 1) {
  const r = Math.round(clamp(rawR, 0, 255));
  const g = Math.round(clamp(rawG, 0, 255));
  const b = Math.round(clamp(rawB, 0, 255));
  const a = round(clamp(rawA, 0, 1), 2);

  const { h, s, l } = rgbToHsl(r, g, b);

  const hex = rgbToHex(r, g, b, 1, false);
  const hex8 = rgbToHex(r, g, b, a, true);
  const rgb = `rgb(${r}, ${g}, ${b})`;
  const rgba = `rgba(${r}, ${g}, ${b}, ${a})`;
  const hsl = `hsl(${h}, ${s}%, ${l}%)`;
  const hsla = `hsla(${h}, ${s}%, ${l}%, ${a})`;

  return {
    r,
    g,
    b,
    a,
    h,
    s,
    l,
    hex,
    hex8,
    rgb,
    rgba,
    hsl,
    hsla
  };
}

/**
 * Formats a canonical color into a specific output string
 * @param {CanonicalColor} color
 * @param {'hex'|'hex8'|'rgb'|'rgba'|'hsl'|'hsla'|'css-var'|'modern-rgb'} format
 * @param {string} [varName='--color-primary']
 * @returns {string}
 */
export function formatColor(color, format = 'hex', varName = '--color-primary') {
  if (!color) return '';

  switch (format) {
    case 'hex':
      return color.a < 1 ? color.hex8 : color.hex;
    case 'hex8':
      return color.hex8;
    case 'rgb':
      return color.rgb;
    case 'rgba':
      return color.rgba;
    case 'hsl':
      return color.hsl;
    case 'hsla':
      return color.hsla;
    case 'css-var': {
      const cleanVar = sanitizeCssVarName(varName);
      const val = color.a < 1 ? color.rgba : color.hex;
      return `${cleanVar}: ${val};`;
    }
    case 'modern-rgb':
      return color.a < 1
        ? `rgb(${color.r} ${color.g} ${color.b} / ${color.a})`
        : `rgb(${color.r} ${color.g} ${color.b})`;
    default:
      return color.hex;
  }
}

/**
 * Sanitizes a CSS custom property variable name
 * @param {string} name
 * @returns {string} e.g. '--brand-primary'
 */
export function sanitizeCssVarName(name) {
  if (!name || typeof name !== 'string') return '--color-primary';
  let clean = name.trim();
  // Strip leading dashes first to normalize
  clean = clean.replace(/^-+/, '');
  // Replace invalid characters with hyphens
  clean = clean.replace(/[^a-zA-Z0-9_\-]/g, '-').replace(/-+/g, '-');
  clean = clean.replace(/^-+|-+$/g, '');
  return '--' + (clean || 'color-primary');
}
