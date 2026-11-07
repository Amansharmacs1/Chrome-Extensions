/**
 * FontLens - CSS Export & Serialization Unit Tests
 */

import {
  buildCssRule,
  generateCSSRule,
  buildFontFamilyDeclaration,
  generateFontFamilyDeclaration,
  exportScanToJson,
  generateScanJSON,
  exportScanToCsv,
  generateScanCSV
} from '../scripts/css-export.js';

export async function runCssExportTests() {
  const results = [];

  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    results.push({ name: message, passed: true });
  }

  // 1. Build CSS Rule
  const typoProps = {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: '28px',
    fontWeight: '700',
    fontStyle: 'italic',
    lineHeight: '1.3',
    letterSpacing: '-0.5px',
    color: '#1e293b',
    textAlign: 'center'
  };

  const css = buildCssRule('.hero-heading', typoProps);
  assert(css.startsWith('.hero-heading {'), 'CSS rule starts with selector and opening brace');
  assert(css.includes('font-family: "Playfair Display", Georgia, serif;'), 'Includes font-family');
  assert(css.includes('font-size: 28px;'), 'Includes font-size');
  assert(css.includes('font-weight: 700;'), 'Includes font-weight');
  assert(css.includes('font-style: italic;'), 'Includes font-style');
  assert(css.includes('line-height: 1.3;'), 'Includes line-height');
  assert(css.includes('letter-spacing: -0.5px;'), 'Includes letter-spacing');
  assert(css.includes('color: #1e293b;'), 'Includes color');
  assert(css.includes('text-align: center;'), 'Includes text-align');
  assert(css.endsWith('}'), 'CSS rule closes with brace');

  // Verify alias
  assert(generateCSSRule === buildCssRule, 'generateCSSRule alias matches buildCssRule');

  // 2. Build Font Family Declaration
  const ff = buildFontFamilyDeclaration('"Inter", sans-serif');
  assert(ff === 'font-family: "Inter", sans-serif;', 'buildFontFamilyDeclaration formats correctly');
  assert(generateFontFamilyDeclaration === buildFontFamilyDeclaration, 'generateFontFamilyDeclaration alias matches');

  // 3. Scan JSON Exporter
  const mockScan = {
    url: 'https://example.com/blog',
    title: 'Example Blog Post',
    totalElements: 450,
    uniqueFonts: ['Inter', 'Merriweather'],
    fontSizes: ['16px', '24px', '32px'],
    fontWeights: ['400', '700'],
    categories: {
      headings: [{ text: 'Title' }],
      body: [{ text: 'Paragraph' }]
    },
    uniqueStyles: [
      {
        fontFamily: 'Inter',
        fontSize: '16px',
        fontWeight: '400',
        lineHeight: '1.5',
        color: '#000',
        textAlign: 'left',
        count: 12,
        sampleTags: ['P', 'SPAN']
      }
    ]
  };

  const jsonStr = exportScanToJson(mockScan);
  const parsedJson = JSON.parse(jsonStr);
  assert(parsedJson.generator.includes('FontLens'), 'JSON contains generator metadata');
  assert(parsedJson.url === 'https://example.com/blog', 'JSON records source URL');
  assert(parsedJson.stats.totalElementsScanned === 450, 'JSON contains correct stats');
  assert(generateScanJSON === exportScanToJson, 'generateScanJSON alias matches');

  // 4. Scan CSV Exporter
  const csvStr = exportScanToCsv(mockScan);
  assert(csvStr.includes('"Font Family","Font Size"'), 'CSV contains header row');
  assert(csvStr.includes('"Inter","16px","400"'), 'CSV contains style row');
  assert(generateScanCSV === exportScanToCsv, 'generateScanCSV alias matches');

  return results;
}
