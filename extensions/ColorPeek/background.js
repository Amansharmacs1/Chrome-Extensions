/**
 * ColorPeek - Background Service Worker (Manifest V3)
 * Handles dashboard window launching, element inspector injection into active tabs,
 * and extension message routing with error checking.
 */

import { setActiveColor, addRecentColor } from './scripts/palette-manager.js';

const RESTRICTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'view-source:',
  'https://chrome.google.com/webstore',
  'https://chromewebstore.google.com'
];

/**
 * Checks if a given URL is eligible for script injection
 * @param {string} url
 * @returns {boolean}
 */
function isInjectableUrl(url = '') {
  if (!url || typeof url !== 'string') return false;
  return !RESTRICTED_URL_PREFIXES.some(prefix => url.startsWith(prefix));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  switch (message.type) {
    case 'OPEN_DASHBOARD': {
      const dashboardUrl = chrome.runtime.getURL('dashboard.html');
      chrome.tabs.create({ url: dashboardUrl }, () => {
        if (chrome.runtime?.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ success: true });
      });
      return true;
    }

    case 'INSPECT_ELEMENT': {
      chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
        if (chrome.runtime?.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        const tab = tabs?.[0];
        if (!tab || !tab.id || !tab.url) {
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }

        if (!isInjectableUrl(tab.url)) {
          sendResponse({
            success: false,
            error: 'Browser internal pages and the Web Store cannot be inspected.'
          });
          return;
        }

        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scripts/element-inspector.js']
          });
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.message || 'Inspection injection failed' });
        }
      });
      return true;
    }

    case 'SET_ACTIVE_COLOR': {
      if (message.color) {
        setActiveColor(message.color).then(() => {
          if (message.recordRecent) {
            addRecentColor(message.color, message.source || 'manual');
          }
          sendResponse({ success: true });
        });
        return true;
      }
      sendResponse({ success: false });
      return true;
    }

    default:
      return false;
  }
});
