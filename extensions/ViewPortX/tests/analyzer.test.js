/**
 * ViewPortX - Analyzer Unit Tests
 * Validates rule-based heuristic detection across 10 responsive layout categories.
 */

import { analyzeScanReport } from '../scripts/analyzer.js';

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

console.log('\n--- Running Analyzer Unit Tests ---');

// Build a synthetic scan report with known defects
const mockReport = {
  timestamp: Date.now(),
  url: 'https://example.com',
  hostname: 'example.com',
  viewportWidth: 360,
  viewportHeight: 640,
  documentScrollWidth: 720,
  documentScrollHeight: 1200,
  hasHorizontalOverflow: true,
  totalHorizontalOverflow: 360,
  totalElementsScanned: 8,
  elements: [
    // 1. Fixed Container
    {
      id: 'e1',
      tagName: 'div',
      selector: '#sidebar-wrapper',
      classNames: ['wrapper'],
      isVisible: true,
      isInteractive: false,
      rect: { top: 0, left: 0, right: 600, bottom: 200, width: 600, height: 200 },
      computed: {
        width: '600px',
        maxWidth: 'none',
        display: 'block',
        overflowX: 'visible',
        boxSizing: 'border-box'
      },
      parentDimensions: { clientWidth: 360, scrollWidth: 600, width: 360 }
    },
    // 2. Oversized Image
    {
      id: 'e2',
      tagName: 'img',
      selector: '.banner-img',
      classNames: ['banner-img'],
      isVisible: true,
      isInteractive: false,
      intrinsicWidth: 800,
      rect: { top: 200, left: 0, right: 800, bottom: 400, width: 800, height: 200 },
      computed: {
        width: '800px',
        maxWidth: 'none',
        display: 'block',
        overflowX: 'visible',
        boxSizing: 'content-box'
      },
      parentDimensions: { clientWidth: 360, scrollWidth: 800, width: 360 }
    },
    // 3. Navigation with nowrap
    {
      id: 'e3',
      tagName: 'nav',
      selector: 'nav.main-nav',
      classNames: ['main-nav'],
      isVisible: true,
      isInteractive: false,
      rect: { top: 0, left: 0, right: 500, bottom: 50, width: 500, height: 50 },
      computed: {
        width: '500px',
        maxWidth: 'none',
        display: 'flex',
        flexWrap: 'nowrap',
        overflowX: 'visible'
      },
      parentDimensions: { clientWidth: 360, scrollWidth: 500, width: 360 }
    },
    // 4. Preformatted Code Block
    {
      id: 'e4',
      tagName: 'pre',
      selector: 'pre.code-snippet',
      classNames: ['code-snippet'],
      isVisible: true,
      isInteractive: false,
      rect: { top: 450, left: 0, right: 650, bottom: 600, width: 650, height: 150 },
      computed: {
        width: '650px',
        maxWidth: 'none',
        display: 'block',
        overflowX: 'visible',
        wordBreak: 'normal',
        overflowWrap: 'normal'
      },
      parentDimensions: { clientWidth: 360, scrollWidth: 650, width: 360 }
    },
    // 5. Grid with multiple fixed pixel columns
    {
      id: 'e5',
      tagName: 'div',
      selector: '.product-grid',
      classNames: ['product-grid'],
      isVisible: true,
      isInteractive: false,
      rect: { top: 650, left: 0, right: 640, bottom: 900, width: 640, height: 250 },
      computed: {
        width: '640px',
        maxWidth: 'none',
        display: 'grid',
        gridTemplateColumns: '300px 300px',
        overflowX: 'visible'
      },
      parentDimensions: { clientWidth: 360, scrollWidth: 640, width: 360 }
    },
    // 6. Wide Table
    {
      id: 'e6',
      tagName: 'table',
      selector: 'table.data-sheet',
      classNames: ['data-sheet'],
      isVisible: true,
      isInteractive: false,
      rect: { top: 920, left: 0, right: 700, bottom: 1100, width: 700, height: 180 },
      computed: {
        width: '700px',
        maxWidth: 'none',
        display: 'table',
        overflowX: 'visible'
      },
      parentDimensions: { clientWidth: 360, scrollWidth: 700, width: 360 }
    },
    // 7. Small Touch Target
    {
      id: 'e7',
      tagName: 'button',
      selector: 'button.tiny-close-btn',
      classNames: ['tiny-close-btn'],
      isVisible: true,
      isInteractive: true,
      rect: { top: 10, left: 10, right: 28, bottom: 28, width: 18, height: 18 },
      computed: {
        width: '18px',
        height: '18px',
        display: 'inline-block'
      },
      parentDimensions: { clientWidth: 360, scrollWidth: 360, width: 360 }
    }
  ]
};

const issues = analyzeScanReport(mockReport);

// Verify detections
assert(Array.isArray(issues) && issues.length >= 7, 'Detects multiple responsive defects from report');

const globalOverflowIssue = issues.find(i => i.id === 'issue-global-overflow');
assert(globalOverflowIssue !== undefined, 'Identifies global document horizontal overflow');
assert(globalOverflowIssue.severity === 'critical', 'Global overflow is marked as critical severity');

const containerIssue = issues.find(i => i.category === 'container');
assert(containerIssue !== undefined, 'Detects fixed-width container exceeding viewport');
assert(containerIssue.selector === '#sidebar-wrapper', 'Points to correct container selector');

const imageIssue = issues.find(i => i.category === 'image');
assert(imageIssue !== undefined, 'Detects overflowing image missing max-width constraints');

const navIssue = issues.find(i => i.category === 'navigation');
assert(navIssue !== undefined, 'Detects navigation using flex nowrap');

const typoIssue = issues.find(i => i.category === 'typography');
assert(typoIssue !== undefined, 'Detects pre code block lacking overflow-x scrolling');

const gridIssue = issues.find(i => i.category === 'flex-grid');
assert(gridIssue !== undefined, 'Detects fixed-column CSS grid tracks');

const tableIssue = issues.find(i => i.category === 'table');
assert(tableIssue !== undefined, 'Detects wide table lacking scroll wrapper');

const touchIssue = issues.find(i => i.category === 'touch-target');
assert(touchIssue !== undefined, 'Detects undersized touch target (< 36px)');

// Severity ordering
const severityRank = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
let isSorted = true;
for (let i = 1; i < issues.length; i++) {
  if (severityRank[issues[i].severity] > severityRank[issues[i - 1].severity]) {
    isSorted = false;
    break;
  }
}
assert(isSorted, 'Issues are strictly sorted by severity priority');

console.log(`\nAnalyzer Unit Tests Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
