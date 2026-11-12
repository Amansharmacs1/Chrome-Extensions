/**
 * QRQuick - Popup Controller
 * Handles active tab QR generation, quick text input, downloads, and clipboard copying.
 */

import { renderQRToCanvas } from '../generator/qr-engine.js';
import { downloadPng, downloadSvg, copyQrImageToClipboard } from '../services/export-service.js';
import { saveHistoryItem, getSettings } from '../services/storage-service.js';

// DOM elements
const tabCurrentPage = document.getElementById('tabCurrentPage');
const tabQuickText = document.getElementById('tabQuickText');
const viewCurrentPage = document.getElementById('viewCurrentPage');
const viewQuickText = document.getElementById('viewQuickText');
const pageTitleEl = document.getElementById('pageTitle');
const pageUrlEl = document.getElementById('pageUrl');
const quickTextInput = document.getElementById('quickTextInput');
const popupCanvas = document.getElementById('popupCanvas');
const qrCapacityWarning = document.getElementById('qrCapacityWarning');
const btnDownloadPng = document.getElementById('btnDownloadPng');
const btnCopyImage = document.getElementById('btnCopyImage');
const btnDownloadSvg = document.getElementById('btnDownloadSvg');
const linkFullStudio = document.getElementById('linkFullStudio');

let activeTabUrl = '';
let activeTabTitle = '';
let currentPayload = '';
let currentTitle = '';
let currentType = 'url';
let isCurrentPageView = true;

/**
 * Initializes the popup
 */
async function initPopup() {
  bindTabs();
  bindActions();
  await loadCurrentPage();
}

/**
 * Loads the active browser tab
 */
async function loadCurrentPage() {
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (tab && tab.url) {
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
          pageTitleEl.textContent = 'Internal Browser Page';
          pageUrlEl.textContent = 'Cannot generate QR for internal system pages.';
          activeTabUrl = '';
          switchToQuickText('https://example.com');
          return;
        }

        activeTabUrl = tab.url;
        activeTabTitle = tab.title || tab.url;
        pageTitleEl.textContent = activeTabTitle;
        pageUrlEl.textContent = activeTabUrl;

        updateQr(activeTabUrl, activeTabTitle, 'url');
        return;
      }
    }
  } catch (err) {
    console.warn('[QRQuick] Failed to query active tab:', err);
  }

  // Fallback if not running inside Chrome extension context
  pageTitleEl.textContent = 'QRQuick — Generator';
  pageUrlEl.textContent = 'https://github.com';
  updateQr('https://github.com', 'GitHub', 'url');
}

/**
 * Switches to Quick Text tab with initial text
 */
function switchToQuickText(initialText = '') {
  isCurrentPageView = false;
  tabCurrentPage.classList.remove('active');
  tabQuickText.classList.add('active');
  viewCurrentPage.classList.remove('active');
  viewQuickText.classList.add('active');

  quickTextInput.value = initialText;
  quickTextInput.focus();
  updateQr(initialText, 'Quick Text', 'text');
}

/**
 * Re-renders QR code on canvas
 */
async function updateQr(payload, title, type = 'text') {
  currentPayload = String(payload || '').trim();
  currentTitle = title || currentPayload.slice(0, 30);
  currentType = type;

  // Update link to generator
  if (linkFullStudio) {
    const encodedPayload = encodeURIComponent(currentPayload);
    const encodedTitle = encodeURIComponent(currentTitle);
    linkFullStudio.href = `../generator/generator.html?${type}=${encodedPayload}&title=${encodedTitle}`;
  }

  if (!currentPayload) {
    qrCapacityWarning.hidden = false;
    qrCapacityWarning.textContent = 'Please enter content to generate QR code.';
    return;
  }

  qrCapacityWarning.hidden = true;

  try {
    await renderQRToCanvas(popupCanvas, currentPayload, {
      size: 340,
      margin: 4,
      ecLevel: 'M',
      fgColor: '#0F172A',
      bgColor: '#FFFFFF',
      pattern: 'square',
      eyeOuter: 'square',
      eyeInner: 'square'
    });

    // Save to history automatically if enabled
    const settings = await getSettings();
    if (settings.autoSaveGenerated) {
      saveHistoryItem({
        type: currentType,
        title: currentTitle,
        payload: currentPayload,
        thumbnailDataUrl: popupCanvas.toDataURL('image/png', 0.5)
      }).catch(() => {});
    }
  } catch (err) {
    qrCapacityWarning.hidden = false;
    qrCapacityWarning.textContent = err.message || 'Failed to generate QR code.';
  }
}

/**
 * Binds tabs events
 */
function bindTabs() {
  tabCurrentPage.addEventListener('click', () => {
    if (isCurrentPageView) return;
    isCurrentPageView = true;
    tabQuickText.classList.remove('active');
    tabCurrentPage.classList.add('active');
    viewQuickText.classList.remove('active');
    viewCurrentPage.classList.add('active');

    if (activeTabUrl) {
      updateQr(activeTabUrl, activeTabTitle, 'url');
    }
  });

  tabQuickText.addEventListener('click', () => {
    if (!isCurrentPageView) return;
    switchToQuickText(quickTextInput.value || 'https://');
  });

  quickTextInput.addEventListener('input', (e) => {
    const text = e.target.value;
    const isUrl = text.startsWith('http://') || text.startsWith('https://');
    updateQr(text, text.slice(0, 30), isUrl ? 'url' : 'text');
  });
}

/**
 * Binds export actions
 */
function bindActions() {
  btnDownloadPng.addEventListener('click', async () => {
    if (!currentPayload) return;
    try {
      await downloadPng(currentPayload, {
        title: currentTitle,
        type: currentType,
        size: 1024,
        margin: 4,
        ecLevel: 'M'
      });
      showTemporaryLabel(btnDownloadPng, '✓ Downloaded');
    } catch (err) {
      console.error('PNG download error:', err);
      alert('Failed to download PNG.');
    }
  });

  btnDownloadSvg.addEventListener('click', () => {
    if (!currentPayload) return;
    try {
      downloadSvg(currentPayload, {
        title: currentTitle,
        type: currentType,
        size: 512,
        margin: 4,
        ecLevel: 'M'
      });
      showTemporaryLabel(btnDownloadSvg, '✓ Saved');
    } catch (err) {
      console.error('SVG download error:', err);
      alert('Failed to download SVG.');
    }
  });

  btnCopyImage.addEventListener('click', async () => {
    if (!currentPayload) return;
    try {
      await copyQrImageToClipboard(popupCanvas);
      showTemporaryLabel(btnCopyImage, '✓ Copied!');
    } catch (err) {
      console.warn('Clipboard image copy failed, copying text:', err);
      try {
        await navigator.clipboard.writeText(currentPayload);
        showTemporaryLabel(btnCopyImage, '✓ Text Copied!');
      } catch (e) {
        alert('Could not copy to clipboard.');
      }
    }
  });
}

/**
 * Helper to show brief success feedback on buttons
 */
function showTemporaryLabel(button, text) {
  const original = button.innerHTML;
  button.textContent = text;
  setTimeout(() => {
    button.innerHTML = original;
  }, 1600);
}

// Start on DOM ready
document.addEventListener('DOMContentLoaded', initPopup);
