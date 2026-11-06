/**
 * BugShot - Popup Controller
 * Connects with background service worker and active tab, handles capture actions,
 * toggles real-time console monitoring, and lists recent bug reports.
 */

import { getReports } from '../scripts/storage.js';

let activeTabId = null;

// DOM Elements
const restrictedNotice = document.getElementById('restricted-notice');
const restrictedReason = document.getElementById('restricted-reason');
const tabDomainEl = document.getElementById('tab-domain');
const tabDimsEl = document.getElementById('tab-dims');
const tabTitleEl = document.getElementById('tab-title');

const btnCaptureViewport = document.getElementById('btn-capture-viewport');
const btnCaptureRegion = document.getElementById('btn-capture-region');
const btnCaptureFull = document.getElementById('btn-capture-full');

const toggleConsoleMonitor = document.getElementById('toggle-console-monitor');
const monitorCountBadge = document.getElementById('monitor-count-badge');

const recentReportsList = document.getElementById('recent-reports-list');
const recentEmpty = document.getElementById('recent-empty');
const linkViewAll = document.getElementById('link-view-all');
const btnOpenDashboard = document.getElementById('btn-open-dashboard');
const btnDashboardFooter = document.getElementById('btn-dashboard-footer');

/**
 * Initializes popup state
 */
async function initPopup() {
  try {
    const status = await chrome.runtime.sendMessage({ type: 'CHECK_TAB_STATUS' });
    if (!status) return;

    activeTabId = status.tabId;

    if (!status.capturable) {
      showRestrictedPage(status.reason || 'This page cannot be captured.');
      return;
    }

    // Populate active tab details
    if (status.url) {
      try {
        const u = new URL(status.url);
        tabDomainEl.textContent = u.hostname || status.url;
      } catch {
        tabDomainEl.textContent = status.url;
      }
    }
    tabTitleEl.textContent = status.title || 'Untitled Webpage';

    // Query active tab for viewport dimensions and monitor status
    if (activeTabId) {
      try {
        const info = await chrome.tabs.sendMessage(activeTabId, { action: 'COLLECT_PAGE_DIAGNOSTICS' });
        if (info?.metadata) {
          tabDimsEl.textContent = `${info.metadata.viewportWidth} × ${info.metadata.viewportHeight}px`;
        }
        const monStatus = await chrome.tabs.sendMessage(activeTabId, { action: 'GET_MONITOR_STATUS' });
        if (monStatus) {
          toggleConsoleMonitor.checked = Boolean(monStatus.active);
          updateMonitorBadge(monStatus.count || 0, monStatus.active);
        }
      } catch {
        tabDimsEl.textContent = 'Ready';
      }
    }

    // Load recent reports
    await loadRecentReports();
  } catch (err) {
    console.error('[BugShot Popup] Init error:', err);
  }
}

function showRestrictedPage(reason) {
  restrictedNotice.classList.remove('hidden');
  restrictedReason.textContent = reason;
  btnCaptureViewport.disabled = true;
  btnCaptureRegion.disabled = true;
  btnCaptureFull.disabled = true;
  toggleConsoleMonitor.disabled = true;
}

function updateMonitorBadge(count, active) {
  monitorCountBadge.textContent = `${count} ${count === 1 ? 'Error' : 'Errors'}`;
  if (active) {
    monitorCountBadge.classList.add('active');
  } else {
    monitorCountBadge.classList.remove('active');
  }
}

/**
 * Loads recent bug reports from storage
 */
async function loadRecentReports() {
  try {
    const reports = await getReports();
    if (!reports || reports.length === 0) {
      recentEmpty.style.display = 'block';
      return;
    }

    recentEmpty.style.display = 'none';
    recentReportsList.innerHTML = '';

    for (const report of reports.slice(0, 3)) {
      const item = document.createElement('div');
      item.className = 'recent-item';
      item.title = `${report.title}\nSeverity: ${report.severity} • Category: ${report.category}`;

      item.innerHTML = `
        <span class="recent-item-title">${escapeHtml(report.title || 'Untitled Report')}</span>
        <div class="recent-item-meta">
          <span class="severity-pill sev-${report.severity}">${report.severity}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          type: 'OPEN_REPORT',
          reportId: report.id
        });
        window.close();
      });

      recentReportsList.appendChild(item);
    }
  } catch (err) {
    console.warn('[BugShot Popup] Failed to load recent reports:', err);
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

// Action Handlers
btnCaptureViewport.addEventListener('click', async () => {
  btnCaptureViewport.disabled = true;
  await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
  window.close();
});

btnCaptureRegion.addEventListener('click', async () => {
  btnCaptureRegion.disabled = true;
  await chrome.runtime.sendMessage({ type: 'CAPTURE_REGION' });
  window.close();
});

btnCaptureFull.addEventListener('click', async () => {
  btnCaptureFull.disabled = true;
  await chrome.runtime.sendMessage({ type: 'CAPTURE_FULL_PAGE' });
  window.close();
});

toggleConsoleMonitor.addEventListener('change', async () => {
  if (!activeTabId) return;
  const isEnabled = toggleConsoleMonitor.checked;

  try {
    const res = await chrome.tabs.sendMessage(activeTabId, {
      action: isEnabled ? 'START_CONSOLE_MONITOR' : 'STOP_CONSOLE_MONITOR'
    });
    updateMonitorBadge(0, isEnabled);
  } catch (err) {
    console.warn('[BugShot Popup] Toggle monitor failed:', err);
  }
});

function openDashboard() {
  chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
  window.close();
}

btnOpenDashboard.addEventListener('click', openDashboard);
linkViewAll.addEventListener('click', (e) => {
  e.preventDefault();
  openDashboard();
});
btnDashboardFooter.addEventListener('click', openDashboard);

document.addEventListener('DOMContentLoaded', initPopup);
