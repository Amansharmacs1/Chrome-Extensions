/**
 * FontLens - Typography Engine
 * Computes, extracts, normalizes, and analyzes typography properties
 * from DOM elements using CSSOM and computed style APIs.
 */

import {
  parseColor,
  rgbaToHex,
  getEffectiveBackgroundColor,
  getContrastRating,
  getSafeSelector,
  truncate
} from './utils.js';

export const FONT_WEIGHT_LABELS = {
  '100': 'Thin',
  '200': 'ExtraLight',
  '300': 'Light',
  '400': 'Regular',
  '500': 'Medium',
  '600': 'SemiBold',
  '700': 'Bold',
  '800': 'ExtraBold',
  '900': 'Black',
  '950': 'ExtraBlack'
};

/**
 * Returns human-readable label for numeric font-weight
 * @param {string|number} weight
 * @returns {string} e.g. "Bold (700)"
 */
export function formatFontWeight(weight) {
  const wStr = String(weight).trim();
  const label = FONT_WEIGHT_LABELS[wStr] || (wStr === 'normal' ? 'Regular' : wStr === 'bold' ? 'Bold' : 'Custom');
  return `${label} (${wStr})`;
}

/**
 * Parses font-family CSS value into ordered array of individual font candidates
 * @param {string} stackStr e.g. '"Inter", -apple-system, sans-serif'
 * @returns {string[]} ['Inter', '-apple-system', 'sans-serif']
 */
export function parseFontFamilyStack(stackStr = '') {
  if (!stackStr || typeof stackStr !== 'string') return [];

  const list = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < stackStr.length; i++) {
    const ch = stackStr[i];

    if ((ch === '"' || ch === "'") && (!inQuotes || ch === quoteChar)) {
      inQuotes = !inQuotes;
      quoteChar = inQuotes ? ch : '';
      continue;
    }

    if (ch === ',' && !inQuotes) {
      const clean = current.trim().replace(/^['"]|['"]$/g, '');
      if (clean) list.push(clean);
      current = '';
      continue;
    }

    current += ch;
  }

  const lastClean = current.trim().replace(/^['"]|['"]$/g, '');
  if (lastClean) list.push(lastClean);

  return list;
}

/**
 * Computes unitless line-height ratio
 * @param {string} lineHeightStr e.g. "24px" or "1.5" or "normal"
 * @param {number} fontSizePx e.g. 16
 * @returns {{ raw: string, px: number, ratio: number, formattedRatio: string }}
 */
export function normalizeLineHeight(lineHeightStr = '', fontSizePx = 16) {
  const clean = String(lineHeightStr).trim();
  const fsPx = typeof fontSizePx === 'string' ? parseFloat(fontSizePx) || 16 : (Number(fontSizePx) || 16);

  if (clean === 'normal') {
    const approxPx = Math.round(fsPx * 1.2 * 10) / 10;
    return {
      raw: 'normal',
      px: approxPx,
      ratio: 1.2,
      formattedRatio: '1.20 (approx)',
      formatted: 'normal (~1.20)'
    };
  }

  if (clean.endsWith('px')) {
    const px = parseFloat(clean) || fsPx;
    const ratio = Math.round((px / fsPx) * 100) / 100;
    return {
      raw: clean,
      px: Math.round(px * 10) / 10,
      ratio,
      formattedRatio: `${ratio.toFixed(2)}×`,
      formatted: `${clean} (${ratio.toFixed(2)})`
    };
  }

  const unitless = parseFloat(clean);
  if (!isNaN(unitless) && unitless > 0) {
    const px = Math.round(unitless * fsPx * 10) / 10;
    return {
      raw: clean,
      px,
      ratio: Math.round(unitless * 100) / 100,
      formattedRatio: `${unitless.toFixed(2)}×`,
      formatted: `${unitless} (${unitless.toFixed(2)})`
    };
  }

  return {
    raw: clean || 'normal',
    px: fsPx,
    ratio: 1.0,
    formattedRatio: '1.00×',
    formatted: '1.00'
  };
}

/**
 * Normalizes font weight into structured object
 * @param {string|number} weight
 * @returns {{ value: string, label: string }}
 */
export function normalizeFontWeight(weight = '400') {
  let wStr = String(weight).trim().toLowerCase();
  if (wStr === 'bold') wStr = '700';
  if (wStr === 'normal') wStr = '400';
  const label = FONT_WEIGHT_LABELS[wStr] || (parseInt(wStr, 10) >= 700 ? 'Bold' : parseInt(wStr, 10) <= 300 ? 'Light' : 'Regular');
  return { value: wStr, label };
}

/**
 * Computes REM value string from pixel size
 * @param {string|number} fontSize
 * @param {number} [rootSize=16]
 * @returns {string} e.g. "1.5rem"
 */
export function computeRemValue(fontSize = '16px', rootSize = 16) {
  const px = parseFloat(fontSize) || 16;
  const rem = Math.round((px / (rootSize || 16)) * 1000) / 1000;
  return `${rem}rem`;
}


/**
 * Computes root font size (usually 16px) for rem conversions
 * @returns {number}
 */
export function getRootFontSize() {
  if (typeof document === 'undefined') return 16;
  try {
    const rootStyle = window.getComputedStyle(document.documentElement);
    return parseFloat(rootStyle.fontSize) || 16;
  } catch {
    return 16;
  }
}

/**
 * Extracts complete computed typography properties from any DOM element
 * @param {Element} element
 * @returns {object} Structured typography report
 */
export function extractTypography(element) {
  if (!element || element.nodeType !== (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
    return null;
  }

  let style;
  try {
    const win = element.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
    style = win ? win.getComputedStyle(element) : null;
  } catch {
    return null;
  }
  if (!style) return null;

  // 1. Font Family & Stack
  const rawFamily = style.fontFamily || '';
  const fontStack = parseFontFamilyStack(rawFamily);
  const primaryFamily = fontStack[0] || 'serif';

  // 2. Font Size & REM
  const rawFontSize = style.fontSize || '16px';
  const fontSizePx = parseFloat(rawFontSize) || 16;
  const rootSize = getRootFontSize();
  const fontSizeRem = Math.round((fontSizePx / rootSize) * 1000) / 1000;

  // 3. Weight & Style
  const fontWeight = style.fontWeight || '400';
  const fontStyle = style.fontStyle || 'normal';

  // 4. Line Height & Spacing
  const rawLineHeight = style.lineHeight || 'normal';
  const lineHeight = normalizeLineHeight(rawLineHeight, fontSizePx);
  const letterSpacing = style.letterSpacing || 'normal';
  const wordSpacing = style.wordSpacing || 'normal';

  // 5. Colors & Contrast
  const textColor = style.color || 'rgb(0, 0, 0)';
  const parsedColor = parseColor(textColor) || { r: 0, g: 0, b: 0, a: 1 };
  const hexColor = rgbaToHex(parsedColor);

  const effectiveBg = getEffectiveBackgroundColor(element);
  const contrast = getContrastRating(parsedColor, effectiveBg.rgb);

  // 6. Text Formatting & Alignment
  const textAlign = style.textAlign || 'start';
  const textTransform = style.textTransform || 'none';
  const textDecoration = style.textDecorationLine || style.textDecoration || 'none';
  const textIndent = style.textIndent || '0px';
  const textRendering = style.textRendering || 'auto';
  const whiteSpace = style.whiteSpace || 'normal';
  const textOverflow = style.textOverflow || 'clip';
  const textShadow = style.textShadow || 'none';

  // 7. Element Details
  const tagName = element.tagName.toLowerCase();
  const selector = getSafeSelector(element);
  const id = element.id || '';
  const classes = Array.from(element.classList || []);
  const parentTag = element.parentElement ? element.parentElement.tagName.toLowerCase() : '';
  const textSnippet = truncate(element.textContent || '', 75);

  return {
    element: {
      tagName,
      selector,
      id,
      classes,
      parentTag,
      textSnippet
    },
    typography: {
      fontFamily: rawFamily,
      fontStack,
      primaryFamily,
      fontSize: rawFontSize,
      fontSizePx,
      fontSizeRem: `${fontSizeRem}rem`,
      fontWeight,
      fontWeightFormatted: formatFontWeight(fontWeight),
      fontStyle,
      lineHeight,
      letterSpacing,
      wordSpacing,
      color: textColor,
      colorHex: hexColor,
      backgroundColor: effectiveBg.color,
      backgroundColorHex: effectiveBg.hex,
      contrast,
      textAlign,
      textTransform,
      textDecoration,
      textIndent,
      textRendering,
      whiteSpace,
      textOverflow,
      textShadow
    }
  };
}
