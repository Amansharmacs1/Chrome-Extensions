/**
 * QRQuick - QR Engine & Rendering Logic Unit Tests
 */

import {
  generateQRMatrix,
  getFinderInfo,
  getLogoModuleBounds,
  generateQRSvg
} from '../generator/qr-engine.js';

export async function runQrEngineTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`QR Engine Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  // 1. Matrix Generation
  const matrix = generateQRMatrix('https://example.com', 'M');
  assert(typeof matrix.moduleCount === 'number', 'moduleCount is a number');
  assert(matrix.moduleCount >= 21, `Module count >= 21 (actual: ${matrix.moduleCount})`);
  assert(Array.isArray(matrix.matrix), 'matrix is an array of rows');
  assert(matrix.matrix.length === matrix.moduleCount, 'matrix row count matches moduleCount');
  assert(typeof matrix.isDark === 'function', 'isDark is a function');

  // Verify finder pattern corners are dark
  assert(matrix.isDark(0, 0) === true, 'Top-left corner is dark');
  assert(matrix.isDark(0, matrix.moduleCount - 1) === true, 'Top-right corner is dark');
  assert(matrix.isDark(matrix.moduleCount - 1, 0) === true, 'Bottom-left corner is dark');

  // Empty string throws
  let threw = false;
  try {
    generateQRMatrix('', 'M');
  } catch {
    threw = true;
  }
  assert(threw, 'Throws on empty string');

  // 2. Finder Pattern Detection
  const count = matrix.moduleCount;

  // Inside Top-Left finder
  const tlFinder = getFinderInfo(0, 0, count);
  assert(tlFinder.isFinder === true, '(0,0) is part of finder pattern');
  assert(tlFinder.which === 'TL', 'which finder is TL');
  assert(tlFinder.isOuter === true, '(0,0) is part of outer frame');

  // Center of Top-Left finder
  const tlCenter = getFinderInfo(3, 3, count);
  assert(tlCenter.isFinder === true && tlCenter.isInner === true, '(3,3) is inner pupil of TL finder');

  // White separator of Top-Left finder
  const tlSep = getFinderInfo(1, 1, count);
  assert(tlSep.isFinder === true && !tlSep.isOuter && !tlSep.isInner, '(1,1) is white separator');

  // Non-finder data module
  const dataModule = getFinderInfo(10, 10, count);
  assert(dataModule.isFinder === false, '(10,10) is not a finder pattern');

  // 3. Logo Bounds
  const logoBounds = getLogoModuleBounds(count, 20);
  assert(logoBounds.sizeModules >= 3, 'Logo occupies at least 3 modules');
  assert(logoBounds.startCol > 0 && logoBounds.endCol < count, 'Logo is centered horizontally');
  assert(logoBounds.startRow > 0 && logoBounds.endRow < count, 'Logo is centered vertically');
  assert(logoBounds.endCol - logoBounds.startCol === logoBounds.sizeModules, 'Logo width matches sizeModules');

  // 4. SVG Vector Generation
  const svgXml = generateQRSvg('https://qrquick.app', {
    size: 400,
    margin: 4,
    ecLevel: 'Q',
    fgColor: '#0F172A',
    bgColor: '#FFFFFF',
    pattern: 'rounded',
    eyeOuter: 'circle',
    eyeInner: 'circle'
  });

  assert(typeof svgXml === 'string', 'SVG output is string');
  assert(svgXml.startsWith('<?xml'), 'SVG starts with XML header');
  assert(svgXml.includes('<svg'), 'Contains <svg tag');
  assert(svgXml.includes('viewBox="0 0 400 400"'), 'SVG contains correct viewBox');
  assert(svgXml.includes('fill="#0F172A"'), 'SVG contains foreground color');
  assert(svgXml.includes('</svg>'), 'SVG properly closed');

  // Gradient SVG
  const gradSvg = generateQRSvg('Test Gradient', {
    size: 300,
    isGradient: true,
    gradientType: 'linear',
    fgColor: '#06B6D4',
    fgColorSecondary: '#38BDF8'
  });
  assert(gradSvg.includes('<linearGradient id="qrGrad"'), 'SVG includes linearGradient definition');
  assert(gradSvg.includes('url(#qrGrad)'), 'SVG references gradient fill ID');

  return assertions;
}
