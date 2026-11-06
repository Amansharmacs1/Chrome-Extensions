/**
 * BugShot - Bug Report Editor Controller
 * Binds report form fields, technical diagnostics review, screenshot attachments,
 * local storage persistence, and export actions (JSON, Markdown, Print/PDF, Clipboard).
 */

import {
  getActiveSession,
  getReportById,
  saveReport,
  clearActiveSession
} from '../scripts/storage.js';
import {
  generateJsonExport,
  generateMarkdownExport,
  generateQuickSummary
} from './export-manager.js';

let currentReport = null;
let currentSession = null;
let activeSeverity = 'medium';

// DOM Elements
const reportIdPill = document.getElementById('report-id-pill');
const inputTitle = document.getElementById('input-title');
const selectPriority = document.getElementById('select-priority');
const selectCategory = document.getElementById('select-category');
const inputDesc = document.getElementById('input-desc');
const inputSteps = document.getElementById('input-steps');
const inputExpected = document.getElementById('input-expected');
const inputActual = document.getElementById('input-actual');

const sevButtons = document.querySelectorAll('.sev-btn');
const screenshotPreviewImg = document.getElementById('screenshot-preview-img');
const metadataDisplayTable = document.getElementById('metadata-display-table').querySelector('tbody');
const consoleLogsContainer = document.getElementById('console-logs-container');
const consoleLogsCount = document.getElementById('console-logs-count');
const networkInsightsContainer = document.getElementById('network-insights-container');
const networkInsightsCount = document.getElementById('network-insights-count');

// Buttons
const btnSaveReport = document.getElementById('btn-save-report');
const btnExportJson = document.getElementById('btn-export-json');
const btnExportMarkdown = document.getElementById('btn-export-markdown');
const btnCopySummary = document.getElementById('btn-copy-summary');
const btnPrintPdf = document.getElementById('btn-print-pdf');
const btnReEdit = document.getElementById('btn-re-edit');
const btnDownloadThumb = document.getElementById('btn-download-thumb');

/**
 * Initializes the report page
 */
async function initReportPage() {
  setupSeverityControls();
  setupExportActions();

  const urlParams = new URLSearchParams(window.location.search);
  const reportIdParam = urlParams.get('reportId');

  if (reportIdParam) {
    // Mode A: Editing existing report
    const existing = await getReportById(reportIdParam);
    if (existing) {
      currentReport = existing;
      reportIdPill.textContent = existing.id;
      populateFromReport(existing);
      return;
    }
  }

  // Mode B: Creating new report from active capture session
  currentSession = await getActiveSession();
  if (currentSession) {
    const freshId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    reportIdPill.textContent = freshId;

    currentReport = {
      id: freshId,
      createdAt: currentSession.timestamp || Date.now(),
      updatedAt: Date.now(),
      title: currentSession.metadata?.title ? `Issue on ${currentSession.metadata.title}` : '',
      description: '',
      stepsToReproduce: [],
      expectedResult: '',
      actualResult: '',
      severity: 'medium',
      priority: 'P2',
      category: 'ui-ux',
      tags: [],
      metadata: currentSession.metadata || {},
      screenshotOriginal: currentSession.rawScreenshot || currentSession.annotatedScreenshot,
      screenshotAnnotated: currentSession.annotatedScreenshot || currentSession.rawScreenshot,
      annotations: currentSession.annotations || [],
      consoleLogs: currentSession.consoleLogs || [],
      networkInsights: currentSession.networkInsights || [],
      status: 'open'
    };

    populateFromReport(currentReport);
  } else {
    // Standalone empty report
    const freshId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    reportIdPill.textContent = freshId;
    currentReport = {
      id: freshId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      title: '',
      description: '',
      stepsToReproduce: [],
      expectedResult: '',
      actualResult: '',
      severity: 'medium',
      priority: 'P2',
      category: 'ui-ux',
      tags: [],
      metadata: {
        url: 'https://example.com',
        title: 'Manual Report',
        timestamp: Date.now(),
        browserName: 'Google Chrome',
        browserVersion: '',
        userAgent: navigator.userAgent,
        os: 'Desktop',
        platform: '',
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        screenWidth: 0,
        screenHeight: 0,
        colorDepth: 24,
        language: 'en',
        online: true
      },
      status: 'open'
    };
    populateFromReport(currentReport);
  }
}

/**
 * Fills UI inputs from a report data structure
 */
function populateFromReport(report) {
  inputTitle.value = report.title || '';
  inputDesc.value = report.description || '';
  inputSteps.value = Array.isArray(report.stepsToReproduce) ? report.stepsToReproduce.join('\n') : '';
  inputExpected.value = report.expectedResult || '';
  inputActual.value = report.actualResult || '';
  selectPriority.value = report.priority || 'P2';
  selectCategory.value = report.category || 'ui-ux';

  // Severity selector
  setSeverity(report.severity || 'medium');

  // Screenshot image
  const imgData = report.screenshotAnnotated || report.screenshotOriginal;
  if (imgData) {
    screenshotPreviewImg.src = imgData;
  } else {
    screenshotPreviewImg.style.display = 'none';
  }

  // Technical Metadata Table
  renderMetadataTable(report.metadata);

  // Console Logs
  renderConsoleLogs(report.consoleLogs || []);

  // Network Failures
  renderNetworkInsights(report.networkInsights || []);
}

function setSeverity(sev) {
  activeSeverity = sev;
  sevButtons.forEach(btn => {
    if (btn.getAttribute('data-sev') === sev) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function setupSeverityControls() {
  sevButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setSeverity(btn.getAttribute('data-sev'));
    });
  });
}

function renderMetadataTable(meta = {}) {
  metadataDisplayTable.innerHTML = '';
  const rows = [
    ['URL', meta.url || 'N/A'],
    ['Page Title', meta.title || 'N/A'],
    ['Browser', `${meta.browserName || 'Chrome'} ${meta.browserVersion || ''}`],
    ['Operating System', meta.os || 'N/A'],
    ['Viewport Size', `${meta.viewportWidth || 0} × ${meta.viewportHeight || 0}px`],
    ['Device Pixel Ratio', `${meta.devicePixelRatio || 1}`],
    ['Timestamp', meta.timestamp ? new Date(meta.timestamp).toLocaleString() : 'N/A']
  ];

  for (const [k, v] of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="meta-label">${escapeHtml(k)}</td>
      <td class="meta-val">${escapeHtml(v)}</td>
    `;
    metadataDisplayTable.appendChild(tr);
  }
}

function renderConsoleLogs(logs = []) {
  consoleLogsCount.textContent = logs.length.toString();
  consoleLogsContainer.innerHTML = '';

  if (logs.length === 0) {
    consoleLogsContainer.innerHTML = '<div class="empty-hint">Zero console errors detected.</div>';
    return;
  }

  for (const log of logs) {
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
      <input type="checkbox" class="log-check" ${log.included !== false ? 'checked' : ''} />
      <div class="log-content">
        <span class="log-msg" title="${escapeHtml(log.message)}">${escapeHtml(log.message)}</span>
        <span class="log-sub">${new Date(log.timestamp).toLocaleTimeString()}${log.source ? ` • ${escapeHtml(log.source)}` : ''}</span>
      </div>
    `;

    const chk = item.querySelector('.log-check');
    chk.addEventListener('change', () => {
      log.included = chk.checked;
    });

    consoleLogsContainer.appendChild(item);
  }
}

function renderNetworkInsights(insights = []) {
  networkInsightsCount.textContent = insights.length.toString();
  networkInsightsContainer.innerHTML = '';

  if (insights.length === 0) {
    networkInsightsContainer.innerHTML = '<div class="empty-hint">Zero failed network requests.</div>';
    return;
  }

  for (const net of insights) {
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
      <input type="checkbox" class="log-check" ${net.included !== false ? 'checked' : ''} />
      <div class="log-content">
        <span class="log-msg" style="color: #f59e0b;">${escapeHtml(net.url)}</span>
        <span class="log-sub">Status: ${net.status || 'ERR'} (${escapeHtml(net.statusText || 'Failed')}) • ${net.duration || 0}ms</span>
      </div>
    `;

    const chk = item.querySelector('.log-check');
    chk.addEventListener('change', () => {
      net.included = chk.checked;
    });

    networkInsightsContainer.appendChild(item);
  }
}

/**
 * Gathers current form state into a unified BugReport object
 */
function gatherCurrentReport() {
  const stepsRaw = inputSteps.value.split('\n').map(s => s.trim()).filter(Boolean);

  return {
    ...currentReport,
    title: inputTitle.value.trim() || 'Untitled Bug Report',
    description: inputDesc.value.trim(),
    stepsToReproduce: stepsRaw,
    expectedResult: inputExpected.value.trim(),
    actualResult: inputActual.value.trim(),
    severity: activeSeverity,
    priority: selectPriority.value,
    category: selectCategory.value,
    updatedAt: Date.now()
  };
}

/**
 * Setup export & save event listeners
 */
function setupExportActions() {
  btnSaveReport.addEventListener('click', async () => {
    if (!inputTitle.value.trim()) {
      alert('Please enter a Bug Title before saving.');
      inputTitle.focus();
      return;
    }

    btnSaveReport.disabled = true;
    btnSaveReport.querySelector('span').textContent = 'Saving...';

    const reportToSave = gatherCurrentReport();
    await saveReport(reportToSave);
    await clearActiveSession();

    // Route to dashboard
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    window.close();
  });

  btnExportJson.addEventListener('click', () => {
    const report = gatherCurrentReport();
    const jsonStr = generateJsonExport(report, false);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bugshot-report-${report.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  btnExportMarkdown.addEventListener('click', () => {
    const report = gatherCurrentReport();
    const mdStr = generateMarkdownExport(report);
    const blob = new Blob([mdStr], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bugshot-report-${report.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });

  btnCopySummary.addEventListener('click', () => {
    const report = gatherCurrentReport();
    const summary = generateQuickSummary(report);
    navigator.clipboard.writeText(summary).then(() => {
      btnCopySummary.querySelector('span').textContent = 'Copied!';
      setTimeout(() => {
        btnCopySummary.querySelector('span').textContent = 'Copy Summary';
      }, 1500);
    });
  });

  btnPrintPdf.addEventListener('click', () => {
    window.print();
  });

  btnReEdit.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_EDITOR' });
  });

  btnDownloadThumb.addEventListener('click', () => {
    const src = screenshotPreviewImg.src;
    if (src) {
      const a = document.createElement('a');
      a.href = src;
      a.download = `bugshot-screenshot-${Date.now()}.png`;
      a.click();
    }
  });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', initReportPage);
