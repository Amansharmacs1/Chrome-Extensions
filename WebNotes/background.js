/**
 * WebNotes — Background Service Worker
 * 
 * Handles context menu actions, message routing, and dashboard opening.
 */

import { createHighlight, saveHighlight, initializeStorage } from './scripts/storage.js';
import { normalizeUrl, extractDomain, isRestrictedUrl } from './scripts/url-utils.js';

// ============================================================
// Initialization
// ============================================================

chrome.runtime.onInstalled.addListener(async (details) => {
  await initializeStorage();
  setupContextMenus();
});

// ============================================================
// Context Menus
// ============================================================

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'webnotes-save-selection',
      title: 'Save to WebNotes',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'webnotes-new-note',
      title: 'New WebNote for this page',
      contexts: ['page']
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'webnotes-save-selection') {
    await handleSaveSelection(info, tab);
  } else if (info.menuItemId === 'webnotes-new-note') {
    // Open popup — Chrome doesn't allow programmatic popup opening,
    // so we open the dashboard with a pre-filled URL
    const url = tab?.url || '';
    const title = tab?.title || '';
    const dashboardUrl = chrome.runtime.getURL('dashboard.html') + 
      `?action=new-note&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: dashboardUrl });
  }
});

async function handleSaveSelection(info, tab) {
  const selectedText = info.selectionText || '';
  if (!selectedText.trim()) return;

  const sourceUrl = tab?.url || info.pageUrl || '';
  const sourceTitle = tab?.title || '';

  if (isRestrictedUrl(sourceUrl)) {
    // Can't save from restricted pages — silently skip
    return;
  }

  try {
    const highlight = createHighlight({
      selectedText: selectedText.trim(),
      userNote: '',
      sourceUrl: normalizeUrl(sourceUrl) || sourceUrl,
      sourceTitle: sourceTitle
    });

    await saveHighlight(highlight);

    // Notify popup if it's open
    try {
      chrome.runtime.sendMessage({
        type: 'HIGHLIGHT_SAVED',
        highlight
      });
    } catch {
      // Popup might not be open
    }
  } catch (error) {
    // Storage error — can't show UI from background
  }
}

// ============================================================
// Message Handling
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  switch (message.type) {
    case 'OPEN_DASHBOARD':
      openDashboard(message.params);
      sendResponse({ success: true });
      return false;

    case 'OPEN_URL':
      if (message.url) {
        chrome.tabs.create({ url: message.url });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No URL provided' });
      }
      return false;

    case 'GET_ACTIVE_TAB':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs?.[0];
        if (tab) {
          sendResponse({
            success: true,
            tab: {
              url: tab.url || '',
              title: tab.title || '',
              id: tab.id
            }
          });
        } else {
          sendResponse({ success: false, error: 'No active tab' });
        }
      });
      return true; // Async response

    case 'GET_SELECTED_TEXT':
      // Try to get selected text from active tab via scripting API
      getSelectedTextFromTab(sender).then(text => {
        sendResponse({ success: true, text });
      }).catch(() => {
        sendResponse({ success: false, text: '' });
      });
      return true; // Async response

    case 'CAPTURE_SELECTION':
      captureSelectionFromTab().then(result => {
        sendResponse(result);
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;

    default:
      return false;
  }
});

async function getSelectedTextFromTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || isRestrictedUrl(tab.url)) {
      return '';
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || ''
    });

    return results?.[0]?.result || '';
  } catch {
    return '';
  }
}

async function captureSelectionFromTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      return { success: false, error: 'No active tab' };
    }
    if (isRestrictedUrl(tab.url)) {
      return { success: false, error: 'Cannot capture from this page' };
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const text = sel.toString();
        if (!text.trim()) return null;
        return { text: text.trim() };
      }
    });

    const data = results?.[0]?.result;
    if (data && data.text) {
      return {
        success: true,
        selectedText: data.text,
        sourceUrl: tab.url,
        sourceTitle: tab.title
      };
    }
    return { success: false, error: 'No text selected' };
  } catch (err) {
    return { success: false, error: 'Cannot access page content. Try using the right-click menu instead.' };
  }
}

function openDashboard(params = {}) {
  let url = chrome.runtime.getURL('dashboard.html');
  const queryParts = [];
  
  if (params?.filter) queryParts.push(`filter=${encodeURIComponent(params.filter)}`);
  if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params?.action) queryParts.push(`action=${encodeURIComponent(params.action)}`);
  if (params?.url) queryParts.push(`url=${encodeURIComponent(params.url)}`);
  if (params?.title) queryParts.push(`title=${encodeURIComponent(params.title)}`);
  
  if (queryParts.length > 0) url += '?' + queryParts.join('&');

  chrome.tabs.create({ url });
}
