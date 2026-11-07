/**
 * FontLens - Font Detection & Evidence Engine Unit Tests
 */

import {
  isSystemFallback,
  analyzeFontEvidence
} from '../scripts/font-detection.js';

import {
  findGoogleFontMatch,
  getGoogleFontsByCategory,
  GOOGLE_FONTS_CATALOG
} from '../scripts/google-fonts-data.js';

export async function runFontDetectionTests() {
  const results = [];

  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    results.push({ name: message, passed: true });
  }

  // 1. System Fallback detection
  assert(isSystemFallback('sans-serif') === true, 'sans-serif is recognized system fallback');
  assert(isSystemFallback('serif') === true, 'serif is recognized system fallback');
  assert(isSystemFallback('monospace') === true, 'monospace is recognized system fallback');
  assert(isSystemFallback('-apple-system') === true, '-apple-system is recognized system fallback');
  assert(isSystemFallback('arial') === true, 'arial is recognized system fallback');
  assert(isSystemFallback('times new roman') === true, 'times new roman is recognized system fallback');
  assert(isSystemFallback('Inter') === false, 'Inter is not a generic system fallback');
  assert(isSystemFallback('Playfair Display') === false, 'Playfair Display is not a generic fallback');

  // 2. Google Fonts Catalog Checks
  assert(Array.isArray(GOOGLE_FONTS_CATALOG) && GOOGLE_FONTS_CATALOG.length >= 100, 'Catalog contains 100+ curated Google Fonts');

  const matchRoboto = findGoogleFontMatch('Roboto');
  assert(matchRoboto !== null, 'Roboto found in Google Fonts catalog');
  assert(matchRoboto.category === 'sans-serif', 'Roboto category is sans-serif');

  const matchMerriweather = findGoogleFontMatch('Merriweather');
  assert(matchMerriweather !== null, 'Merriweather found in Google Fonts catalog');
  assert(matchMerriweather.category === 'serif', 'Merriweather category is serif');

  const matchJetBrains = findGoogleFontMatch('JetBrains Mono');
  assert(matchJetBrains !== null, 'JetBrains Mono found in Google Fonts catalog');
  assert(matchJetBrains.category === 'monospace', 'JetBrains Mono category is monospace');

  const matchNonExistent = findGoogleFontMatch('FakeFontNotFoundXYZ');
  assert(matchNonExistent === null, 'Unknown font returns null match');

  const serifFonts = getGoogleFontsByCategory('serif');
  assert(serifFonts.length > 5, 'Can query Google Fonts by serif category');

  // 3. Evidence Engine evaluation
  const stack = ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'];
  const analysis = analyzeFontEvidence(stack, '400', 'normal');

  assert(analysis.declaredStack.length === 4, 'Declared stack has 4 items');
  assert(analysis.candidates.length === 4, '4 candidates analyzed');
  assert(analysis.candidates[0].name === 'Inter', 'First candidate is Inter');
  assert(analysis.candidates[0].isPrimaryDeclared === true, 'Inter is primary declared font');
  assert(analysis.candidates[0].googleMatch !== null, 'Inter is matched with Google Fonts');
  assert(analysis.candidates[3].isSystemFallback === true, 'sans-serif marked as system fallback');
  assert(typeof analysis.summary === 'string' && analysis.summary.length > 0, 'Generates human-readable summary');

  return results;
}
