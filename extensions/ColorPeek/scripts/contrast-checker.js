/**
 * ColorPeek - WCAG 2.1 Contrast Engine
 * Calculates exact relative luminance using sRGB linearization and evaluates
 * WCAG AA and AAA accessibility compliance across text sizes and graphical objects.
 */

import { parseColor, clamp, round } from './color-converter.js';

/**
 * Standard WCAG 2.1 Contrast Thresholds
 */
export const WCAG_THRESHOLDS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
  UI_COMPONENT: 3.0
};

/**
 * Linearizes an 8-bit sRGB channel according to WCAG 2.1 specifications
 * @param {number} channel 0-255
 * @returns {number} 0-1 linearized luminance value
 */
export function linearizeChannel(channel) {
  const norm = clamp(channel, 0, 255) / 255;
  if (norm <= 0.04045) {
    return norm / 12.92;
  }
  return Math.pow((norm + 0.055) / 1.055, 2.4);
}

/**
 * Calculates relative luminance of an RGB color according to WCAG 2.1
 * L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
 * @param {number|Object} rOrColor Red 0-255 OR canonical color object
 * @param {number} [g] Green 0-255
 * @param {number} [b] Blue 0-255
 * @returns {number} Relative luminance from 0.0 (darkest black) to 1.0 (lightest white)
 */
export function getRelativeLuminance(rOrColor, g, b) {
  let red, green, blue;

  if (typeof rOrColor === 'object' && rOrColor !== null) {
    red = rOrColor.r;
    green = rOrColor.g;
    blue = rOrColor.b;
  } else {
    red = rOrColor;
    green = g;
    blue = b;
  }

  const rLin = linearizeChannel(red);
  const gLin = linearizeChannel(green);
  const bLin = linearizeChannel(blue);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Composites a foreground color with alpha over an opaque background
 * @param {{r: number, g: number, b: number, a: number}} fg
 * @param {{r: number, g: number, b: number}} bg
 * @returns {{r: number, g: number, b: number}}
 */
export function compositeOverBackground(fg, bg) {
  const alpha = fg.a !== undefined ? clamp(fg.a, 0, 1) : 1;
  if (alpha >= 0.999) return { r: fg.r, g: fg.g, b: fg.b };

  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha))
  };
}

/**
 * Calculates WCAG contrast ratio between two colors
 * Ratio = (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter of the two
 * @param {string|Object} colorA Foreground or background color
 * @param {string|Object} colorB Foreground or background color
 * @returns {ContrastResult}
 *
 * @typedef {Object} ContrastResult
 * @property {number} ratio - Numeric contrast ratio (e.g. 7.42)
 * @property {string} ratioFormatted - Formatted ratio string (e.g. "7.4:1")
 * @property {number} lumA - Relative luminance of color A
 * @property {number} lumB - Relative luminance of color B
 * @property {Object} aaNormal - { pass: boolean, min: 4.5 }
 * @property {Object} aaLarge - { pass: boolean, min: 3.0 }
 * @property {Object} aaaNormal - { pass: boolean, min: 7.0 }
 * @property {Object} aaaLarge - { pass: boolean, min: 4.5 }
 * @property {Object} uiComponent - { pass: boolean, min: 3.0 }
 * @property {'AAA'|'AA'|'FAIL'} grade - Overall rating badge
 */
export function evaluateContrast(colorA, colorB) {
  const parsedA = parseColor(colorA);
  const parsedB = parseColor(colorB);

  if (!parsedA || !parsedB) {
    return {
      ratio: 1,
      ratioFormatted: '1.00:1',
      lumA: 0,
      lumB: 0,
      aaNormal: { pass: false, min: WCAG_THRESHOLDS.AA_NORMAL },
      aaLarge: { pass: false, min: WCAG_THRESHOLDS.AA_LARGE },
      aaaNormal: { pass: false, min: WCAG_THRESHOLDS.AAA_NORMAL },
      aaaLarge: { pass: false, min: WCAG_THRESHOLDS.AAA_LARGE },
      uiComponent: { pass: false, min: WCAG_THRESHOLDS.UI_COMPONENT },
      grade: 'FAIL'
    };
  }

  // Handle alpha compositing if foreground has transparency
  const effectiveA = parsedA.a < 1 ? compositeOverBackground(parsedA, parsedB) : parsedA;
  const effectiveB = parsedB.a < 1 ? compositeOverBackground(parsedB, { r: 255, g: 255, b: 255 }) : parsedB;

  const lumA = getRelativeLuminance(effectiveA);
  const lumB = getRelativeLuminance(effectiveB);

  const l1 = Math.max(lumA, lumB);
  const l2 = Math.min(lumA, lumB);

  const rawRatio = (l1 + 0.05) / (l2 + 0.05);
  const ratio = round(rawRatio, 2);

  const aaNormalPass = ratio >= WCAG_THRESHOLDS.AA_NORMAL;
  const aaLargePass = ratio >= WCAG_THRESHOLDS.AA_LARGE;
  const aaaNormalPass = ratio >= WCAG_THRESHOLDS.AAA_NORMAL;
  const aaaLargePass = ratio >= WCAG_THRESHOLDS.AAA_LARGE;
  const uiPass = ratio >= WCAG_THRESHOLDS.UI_COMPONENT;

  let grade = 'FAIL';
  if (aaaNormalPass) {
    grade = 'AAA';
  } else if (aaNormalPass) {
    grade = 'AA';
  } else if (aaLargePass) {
    grade = 'AA-Large';
  }

  return {
    ratio,
    ratioFormatted: `${ratio.toFixed(2)}:1`,
    lumA: round(lumA, 4),
    lumB: round(lumB, 4),
    aaNormal: { pass: aaNormalPass, min: WCAG_THRESHOLDS.AA_NORMAL },
    aaLarge: { pass: aaLargePass, min: WCAG_THRESHOLDS.AA_LARGE },
    aaaNormal: { pass: aaaNormalPass, min: WCAG_THRESHOLDS.AAA_NORMAL },
    aaaLarge: { pass: aaaLargePass, min: WCAG_THRESHOLDS.AAA_LARGE },
    uiComponent: { pass: uiPass, min: WCAG_THRESHOLDS.UI_COMPONENT },
    grade
  };
}

/**
 * Returns suggested accessible text color (black or white) for a given background color
 * @param {string|Object} bg
 * @returns {'#000000'|'#FFFFFF'}
 */
export function getRecommendedTextColor(bg) {
  const parsed = parseColor(bg);
  if (!parsed) return '#000000';
  const lum = getRelativeLuminance(parsed);
  // Using 0.179 as standard midpoint cutoff
  return lum > 0.179 ? '#000000' : '#FFFFFF';
}
