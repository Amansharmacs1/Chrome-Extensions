/**
 * QRQuick - Dashboard & History Controller
 * Manages statistics, history filtering, record management,
 * user preferences, and full data backups.
 */

import {
  getHistory,
  getScanHistory,
  updateHistoryItem,
  deleteHistoryItem,
  deleteScanItem,
  clearHistory,
  clearAllData,
  exportAllData,
  getSettings,
  updateSettings,
  getStorageStats
} from '../services/storage-service.js';
import { downloadPng, copyTextToClipboard, triggerFileDownload } from '../services/export-service.js';

// DOM elements
const valTotalGenerated = document.getElementById('valTotalGenerated');
const valTotalScanned = document.getElementById('valTotalScanned');
const valTotalFavorites = document.getElementById('valTotalFavorites');
const valRecentActivity = document.getElementById('valRecentActivity');

const tabGenerated = document.getElementById('tabGenerated');
const tabScanned = document.getElementById('tabScanned');
const countGenTab = document.getElementById('countGenTab');
const countScanTab = document.getElementById('countScanTab');

const inputSearchHistory = document.getElementById('inputSearchHistory');
const selectTypeFilter = document.getElementById('selectTypeFilter');
const btnToggleFavFilter = document.getElementById('btnToggleFavFilter');

const historyGrid = document.getElementById('historyGrid');
const emptyHistoryState = document.getElementById('emptyHistoryState');
const emptyStateMsg = document.getElementById('emptyStateMsg');

// Settings
const checkConfirmUrls = document.getElementById('checkConfirmUrls');
const checkAutoSaveGen = document.getElementById('checkAutoSaveGen');
const checkAutoSaveScan = document.getElementById('checkAutoSaveScan');
const btnExportBackup = document.getElementById('btnExportBackup');
const btnClearGenHistory = document.getElementById('btnClearGenHistory');
const btnEraseAll = document.getElementById('btnEraseAll');

// State
let activeTab = 'generated'; // 'generated' | 'scanned'
let generatedList = [];
let scanList = [];
let isFavFilterActive = false;
let searchQuery = '';
let selectedType = 'all';

/**
 * Initializes the dashboard
 */
async function initDashboard() {
  bindTabs();
  bindFilters();
  bindSettings();
  await refreshData();
}

/**
 * Refreshes data from storage and re-renders
 */
async function refreshData() {
  const [stats, history, scans, settings] = await Promise.all([
    getStorageStats(),
    getHistory(),
    getScanHistory(),
    getSettings()
  ]);

  // Update Stats Cards
  valTotalGenerated.textContent = stats.totalGenerated;
  valTotalScanned.textContent = stats.totalScanned;
  valTotalFavorites.textContent = stats.totalFavorites;
  valRecentActivity.textContent = stats.recentActivityCount;

  countGenTab.textContent = history.length;
  countScanTab.textContent = scans.length;

  generatedList = history;
  scanList = scans;

  // Sync Settings
  checkConfirmUrls.checked = settings.promptConfirmOnUrl;
  checkAutoSaveGen.checked = settings.autoSaveGenerated;
  checkAutoSaveScan.checked = settings.autoSaveScans;

  renderGrid();
}

/**
 * Filters and renders history items in the active tab
 */
function renderGrid() {
  const sourceList = activeTab === 'generated' ? generatedList : scanList;

  // Filter items
  const filtered = sourceList.filter(item => {
    // 1. Favorite filter
    if (isFavFilterActive && !item.isFavorite) return false;

    // 2. Type filter
    const itemType = item.type || item.recognizedType || 'text';
    if (selectedType !== 'all' && itemType.toLowerCase() !== selectedType.toLowerCase()) {
      return false;
    }

    // 3. Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (item.title || '').toLowerCase().includes(q);
      const textMatch = (item.payload || item.decodedText || '').toLowerCase().includes(q);
      if (!titleMatch && !textMatch) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    historyGrid.innerHTML = '';
    emptyHistoryState.hidden = false;
    emptyStateMsg.textContent = searchQuery || isFavFilterActive || selectedType !== 'all'
      ? 'No records match your filter criteria.'
      : (activeTab === 'generated' ? 'No generated QR codes yet.' : 'No scanned QR codes yet.');
    return;
  }

  emptyHistoryState.hidden = true;
  historyGrid.innerHTML = '';

  for (const item of filtered) {
    const card = activeTab === 'generated' ? createGeneratedCard(item) : createScannedCard(item);
    historyGrid.appendChild(card);
  }
}

/**
 * Creates a card DOM element for a generated QR item
 */
function createGeneratedCard(item) {
  const card = document.createElement('div');
  card.className = 'history-card';

  const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  card.innerHTML = `
    <div class="card-top">
      <div class="thumb-preview">
        ${item.thumbnailDataUrl ? `<img src="${item.thumbnailDataUrl}" alt="QR">` : `<span class="thumb-placeholder">📱</span>`}
      </div>
      <div class="card-info">
        <div class="card-title-row">
          <span class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
          <button class="fav-star-btn ${item.isFavorite ? 'active' : ''}" data-id="${item.id}" title="Favorite">
            ${item.isFavorite ? '★' : '☆'}
          </button>
        </div>
        <div class="card-meta">
          <span class="type-pill">${item.type || 'QR'}</span>
          <span class="time-str">${dateStr}</span>
        </div>
      </div>
    </div>

    <div class="card-payload-snippet" title="${escapeHtml(item.payload)}">
      ${escapeHtml(item.payload)}
    </div>

    <div class="card-actions-bar">
      <div style="display: flex; gap: 6px;">
        <button class="card-btn btn-open-studio" data-id="${item.id}">Edit</button>
        <button class="card-btn btn-dl-card" data-id="${item.id}">Download</button>
        <button class="card-btn btn-copy-card" data-payload="${escapeHtml(item.payload)}">Copy</button>
      </div>
      <button class="card-btn danger btn-del-card" data-id="${item.id}" title="Delete">✕</button>
    </div>
  `;

  // Favorite toggle
  card.querySelector('.fav-star-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    const newFav = !item.isFavorite;
    await updateHistoryItem(item.id, { isFavorite: newFav });
    await refreshData();
  });

  // Edit in Studio
  card.querySelector('.btn-open-studio').addEventListener('click', () => {
    const type = item.type || 'text';
    const text = encodeURIComponent(item.payload);
    const title = encodeURIComponent(item.title || '');
    window.location.href = `../generator/generator.html?${type}=${text}&title=${title}`;
  });

  // Download
  card.querySelector('.btn-dl-card').addEventListener('click', async () => {
    try {
      await downloadPng(item.payload, {
        title: item.title,
        type: item.type,
        ...(item.options || {})
      });
    } catch (err) {
      alert('Failed to download QR code.');
    }
  });

  // Copy
  card.querySelector('.btn-copy-card').addEventListener('click', async (e) => {
    await copyTextToClipboard(item.payload);
    e.target.textContent = '✓ Copied';
    setTimeout(() => { e.target.textContent = 'Copy'; }, 1600);
  });

  // Delete
  card.querySelector('.btn-del-card').addEventListener('click', async () => {
    if (confirm(`Delete "${item.title}" from history?`)) {
      await deleteHistoryItem(item.id);
      await refreshData();
    }
  });

  return card;
}

/**
 * Creates a card DOM element for a scanned QR item
 */
function createScannedCard(item) {
  const card = document.createElement('div');
  card.className = 'history-card';

  const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  card.innerHTML = `
    <div class="card-top">
      <div class="thumb-preview">
        <span class="thumb-placeholder">🔍</span>
      </div>
      <div class="card-info">
        <div class="card-title-row">
          <span class="card-title" title="${escapeHtml(item.title || item.decodedText)}">${escapeHtml(item.title || item.decodedText)}</span>
        </div>
        <div class="card-meta">
          <span class="type-pill">${item.recognizedType || 'SCAN'}</span>
          <span class="time-str">${dateStr}</span>
        </div>
      </div>
    </div>

    <div class="card-payload-snippet" title="${escapeHtml(item.decodedText)}">
      ${escapeHtml(item.decodedText)}
    </div>

    <div class="card-actions-bar">
      <div style="display: flex; gap: 6px;">
        ${item.isUrl ? `<button class="card-btn btn-open-url" data-url="${escapeHtml(item.decodedText)}">Open Link</button>` : ''}
        <button class="card-btn btn-edit-scan" data-payload="${escapeHtml(item.decodedText)}">Open in Studio</button>
        <button class="card-btn btn-copy-scan" data-payload="${escapeHtml(item.decodedText)}">Copy</button>
      </div>
      <button class="card-btn danger btn-del-scan" data-id="${item.id}" title="Delete">✕</button>
    </div>
  `;

  // Open URL with confirmation
  const btnOpen = card.querySelector('.btn-open-url');
  if (btnOpen) {
    btnOpen.addEventListener('click', async () => {
      const settings = await getSettings();
      if (settings.promptConfirmOnUrl) {
        if (confirm(`Open external link:\n\n${item.decodedText}\n\nProceed to open in a new tab?`)) {
          window.open(item.decodedText, '_blank', 'noopener,noreferrer');
        }
      } else {
        window.open(item.decodedText, '_blank', 'noopener,noreferrer');
      }
    });
  }

  // Open in Studio
  card.querySelector('.btn-edit-scan').addEventListener('click', () => {
    const type = item.recognizedType || 'text';
    const text = encodeURIComponent(item.decodedText);
    window.location.href = `../generator/generator.html?${type}=${text}`;
  });

  // Copy
  card.querySelector('.btn-copy-scan').addEventListener('click', async (e) => {
    await copyTextToClipboard(item.decodedText);
    e.target.textContent = '✓ Copied';
    setTimeout(() => { e.target.textContent = 'Copy'; }, 1600);
  });

  // Delete
  card.querySelector('.btn-del-scan').addEventListener('click', async () => {
    if (confirm('Delete this scan record?')) {
      await deleteScanItem(item.id);
      await refreshData();
    }
  });

  return card;
}

/**
 * Binds tabs (Generated vs Scanned)
 */
function bindTabs() {
  tabGenerated.addEventListener('click', () => {
    if (activeTab === 'generated') return;
    activeTab = 'generated';
    tabGenerated.classList.add('active');
    tabScanned.classList.remove('active');
    renderGrid();
  });

  tabScanned.addEventListener('click', () => {
    if (activeTab === 'scanned') return;
    activeTab = 'scanned';
    tabScanned.classList.add('active');
    tabGenerated.classList.remove('active');
    renderGrid();
  });
}

/**
 * Binds search and filter controls
 */
function bindFilters() {
  inputSearchHistory.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderGrid();
  });

  selectTypeFilter.addEventListener('change', (e) => {
    selectedType = e.target.value;
    renderGrid();
  });

  btnToggleFavFilter.addEventListener('click', () => {
    isFavFilterActive = !isFavFilterActive;
    btnToggleFavFilter.classList.toggle('active', isFavFilterActive);
    renderGrid();
  });
}

/**
 * Binds preferences and danger zone buttons
 */
function bindSettings() {
  checkConfirmUrls.addEventListener('change', async (e) => {
    await updateSettings({ promptConfirmOnUrl: e.target.checked });
  });

  checkAutoSaveGen.addEventListener('change', async (e) => {
    await updateSettings({ autoSaveGenerated: e.target.checked });
  });

  checkAutoSaveScan.addEventListener('change', async (e) => {
    await updateSettings({ autoSaveScans: e.target.checked });
  });

  // Export full backup
  btnExportBackup.addEventListener('click', async () => {
    try {
      const backup = await exportAllData();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      triggerFileDownload(blob, `qrquick_backup_${nowStr}.json`);
    } catch (err) {
      alert('Failed to export backup data.');
    }
  });

  // Clear generated history (preserves favorites)
  btnClearGenHistory.addEventListener('click', async () => {
    if (confirm('Clear all generated QR codes? (Starred favorites will be preserved).')) {
      await clearHistory(true);
      await refreshData();
    }
  });

  // Erase all data
  btnEraseAll.addEventListener('click', async () => {
    const confirmed = confirm(
      'Are you sure you want to PERMANENTLY delete ALL QRQuick data?\n\n' +
      'This will erase all generated codes, scan history, custom presets, and settings. This cannot be undone.'
    );
    if (confirmed) {
      await clearAllData();
      await refreshData();
      alert('All QRQuick data has been permanently cleared.');
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

// Start on DOM ready
document.addEventListener('DOMContentLoaded', initDashboard);
