/**
 * QRQuick - Validation & Safety Tests
 */

import {
  validatePayloadCapacity,
  hexToRgba,
  calculateRelativeLuminance,
  calculateContrastRatio,
  validateLogoCoverage,
  validateUrl
} from '../services/validation.js';

export async function runValidationTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Validation Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  // 1. Capacity Limits
  const validCap = validatePayloadCapacity('Short text', 'M');
  assert(validCap.valid === true, 'Short text is within capacity');
  assert(validCap.byteLength === 10, 'Byte length is 10');

  const emptyCap = validatePayloadCapacity('', 'M');
  assert(emptyCap.valid === false, 'Empty payload rejected');

  // Enormous payload
  const hugeText = 'A'.repeat(3000);
  const hugeCap = validatePayloadCapacity(hugeText, 'H');
  assert(hugeCap.valid === false, 'Payload exceeding Level H capacity rejected');
  assert(hugeCap.error.includes('exceeds'), 'Capacity error contains explanation');

  // 2. Hex to RGBA
  const blackRgba = hexToRgba('#000000');
  assert(blackRgba.r === 0 && blackRgba.g === 0 && blackRgba.b === 0, 'Parses #000000');

  const whiteRgba = hexToRgba('#FFF');
  assert(whiteRgba.r === 255 && whiteRgba.g === 255 && whiteRgba.b === 255, 'Parses 3-digit #FFF');

  const invalidHex = hexToRgba('not-a-color');
  assert(invalidHex === null, 'Returns null on invalid hex');

  // 3. Luminance & Contrast Ratio
  const lumBlack = calculateRelativeLuminance(0, 0, 0);
  const lumWhite = calculateRelativeLuminance(255, 255, 255);
  assert(lumBlack === 0, 'Black relative luminance is 0');
  assert(Math.round(lumWhite) === 1, 'White relative luminance is 1');

  // Black on White = 21:1
  const maxContrast = calculateContrastRatio('#000000', '#ffffff');
  assert(maxContrast.ratio === 21, `Black on white contrast is 21:1 (actual: ${maxContrast.ratio})`);
  assert(maxContrast.isSafe === true, 'Black on white is safe');

  // Low contrast (e.g. Light gray on white)
  const lowContrast = calculateContrastRatio('#E2E8F0', '#FFFFFF');
  assert(lowContrast.isSafe === false, 'Light gray on white flagged unsafe');
  assert(lowContrast.ratio < 3.0, 'Contrast ratio is < 3.0:1');
  assert(Boolean(lowContrast.warning), 'Low contrast warning provided');

  // Inverted QR code note
  const inverted = calculateContrastRatio('#FFFFFF', '#0F172A');
  assert(inverted.isSafe === true, 'Inverted high contrast is mathematically safe');
  assert(inverted.warning.includes('inverted'), 'Inverted QR provides helpful compatibility note');

  // 4. Logo Coverage
  const safeLogo = validateLogoCoverage(80, 500, 'H');
  assert(safeLogo.isSafe === true, 'Reasonable logo size is safe');
  assert(safeLogo.recommendedEcLevel === 'H' || safeLogo.recommendedEcLevel === 'Q', 'Recommends high error correction');

  // Excessive logo (> 25% area)
  const hugeLogo = validateLogoCoverage(300, 500, 'M');
  assert(hugeLogo.isSafe === false, 'Oversized logo flagged as unsafe');
  assert(hugeLogo.coveragePercent === 36, `Calculates coverage percent (actual: ${hugeLogo.coveragePercent}%)`);

  // 5. URL Security Validation
  const validUrl = validateUrl('https://example.com/login');
  assert(validUrl.valid === true, 'Normal HTTPS URL valid');
  assert(validUrl.isSuspicious === false, 'Not marked suspicious');

  const jsUrl = validateUrl('javascript:alert(document.cookie)');
  assert(jsUrl.valid === false, 'javascript: URL rejected');
  assert(jsUrl.isSuspicious === true, 'Marked suspicious');
  assert(Boolean(jsUrl.error), 'Provides error message');

  const dataUrl = validateUrl('data:text/html,<script>alert(1)</script>');
  assert(dataUrl.valid === false && dataUrl.isSuspicious === true, 'data: URI rejected as suspicious');

  return assertions;
}
