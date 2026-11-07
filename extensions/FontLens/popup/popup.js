/**
 * FontLens - Extension Popup Controller
 * Connects with active tab, controls inspection state, launches scanner,
 * opens comparison studio, and lists recently inspected typefaces.
 */

import { getRecentFonts, clearRecentFonts } from '../scripts/storage.js';

let activeTab = null;
let isInspectActive = false;

async function initPopup() {
  const targetDomainText = document.getElementById('targetDomainText');
  const statusDot = document.getElementById('statusDot');
  const btnToggleInspect = document.getElementById('btnToggleInspect');
  const inspectBtnTitle = document.getElementById('inspectBtnTitle');
  const btnLaunchScanner = document.getElementById('btnLaunchScanner');
  const btnOpenComparison = document.getElementById('btnOpenComparison');
  const btnClearRecent = document.getElementById('btnClearRecent');

  // 1. Query Active Tab
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab = tabs[0];
    } catch (err) {
      console.warn('[FontLens Popup] Tab query error:', err);
    }
  }

  if (activeTab && activeTab.url) {
    const url = activeTab.url;
    const isRestricted = url.startsWith('chrome://') ||
                         url.startsWith('chrome-extension://') ||
                         url.startsWith('edge://') ||
                         url.startsWith('about:') ||
                         url.includes('chromewebstore.google.com');

    if (isRestricted) {
      targetDomainText.textContent = 'Restricted Browser Page';
      statusDot.className = 'status-indicator inactive';
      btnToggleInspect.disabled = true;
      btnToggleInspect.style.opacity = '0.5';
      btnToggleInspect.style.cursor = 'not-allowed';
      inspectBtnTitle.textContent = 'Cannot Inspect System Page';
      btnLaunchScanner.disabled = true;
      btnLaunchScanner.style.opacity = '0.5';
    } else {
      try {
        const domain = new URL(url).hostname;
        targetDomainText.textContent = domain;
      } catch {
        targetDomainText.textContent = 'Active Webpage';
      }

      // Check current inspection status in tab
      try {
        chrome.tabs.sendMessage(activeTab.id, { action: 'GET_INSPECTOR_STATUS' }, (response) => {
          if (chrome.runtime?.lastError) {
            // Script not injected yet, default to inactive
            setInspectionUI(false);
          } else if (response && response.active) {
            setInspectionUI(true);
          } else {
            setInspectionUI(false);
          }
        });
      } catch {
        setInspectionUI(false);
      }
    }
  } else {
    targetDomainText.textContent = 'No Active Tab';
    statusDot.className = 'status-indicator inactive';
  }

  // 2. Toggle Inspection Action
  btnToggleInspect.addEventListener('click', async () => {
    if (!activeTab || !activeTab.id) return;

    if (isInspectActive) {
      // Deactivate
      chrome.tabs.sendMessage(activeTab.id, { action: 'STOP_INSPECTION' }, () => {
        window.close();
      });
    } else {
      // Activate: try messaging if already present, or inject script if not
      chrome.tabs.sendMessage(activeTab.id, { action: 'START_INSPECTION' }, async (response) => {
        if (chrome.runtime?.lastError || !response) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['inspector/inspector.js']
            });
          } catch (err) {
            console.warn('[FontLens Popup] Script injection exception:', err);
          }
        }
        window.close();
      });
    }
  });

  // 3. Launch Page Scanner
  btnLaunchScanner.addEventListener('click', async () => {
    if (!activeTab || !activeTab.id) return;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['scanner/scanner.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          if (window.__FONTLENS_SCANNER_LAUNCH__) {
            window.__FONTLENS_SCANNER_LAUNCH__();
          }
        }
      });
    } catch (err) {
      console.warn('[FontLens Popup] Scanner execution error:', err);
    }
    window.close();
  });

  // 4. Open Comparison Studio
  btnOpenComparison.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('comparison/comparison.html') });
    }
  });

  // 5. Load and Render Recent Fonts
  await renderRecentList();

  btnClearRecent.addEventListener('click', async () => {
    await clearRecentFonts();
    await renderRecentList();
  });

  function setInspectionUI(active) {
    isInspectActive = active;
    if (active) {
      btnToggleInspect.classList.add('active');
      inspectBtnTitle.textContent = 'Exit Inspection Mode';
    } else {
      btnToggleInspect.classList.remove('active');
      inspectBtnTitle.textContent = 'Inspect Page Typography';
    }
  }
}

async function renderRecentList() {
  const container = document.getElementById('recentList');
  const list = await getRecentFonts();

  if (!list || list.length === 0) {
    container.innerHTML = '<div class="empty-recent-state">No fonts inspected yet. Activate inspection mode to start!</div>';
    return;
  }

  container.innerHTML = '';
  list.slice(0, 4).forEach(item => {
    const row = document.createElement('div');
    row.className = 'recent-item';
    row.innerHTML = `
      <span class="recent-font-name">${item.fontName}</span>
      <button class="recent-copy-btn" title="Copy font-family">Copy</button>
    `;

    row.querySelector('.recent-copy-btn').addEventListener('click', (e) => {
      navigator.clipboard.writeText(`font-family: "${item.fontName}", sans-serif;`);
      e.target.textContent = 'Copied!';
      setTimeout(() => { e.target.textContent = 'Copy'; }, 1200);
    });

    container.appendChild(row);
  });
}

document.addEventListener('DOMContentLoaded', initPopup);
