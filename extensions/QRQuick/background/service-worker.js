/**
 * QRQuick - Background Service Worker (Manifest V3)
 * Handles context menu actions, keyboard shortcuts, and URL routing.
 */

import { initStorage } from '../services/storage-service.js';

// Initialize storage on install
chrome.runtime.onInstalled.addListener(async () => {
  await initStorage();

  // Create context menus
  chrome.contextMenus.create({
    id: 'qrquick_page',
    title: 'Generate QR code for this page',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'qrquick_selection',
    title: "Generate QR code for '%s'",
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'qrquick_link',
    title: 'Generate QR code for this link',
    contexts: ['link']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let targetUrl = '';
  let queryParam = '';

  if (info.menuItemId === 'qrquick_page') {
    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
      queryParam = `url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;
    }
  } else if (info.menuItemId === 'qrquick_selection') {
    if (info.selectionText) {
      queryParam = `text=${encodeURIComponent(info.selectionText)}`;
    }
  } else if (info.menuItemId === 'qrquick_link') {
    if (info.linkUrl) {
      queryParam = `url=${encodeURIComponent(info.linkUrl)}`;
    }
  }

  const generatorUrl = queryParam
    ? chrome.runtime.getURL(`generator/generator.html?${queryParam}`)
    : chrome.runtime.getURL('generator/generator.html');

  chrome.tabs.create({ url: generatorUrl });
});

// Handle keyboard shortcut (Alt+Shift+Q)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-qr') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    let queryParam = '';

    if (currentTab && currentTab.url && !currentTab.url.startsWith('chrome://')) {
      queryParam = `url=${encodeURIComponent(currentTab.url)}&title=${encodeURIComponent(currentTab.title || '')}`;
    }

    const generatorUrl = queryParam
      ? chrome.runtime.getURL(`generator/generator.html?${queryParam}`)
      : chrome.runtime.getURL('generator/generator.html');

    chrome.tabs.create({ url: generatorUrl });
  }
});
