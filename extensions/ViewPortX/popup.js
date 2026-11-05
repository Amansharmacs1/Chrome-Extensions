/**
 * ViewPortX - Popup Controller
 * Connects with active tab, requests DOM scans, renders health scores & issue breakdown,
 * triggers responsive transformations, and communicates with background service worker.
 */

const RESTRICTED_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'view-source:',
  'https://chrome.google.com/webstore',
  'https://chromewebstore.google.com'
];

let currentTab = null;
let currentScanData = null;

function isInjectable(url = '') {
  return !RESTRICTED_PREFIXES.some(p => url.startsWith(p));
}

// DOM Elements
const pageDomainEl = document.getElementById('page-domain');
const viewportDimsEl = document.getElementById('viewport-dims');
const scoreValueEl = document.getElementById('score-value');
const scoreGradeEl = document.getElementById('score-grade');
const scoreStatusEl = document.getElementById('score-status');
const scoreSummaryEl = document.getElementById('score-summary');
const valOverflowEl = document.getElementById('val-overflow');
const valIssuesEl = document.getElementById('val-issues');
const valModeEl = document.getElementById('val-mode');
const issueBadgeCountEl = document.getElementById('issue-badge-count');
const issuesListEl = document.getElementById('issues-list');
const btnMakeResponsive = document.getElementById('btn-make-responsive');
const btnResponsiveLabel = document.getElementById('btn-responsive-label');
const btnRestore = document.getElementById('btn-restore');
const btnOpenDashboard = document.getElementById('btn-open-dashboard');
const restrictedNoticeEl = document.getElementById('restricted-notice');
const activeContainerEl = document.getElementById('active-container');

/**
 * Initializes the popup by querying active tab and triggering scan
 */
async function initPopup() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs?.[0];

    if (!currentTab || !currentTab.id || !currentTab.url) {
      showRestricted('No active webpage detected.');
      return;
    }

    if (!isInjectable(currentTab.url)) {
      showRestricted('Browser internal pages and the Web Store cannot be inspected.');
      return;
    }

    try {
      const parsedUrl = new URL(currentTab.url);
      pageDomainEl.textContent = parsedUrl.hostname || currentTab.url;
    } catch {
      pageDomainEl.textContent = currentTab.url;
    }

    await executePageScan();
  } catch (err) {
    console.error('[ViewPortX] Init error:', err);
    showRestricted('Failed to connect to page.');
  }
}

/**
 * Displays restricted page notice
 */
function showRestricted(message) {
  if (restrictedNoticeEl && activeContainerEl) {
    restrictedNoticeEl.classList.remove('hidden');
    const p = restrictedNoticeEl.querySelector('p');
    if (p) p.textContent = message;
    activeContainerEl.style.opacity = '0.4';
    activeContainerEl.style.pointerEvents = 'none';
  }
}

/**
 * Sends message to active tab content script with injection retry
 */
async function sendTabMessage(message) {
  if (!currentTab?.id) throw new Error('No active tab');

  try {
    return await chrome.tabs.sendMessage(currentTab.id, message);
  } catch (err) {
    // Attempt injection via background worker then retry
    await chrome.runtime.sendMessage({
      type: 'ENSURE_CONTENT_SCRIPT',
      tabId: currentTab.id
    });
    // Brief settle time
    await new Promise(r => setTimeout(r, 200));
    return await chrome.tabs.sendMessage(currentTab.id, message);
  }
}

/**
 * Scans active page and populates popup UI
 */
async function executePageScan() {
  try {
    const res = await sendTabMessage({ action: 'SCAN_PAGE' });
    if (!res || !res.success) {
      throw new Error(res?.error || 'Scan failed');
    }

    currentScanData = res;
    renderScanResults(res);
  } catch (err) {
    console.warn('[ViewPortX] Page scan failed:', err);
    scoreStatusEl.textContent = 'Scan Unavailable';
    scoreSummaryEl.textContent = 'Could not inspect page styles. Check tab permissions.';
    issuesListEl.innerHTML = '<div class="empty-state">Unable to scan page DOM</div>';
  }
}

/**
 * Updates UI with scan and health-score metrics
 */
function renderScanResults(data) {
  const { scanReport, issues, healthScore, isApplied } = data;

  if (scanReport) {
    viewportDimsEl.textContent = `${scanReport.viewportWidth} × ${scanReport.viewportHeight}px`;
    valOverflowEl.textContent = `${Math.round(scanReport.totalHorizontalOverflow || 0)}px`;
    if (scanReport.totalHorizontalOverflow > 2) {
      valOverflowEl.style.color = '#ef4444';
    } else {
      valOverflowEl.style.color = '#10b981';
    }
  }

  const issueCount = issues ? issues.length : 0;
  valIssuesEl.textContent = issueCount.toString();
  issueBadgeCountEl.textContent = issueCount.toString();

  // Health Score rendering
  if (healthScore) {
    scoreValueEl.textContent = healthScore.overall.toString();
    scoreGradeEl.textContent = healthScore.grade;
    scoreSummaryEl.textContent = healthScore.summary;

    const gradeColors = {
      A: '#10b981',
      B: '#0ea5e9',
      C: '#f59e0b',
      D: '#f97316',
      F: '#ef4444'
    };
    const circleColor = gradeColors[healthScore.grade] || '#6366f1';
    const scoreCircle = document.querySelector('.score-circle');
    if (scoreCircle) {
      scoreCircle.style.borderColor = circleColor;
      scoreCircle.style.boxShadow = `0 0 12px ${circleColor}40`;
    }
    scoreGradeEl.style.color = circleColor;

    if (isApplied) {
      scoreStatusEl.textContent = 'Responsive Mode Active';
    } else if (healthScore.overall >= 90) {
      scoreStatusEl.textContent = 'Responsive Layout';
    } else {
      scoreStatusEl.textContent = `${issueCount} Issues Found`;
    }
  }

  // Applied state buttons & mode indicator
  if (isApplied) {
    valModeEl.textContent = 'Adapted';
    valModeEl.style.color = '#10b981';
    btnMakeResponsive.classList.add('active');
    btnResponsiveLabel.textContent = 'Transformations Active';
    btnRestore.disabled = false;
  } else {
    valModeEl.textContent = 'Original';
    valModeEl.style.color = '#94a3b8';
    btnMakeResponsive.classList.remove('active');
    btnResponsiveLabel.textContent = 'Make Responsive';
    btnRestore.disabled = true;
  }

  // Render Issues List
  renderIssuesList(issues);
}

/**
 * Populates issues accordion with interactive preview pills
 */
function renderIssuesList(issues = []) {
  if (!issues || issues.length === 0) {
    issuesListEl.innerHTML = `
      <div class="empty-state">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>No responsive defects detected!</span>
      </div>
    `;
    return;
  }

  issuesListEl.innerHTML = '';
  for (const issue of issues.slice(0, 15)) {
    const item = document.createElement('div');
    item.className = 'issue-item';
    item.title = `${issue.description}\nRecommended fix: ${issue.recommendedFix}`;

    item.innerHTML = `
      <div class="issue-item-main">
        <span class="issue-item-title">${escapeHtml(issue.description)}</span>
        <span class="issue-item-selector">${escapeHtml(issue.selector)}</span>
      </div>
      <span class="severity-pill severity-${issue.severity}">${issue.severity}</span>
    `;

    // Highlight element on hover
    item.addEventListener('mouseenter', () => {
      sendTabMessage({ action: 'HIGHLIGHT_ELEMENT', selector: issue.selector }).catch(() => {});
    });
    item.addEventListener('mouseleave', () => {
      sendTabMessage({ action: 'HIGHLIGHT_ELEMENT', selector: '' }).catch(() => {});
    });

    issuesListEl.appendChild(item);
  }
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Event Listeners
btnMakeResponsive.addEventListener('click', async () => {
  btnMakeResponsive.disabled = true;
  btnResponsiveLabel.textContent = 'Transforming...';

  try {
    const res = await sendTabMessage({ action: 'APPLY_TRANSFORMATIONS' });
    if (res && res.success) {
      await executePageScan();
    }
  } catch (err) {
    console.error('[ViewPortX] Apply failed:', err);
  } finally {
    btnMakeResponsive.disabled = false;
  }
});

btnRestore.addEventListener('click', async () => {
  btnRestore.disabled = true;

  try {
    const res = await sendTabMessage({ action: 'RESTORE_ORIGINAL' });
    if (res && res.success) {
      await executePageScan();
    }
  } catch (err) {
    console.error('[ViewPortX] Restore failed:', err);
  } finally {
    btnRestore.disabled = false;
  }
});

btnOpenDashboard.addEventListener('click', () => {
  const targetUrl = currentTab?.url || '';
  chrome.runtime.sendMessage({
    type: 'OPEN_DASHBOARD',
    url: targetUrl
  });
});

document.addEventListener('DOMContentLoaded', initPopup);
