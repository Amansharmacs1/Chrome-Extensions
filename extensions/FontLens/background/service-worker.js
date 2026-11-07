/**
 * FontLens - Background Service Worker (Manifest V3)
 * Coordinates shortcut keybindings (Alt+Shift+F), context menus,
 * tab scripting injections, and extension lifecycle events.
 */

// Install / Update lifecycle
chrome.runtime.onInstalled.addListener(() => {
  // Create right-click context menu safely
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: 'fontlens-inspect-context',
      title: 'Inspect Typography with FontLens (Alt+Shift+F)',
      contexts: ['selection', 'page', 'link']
    });
  }
});

// Handle Context Menu clicks
if (chrome.contextMenus?.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'fontlens-inspect-context' && tab?.id) {
      await toggleTabInspection(tab.id, tab.url);
    }
  });
}

// Handle Keyboard Shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-inspection') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id && tab?.url) {
      await toggleTabInspection(tab.id, tab.url);
    }
  }
});

/**
 * Toggles inspection script on target tab
 * @param {number} tabId
 * @param {string} url
 */
async function toggleTabInspection(tabId, url = '') {
  // Check for restricted URLs
  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.includes('chromewebstore.google.com')
  ) {
    return;
  }

  try {
    // Send toggle message if already injected
    chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_INSPECTION' }, async (response) => {
      if (chrome.runtime?.lastError || !response) {
        // Not yet injected, inject inspector now
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['inspector/inspector.js']
          });
        } catch (injectErr) {
          console.warn('[FontLens Background] Injection error:', injectErr);
        }
      }
    });
  } catch (err) {
    console.warn('[FontLens Background] Inspection toggle error:', err);
  }
}
