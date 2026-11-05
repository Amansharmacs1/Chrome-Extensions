/**
 * ViewPortX - Transformer Unit Tests
 * Validates CSS override generation, stylesheet compilation, and DOM injection/removal.
 */

import {
  generateTransformations,
  compileStylesheet,
  injectStyles,
  removeInjectedStyles,
  isStylesInjected,
  highlightElement,
  VIEWPORTX_STYLE_ID
} from '../scripts/transformer.js';

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

console.log('\n--- Running Transformer Unit Tests ---');

const mockIssues = [
  {
    id: 'iss-1',
    selector: 'html, body',
    tagName: 'body',
    category: 'overflow',
    severity: 'critical',
    description: 'Document has horizontal overflow',
    confidence: 0.98
  },
  {
    id: 'iss-2',
    selector: '#fixed-sidebar',
    tagName: 'div',
    category: 'container',
    severity: 'high',
    description: 'Fixed width container',
    confidence: 0.92
  },
  {
    id: 'iss-3',
    selector: '.legacy-banner',
    tagName: 'img',
    category: 'image',
    severity: 'high',
    description: 'Image missing max-width',
    confidence: 0.95
  },
  {
    id: 'iss-4',
    selector: 'table.report-table',
    tagName: 'table',
    category: 'table',
    severity: 'high',
    description: 'Table missing overflow scroll',
    confidence: 0.94
  }
];

// 1. generateTransformations
const transformations = generateTransformations(mockIssues);
assert(Array.isArray(transformations) && transformations.length === 4, 'Generates 4 transformation objects');

const overflowTx = transformations.find(t => t.category === 'overflow');
assert(overflowTx.rules['overflow-x'] === 'hidden !important', 'Sets overflow-x: hidden !important on body/html');

const containerTx = transformations.find(t => t.category === 'container');
assert(containerTx.rules['max-width'] === '100% !important', 'Sets max-width: 100% !important on container');
assert(containerTx.rules['width'] === '100% !important', 'Sets width: 100% !important on container');

const imageTx = transformations.find(t => t.category === 'image');
assert(imageTx.rules['max-width'] === '100% !important', 'Sets max-width: 100% on image');
assert(imageTx.rules['height'] === 'auto !important', 'Sets height: auto on image');

const tableTx = transformations.find(t => t.category === 'table');
assert(tableTx.rules['overflow-x'] === 'auto !important', 'Sets overflow-x: auto on table');

// 2. compileStylesheet
const compiledCss = compileStylesheet(transformations, true);
assert(typeof compiledCss === 'string' && compiledCss.length > 100, 'Compiled CSS is non-empty string');
assert(compiledCss.includes('box-sizing: border-box !important;'), 'Contains global box-sizing reset');
assert(compiledCss.includes('#fixed-sidebar {'), 'Contains #fixed-sidebar target selector block');
assert(compiledCss.includes('.legacy-banner {'), 'Contains .legacy-banner target selector block');

// 3. Mock DOM Injection / Removal
class MockElement {
  constructor(tag, id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.parentNode = null;
    this.attributes = {};
    this.textContent = '';
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
}

const mockDoc = {
  elements: {},
  head: {
    appendChild: (el) => {
      mockDoc.elements[el.id] = el;
      el.parentNode = mockDoc.head;
      return el;
    },
    removeChild: (child) => {
      delete mockDoc.elements[child.id];
      child.parentNode = null;
    }
  },
  createElement: (tag) => new MockElement(tag),
  getElementById: (id) => mockDoc.elements[id] || null
};
MockElement.prototype.remove = function() {
  delete mockDoc.elements[this.id];
  this.parentNode = null;
};

assert(isStylesInjected(mockDoc) === false, 'Initially isStylesInjected is false');

const injectRes = injectStyles(mockDoc, compiledCss);
assert(injectRes.success === true, 'injectStyles succeeds');
assert(isStylesInjected(mockDoc) === true, 'isStylesInjected returns true after injection');
assert(mockDoc.getElementById(VIEWPORTX_STYLE_ID).textContent === compiledCss, 'Injected element holds compiled CSS text');

// Element highlighter
highlightElement(mockDoc, '#fixed-sidebar');
assert(mockDoc.getElementById('viewportx-highlight-styles') !== null, 'Highlighter style element created');

// Removal
const removeRes = removeInjectedStyles(mockDoc);
assert(removeRes.success === true, 'removeInjectedStyles succeeds');
assert(isStylesInjected(mockDoc) === false, 'isStylesInjected returns false after removal');

console.log(`\nTransformer Unit Tests Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
