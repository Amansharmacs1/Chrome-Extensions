/**
 * ViewPortX - Background Service Worker (Manifest V3)
 * Coordinates dashboard tab launching, script injection into active tabs,
 * extension badge updates, and communication bridging between popup and content scripts.
 */

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
 * Checks whether a URL is valid for script injection and DOM manipulation.
 * @param {string} url
 * @returns {boolean}
 */
export function isInjectableUrl(url = '') {
  if (!url || typeof url !== 'string') return false;
  return !RESTRICTED_URL_PREFIXES.some(prefix => url.startsWith(prefix));
}

// Runtime message routing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  switch (message.type) {
    case 'OPEN_DASHBOARD': {
      const url = message.url ? `dashboard.html?targetUrl=${encodeURIComponent(message.url)}` : 'dashboard.html';
      const dashboardUrl = chrome.runtime.getURL(url);
      chrome.tabs.create({ url: dashboardUrl }, (createdTab) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ success: true, tabId: createdTab.id });
      });
      return true;
    }

    case 'ENSURE_CONTENT_SCRIPT': {
      const tabId = message.tabId;
      if (!tabId) {
        sendResponse({ success: false, error: 'No tabId provided' });
        return false;
      }

      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          sendResponse({ success: false, error: 'Tab not accessible' });
          return;
        }

        if (!isInjectableUrl(tab.url)) {
          sendResponse({
            success: false,
            error: 'Browser internal pages and Web Store cannot be transformed'
          });
          return;
        }

        chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true });
          }
        });
      });
      return true;
    }

    case 'UPDATE_BADGE': {
      const { text, color, tabId } = message;
      if (typeof text === 'string') {
        chrome.action.setBadgeText({ text, tabId });
      }
      if (color) {
        chrome.action.setBadgeBackgroundColor({ color, tabId });
      }
      sendResponse({ success: true });
      return true;
    }

    default:
      return false;
  }
});

// Clean up badge when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab?.url && isInjectableUrl(tab.url)) {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});
