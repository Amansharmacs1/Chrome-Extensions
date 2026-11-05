/**
 * ColorPeek - CSS & Palette Exporter Tests
 */

import {
  exportToHexList,
  exportToCssVariables,
  exportToScssVariables,
  exportToTailwindConfig,
  exportToJson,
  generateCssGradient,
  slugifyColorName
} from '../scripts/css-exporter.js';

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

console.log('\n--- Running CSS Exporter Tests ---');

const sampleColors = [
  { hex: '#3B82F6', name: 'Primary Blue', note: 'Main brand' },
  { hex: '#06B6D4', name: 'Secondary Cyan', note: 'Accent' },
  { hex: '#10B981', name: 'Success Green' }
];

// 1. Slugify Color Names
assert(slugifyColorName('Primary Blue') === 'primary-blue', 'Slugs "Primary Blue" to "primary-blue"');
assert(slugifyColorName('  Dark & Bold!  ') === 'dark-bold', 'Sanitizes special characters into clean slug');
assert(slugifyColorName('', 2) === 'color-3', 'Falls back to numbered index when name is empty');

// 2. Plain HEX List
const hexList = exportToHexList(sampleColors);
assert(hexList.includes('#3B82F6'), 'HEX list contains first color');
assert(hexList.includes('#06B6D4'), 'HEX list contains second color');
assert(hexList.split('\n').length === 3, 'HEX list has exactly 3 lines');

// 3. CSS Custom Properties (:root)
const cssVars = exportToCssVariables(sampleColors);
assert(cssVars.startsWith(':root {'), 'CSS variables output begins with :root block');
assert(cssVars.includes('--primary-blue: #3B82F6;'), 'Contains --primary-blue declaration');
assert(cssVars.includes('--secondary-cyan: #06B6D4;'), 'Contains --secondary-cyan declaration');
assert(cssVars.endsWith('}'), 'CSS variables output cleanly closes root block');

// 4. SCSS / SASS Variables
const scssVars = exportToScssVariables(sampleColors);
assert(scssVars.includes('$primary-blue: #3B82F6;'), 'SCSS contains $primary-blue variable');
assert(scssVars.includes('$secondary-cyan: #06B6D4;'), 'SCSS contains $secondary-cyan variable');

// 5. Tailwind CSS Config
const twConfig = exportToTailwindConfig(sampleColors, 'brand');
assert(twConfig.includes("module.exports = {"), 'Tailwind config contains module.exports wrapper');
assert(twConfig.includes("'brand': {"), 'Tailwind config contains palette key "brand"');
assert(twConfig.includes("'primary-blue': '#3B82F6'"), 'Tailwind config contains mapped color hex');

// 6. JSON Tokens
const jsonOutput = exportToJson({
  name: 'Sample Brand',
  id: 'pal-123',
  colors: sampleColors
});
const parsedJson = JSON.parse(jsonOutput);
assert(parsedJson.name === 'Sample Brand', 'JSON export preserves palette name');
assert(parsedJson.colors.length === 3, 'JSON export contains 3 color objects');
assert(parsedJson.colors[0].hex === '#3B82F6', 'JSON color preserves HEX value');
assert(parsedJson.colors[0].rgb === 'rgb(59, 130, 246)', 'JSON export includes pre-computed RGB format');

// 7. CSS Gradient Generator
const linearGrad = generateCssGradient(sampleColors, 'linear', 90);
assert(linearGrad.startsWith('linear-gradient(90deg,'), 'Linear gradient starts with linear-gradient and angle');
assert(linearGrad.includes('#3B82F6 0%'), 'First color stop is at 0%');
assert(linearGrad.includes('#10B981 100%'), 'Last color stop is at 100%');

const radialGrad = generateCssGradient(sampleColors, 'radial');
assert(radialGrad.startsWith('radial-gradient(circle,'), 'Radial gradient starts with radial-gradient');

// Empty or single color gradient handling
assert(generateCssGradient([]) === 'none', 'Empty list returns "none"');
assert(generateCssGradient(['#FF0000']) === '#FF0000', 'Single color returns plain color string');

console.log(`CSS Exporter Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
