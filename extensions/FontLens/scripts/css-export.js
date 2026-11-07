/**
 * FontLens - CSS Export & Report Generator
 * Formats clean, valid CSS rules, individual property declarations,
 * and page-wide typography scan reports in JSON and CSV formats.
 */

/**
 * Builds formatted CSS rule string for given selector and typography properties
 * @param {string} selector e.g. ".hero-title"
 * @param {object} typo
 * @returns {string}
 */
export function buildCssRule(selector = '.typography-preview', typo = {}) {
  if (!typo) return '';

  const cleanSel = selector && typeof selector === 'string' ? selector.trim() : '.typography-preview';
  const lines = [];

  if (typo.fontFamily) {
    lines.push(`  font-family: ${typo.fontFamily};`);
  }
  if (typo.fontSize) {
    lines.push(`  font-size: ${typo.fontSize};`);
  }
  if (typo.fontWeight) {
    lines.push(`  font-weight: ${typo.fontWeight};`);
  }
  if (typo.fontStyle && typo.fontStyle !== 'normal') {
    lines.push(`  font-style: ${typo.fontStyle};`);
  }
  if (typo.lineHeight) {
    const val = typeof typo.lineHeight === 'object' ? typo.lineHeight.raw : typo.lineHeight;
    if (val && val !== 'normal') {
      lines.push(`  line-height: ${val};`);
    }
  }
  if (typo.letterSpacing && typo.letterSpacing !== 'normal' && typo.letterSpacing !== '0px') {
    lines.push(`  letter-spacing: ${typo.letterSpacing};`);
  }
  if (typo.wordSpacing && typo.wordSpacing !== 'normal' && typo.wordSpacing !== '0px') {
    lines.push(`  word-spacing: ${typo.wordSpacing};`);
  }
  if (typo.color) {
    lines.push(`  color: ${typo.color};`);
  }
  if (typo.textAlign && typo.textAlign !== 'start' && typo.textAlign !== 'left') {
    lines.push(`  text-align: ${typo.textAlign};`);
  }
  if (typo.textTransform && typo.textTransform !== 'none') {
    lines.push(`  text-transform: ${typo.textTransform};`);
  }
  if (typo.textDecoration && typo.textDecoration !== 'none') {
    lines.push(`  text-decoration: ${typo.textDecoration};`);
  }
  if (typo.textRendering && typo.textRendering !== 'auto') {
    lines.push(`  text-rendering: ${typo.textRendering};`);
  }

  return `${cleanSel} {\n${lines.join('\n')}\n}`;
}

/**
 * Returns single font-family declaration
 * @param {string} fontFamily
 * @returns {string} e.g. 'font-family: "Inter", sans-serif;'
 */
export function buildFontFamilyDeclaration(fontFamily = '') {
  return `font-family: ${fontFamily || 'sans-serif'};`;
}

/**
 * Exports page scanner summary to structured JSON string
 * @param {object} scanData
 * @returns {string}
 */
export function exportScanToJson(scanData) {
  const exportPayload = {
    generator: 'FontLens Chrome Extension v1.0.0',
    exportedAt: new Date().toISOString(),
    url: scanData.url || '',
    pageTitle: scanData.title || '',
    stats: {
      totalElementsScanned: scanData.totalElements || 0,
      uniqueFontsCount: scanData.uniqueFonts?.length || 0,
      uniqueStylesCount: scanData.uniqueStyles?.length || 0
    },
    uniqueFonts: scanData.uniqueFonts || [],
    fontSizes: scanData.fontSizes || [],
    fontWeights: scanData.fontWeights || [],
    categories: scanData.categories || {},
    uniqueStyles: scanData.uniqueStyles || []
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Exports page scanner unique styles to clean CSV string
 * @param {object} scanData
 * @returns {string}
 */
export function exportScanToCsv(scanData) {
  const headers = [
    'Font Family',
    'Font Size',
    'Font Weight',
    'Line Height',
    'Text Color',
    'Text Align',
    'Element Count',
    'Sample Elements'
  ];

  const rows = [];
  rows.push(headers.map(h => `"${h}"`).join(','));

  const styles = scanData.uniqueStyles || [];
  for (const s of styles) {
    const row = [
      (s.fontFamily || '').replace(/"/g, '""'),
      s.fontSize || '',
      s.fontWeight || '',
      s.lineHeight || '',
      s.color || '',
      s.textAlign || '',
      s.count || 1,
      (s.sampleTags || []).join(', ')
    ];
    rows.push(row.map(val => `"${val}"`).join(','));
  }

  return rows.join('\n');
}

// Aliases for convenience
export const generateCSSRule = buildCssRule;
export const generateFontFamilyDeclaration = buildFontFamilyDeclaration;
export const generateScanJSON = exportScanToJson;
export const generateScanCSV = exportScanToCsv;


