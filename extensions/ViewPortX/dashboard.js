/**
 * ViewPortX - Workstation Dashboard Controller
 * Multi-section workspace supporting in-depth DOM inspection, responsive preview
 * simulation, diagnostic health breakdown, and live CSS override compilation.
 */

import {
  getViewPortXSettings,
  saveViewPortXSettings,
  DEVICE_PROFILES
} from './scripts/storage.js';
import { CATEGORY_DEFINITIONS } from './scripts/health-score.js';

let connectedTab = null;
let currentScanData = null;
let activeTransformations = [];
let currentStylesheet = '';

// DOM Elements - Navigation
const navTabs = document.querySelectorAll('.nav-tab');
const tabPanes = document.querySelectorAll('.tab-pane');
const sectionTitleEl = document.getElementById('section-title');
const headerBreadcrumbEl = document.getElementById('header-breadcrumb');
const sidebarTargetUrlEl = document.getElementById('sidebar-target-url');
const sidebarConnectionStatusEl = document.getElementById('sidebar-connection-status');
const navIssuesCountEl = document.getElementById('nav-issues-count');

// Buttons
const btnRefreshScan = document.getElementById('btn-refresh-scan');
const btnExportCss = document.getElementById('btn-export-css');
const sidebarBtnMakeResponsive = document.getElementById('sidebar-btn-make-responsive');
const sidebarBtnRestore = document.getElementById('sidebar-btn-restore');

// Overview Elements
const overviewScoreValEl = document.getElementById('overview-score-val');
const overviewGradeValEl = document.getElementById('overview-grade-val');
const overviewHealthBadgeEl = document.getElementById('overview-health-badge');
const overviewTestedCountEl = document.getElementById('overview-tested-count');
const overviewHeadlineEl = document.getElementById('overview-headline');
const overviewDescEl = document.getElementById('overview-desc');
const statOverflowEl = document.getElementById('stat-overflow');
const statOverflowSubEl = document.getElementById('stat-overflow-sub');
const statIssuesCountEl = document.getElementById('stat-issues-count');
const statCriticalCountEl = document.getElementById('stat-critical-count');
const statViewportDimsEl = document.getElementById('stat-viewport-dims');
const statElementsScannedEl = document.getElementById('stat-elements-scanned');
const statVerificationEl = document.getElementById('stat-verification');
const statModeSubEl = document.getElementById('stat-mode-sub');
const categoryCardsContainer = document.getElementById('category-cards-container');

// Inspector Elements
const inspectorSearch = document.getElementById('inspector-search');
const inspectorFilterTag = document.getElementById('inspector-filter-tag');
const inspectorTableBody = document.getElementById('inspector-table-body');

// Preview Elements
const devicePresetsBar = document.getElementById('device-presets-bar');
const previewInputWidth = document.getElementById('preview-input-width');
const previewInputHeight = document.getElementById('preview-input-height');
const btnRotatePreview = document.getElementById('btn-rotate-preview');
const deviceMockupFrame = document.getElementById('device-mockup-frame');
const previewIframe = document.getElementById('preview-iframe');
const btnPreviewToggleMode = document.getElementById('btn-preview-toggle-mode');
const previewModeLabel = document.getElementById('preview-mode-label');

// Issues Elements
const issuesSearch = document.getElementById('issues-search');
const filterSeverity = document.getElementById('filter-severity');
const filterCategory = document.getElementById('filter-category');
const issuesTableBody = document.getElementById('issues-table-body');

// Editor Elements
const cssEditorTextarea = document.getElementById('css-editor-textarea');
const btnCopyCss = document.getElementById('btn-copy-css');
const btnApplyEditorCss = document.getElementById('btn-apply-editor-css');
const rulesCountLabel = document.getElementById('rules-count-label');
const rulesToggleList = document.getElementById('rules-toggle-list');

// Settings Elements
const settingAutoScan = document.getElementById('setting-auto-scan');
const settingAutoApply = document.getElementById('setting-auto-apply');
const settingRememberSite = document.getElementById('setting-remember-site');
const settingHighlightIssues = document.getElementById('setting-highlight-issues');
const settingMaxElements = document.getElementById('setting-max-elements');
const settingTheme = document.getElementById('setting-theme');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnResetSettings = document.getElementById('btn-reset-settings');

/**
 * Initializes the dashboard workspace
 */
async function initDashboard() {
  setupNavigation();
  setupPreviewControls();
  setupSettingsHandlers();
  await loadUserSettings();
  await connectToTargetTab();
}

/**
 * Sets up sidebar navigation tabs
 */
function setupNavigation() {
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTabId = tab.getAttribute('data-tab');
      navTabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const pane = document.getElementById(targetTabId);
      if (pane) pane.classList.add('active');

      const titles = {
        'tab-overview': { title: 'Overview', sub: 'Comprehensive Health Analysis' },
        'tab-inspector': { title: 'DOM Inspector', sub: 'Real-time Computed Styles & Layout Hierarchy' },
        'tab-preview': { title: 'Responsive Preview', sub: 'Interactive Multi-Device Simulation Frame' },
        'tab-issues': { title: 'Detected Issues', sub: 'Rule-Based Responsive Heuristic Defects' },
        'tab-editor': { title: 'CSS Transformations', sub: 'Targeted Non-Destructive Overrides Editor' },
        'tab-settings': { title: 'Settings', sub: 'Automation & Workstation Preferences' }
      };

      if (titles[targetTabId]) {
        sectionTitleEl.textContent = titles[targetTabId].title;
        headerBreadcrumbEl.textContent = titles[targetTabId].sub;
      }
    });
  });
}

/**
 * Finds and establishes communication with the target tab
 */
async function connectToTargetTab() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetUrlParam = urlParams.get('targetUrl');

  try {
    const tabs = await chrome.tabs.query({});
    // Find inspectable tab
    let candidate = null;
    if (targetUrlParam) {
      candidate = tabs.find(t => t.url && t.url.includes(targetUrlParam));
    }
    if (!candidate) {
      candidate = tabs.find(t => t.url && !t.url.startsWith('chrome') && !t.url.startsWith('about:'));
    }

    if (candidate) {
      connectedTab = candidate;
      sidebarTargetUrlEl.textContent = candidate.url;
      sidebarConnectionStatusEl.textContent = 'Connected';
      sidebarConnectionStatusEl.previousElementSibling.classList.add('online');

      // Set iframe preview URL
      previewIframe.src = candidate.url;

      await triggerScan();
    } else {
      sidebarTargetUrlEl.textContent = 'No active webpage';
      sidebarConnectionStatusEl.textContent = 'Disconnected';
      sidebarConnectionStatusEl.previousElementSibling.classList.remove('online');
    }
  } catch (err) {
    console.error('[ViewPortX] Connection error:', err);
  }
}

/**
 * Sends a message to the connected tab's content script
 */
async function sendTargetMessage(message) {
  if (!connectedTab?.id) throw new Error('No target tab connected');

  try {
    return await chrome.tabs.sendMessage(connectedTab.id, message);
  } catch {
    await chrome.runtime.sendMessage({
      type: 'ENSURE_CONTENT_SCRIPT',
      tabId: connectedTab.id
    });
    await new Promise(r => setTimeout(r, 200));
    return await chrome.tabs.sendMessage(connectedTab.id, message);
  }
}

/**
 * Executes a full scan on the target page
 */
async function triggerScan() {
  btnRefreshScan.disabled = true;
  sidebarConnectionStatusEl.textContent = 'Scanning...';

  try {
    const res = await sendTargetMessage({ action: 'SCAN_PAGE' });
    if (res && res.success) {
      currentScanData = res;
      renderAllSections(res);
      sidebarConnectionStatusEl.textContent = 'Connected';
    }
  } catch (err) {
    console.warn('[ViewPortX] Scan error:', err);
    sidebarConnectionStatusEl.textContent = 'Scan Error';
  } finally {
    btnRefreshScan.disabled = false;
  }
}

/**
 * Renders all 6 dashboard sections from scan data
 */
function renderAllSections(data) {
  const { scanReport, issues, healthScore, isApplied } = data;

  // 1. Overview Section
  renderOverview(scanReport, issues, healthScore, isApplied);

  // 2. DOM Inspector Section
  renderInspector(scanReport, issues);

  // 3. Detected Issues Section
  renderIssues(issues);

  // 4. CSS Transformations Section
  renderEditor(issues, isApplied);

  // Update nav badge
  const count = issues ? issues.length : 0;
  navIssuesCountEl.textContent = count.toString();
}

/**
 * Populates Overview cards & diagnostic grid
 */
function renderOverview(scanReport, issues = [], healthScore, isApplied) {
  if (healthScore) {
    overviewScoreValEl.textContent = healthScore.overall.toString();
    overviewGradeValEl.textContent = healthScore.grade;
    overviewHeadlineEl.textContent = healthScore.grade === 'A'
      ? 'Mobile-Friendly Responsive Layout'
      : `${issues.length} Responsive Defects Detected`;
    overviewDescEl.textContent = healthScore.summary;
    overviewTestedCountEl.textContent = `${healthScore.testedCount} Elements Tested`;

    const gradeColors = { A: '#10b981', B: '#0ea5e9', C: '#f59e0b', D: '#f97316', F: '#ef4444' };
    const color = gradeColors[healthScore.grade] || '#6366f1';
    overviewRadial.style.borderColor = color;
    overviewGradeValEl.style.color = color;
    overviewHealthBadgeEl.textContent = isApplied ? 'Adapted Mode' : `Grade ${healthScore.grade}`;
  }

  if (scanReport) {
    statOverflowEl.textContent = `${Math.round(scanReport.totalHorizontalOverflow || 0)} px`;
    statOverflowSubEl.textContent = scanReport.hasHorizontalOverflow
      ? 'Horizontal scroll bar active'
      : 'Zero horizontal scroll';
    statOverflowEl.style.color = scanReport.hasHorizontalOverflow ? '#ef4444' : '#10b981';

    statViewportDimsEl.textContent = `${scanReport.viewportWidth} × ${scanReport.viewportHeight}px`;
    statElementsScannedEl.textContent = `${scanReport.totalElementsScanned} elements inspected`;
  }

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  statIssuesCountEl.textContent = issues.length.toString();
  statCriticalCountEl.textContent = `${criticalCount} critical flaws`;

  if (isApplied) {
    statVerificationEl.textContent = '100 %';
    statModeSubEl.textContent = 'Mode: Adapted';
    sidebarBtnMakeResponsive.classList.add('active');
    sidebarBtnMakeResponsive.querySelector('span').textContent = 'Transformations Active';
    sidebarBtnRestore.disabled = false;
  } else {
    statVerificationEl.textContent = '-- %';
    statModeSubEl.textContent = 'Mode: Original';
    sidebarBtnMakeResponsive.classList.remove('active');
    sidebarBtnMakeResponsive.querySelector('span').textContent = 'Make Responsive';
    sidebarBtnRestore.disabled = true;
  }

  // Render 10 Category Cards
  categoryCardsContainer.innerHTML = '';
  if (healthScore?.categories) {
    for (const [key, catData] of Object.entries(healthScore.categories)) {
      const def = CATEGORY_DEFINITIONS[key] || { name: key };
      const card = document.createElement('div');
      card.className = 'category-card-item';

      const barColor = catData.score >= 90 ? '#10b981' : catData.score >= 60 ? '#f59e0b' : '#ef4444';

      card.innerHTML = `
        <div class="cat-header">
          <span class="cat-name">${def.name}</span>
          <span class="cat-status-badge cat-status-${catData.status}">${catData.status} (${catData.score}%)</span>
        </div>
        <div class="cat-progress-track">
          <div class="cat-progress-fill" style="width: ${catData.score}%; background-color: ${barColor};"></div>
        </div>
        <div class="cat-metrics">
          <span>Tested: ${catData.tested}</span>
          <span>Passed: ${catData.passed}</span>
          <span>Failed: ${catData.failed}</span>
        </div>
      `;
      categoryCardsContainer.appendChild(card);
    }
  }
}

/**
 * Populates DOM Inspector table
 */
function renderInspector(scanReport, issues = []) {
  if (!scanReport || !scanReport.elements) {
    inspectorTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No elements available.</td></tr>';
    return;
  }

  const issueSelectors = new Set(issues.map(i => i.selector));
  const query = (inspectorSearch.value || '').toLowerCase();
  const tagFilter = inspectorFilterTag.value;

  const filtered = scanReport.elements.filter(el => {
    if (tagFilter !== 'all' && el.tagName !== tagFilter) return false;
    if (query) {
      const matchesSelector = el.selector.toLowerCase().includes(query);
      const matchesTag = el.tagName.toLowerCase().includes(query);
      if (!matchesSelector && !matchesTag) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    inspectorTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No elements match the current filters.</td></tr>';
    return;
  }

  inspectorTableBody.innerHTML = '';
  for (const el of filtered.slice(0, 50)) {
    const tr = document.createElement('tr');
    const hasIssue = issueSelectors.has(el.selector);

    tr.innerHTML = `
      <td><span class="selector-code" title="${el.selector}">${escapeHtml(el.selector)}</span> ${hasIssue ? '⚠️' : ''}</td>
      <td>&lt;${el.tagName}&gt;</td>
      <td class="mono-cell">${Math.round(el.rect.width)} × ${Math.round(el.rect.height)}</td>
      <td class="mono-cell">${el.computed.width}</td>
      <td class="mono-cell">${el.computed.maxWidth}</td>
      <td class="mono-cell">${el.computed.display}</td>
      <td class="mono-cell">${el.computed.overflowX}</td>
      <td>
        <button class="btn btn-secondary icon-only btn-highlight" title="Highlight in Webpage">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </button>
      </td>
    `;

    const highlightBtn = tr.querySelector('.btn-highlight');
    highlightBtn.addEventListener('click', () => {
      sendTargetMessage({ action: 'HIGHLIGHT_ELEMENT', selector: el.selector });
    });

    inspectorTableBody.appendChild(tr);
  }
}

/**
 * Populates Detected Issues table
 */
function renderIssues(issues = []) {
  if (!issues || issues.length === 0) {
    issuesTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No responsive issues found! Perfect mobile layout.</td></tr>';
    return;
  }

  const query = (issuesSearch.value || '').toLowerCase();
  const sevFilter = filterSeverity.value;
  const catFilter = filterCategory.value;

  const filtered = issues.filter(i => {
    if (sevFilter !== 'all' && i.severity !== sevFilter) return false;
    if (catFilter !== 'all' && i.category !== catFilter) return false;
    if (query) {
      const matchDesc = i.description.toLowerCase().includes(query);
      const matchSel = i.selector.toLowerCase().includes(query);
      if (!matchDesc && !matchSel) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    issuesTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No issues match the selected filters.</td></tr>';
    return;
  }

  issuesTableBody.innerHTML = '';
  for (const issue of filtered) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="severity-pill severity-${issue.severity}">${issue.severity}</span></td>
      <td><span class="cat-name">${issue.category}</span></td>
      <td><span class="selector-code" title="${issue.selector}">${escapeHtml(issue.selector)}</span></td>
      <td>${escapeHtml(issue.description)}</td>
      <td class="mono-cell">${escapeHtml(issue.currentDimensions)}</td>
      <td class="mono-cell text-muted">${escapeHtml(issue.recommendedFix)}</td>
      <td>
        <button class="btn btn-secondary icon-only btn-issue-focus" title="Highlight Issue">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
          </svg>
        </button>
      </td>
    `;

    const focusBtn = tr.querySelector('.btn-issue-focus');
    focusBtn.addEventListener('click', () => {
      sendTargetMessage({ action: 'HIGHLIGHT_ELEMENT', selector: issue.selector });
    });

    issuesTableBody.appendChild(tr);
  }
}

/**
 * Compiles and populates CSS Transformations editor and rule toggles
 */
async function renderEditor(issues = [], isApplied) {
  // Dynamically import transformer utilities for dashboard
  const { generateTransformations, compileStylesheet } = await import('./scripts/transformer.js');

  const transformations = generateTransformations(issues);
  activeTransformations = transformations;

  const css = compileStylesheet(transformations, true);
  currentStylesheet = css;
  cssEditorTextarea.value = css;

  rulesCountLabel.textContent = `${transformations.length} rules active`;
  rulesToggleList.innerHTML = '';

  for (const tx of transformations) {
    const item = document.createElement('div');
    item.className = 'rule-toggle-item';
    item.innerHTML = `
      <input type="checkbox" class="toggle-checkbox rule-check" checked data-tx-id="${tx.id}" />
      <div class="rule-info">
        <span class="rule-selector">${escapeHtml(tx.targetSelector)}</span>
        <span class="rule-reason">${escapeHtml(tx.reason)}</span>
      </div>
    `;

    const check = item.querySelector('.rule-check');
    check.addEventListener('change', () => {
      tx.applied = check.checked;
      const activeOnly = activeTransformations.filter(t => t.applied !== false);
      const updatedCss = compileStylesheet(activeOnly, true);
      cssEditorTextarea.value = updatedCss;
      rulesCountLabel.textContent = `${activeOnly.length} rules active`;
    });

    rulesToggleList.appendChild(item);
  }
}

/**
 * Preview controls and presets
 */
function setupPreviewControls() {
  const presetBtns = devicePresetsBar.querySelectorAll('.preset-btn');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const width = parseInt(btn.getAttribute('data-width'), 10);
      const height = parseInt(btn.getAttribute('data-height'), 10);

      previewInputWidth.value = width;
      previewInputHeight.value = height;
      updateDeviceMockupSize(width, height);
    });
  });

  previewInputWidth.addEventListener('input', () => {
    updateDeviceMockupSize(parseInt(previewInputWidth.value, 10), parseInt(previewInputHeight.value, 10));
  });

  previewInputHeight.addEventListener('input', () => {
    updateDeviceMockupSize(parseInt(previewInputWidth.value, 10), parseInt(previewInputHeight.value, 10));
  });

  btnRotatePreview.addEventListener('click', () => {
    const w = parseInt(previewInputWidth.value, 10);
    const h = parseInt(previewInputHeight.value, 10);
    previewInputWidth.value = h;
    previewInputHeight.value = w;
    updateDeviceMockupSize(h, w);
  });
}

function updateDeviceMockupSize(w, h) {
  if (w && h && deviceMockupFrame) {
    deviceMockupFrame.style.width = `${w}px`;
    deviceMockupFrame.style.height = `${h}px`;
  }
}

/**
 * Loads and binds user settings
 */
async function loadUserSettings() {
  const settings = await getViewPortXSettings();
  settingAutoScan.checked = !!settings.autoScan;
  settingAutoApply.checked = !!settings.autoApplySafeFixes;
  settingRememberSite.checked = !!settings.rememberPerSite;
  settingHighlightIssues.checked = !!settings.highlightIssues;
  settingMaxElements.value = settings.maxElementsScanned.toString();
  settingTheme.value = settings.theme || 'dark';
}

function setupSettingsHandlers() {
  btnSaveSettings.addEventListener('click', async () => {
    await saveViewPortXSettings({
      autoScan: settingAutoScan.checked,
      autoApplySafeFixes: settingAutoApply.checked,
      rememberPerSite: settingRememberSite.checked,
      highlightIssues: settingHighlightIssues.checked,
      maxElementsScanned: parseInt(settingMaxElements.value, 10),
      theme: settingTheme.value
    });
    alert('Settings saved successfully.');
  });

  btnResetSettings.addEventListener('click', async () => {
    await saveViewPortXSettings({});
    await loadUserSettings();
  });
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Global Actions
btnRefreshScan.addEventListener('click', triggerScan);

btnExportCss.addEventListener('click', () => {
  const css = cssEditorTextarea.value || currentStylesheet;
  const blob = new Blob([css], { type: 'text/css' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'viewportx-responsive-overrides.css';
  a.click();
  URL.revokeObjectURL(url);
});

btnCopyCss.addEventListener('click', () => {
  navigator.clipboard.writeText(cssEditorTextarea.value).then(() => {
    btnCopyCss.querySelector('span').textContent = 'Copied!';
    setTimeout(() => {
      btnCopyCss.querySelector('span').textContent = 'Copy CSS';
    }, 1500);
  });
});

btnApplyEditorCss.addEventListener('click', async () => {
  btnApplyEditorCss.disabled = true;
  try {
    const customCss = cssEditorTextarea.value;
    await sendTargetMessage({
      action: 'APPLY_TRANSFORMATIONS',
      transformations: activeTransformations
    });
    await triggerScan();
  } catch (err) {
    console.error('[ViewPortX] Apply error:', err);
  } finally {
    btnApplyEditorCss.disabled = false;
  }
});

sidebarBtnMakeResponsive.addEventListener('click', async () => {
  sidebarBtnMakeResponsive.disabled = true;
  try {
    await sendTargetMessage({ action: 'APPLY_TRANSFORMATIONS' });
    await triggerScan();
  } finally {
    sidebarBtnMakeResponsive.disabled = false;
  }
});

sidebarBtnRestore.addEventListener('click', async () => {
  sidebarBtnRestore.disabled = true;
  try {
    await sendTargetMessage({ action: 'RESTORE_ORIGINAL' });
    await triggerScan();
  } finally {
    sidebarBtnRestore.disabled = false;
  }
});

// Filter event listeners
inspectorSearch.addEventListener('input', () => renderInspector(currentScanData?.scanReport, currentScanData?.issues));
inspectorFilterTag.addEventListener('change', () => renderInspector(currentScanData?.scanReport, currentScanData?.issues));
issuesSearch.addEventListener('input', () => renderIssues(currentScanData?.issues));
filterSeverity.addEventListener('change', () => renderIssues(currentScanData?.issues));
filterCategory.addEventListener('change', () => renderIssues(currentScanData?.issues));

document.addEventListener('DOMContentLoaded', initDashboard);
