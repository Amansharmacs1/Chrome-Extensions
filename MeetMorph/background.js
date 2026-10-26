/**
 * MeetMorph - Background Service Worker (Manifest V3)
 * Handles extension installation, global keyboard shortcuts (Command+Shift+V),
 * badge status updates, and lifecycle management.
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[MeetMorph] Extension installed:', details.reason);
  chrome.action.setBadgeText({ text: '' });
});

// Handle keyboard command (e.g. Command+Shift+V to toggle vanish)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-vanish') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id) {
      try {
        await chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE' });
      } catch (err) {
        console.warn('[MeetMorph] Could not send toggle command to active tab:', err.message);
      }
    }
  }
});

// Listen for status updates to update the extension action badge
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'STATUS_UPDATE' && sender.tab && sender.tab.id) {
    const status = message.payload;
    if (status.isVanished) {
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: 'VAN' });
      chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#8b5cf6' });
    } else if (status.hasRawStream) {
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: 'LIVE' });
      chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#10b981' });
    } else {
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: '' });
    }
  }
});
