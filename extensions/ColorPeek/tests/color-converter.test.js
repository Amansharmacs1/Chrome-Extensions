/**
 * ColorPeek - Color Converter & Canonical Engine Tests
 */

import {
  parseColor,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  buildCanonical,
  formatColor,
  clamp,
  round
} from '../scripts/color-converter.js';

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

console.log('\n--- Running Color Conversion Tests ---');

// 1. Clamping & Math helpers
assert(clamp(300, 0, 255) === 255, 'Clamps upper value to 255');
assert(clamp(-50, 0, 255) === 0, 'Clamps lower value to 0');
assert(clamp(128, 0, 255) === 128, 'Preserves in-bounds value');
assert(round(3.14159, 2) === 3.14, 'Rounds to 2 decimal places');
assert(round(0.854, 2) === 0.85, 'Rounds alpha to 2 decimal places');

// 2. HEX to RGB
const hex3 = hexToRgb('#FFF');
assert(hex3.r === 255 && hex3.g === 255 && hex3.b === 255 && hex3.a === 1, 'Parses 3-digit HEX (#FFF)');

const hex3Bare = hexToRgb('F00');
assert(hex3Bare.r === 255 && hex3Bare.g === 0 && hex3Bare.b === 0, 'Parses bare 3-digit HEX without # (F00)');

const hex6 = hexToRgb('#3B82F6');
assert(hex6.r === 59 && hex6.g === 130 && hex6.b === 246 && hex6.a === 1, 'Parses 6-digit HEX (#3B82F6)');

const hex8 = hexToRgb('#3B82F680');
assert(hex8.r === 59 && hex8.g === 130 && hex8.b === 246 && Math.abs(hex8.a - 0.5) < 0.02, 'Parses 8-digit HEX with alpha (#3B82F680)');

assert(hexToRgb('#ZZZZZZ') === null, 'Rejects invalid hex string');
assert(hexToRgb('#12') === null, 'Rejects too short hex string');
assert(hexToRgb('#12345') === null, 'Rejects 5-character hex string');

// 3. RGB to HEX
assert(rgbToHex(255, 255, 255) === '#FFFFFF', 'Converts white RGB to #FFFFFF');
assert(rgbToHex(0, 0, 0) === '#000000', 'Converts black RGB to #000000');
assert(rgbToHex(59, 130, 246) === '#3B82F6', 'Converts primary blue RGB to #3B82F6');
assert(rgbToHex(59, 130, 246, 0.5, true) === '#3B82F680', 'Converts RGBA to 8-digit HEX');

// 4. RGB to HSL
const pureRedHsl = rgbToHsl(255, 0, 0);
assert(pureRedHsl.h === 0 && pureRedHsl.s === 100 && pureRedHsl.l === 50, 'Converts Pure Red RGB to HSL (0, 100%, 50%)');

const pureGreenHsl = rgbToHsl(0, 255, 0);
assert(pureGreenHsl.h === 120 && pureGreenHsl.s === 100 && pureGreenHsl.l === 50, 'Converts Pure Green RGB to HSL (120, 100%, 50%)');

const pureBlueHsl = rgbToHsl(0, 0, 255);
assert(pureBlueHsl.h === 240 && pureBlueHsl.s === 100 && pureBlueHsl.l === 50, 'Converts Pure Blue RGB to HSL (240, 100%, 50%)');

const whiteHsl = rgbToHsl(255, 255, 255);
assert(whiteHsl.l === 100 && whiteHsl.s === 0, 'Converts White to HSL (L: 100%)');

const blackHsl = rgbToHsl(0, 0, 0);
assert(blackHsl.l === 0 && blackHsl.s === 0, 'Converts Black to HSL (L: 0%)');

// 5. HSL to RGB
const redRgb = hslToRgb(0, 100, 50);
assert(redRgb.r === 255 && redRgb.g === 0 && redRgb.b === 0, 'Converts Pure Red HSL back to RGB');

const blueRgb = hslToRgb(240, 100, 50);
assert(blueRgb.r === 0 && blueRgb.g === 0 && blueRgb.b === 255, 'Converts Pure Blue HSL back to RGB');

// 6. Round-Trip Bidirectional Stability
const testColors = [
  { r: 59, g: 130, b: 246 },
  { r: 16, g: 185, b: 129 },
  { r: 245, g: 158, b: 11 },
  { r: 239, g: 68, b: 68 },
  { r: 139, g: 92, b: 246 }
];

for (const c of testColors) {
  const hex = rgbToHex(c.r, c.g, c.b);
  const backToRgb = hexToRgb(hex);
  assert(
    backToRgb.r === c.r && backToRgb.g === c.g && backToRgb.b === c.b,
    `Round-trip RGB -> HEX -> RGB exact for (${c.r}, ${c.g}, ${c.b})`
  );

  const hsl = rgbToHsl(c.r, c.g, c.b);
  const backRgbFromHsl = hslToRgb(hsl.h, hsl.s, hsl.l);
  const diff = Math.abs(backRgbFromHsl.r - c.r) + Math.abs(backRgbFromHsl.g - c.g) + Math.abs(backRgbFromHsl.b - c.b);
  assert(diff <= 6, `Round-trip RGB -> HSL -> RGB drift within tolerance for (${c.r}, ${c.g}, ${c.b})`);
}

// 7. parseColor() Unified Parser
const p1 = parseColor('#06B6D4');
assert(p1 && p1.hex === '#06B6D4' && p1.r === 6 && p1.g === 182 && p1.b === 212, 'parseColor parses #06B6D4');

const p2 = parseColor('rgb(59, 130, 246)');
assert(p2 && p2.hex === '#3B82F6', 'parseColor parses rgb(59, 130, 246)');

const p3 = parseColor('rgba(59, 130, 246, 0.5)');
assert(p3 && p3.a === 0.5 && p3.hex === '#3B82F6', 'parseColor parses rgba() with alpha');

const p4 = parseColor('hsl(217, 91%, 60%)');
assert(p4 && p4.h === 217 && Math.abs(p4.r - 59) <= 2, 'parseColor parses hsl() syntax');

const p5 = parseColor('white');
assert(p5 && p5.hex === '#FFFFFF', 'parseColor parses named color "white"');

const p6 = parseColor('transparent');
assert(p6 && p6.a === 0, 'parseColor parses "transparent" with a=0');

assert(parseColor('not-a-color') === null, 'parseColor safely returns null on malformed string');
assert(parseColor(null) === null, 'parseColor safely returns null on null');
assert(parseColor('') === null, 'parseColor safely returns null on empty string');

// 8. formatColor() Formatting Outputs
const testCanonical = buildCanonical(59, 130, 246, 1);
assert(formatColor(testCanonical, 'hex') === '#3B82F6', 'formatColor formats hex');
assert(formatColor(testCanonical, 'rgb') === 'rgb(59, 130, 246)', 'formatColor formats rgb');
assert(formatColor(testCanonical, 'hsl') === 'hsl(217, 91%, 60%)', 'formatColor formats hsl');
assert(formatColor(testCanonical, 'css-var', '--accent') === '--accent: #3B82F6;', 'formatColor formats css-var');

console.log(`Color Conversion Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
