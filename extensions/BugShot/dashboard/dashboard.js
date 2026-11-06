/**
 * BugShot - Workstation Dashboard Controller
 * Manages saved bug reports, metrics aggregation, search and filtering,
 * individual report exports, deletion, duplication, and user preferences.
 */

import {
  getReports,
  deleteReport,
  duplicateReport,
  getUserPreferences,
  saveUserPreferences,
  getStorageUsage,
  deleteAllData
} from '../scripts/storage.js';
import {
  generateJsonExport,
  generateMarkdownExport
} from '../report/export-manager.js';

let allReports = [];

// DOM Elements - Metrics
const statTotal = document.getElementById('stat-total');
const statCritical = document.getElementById('stat-critical');
const statUrgent = document.getElementById('stat-urgent');
const statWeek = document.getElementById('stat-week');
const statStorage = document.getElementById('stat-storage');

// DOM Elements - Table & Filters
const inputSearch = document.getElementById('input-search');
const filterSeverity = document.getElementById('filter-severity');
const filterCategory = document.getElementById('filter-category');
const filterSort = document.getElementById('filter-sort');
const reportsTbody = document.getElementById('reports-tbody');
const emptyDashboard = document.getElementById('empty-dashboard');

// Header Buttons
const btnCreateManualReport = document.getElementById('btn-create-manual-report');
const btnEmptyCreate = document.getElementById('btn-empty-create');
const btnToggleSettings = document.getElementById('btn-toggle-settings');

// Modal Elements
const modalSettings = document.getElementById('modal-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnSavePrefs = document.getElementById('btn-save-prefs');
const btnDeleteAllData = document.getElementById('btn-delete-all-data');

const prefTheme = document.getElementById('pref-theme');
const prefAutoConsole = document.getElementById('pref-auto-console');
const prefAutoNetwork = document.getElementById('pref-auto-network');
const prefSanitizeUrl = document.getElementById('pref-sanitize-url');
const prefMaxReports = document.getElementById('pref-max-reports');

/**
 * Initializes dashboard workspace
 */
async function initDashboard() {
  setupFilterListeners();
  setupSettingsModal();
  setupActionButtons();

  await loadAndRenderReports();
}

/**
 * Loads reports from storage and updates stats & view
 */
async function loadAndRenderReports() {
  try {
    allReports = await getReports();
    updateStatistics(allReports);
    renderReportsTable();

    // Storage footprint
    const usage = await getStorageUsage();
    statStorage.textContent = usage.formatted;
  } catch (err) {
    console.error('[BugShot Dashboard] Load error:', err);
  }
}

/**
 * Calculates executive statistics from actual stored reports
 */
function updateStatistics(reports = []) {
  statTotal.textContent = reports.length.toString();

  const criticalCount = reports.filter(r => r.severity === 'critical').length;
  statCritical.textContent = criticalCount.toString();

  const urgentCount = reports.filter(r => r.priority === 'P0' || r.priority === 'P1').length;
  statUrgent.textContent = urgentCount.toString();

  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const weekCount = reports.filter(r => (r.createdAt || 0) >= oneWeekAgo).length;
  statWeek.textContent = weekCount.toString();
}

/**
 * Filters, sorts, and renders the reports table
 */
function renderReportsTable() {
  const query = (inputSearch.value || '').trim().toLowerCase();
  const sevFilter = filterSeverity.value;
  const catFilter = filterCategory.value;
  const sortMode = filterSort.value;

  let filtered = allReports.filter(report => {
    if (sevFilter !== 'all' && report.severity !== sevFilter) return false;
    if (catFilter !== 'all' && report.category !== catFilter) return false;

    if (query) {
      const matchTitle = (report.title || '').toLowerCase().includes(query);
      const matchUrl = (report.metadata?.url || '').toLowerCase().includes(query);
      const matchDesc = (report.description || '').toLowerCase().includes(query);
      const matchCat = (report.category || '').toLowerCase().includes(query);
      if (!matchTitle && !matchUrl && !matchDesc && !matchCat) return false;
    }

    return true;
  });

  // Sort
  const sevRank = { critical: 4, high: 3, medium: 2, low: 1 };
  filtered.sort((a, b) => {
    if (sortMode === 'oldest') {
      return (a.createdAt || 0) - (b.createdAt || 0);
    }
    if (sortMode === 'severity') {
      return (sevRank[b.severity] || 0) - (sevRank[a.severity] || 0);
    }
    // Default newest
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  if (filtered.length === 0) {
    reportsTbody.innerHTML = '';
    emptyDashboard.style.display = 'flex';
    return;
  }

  emptyDashboard.style.display = 'none';
  reportsTbody.innerHTML = '';

  for (const report of filtered) {
    const tr = document.createElement('tr');

    const thumbSrc = report.screenshotAnnotated || report.screenshotOriginal || '';
    const dateFormatted = report.createdAt ? new Date(report.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'N/A';

    tr.innerHTML = `
      <td>
        ${thumbSrc ? `<img src="${thumbSrc}" class="thumb-preview" alt="Thumb" />` : '<div class="thumb-preview"></div>'}
      </td>
      <td>
        <div class="report-info-col">
          <span class="report-table-title" data-id="${report.id}">${escapeHtml(report.title || 'Untitled Report')}</span>
          <span class="report-table-url" title="${escapeHtml(report.metadata?.url || '')}">${escapeHtml(report.metadata?.url || 'No URL')}</span>
        </div>
      </td>
      <td><span class="severity-pill sev-${report.severity}">${report.severity}</span></td>
      <td><span class="priority-pill">${report.priority || 'P2'}</span></td>
      <td><span class="category-tag">${report.category || 'other'}</span></td>
      <td class="meta-val">${dateFormatted}</td>
      <td>
        <div class="action-row">
          <button class="icon-btn btn-view" data-id="${report.id}" title="Edit / View Report">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="icon-btn btn-duplicate" data-id="${report.id}" title="Duplicate Report">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="icon-btn btn-dl-md" data-id="${report.id}" title="Download Markdown">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </button>
          <button class="icon-btn btn-dl-json" data-id="${report.id}" title="Download JSON">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          </button>
          <button class="icon-btn btn-del" data-id="${report.id}" title="Delete Report" style="color: #ef4444;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;

    // Row Event Listeners
    tr.querySelector('.report-table-title').addEventListener('click', () => openReport(report.id));
    tr.querySelector('.btn-view').addEventListener('click', () => openReport(report.id));

    tr.querySelector('.btn-duplicate').addEventListener('click', async () => {
      await duplicateReport(report.id);
      await loadAndRenderReports();
    });

    tr.querySelector('.btn-dl-md').addEventListener('click', () => {
      const md = generateMarkdownExport(report);
      downloadFile(md, `bugshot-report-${report.id}.md`, 'text/markdown');
    });

    tr.querySelector('.btn-dl-json').addEventListener('click', () => {
      const json = generateJsonExport(report, false);
      downloadFile(json, `bugshot-report-${report.id}.json`, 'application/json');
    });

    tr.querySelector('.btn-del').addEventListener('click', async () => {
      if (confirm(`Delete bug report "${report.title}"?`)) {
        await deleteReport(report.id);
        await loadAndRenderReports();
      }
    });

    reportsTbody.appendChild(tr);
  }
}

function openReport(reportId) {
  const url = chrome.runtime.getURL(`report/report.html?reportId=${reportId}`);
  chrome.tabs.create({ url });
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function setupFilterListeners() {
  inputSearch.addEventListener('input', renderReportsTable);
  filterSeverity.addEventListener('change', renderReportsTable);
  filterCategory.addEventListener('change', renderReportsTable);
  filterSort.addEventListener('change', renderReportsTable);
}

function setupActionButtons() {
  const openNewReport = () => {
    const url = chrome.runtime.getURL('report/report.html');
    chrome.tabs.create({ url });
  };

  btnCreateManualReport.addEventListener('click', openNewReport);
  btnEmptyCreate.addEventListener('click', openNewReport);
}

/**
 * Settings and Preferences Dialog
 */
function setupSettingsModal() {
  btnToggleSettings.addEventListener('click', async () => {
    const prefs = await getUserPreferences();
    prefTheme.value = prefs.theme || 'dark';
    prefAutoConsole.checked = Boolean(prefs.autoCaptureConsole);
    prefAutoNetwork.checked = Boolean(prefs.autoCaptureNetwork);
    prefSanitizeUrl.checked = Boolean(prefs.sanitizeUrlParams);
    prefMaxReports.value = (prefs.maxStoredReports || 50).toString();

    modalSettings.style.display = 'flex';
  });

  btnCloseSettings.addEventListener('click', () => {
    modalSettings.style.display = 'none';
  });

  btnSavePrefs.addEventListener('click', async () => {
    await saveUserPreferences({
      theme: prefTheme.value,
      autoCaptureConsole: prefAutoConsole.checked,
      autoCaptureNetwork: prefAutoNetwork.checked,
      sanitizeUrlParams: prefSanitizeUrl.checked,
      maxStoredReports: parseInt(prefMaxReports.value, 10)
    });

    modalSettings.style.display = 'none';
    alert('Preferences saved.');
  });

  btnDeleteAllData.addEventListener('click', async () => {
    if (confirm('CAUTION: Are you sure you want to permanently delete ALL saved bug reports and settings? This cannot be undone.')) {
      await deleteAllData();
      modalSettings.style.display = 'none';
      await loadAndRenderReports();
      alert('All BugShot data purged.');
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

document.addEventListener('DOMContentLoaded', initDashboard);
