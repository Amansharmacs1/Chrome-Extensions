/**
 * FontLens - Typography & Color Utilities
 * Color conversions, parent background compositing, WCAG 2.1 contrast calculations,
 * string sanitization, and safe CSS selector derivation.
 */

/**
 * Parses color string into { r, g, b, a }
 * @param {string} str
 * @returns {{ r: number, g: number, b: number, a: number }|null}
 */
export function parseColor(str = '') {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim().toLowerCase();

  // Transparent
  if (s === 'transparent' || s === 'rgba(0, 0, 0, 0)') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Named common colors
  if (s === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (s === 'black') return { r: 0, g: 0, b: 0, a: 1 };

  // Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1
      };
    }
    if (hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: Math.round((parseInt(hex[3] + hex[3], 16) / 255) * 100) / 100
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: Math.round((parseInt(hex.slice(6, 8), 16) / 255) * 100) / 100
      };
    }
  }

  // rgb(...) and rgba(...)
  const rgbMatch = s.match(/rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*[,/]\s*([0-9.]+%?))?\s*\)/);
  if (rgbMatch) {
    let a = 1;
    if (rgbMatch[4] !== undefined) {
      if (rgbMatch[4].endsWith('%')) {
        a = parseFloat(rgbMatch[4]) / 100;
      } else {
        a = parseFloat(rgbMatch[4]);
      }
    }
    return {
      r: Math.round(parseFloat(rgbMatch[1])),
      g: Math.round(parseFloat(rgbMatch[2])),
      b: Math.round(parseFloat(rgbMatch[3])),
      a: Math.max(0, Math.min(1, a))
    };
  }

  return null;
}

/**
 * Converts RGB(A) to 6 or 8-digit Hex string
 * @param {{ r: number, g: number, b: number, a?: number }} rgba
 * @returns {string}
 */
export function rgbaToHex(rgba) {
  if (!rgba) return '#000000';
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  const base = `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
  if (rgba.a !== undefined && rgba.a < 1) {
    return `${base}${toHex(Math.round(rgba.a * 255))}`.toUpperCase();
  }
  return base.toUpperCase();
}

/**
 * Calculates sRGB linearized relative luminance per WCAG 2.1
 * @param {{ r: number, g: number, b: number }} rgb
 * @returns {number} 0.0 to 1.0
 */
export function getRelativeLuminance({ r, g, b }) {
  const srgb = [r, g, b].map(v => {
    const val = v / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Composites a foreground RGBA color over a background RGB color
 * @param {{ r: number, g: number, b: number, a: number }} fg
 * @param {{ r: number, g: number, b: number }} bg
 * @returns {{ r: number, g: number, b: number }}
 */
export function compositeOver(fg, bg) {
  const alpha = fg.a !== undefined ? fg.a : 1;
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha))
  };
}

/**
 * Computes WCAG 2.1 contrast ratio between two colors
 * @param {string|object} fgColor
 * @param {string|object} bgColor
 * @returns {{ ratio: number, scoreAA: boolean, scoreAALarge: boolean, scoreAAA: boolean, formatted: string }}
 */
export function getContrastRating(fgColor, bgColor) {
  const fg = typeof fgColor === 'string' ? parseColor(fgColor) : fgColor;
  const bg = typeof bgColor === 'string' ? parseColor(bgColor) : bgColor;

  if (!fg || !bg) {
    return { ratio: 1, scoreAA: false, scoreAALarge: false, scoreAAA: false, formatted: '1.0:1' };
  }

  // Composite foreground if semi-transparent over background
  const finalFg = fg.a < 1 ? compositeOver(fg, bg) : fg;
  const lum1 = getRelativeLuminance(finalFg);
  const lum2 = getRelativeLuminance(bg);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  const ratio = Math.round(((brightest + 0.05) / (darkest + 0.05)) * 100) / 100;

  return {
    ratio,
    scoreAA: ratio >= 4.5,
    scoreAALarge: ratio >= 3.0,
    scoreAAA: ratio >= 7.0,
    formatted: `${ratio.toFixed(1)}:1`
  };
}

/**
 * Traverses parent nodes to find effective computed background color
 * @param {Element} element
 * @returns {{ color: string, hex: string, rgb: { r: number, g: number, b: number } }}
 */
export function getEffectiveBackgroundColor(element) {
  let curr = element;
  let compositeBg = { r: 255, g: 255, b: 255 }; // Default canvas white

  const layers = [];
  while (curr && curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
    try {
      const win = curr.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
      const style = win ? win.getComputedStyle(curr) : null;
      if (style && style.backgroundColor) {
        const bg = parseColor(style.backgroundColor);
        if (bg && bg.a > 0) {
          layers.unshift(bg); // Add bottom-up
        }
      }
    } catch {}
    curr = curr.parentElement;
  }

  // Composite all background layers top-down
  for (const layer of layers) {
    compositeBg = compositeOver(layer, compositeBg);
  }

  return {
    color: `rgb(${compositeBg.r}, ${compositeBg.g}, ${compositeBg.b})`,
    hex: rgbaToHex(compositeBg),
    rgb: compositeBg
  };
}

/**
 * Generates safe, readable CSS selector for an element
 * @param {Element|object} el
 * @returns {string}
 */
export function getSafeSelector(el) {
  if (!el) return '';
  if (el.nodeType && el.nodeType !== (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) return '';

  const tag = (el.tagName || 'div').toLowerCase();
  if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) {
    return `#${el.id}`;
  }

  const classList = el.classList ? Array.from(el.classList) : (typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : []);
  const classes = classList
    .filter(c => /^[a-zA-Z0-9_-]+$/.test(c) && !c.startsWith('fontlens-') && !c.startsWith('inspect-'))
    .slice(0, 2);

  if (classes.length > 0) {
    return `${tag}.${classes.join('.')}`;
  }

  return tag;
}

/**
 * Escapes text for HTML display
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Truncates text safely with ellipsis
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
export function truncate(str = '', max = 60) {
  const clean = String(str).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max) + '…';
}

/**
 * Returns WCAG compliance badge info
 * @param {number} ratio
 * @param {number} [fontSize=16]
 * @returns {{ level: string, passes: boolean }}
 */
export function getWCAGBadge(ratio = 1, fontSize = 16) {
  const isLarge = fontSize >= 24 || (fontSize >= 18.66);
  if (ratio >= 7.0 || (isLarge && ratio >= 4.5)) {
    return { level: 'AAA', passes: true };
  }
  if (ratio >= 4.5 || (isLarge && ratio >= 3.0)) {
    return { level: 'AA', passes: true };
  }
  return { level: 'Fail', passes: false };
}

// Aliases
export const calculateLuminance = getRelativeLuminance;
export const calculateContrastRatio = (fg, bg) => getContrastRating(fg, bg).ratio;
export const generateSafeSelector = getSafeSelector;
export const truncateText = (str, max) => {
  const clean = String(str).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max) + '...';
};

