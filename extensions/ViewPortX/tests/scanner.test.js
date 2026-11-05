/**
 * ViewPortX - Scanner Unit Tests
 * Validates DOM node inspection, safe CSS selector generation,
 * computed property extraction, and horizontal overflow measurement.
 */

import { generateSafeSelector, scanDOM } from '../scripts/scanner.js';

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

console.log('\n--- Running DOM Scanner Unit Tests ---');

// 1. Selector Generator Tests
const mockDoc = {
  querySelectorAll: (selector) => {
    if (selector === '#unique-id') return [{}];
    if (selector === '#duplicate-id') return [{}, {}];
    if (selector === 'div.hero-banner.featured') return [{}];
    return [];
  }
};

const uniqueEl = {
  nodeType: 1,
  tagName: 'DIV',
  id: 'unique-id',
  classList: ['hero'],
  ownerDocument: mockDoc
};
assert(generateSafeSelector(uniqueEl) === '#unique-id', 'Generates clean #id for unique element');

const duplicateIdEl = {
  nodeType: 1,
  tagName: 'DIV',
  id: 'duplicate-id',
  classList: ['hero-banner', 'featured'],
  ownerDocument: mockDoc,
  parentElement: {
    nodeType: 1,
    tagName: 'BODY',
    children: []
  }
};
assert(generateSafeSelector(duplicateIdEl) === 'div.hero-banner.featured', 'Falls back to classes if ID is not unique');

const htmlEl = { nodeType: 1, tagName: 'HTML' };
assert(generateSafeSelector(htmlEl) === 'html', 'Returns "html" for HTML tag');

const bodyEl = { nodeType: 1, tagName: 'BODY' };
assert(generateSafeSelector(bodyEl) === 'body', 'Returns "body" for BODY tag');

// 2. scanDOM Mock Document Test
const mockWindow = {
  innerWidth: 375,
  innerHeight: 667,
  getComputedStyle: (el) => ({
    width: el._computedWidth || '100px',
    height: '50px',
    minWidth: '0px',
    maxWidth: el._computedMaxWidth || 'none',
    display: el._computedDisplay || 'block',
    position: 'static',
    overflowX: el._computedOverflowX || 'visible',
    overflowY: 'visible',
    boxSizing: 'content-box',
    flexShrink: '1',
    flexWrap: 'nowrap',
    gridTemplateColumns: 'none',
    fontSize: '16px',
    lineHeight: '24px',
    padding: '0px',
    margin: '0px',
    textAlign: 'left',
    wordBreak: 'normal',
    overflowWrap: 'normal',
    visibility: 'visible',
    opacity: '1'
  })
};

const mockElements = [
  {
    nodeType: 1,
    tagName: 'DIV',
    id: 'wide-container',
    classList: [],
    _computedWidth: '800px',
    _computedMaxWidth: 'none',
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 200, width: 800, height: 200 }),
    parentElement: { clientWidth: 375, scrollWidth: 800, tagName: 'BODY' },
    ownerDocument: { querySelectorAll: (s) => (s === '#wide-container' ? [{}] : []) }
  },
  {
    nodeType: 1,
    tagName: 'IMG',
    classList: ['hero-img'],
    _computedWidth: '600px',
    _computedMaxWidth: 'none',
    naturalWidth: 600,
    naturalHeight: 400,
    getBoundingClientRect: () => ({ top: 200, left: 0, right: 600, bottom: 600, width: 600, height: 400 }),
    parentElement: { clientWidth: 375, scrollWidth: 600, tagName: 'DIV' },
    ownerDocument: { querySelectorAll: () => [] }
  }
];

const mockDocument = {
  location: { href: 'https://example.com/test', hostname: 'example.com' },
  documentElement: {
    clientWidth: 375,
    clientHeight: 667,
    scrollWidth: 800,
    scrollHeight: 1200
  },
  body: {
    clientWidth: 375,
    clientHeight: 667,
    scrollWidth: 800,
    scrollHeight: 1200
  },
  querySelectorAll: () => mockElements
};

const scanReport = scanDOM(mockDocument, mockWindow);

assert(scanReport.viewportWidth === 375, 'Viewport width is detected accurately (375px)');
assert(scanReport.documentScrollWidth === 800, 'Scroll width detected accurately (800px)');
assert(scanReport.hasHorizontalOverflow === true, 'Horizontal overflow flagged as true');
assert(scanReport.totalHorizontalOverflow === 425, 'Horizontal overflow amount calculated correctly (800 - 375 = 425px)');
assert(scanReport.elements.length === 2, 'Scanned element count matches mock elements (2)');
assert(scanReport.elements[0].selector === '#wide-container', 'Selector captured on element 0');
assert(scanReport.elements[1].intrinsicWidth === 600, 'Intrinsic image width extracted');

console.log(`\nScanner Unit Tests Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
