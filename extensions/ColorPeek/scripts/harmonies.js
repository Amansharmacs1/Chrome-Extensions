/**
 * ColorPeek - Color Harmonies & Palette Generator
 * Generates mathematically grounded color harmonies (Complementary, Analogous,
 * Triadic, Tetradic, Monochromatic) and a 10-step design-system tint/shade scale.
 */

import { parseColor, hslToRgb, buildCanonical, clamp } from './color-converter.js';

/**
 * Normalizes hue angle to 0-359 range
 * @param {number} hue
 * @returns {number}
 */
function normHue(hue) {
  return ((Math.round(hue) % 360) + 360) % 360;
}

/**
 * Generates complementary harmony (Base + 180°)
 * @param {string|Object} baseColor
 * @returns {Array<CanonicalColor>}
 */
export function getComplementary(baseColor) {
  const color = parseColor(baseColor);
  if (!color) return [];

  const compHue = normHue(color.h + 180);
  const rgb = hslToRgb(compHue, color.s, color.l);
  const comp = buildCanonical(rgb.r, rgb.g, rgb.b, color.a);

  return [color, comp];
}

/**
 * Generates analogous harmony (Base, Base - 30°, Base + 30°)
 * @param {string|Object} baseColor
 * @returns {Array<CanonicalColor>}
 */
export function getAnalogous(baseColor) {
  const color = parseColor(baseColor);
  if (!color) return [];

  const h1 = normHue(color.h - 30);
  const h2 = normHue(color.h + 30);

  const rgb1 = hslToRgb(h1, color.s, color.l);
  const rgb2 = hslToRgb(h2, color.s, color.l);

  return [
    buildCanonical(rgb1.r, rgb1.g, rgb1.b, color.a),
    color,
    buildCanonical(rgb2.r, rgb2.g, rgb2.b, color.a)
  ];
}

/**
 * Generates triadic harmony (Base, Base + 120°, Base + 240°)
 * @param {string|Object} baseColor
 * @returns {Array<CanonicalColor>}
 */
export function getTriadic(baseColor) {
  const color = parseColor(baseColor);
  if (!color) return [];

  const h1 = normHue(color.h + 120);
  const h2 = normHue(color.h + 240);

  const rgb1 = hslToRgb(h1, color.s, color.l);
  const rgb2 = hslToRgb(h2, color.s, color.l);

  return [
    color,
    buildCanonical(rgb1.r, rgb1.g, rgb1.b, color.a),
    buildCanonical(rgb2.r, rgb2.g, rgb2.b, color.a)
  ];
}

/**
 * Generates tetradic (square) harmony (Base, Base + 90°, Base + 180°, Base + 270°)
 * @param {string|Object} baseColor
 * @returns {Array<CanonicalColor>}
 */
export function getTetradic(baseColor) {
  const color = parseColor(baseColor);
  if (!color) return [];

  const hues = [
    color.h,
    normHue(color.h + 90),
    normHue(color.h + 180),
    normHue(color.h + 270)
  ];

  return hues.map(h => {
    const rgb = hslToRgb(h, color.s, color.l);
    return buildCanonical(rgb.r, rgb.g, rgb.b, color.a);
  });
}

/**
 * Generates split-complementary harmony (Base, Base + 150°, Base + 210°)
 * @param {string|Object} baseColor
 * @returns {Array<CanonicalColor>}
 */
export function getSplitComplementary(baseColor) {
  const color = parseColor(baseColor);
  if (!color) return [];

  const h1 = normHue(color.h + 150);
  const h2 = normHue(color.h + 210);

  const rgb1 = hslToRgb(h1, color.s, color.l);
  const rgb2 = hslToRgb(h2, color.s, color.l);

  return [
    color,
    buildCanonical(rgb1.r, rgb1.g, rgb1.b, color.a),
    buildCanonical(rgb2.r, rgb2.g, rgb2.b, color.a)
  ];
}

/**
 * Generates monochromatic palette by varying lightness and saturation
 * @param {string|Object} baseColor
 * @returns {Array<CanonicalColor>}
 */
export function getMonochromatic(baseColor) {
  const color = parseColor(baseColor);
  if (!color) return [];

  const variations = [
    { l: clamp(color.l + 32, 10, 95), s: clamp(color.s - 20, 10, 100) },
    { l: clamp(color.l + 16, 10, 95), s: clamp(color.s - 10, 10, 100) },
    { l: color.l, s: color.s },
    { l: clamp(color.l - 16, 10, 95), s: clamp(color.s + 10, 10, 100) },
    { l: clamp(color.l - 32, 10, 95), s: clamp(color.s + 20, 10, 100) }
  ];

  return variations.map(v => {
    const rgb = hslToRgb(color.h, v.s, v.l);
    return buildCanonical(rgb.r, rgb.g, rgb.b, color.a);
  });
}

/**
 * Generates a 10-step design-system lightness scale (50, 100, 200, ..., 900)
 * Similar to Tailwind CSS shade curves
 * @param {string|Object} baseColor
 * @returns {Array<{step: number, color: CanonicalColor}>}
 */
export function getShadesScale(baseColor) {
  const color = parseColor(baseColor);
  if (!color) return [];

  // Steps mapped to target lightness percentages
  const steps = [
    { step: 50, l: 96, sOffset: -20 },
    { step: 100, l: 90, sOffset: -15 },
    { step: 200, l: 80, sOffset: -8 },
    { step: 300, l: 70, sOffset: -4 },
    { step: 400, l: 60, sOffset: 0 },
    { step: 500, l: 50, sOffset: 0 },
    { step: 600, l: 40, sOffset: 2 },
    { step: 700, l: 30, sOffset: 5 },
    { step: 800, l: 20, sOffset: 8 },
    { step: 900, l: 12, sOffset: 12 }
  ];

  return steps.map(({ step, l, sOffset }) => {
    const adjustedS = clamp(color.s + sOffset, 5, 100);
    const rgb = hslToRgb(color.h, adjustedS, l);
    return {
      step,
      color: buildCanonical(rgb.r, rgb.g, rgb.b, color.a)
    };
  });
}

/**
 * Collects all harmonies for a given base color into a structured dictionary
 * @param {string|Object} baseColor
 * @returns {Object}
 */
export function getAllHarmonies(baseColor) {
  return {
    complementary: getComplementary(baseColor),
    analogous: getAnalogous(baseColor),
    triadic: getTriadic(baseColor),
    tetradic: getTetradic(baseColor),
    splitComplementary: getSplitComplementary(baseColor),
    monochromatic: getMonochromatic(baseColor),
    shades: getShadesScale(baseColor)
  };
}
