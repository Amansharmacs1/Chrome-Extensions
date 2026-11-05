/**
 * ViewPortX - Health Score Unit Tests
 * Validates category scoring, weighted aggregation, letter grades, and summary text.
 */

import { calculateHealthScore, CATEGORY_DEFINITIONS } from '../scripts/health-score.js';

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

console.log('\n--- Running Health Score Unit Tests ---');

// 1. Verify category definitions
const categoryKeys = Object.keys(CATEGORY_DEFINITIONS);
assert(categoryKeys.length === 10, 'All 10 required layout categories are defined');
const sumWeights = Object.values(CATEGORY_DEFINITIONS).reduce((acc, c) => acc + c.weight, 0);
assert(sumWeights === 100, `Category weights sum exactly to 100 (got ${sumWeights})`);

// 2. Perfect page test (0 issues)
const cleanReport = {
  viewportWidth: 375,
  documentScrollWidth: 375,
  hasHorizontalOverflow: false,
  totalHorizontalOverflow: 0,
  elements: [
    { tagName: 'div', isInteractive: false },
    { tagName: 'img', isInteractive: false },
    { tagName: 'button', isInteractive: true }
  ]
};

const perfectScore = calculateHealthScore(cleanReport, []);
assert(perfectScore.overall === 100, 'Clean page gets overall score of 100');
assert(perfectScore.grade === 'A', 'Clean page receives Grade A');
assert(perfectScore.failedCount === 0, 'Clean page has 0 failed tests');
assert(typeof perfectScore.summary === 'string' && perfectScore.summary.length > 10, 'Summary is provided');

// 3. Degraded page test (severe overflow + multiple category failures)
const brokenReport = {
  viewportWidth: 360,
  documentScrollWidth: 800,
  hasHorizontalOverflow: true,
  totalHorizontalOverflow: 440,
  elements: [
    { tagName: 'div', isInteractive: false },
    { tagName: 'img', isInteractive: false },
    { tagName: 'table', isInteractive: false }
  ]
};

const brokenIssues = [
  { category: 'overflow', severity: 'critical' },
  { category: 'container', severity: 'high' },
  { category: 'image', severity: 'high' },
  { category: 'table', severity: 'high' }
];

const brokenScore = calculateHealthScore(brokenReport, brokenIssues);
assert(brokenScore.overall < 70, `Broken page receives low score (got ${brokenScore.overall})`);
assert(['D', 'F'].includes(brokenScore.grade), `Broken page receives Grade D or F (got ${brokenScore.grade})`);
assert(brokenScore.failedCount === 4, 'Failed count matches issue count (4)');
assert(brokenScore.categories.overflow.score < 50, 'Overflow category score severely penalized');

console.log(`\nHealth Score Unit Tests Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
