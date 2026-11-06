/**
 * BugShot - Background Service Worker (Manifest V3)
 * Coordinates screenshot capture triggers, tab routing, content script
 * verification, and communication between popup, editor, and dashboard.
 */

import {
  captureViewport,
  captureRegion,
  finalizeRegionCapture,
  captureFullPage
} from '../scripts/capture.js';
import { isCapturableUrl, getUrlRestrictionReason } from '../scripts/permissions.js';

/**
 * Ensures content scripts are active on the target tab
 * @param {number} tabId
 */
async function ensureContentScripts(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [
        'content/console-monitor.js',
        'content/selection-overlay.js',
        'content/content.js'
      ]
    });
    return true;
  } catch (err) {
    console.warn('[BugShot] Content script injection failed:', err.message);
    return false;
  }
}

// Runtime message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  (async () => {
    try {
      switch (message.type) {
        case 'CAPTURE_VISIBLE_TAB': {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const tab = tabs[0];
          if (!tab) {
            sendResponse({ success: false, error: 'No active tab found.' });
            return;
          }
          await ensureContentScripts(tab.id);
          const result = await captureViewport(tab);
          sendResponse(result);
          break;
        }

        case 'CAPTURE_REGION': {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const tab = tabs[0];
          if (!tab) {
            sendResponse({ success: false, error: 'No active tab found.' });
            return;
          }
          await ensureContentScripts(tab.id);
          const result = await captureRegion(tab);
          sendResponse(result);
          break;
        }

        case 'CAPTURE_FULL_PAGE': {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const tab = tabs[0];
          if (!tab) {
            sendResponse({ success: false, error: 'No active tab found.' });
            return;
          }
          await ensureContentScripts(tab.id);
          const result = await captureFullPage(tab);
          sendResponse(result);
          break;
        }

        case 'REGION_CAPTURED': {
          const tab = sender.tab;
          if (tab && message.region) {
            await finalizeRegionCapture(tab, message.region, message.diagnostics);
            sendResponse({ success: true });
          }
          break;
        }

        case 'OPEN_EDITOR': {
          const url = chrome.runtime.getURL(`editor/editor.html${message.sessionId ? `?session=${message.sessionId}` : ''}`);
          await chrome.tabs.create({ url });
          sendResponse({ success: true });
          break;
        }

        case 'OPEN_REPORT': {
          const url = chrome.runtime.getURL(`report/report.html${message.reportId ? `?reportId=${message.reportId}` : ''}`);
          await chrome.tabs.create({ url });
          sendResponse({ success: true });
          break;
        }

        case 'OPEN_DASHBOARD': {
          const url = chrome.runtime.getURL('dashboard/dashboard.html');
          await chrome.tabs.create({ url });
          sendResponse({ success: true });
          break;
        }

        case 'CHECK_TAB_STATUS': {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const tab = tabs[0];
          if (!tab) {
            sendResponse({ capturable: false, reason: 'No active tab detected.' });
            return;
          }
          const capturable = isCapturableUrl(tab.url || '');
          const reason = capturable ? null : getUrlRestrictionReason(tab.url || '');
          sendResponse({
            capturable,
            reason,
            url: tab.url,
            title: tab.title,
            tabId: tab.id
          });
          break;
        }

        default:
          sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
          break;
      }
    } catch (err) {
      console.error('[BugShot Service Worker] Error handling message:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep channel open for async response
});
