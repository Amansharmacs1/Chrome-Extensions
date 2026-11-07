/**
 * FontLens - Page Typography Scanner Unit Tests
 */

import { scanPageTypography } from '../scanner/scanner-core.js';

export async function runScannerTests() {
  const results = [];

  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    results.push({ name: message, passed: true });
  }

  // Create lightweight mock DOM for testing
  const mockElements = [
    {
      tagName: 'H1',
      id: 'page-title',
      textContent: 'Main Title',
      childNodes: [{ nodeType: 3, nodeValue: 'Main Title' }],
      children: [],
      getBoundingClientRect: () => ({ width: 600, height: 48 }),
      getAttribute: () => null,
      closest: () => null,
      computedStyle: {
        fontFamily: '"Inter", sans-serif',
        fontSize: '32px',
        fontWeight: '800',
        lineHeight: '1.2',
        color: 'rgb(15, 23, 42)',
        textAlign: 'left',
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      }
    },
    {
      tagName: 'P',
      id: 'body-p1',
      textContent: 'First article paragraph text with details.',
      childNodes: [{ nodeType: 3, nodeValue: 'First article paragraph text with details.' }],
      children: [],
      getBoundingClientRect: () => ({ width: 600, height: 60 }),
      getAttribute: () => null,
      closest: () => null,
      computedStyle: {
        fontFamily: 'Merriweather, Georgia, serif',
        fontSize: '16px',
        fontWeight: '400',
        lineHeight: '28px',
        color: 'rgb(51, 65, 85)',
        textAlign: 'left',
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      }
    },
    {
      tagName: 'P',
      id: 'body-p2',
      textContent: 'Second article paragraph sharing identical style.',
      childNodes: [{ nodeType: 3, nodeValue: 'Second article paragraph sharing identical style.' }],
      children: [],
      getBoundingClientRect: () => ({ width: 600, height: 60 }),
      getAttribute: () => null,
      closest: () => null,
      computedStyle: {
        fontFamily: 'Merriweather, Georgia, serif',
        fontSize: '16px',
        fontWeight: '400',
        lineHeight: '28px',
        color: 'rgb(51, 65, 85)',
        textAlign: 'left',
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      }
    },
    {
      tagName: 'BUTTON',
      id: 'action-btn',
      textContent: 'Subscribe Now',
      childNodes: [{ nodeType: 3, nodeValue: 'Subscribe Now' }],
      children: [],
      getBoundingClientRect: () => ({ width: 140, height: 38 }),
      getAttribute: () => null,
      closest: () => null,
      computedStyle: {
        fontFamily: '"Inter", sans-serif',
        fontSize: '14px',
        fontWeight: '600',
        lineHeight: '1.4',
        color: 'rgb(255, 255, 255)',
        textAlign: 'center',
        display: 'inline-block',
        visibility: 'visible',
        opacity: '1'
      }
    }
  ];

  // Set global Node if not defined in Node.js test environment
  if (typeof globalThis.Node === 'undefined') {
    globalThis.Node = {
      ELEMENT_NODE: 1,
      TEXT_NODE: 3
    };
  }

  const mockDoc = {
    location: { href: 'https://fontlens-test.dev/blog' },
    title: 'FontLens Mock Test Page',
    querySelectorAll: () => mockElements,
    defaultView: {
      getComputedStyle: (el) => el.computedStyle
    }
  };

  const scanResult = scanPageTypography(mockDoc, 500);

  assert(scanResult.totalElements === 4, 'Scanned 4 mock candidate elements');
  assert(scanResult.uniqueFonts.length === 2, 'Deduplicated to 2 unique primary fonts (Inter, Merriweather)');
  assert(scanResult.uniqueFonts.some(f => f.name === 'Inter' && f.count === 2), 'Inter detected with 2 occurrences');
  assert(scanResult.uniqueFonts.some(f => f.name === 'Merriweather' && f.count === 2), 'Merriweather detected with 2 occurrences');

  // Verify unique style grouping
  assert(scanResult.uniqueStyles.length === 3, 'Grouped into 3 unique typography style signatures');
  const pStyle = scanResult.uniqueStyles.find(s => s.fontFamily === 'Merriweather');
  assert(pStyle && pStyle.count === 2, 'Identical paragraph styles deduplicated into count of 2');

  // Verify categorization
  assert(scanResult.categories.headings.length === 1, 'H1 categorized into headings');
  assert(scanResult.categories.body.length === 2, 'P elements categorized into body');
  assert(scanResult.categories.interactive.length === 1, 'BUTTON categorized into interactive');

  return results;
}
