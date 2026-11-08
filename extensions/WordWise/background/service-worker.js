/**
 * WordWise - Background Service Worker (Manifest V3)
 * Orchestrates context menus, keyboard shortcuts, in-page lookup cards,
 * dictionary fetches, audio playback, and tab routing.
 */

import { lookupWord } from '../services/dictionary-service.js';
import { saveWord, initStorage } from '../services/storage-service.js';
import { playPronunciation } from '../services/audio-service.js';

const CONTEXT_MENU_ID = 'wordwise-lookup-context';

// Initialize storage and context menus on installation
chrome.runtime.onInstalled.addListener(async () => {
  await initStorage();

  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Look up "%s" with WordWise',
      contexts: ['selection']
    });
  }
});

// Handle Context Menu clicks
if (chrome.contextMenus?.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_ID && tab?.id) {
      const rawText = info.selectionText || '';
      const cleanWord = rawText.trim();
      if (!cleanWord || cleanWord.length > 100) return;

      // Ask content script for surrounding sentence context
      chrome.tabs.sendMessage(tab.id, { action: 'GET_SELECTION_CONTEXT' }, async (response) => {
        let sentence = '';
        let pageTitle = tab.title || '';
        let sourceUrl = tab.url || '';

        if (!chrome.runtime.lastError && response) {
          sentence = response.sentence || '';
          pageTitle = response.pageTitle || pageTitle;
          sourceUrl = response.sourceUrl || sourceUrl;
        }

        // Open full lookup tab with parameters
        const lookupUrl = chrome.runtime.getURL(
          `lookup/lookup.html?word=${encodeURIComponent(cleanWord)}&sentence=${encodeURIComponent(sentence)}&pageTitle=${encodeURIComponent(pageTitle)}&sourceUrl=${encodeURIComponent(sourceUrl)}`
        );
        chrome.tabs.create({ url: lookupUrl });
      });
    }
  });
}

// Handle Keyboard Shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-wordwise') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) return;

    // Check for selection
    chrome.tabs.sendMessage(tab.id, { action: 'GET_SELECTION_CONTEXT' }, (response) => {
      if (!chrome.runtime.lastError && response && response.word) {
        const lookupUrl = chrome.runtime.getURL(
          `lookup/lookup.html?word=${encodeURIComponent(response.word)}&sentence=${encodeURIComponent(response.sentence || '')}&pageTitle=${encodeURIComponent(tab.title || '')}&sourceUrl=${encodeURIComponent(tab.url || '')}`
        );
        chrome.tabs.create({ url: lookupUrl });
      } else {
        // Open library / dashboard
        chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
      }
    });
  }
});

// Handle Runtime Messages from Content Script & Extension Pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return false;

  switch (message.action) {
    case 'LOOKUP_WORD': {
      lookupWord(message.word)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ found: false, error: 'exception', message: err.message }));
      return true; // async sendResponse
    }

    case 'SAVE_VOCAB_WORD': {
      saveWord(message.payload)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    case 'PLAY_AUDIO': {
      playPronunciation({
        audioUrl: message.audioUrl,
        word: message.word,
        rate: message.rate || 0.9,
        onStateChange: (state) => {
          // If caller tab is listening
          if (sender.tab?.id) {
            chrome.tabs.sendMessage(sender.tab.id, { action: 'AUDIO_STATE_CHANGED', state }).catch(() => {});
          }
        }
      }).then(ok => sendResponse({ success: ok }));
      return true;
    }

    case 'OPEN_LOOKUP_TAB': {
      const p = message.params || {};
      const url = chrome.runtime.getURL(
        `lookup/lookup.html?word=${encodeURIComponent(p.word || '')}&sentence=${encodeURIComponent(p.sentence || '')}&pageTitle=${encodeURIComponent(p.pageTitle || '')}&sourceUrl=${encodeURIComponent(p.sourceUrl || '')}`
      );
      chrome.tabs.create({ url });
      sendResponse({ opened: true });
      return true;
    }

    case 'OPEN_LIBRARY_TAB': {
      chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
      sendResponse({ opened: true });
      return true;
    }

    case 'OPEN_FLASHCARDS_TAB': {
      chrome.tabs.create({ url: chrome.runtime.getURL('flashcards/flashcards.html') });
      sendResponse({ opened: true });
      return true;
    }

    case 'OPEN_QUIZ_TAB': {
      const mode = message.mode ? `?mode=${message.mode}` : '';
      chrome.tabs.create({ url: chrome.runtime.getURL(`quizzes/quiz.html${mode}`) });
      sendResponse({ opened: true });
      return true;
    }

    case 'OPEN_DASHBOARD_TAB': {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
      sendResponse({ opened: true });
      return true;
    }
  }

  return false;
});
