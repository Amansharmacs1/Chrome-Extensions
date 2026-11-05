/**
 * ViewPortX - Responsive Health Score Engine
 * Computes transparent, weighted responsive scores (0-100) across 10 layout categories,
 * calculates letter grades (A-F), and provides actionable summaries.
 */

/** @type {Record<import('../src/types').IssueCategory, { weight: number, name: string }>} */
export const CATEGORY_DEFINITIONS = {
  overflow: { weight: 25, name: 'Horizontal Overflow' },
  container: { weight: 15, name: 'Container Sizing' },
  navigation: { weight: 10, name: 'Navigation Usability' },
  image: { weight: 10, name: 'Media Responsiveness' },
  typography: { weight: 10, name: 'Typography Wrapping' },
  'flex-grid': { weight: 10, name: 'Flex & Grid Flow' },
  form: { weight: 5, name: 'Form Adaptation' },
  table: { weight: 5, name: 'Table Responsiveness' },
  overlap: { weight: 5, name: 'Element Stacking' },
  'touch-target': { weight: 5, name: 'Touch Target Sizing' }
};

/**
 * Calculates a complete ResponsiveHealthScore for a scan report and detected issues.
 * @param {import('../src/types').DOMScanReport} scanReport
 * @param {import('../src/types').ResponsiveIssue[]} issues
 * @returns {import('../src/types').ResponsiveHealthScore}
 */
export function calculateHealthScore(scanReport, issues = []) {
  /** @type {Record<import('../src/types').IssueCategory, import('../src/types').CategoryScore>} */
  const categories = {};

  const issuesByCategory = {};
  for (const key of Object.keys(CATEGORY_DEFINITIONS)) {
    issuesByCategory[key] = [];
  }

  for (const issue of issues) {
    if (issuesByCategory[issue.category]) {
      issuesByCategory[issue.category].push(issue);
    }
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;
  let totalTested = 0;
  let totalFailed = 0;

  for (const [catKey, meta] of Object.entries(CATEGORY_DEFINITIONS)) {
    const catIssues = issuesByCategory[catKey] || [];
    const failed = catIssues.length;
    let tested = 1;

    // Approximate tested elements based on report
    if (scanReport && Array.isArray(scanReport.elements)) {
      if (catKey === 'image') {
        tested = Math.max(1, scanReport.elements.filter(e => ['img', 'svg', 'canvas', 'video'].includes(e.tagName)).length);
      } else if (catKey === 'container') {
        tested = Math.max(1, scanReport.elements.filter(e => ['div', 'section', 'main', 'article'].includes(e.tagName)).length);
      } else if (catKey === 'table') {
        tested = Math.max(1, scanReport.elements.filter(e => e.tagName === 'table').length);
      } else if (catKey === 'form') {
        tested = Math.max(1, scanReport.elements.filter(e => ['input', 'select', 'textarea', 'form'].includes(e.tagName)).length);
      } else if (catKey === 'touch-target') {
        tested = Math.max(1, scanReport.elements.filter(e => e.isInteractive).length);
      } else {
        tested = Math.max(1, Math.min(20, scanReport.elements.length));
      }
    }

    let score = 100;
    if (failed > 0) {
      if (catKey === 'overflow') {
        // Overflow is critical
        score = Math.max(0, 100 - (failed * 35) - (scanReport.hasHorizontalOverflow ? 30 : 0));
      } else {
        score = Math.max(0, Math.round(((Math.max(0, tested - failed)) / tested) * 100));
        if (failed > 0 && score === 100) score = 75;
      }
    }

    const status = score >= 90 ? 'passed' : score >= 60 ? 'warning' : 'failed';

    categories[catKey] = {
      score,
      tested,
      passed: Math.max(0, tested - failed),
      failed,
      weight: meta.weight,
      status
    };

    totalWeightedScore += score * meta.weight;
    totalWeight += meta.weight;
    totalTested += tested;
    totalFailed += failed;
  }

  const overall = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 100;

  /** @type {'A' | 'B' | 'C' | 'D' | 'F'} */
  let grade = 'F';
  if (overall >= 90) grade = 'A';
  else if (overall >= 80) grade = 'B';
  else if (overall >= 70) grade = 'C';
  else if (overall >= 60) grade = 'D';

  let summary = '';
  if (grade === 'A') {
    summary = 'Excellent mobile layout with minimal or zero responsive defects detected.';
  } else if (grade === 'B') {
    summary = 'Good responsive foundation; minor container sizing or media constraints can be improved.';
  } else if (grade === 'C') {
    summary = 'Moderate layout degradation on narrow viewports; requires responsive override rules.';
  } else if (grade === 'D') {
    summary = 'Poor mobile experience with severe container overflow and unadapted content.';
  } else {
    summary = 'Critical responsive failure: significant horizontal scrolling and unreadable layout.';
  }

  return {
    overall,
    grade,
    summary,
    categories,
    testedCount: totalTested,
    passedCount: Math.max(0, totalTested - totalFailed),
    failedCount: totalFailed
  };
}
