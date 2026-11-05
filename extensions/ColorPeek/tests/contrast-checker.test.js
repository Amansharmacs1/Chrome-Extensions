/**
 * ColorPeek - WCAG 2.1 Contrast Checker Tests
 */

import {
  getRelativeLuminance,
  evaluateContrast,
  compositeOverBackground,
  getRecommendedTextColor,
  WCAG_THRESHOLDS
} from '../scripts/contrast-checker.js';

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

console.log('\n--- Running Contrast Checker Tests ---');

// 1. Relative Luminance
const lumWhite = getRelativeLuminance(255, 255, 255);
assert(Math.abs(lumWhite - 1.0) < 0.001, 'White has relative luminance of exactly 1.0');

const lumBlack = getRelativeLuminance(0, 0, 0);
assert(Math.abs(lumBlack - 0.0) < 0.001, 'Black has relative luminance of exactly 0.0');

// sRGB reference colors
const lumRed = getRelativeLuminance(255, 0, 0);
assert(Math.abs(lumRed - 0.2126) < 0.01, 'Pure red luminance aligns with ITU-R BT.709 red coefficient (~0.2126)');

const lumGreen = getRelativeLuminance(0, 255, 0);
assert(Math.abs(lumGreen - 0.7152) < 0.01, 'Pure green luminance aligns with green coefficient (~0.7152)');

const lumBlue = getRelativeLuminance(0, 0, 255);
assert(Math.abs(lumBlue - 0.0722) < 0.01, 'Pure blue luminance aligns with blue coefficient (~0.0722)');

// 2. Pure Black on Pure White (Maximum possible contrast = 21:1)
const maxContrast = evaluateContrast('#FFFFFF', '#000000');
assert(Math.abs(maxContrast.ratio - 21.0) < 0.05, 'Pure black on white yields maximum contrast of 21.0:1');
assert(maxContrast.grade === 'AAA', '21:1 achieves AAA rating');
assert(maxContrast.aaNormal.pass, 'Passes AA Normal text');
assert(maxContrast.aaLarge.pass, 'Passes AA Large text');
assert(maxContrast.aaaNormal.pass, 'Passes AAA Normal text');
assert(maxContrast.aaaLarge.pass, 'Passes AAA Large text');

// 3. Symmetry / Order Independence
const reversed = evaluateContrast('#000000', '#FFFFFF');
assert(Math.abs(reversed.ratio - maxContrast.ratio) < 0.001, 'Contrast ratio is symmetric regardless of argument order');

// 4. Equal Colors (Minimum possible contrast = 1:1)
const minContrast = evaluateContrast('#3B82F6', '#3B82F6');
assert(Math.abs(minContrast.ratio - 1.0) < 0.01, 'Identical colors yield minimum contrast of 1.0:1');
assert(minContrast.grade === 'FAIL', '1.0:1 fails WCAG standards');
assert(!minContrast.aaNormal.pass, 'Fails AA Normal text');

// 5. Boundary Threshold Tests
// #767676 on #FFFFFF is the canonical boundary color (~4.54:1)
const thresholdTest = evaluateContrast('#767676', '#FFFFFF');
assert(thresholdTest.ratio >= 4.5 && thresholdTest.ratio < 5.0, `Boundary gray #767676 has ratio ~4.54:1 (actual: ${thresholdTest.ratio})`);
assert(thresholdTest.aaNormal.pass, 'Passes AA Normal text (min 4.5:1)');
assert(!thresholdTest.aaaNormal.pass, 'Fails AAA Normal text (min 7.0:1)');

// 6. Alpha Compositing
const semiTransparentFg = { r: 0, g: 0, b: 0, a: 0.5 };
const whiteBg = { r: 255, g: 255, b: 255 };
const composited = compositeOverBackground(semiTransparentFg, whiteBg);
assert(Math.abs(composited.r - 128) <= 1, '50% black over white composites to ~128 mid-gray');

// 7. Recommended Text Color (black vs white for readability)
assert(getRecommendedTextColor('#FFFFFF') === '#000000', 'Recommends black text for white background');
assert(getRecommendedTextColor('#000000') === '#FFFFFF', 'Recommends white text for black background');
assert(getRecommendedTextColor('#0F172A') === '#FFFFFF', 'Recommends white text for dark slate background');
assert(getRecommendedTextColor('#FEF08A') === '#000000', 'Recommends black text for light yellow background');

// 8. Invalid Input Handling
const invalidRes = evaluateContrast('invalid-color', '#FFFFFF');
assert(invalidRes.ratio === 1 && invalidRes.grade === 'FAIL', 'Handles invalid color input safely without crashing');

console.log(`Contrast Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
