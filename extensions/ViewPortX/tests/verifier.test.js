/**
 * ViewPortX - Verifier Unit Tests
 * Validates layout verification measurements, before/after comparisons,
 * and overall success rate calculations.
 */

import { verifyTransformations } from '../scripts/verifier.js';

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

console.log('\n--- Running Verifier Unit Tests ---');

// Mock document where elements fit within 375px viewport
const mockDocResolved = {
  defaultView: { innerWidth: 375 },
  documentElement: {
    scrollWidth: 375,
    clientWidth: 375
  },
  location: { href: 'https://example.com' },
  querySelector: (sel) => {
    if (sel === '#fixed-container') {
      return {
        getBoundingClientRect: () => ({ width: 375, right: 375, left: 0 })
      };
    }
    if (sel === '.hero-img') {
      return {
        getBoundingClientRect: () => ({ width: 350, right: 350, left: 0 })
      };
    }
    return null;
  }
};

const mockTransformations = [
  { id: 'tx-1', targetSelector: 'html, body' },
  { id: 'tx-2', targetSelector: '#fixed-container' },
  { id: 'tx-3', targetSelector: '.hero-img' }
];

const reportResolved = verifyTransformations(mockDocResolved, mockTransformations, 250);

assert(reportResolved.appliedCount === 3, 'Applied count is 3');
assert(reportResolved.verifiedCount === 3, 'All 3 transformations verified');
assert(reportResolved.unsuccessfulCount === 0, 'Zero unsuccessful transformations');
assert(reportResolved.overallSuccessRate === 100, 'Overall success rate is 100%');
assert(reportResolved.finalDocumentOverflow === 0, 'Final document overflow is 0px');

// Mock document with remaining overflow
const mockDocUnresolved = {
  defaultView: { innerWidth: 375 },
  documentElement: {
    scrollWidth: 450,
    clientWidth: 375
  },
  location: { href: 'https://example.com' },
  querySelector: (sel) => {
    if (sel === '#fixed-container') {
      return {
        getBoundingClientRect: () => ({ width: 450, right: 450, left: 0 })
      };
    }
    return null;
  }
};

const reportUnresolved = verifyTransformations(mockDocUnresolved, [
  { id: 'tx-1', targetSelector: '#fixed-container' }
], 300);

assert(reportUnresolved.verifiedCount === 0, 'Unresolved element is not marked verified');
assert(reportUnresolved.unsuccessfulCount === 1, 'Unresolved element incremented unsuccessful count');
assert(reportUnresolved.overallSuccessRate === 0, 'Success rate reflects partial/unsuccessful state (0%)');
assert(reportUnresolved.measurements[0].status === 'partially_verified', 'Status marked as partially_verified when overflow remains');

console.log(`\nVerifier Unit Tests Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
