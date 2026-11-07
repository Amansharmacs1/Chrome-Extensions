/**
 * FontLens - Typography Engine & Math Utilities Unit Tests
 */

import {
  parseFontFamilyStack,
  normalizeFontWeight,
  computeRemValue,
  normalizeLineHeight
} from '../scripts/typography-engine.js';

import {
  calculateLuminance,
  calculateContrastRatio,
  getWCAGBadge,
  generateSafeSelector,
  truncateText
} from '../scripts/utils.js';

export async function runTypographyEngineTests() {
  const results = [];

  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    results.push({ name: message, passed: true });
  }

  // 1. Font-family stack parser
  const stack1 = parseFontFamilyStack('"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
  assert(stack1.length === 5, 'parseFontFamilyStack splits comma-separated entries correctly');
  assert(stack1[0] === 'Inter', 'strips surrounding quotes from "Inter"');
  assert(stack1[4] === 'sans-serif', 'preserves trailing generic fallbacks');

  const emptyStack = parseFontFamilyStack('');
  assert(emptyStack.length === 0, 'empty font-family returns empty list');

  // 2. Font-weight normalization
  assert(normalizeFontWeight('400').label === 'Regular', '400 maps to Regular');
  assert(normalizeFontWeight('700').label === 'Bold', '700 maps to Bold');
  assert(normalizeFontWeight('300').label === 'Light', '300 maps to Light');
  assert(normalizeFontWeight('600').label === 'SemiBold', '600 maps to SemiBold');
  assert(normalizeFontWeight('900').label === 'Black', '900 maps to Black');
  assert(normalizeFontWeight('bold').value === '700', 'keyword "bold" resolves to 700');
  assert(normalizeFontWeight('normal').value === '400', 'keyword "normal" resolves to 400');

  // 3. REM computation
  assert(computeRemValue('16px', 16) === '1rem', '16px on 16px root is 1rem');
  assert(computeRemValue('24px', 16) === '1.5rem', '24px on 16px root is 1.5rem');
  assert(computeRemValue('32px', 16) === '2rem', '32px on 16px root is 2rem');
  assert(computeRemValue('18px', 16) === '1.125rem', '18px on 16px root is 1.125rem');

  // 4. Line height ratio normalization
  const lh1 = normalizeLineHeight('24px', '16px');
  assert(lh1.ratio === 1.5, '24px line-height on 16px font-size gives 1.5 ratio');
  assert(lh1.formatted === '24px (1.50)', 'formatted line-height string matches');

  const lh2 = normalizeLineHeight('normal', '16px');
  assert(lh2.formatted === 'normal (~1.20)', 'normal line-height gives default ~1.20 ratio');

  // 5. Luminance & WCAG 2.1 Contrast Ratio
  const blackLum = calculateLuminance({ r: 0, g: 0, b: 0 });
  const whiteLum = calculateLuminance({ r: 255, g: 255, b: 255 });
  assert(blackLum === 0, 'Black luminance is 0');
  assert(whiteLum === 1, 'White luminance is 1');

  const blackOnWhiteRatio = calculateContrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
  assert(blackOnWhiteRatio === 21, 'Black on White contrast ratio is maximum 21:1');

  const whiteOnWhiteRatio = calculateContrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 });
  assert(whiteOnWhiteRatio === 1, 'Same color contrast ratio is 1:1');

  // 6. WCAG Badges
  const badgeAAA = getWCAGBadge(7.5, 16);
  assert(badgeAAA.level === 'AAA', '7.5:1 ratio on 16px passes AAA');
  assert(badgeAAA.passes === true, 'AAA passes');

  const badgeAA = getWCAGBadge(5.0, 16);
  assert(badgeAA.level === 'AA', '5.0:1 ratio on 16px passes AA');
  assert(badgeAA.passes === true, 'AA passes');

  const badgeFail = getWCAGBadge(2.5, 16);
  assert(badgeFail.level === 'Fail', '2.5:1 ratio on 16px fails WCAG');
  assert(badgeFail.passes === false, 'Fail marked as false');

  // 7. Safe CSS Selector Generator
  // Mock element structure
  const mockElemWithId = {
    id: 'main-title',
    tagName: 'H1',
    className: 'hero-heading bold',
    parentElement: null
  };
  assert(generateSafeSelector(mockElemWithId) === '#main-title', 'Element with ID generates #id selector');

  const mockElemWithClasses = {
    id: '',
    tagName: 'DIV',
    className: 'card-body active-state',
    parentElement: null
  };
  assert(generateSafeSelector(mockElemWithClasses) === 'div.card-body.active-state', 'Element with classes generates tag.class selector');

  // 8. Truncate text
  assert(truncateText('Hello World', 5) === 'Hello...', 'truncateText trims to max length with ellipsis');
  assert(truncateText('Short', 10) === 'Short', 'truncateText preserves short strings');

  return results;
}
