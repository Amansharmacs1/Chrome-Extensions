/**
 * ReadEase - Background Service Worker (Manifest V3)
 * Handles tab extraction coordination, reader window launching,
 * library tab navigation, and message passing.
 */

import { setLocalStorage } from './scripts/storage.js';
import { STORAGE_KEY_ACTIVE } from './scripts/article-manager.js';

// URL patterns that cannot be read by extensions
const RESTRICTED_URL_PATTERNS = [
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^edge:\/\//i,
  /^about:/i,
  /^view-source:/i,
  /^https?:\/\/chrome\.google\.com\/webstore/i,
  /^https?:\/\/chromewebstore\.google\.com/i
];

/**
 * Checks if a URL can be read by ReadEase
 * @param {string} url
 * @returns {boolean}
 */
function isSupportedUrl(url = '') {
  if (!url || typeof url !== 'string') return false;
  return !RESTRICTED_URL_PATTERNS.some(pattern => pattern.test(url));
}

// Extension message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  switch (message.type) {
    case 'CHECK_TAB_STATUS': {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (chrome.runtime?.lastError) {
          sendResponse({ supported: false, reason: chrome.runtime.lastError.message });
          return;
        }
        const tab = tabs?.[0];
        if (!tab || !tab.url) {
          sendResponse({ supported: false, reason: 'No active tab found' });
          return;
        }

        if (!isSupportedUrl(tab.url)) {
          sendResponse({
            supported: false,
            url: tab.url,
            reason: 'Browser internal pages and Web Store cannot be converted into reader mode.'
          });
          return;
        }

        sendResponse({ supported: true, url: tab.url, title: tab.title });
      });
      return true; // Keep channel open for async response
    }

    case 'OPEN_READER': {
      const targetUrl = message.articleId
        ? chrome.runtime.getURL(`reader.html?id=${encodeURIComponent(message.articleId)}`)
        : chrome.runtime.getURL('reader.html');

      chrome.tabs.create({ url: targetUrl }, () => {
        if (chrome.runtime?.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ success: true });
      });
      return true;
    }

    case 'OPEN_LIBRARY': {
      const libUrl = chrome.runtime.getURL('library.html');
      chrome.tabs.create({ url: libUrl }, () => {
        if (chrome.runtime?.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ success: true });
      });
      return true;
    }

    case 'SET_ACTIVE_ARTICLE': {
      if (message.article) {
        setLocalStorage(STORAGE_KEY_ACTIVE, message.article).then(() => {
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
