/**
 * BugShot - Permission & URL Security Validator
 * Validates tab targets, detects Chrome-restricted pages, and supplies
 * transparent error messaging for unsupported navigation contexts.
 */

export const RESTRICTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'view-source:',
  'devtools://',
  'https://chrome.google.com/webstore',
  'https://chromewebstore.google.com'
];

/**
 * Checks whether a given URL is eligible for screenshot capture and content script execution.
 * @param {string} url
 * @returns {boolean}
 */
export function isCapturableUrl(url = '') {
  if (!url || typeof url !== 'string') return false;
  return !RESTRICTED_URL_PREFIXES.some(prefix => url.startsWith(prefix));
}

/**
 * Returns a human-friendly error explanation if a URL cannot be captured.
 * @param {string} url
 * @returns {string|null}
 */
export function getUrlRestrictionReason(url = '') {
  if (!url || typeof url !== 'string') {
    return 'No valid URL detected on active tab.';
  }

  if (url.startsWith('chrome://') || url.startsWith('edge://')) {
    return 'Browser internal settings and diagnostic pages cannot be captured due to Chrome security sandboxing.';
  }

  if (url.startsWith('chrome-extension://')) {
    return 'Extension management interfaces cannot be captured directly.';
  }

  if (url.includes('chromewebstore.google.com') || url.includes('chrome.google.com/webstore')) {
    return 'Chrome Web Store pages are protected by Google Chrome security policies and block content script injection.';
  }

  if (url.startsWith('view-source:')) {
    return 'Source view pages cannot be captured directly.';
  }

  if (url.startsWith('about:')) {
    return 'Empty or internal "about:" pages cannot be captured.';
  }

  return null;
}
