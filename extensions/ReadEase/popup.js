/**
 * ReadEase - Popup Controller
 * Connects active browser tab, in-page article extraction, quick save,
 * reading time previews, theme pickers, and library navigation.
 */

import { saveArticle, getLibraryIndex, STORAGE_KEY_ACTIVE } from './scripts/article-manager.js';
import { getSettings, saveSettings } from './scripts/settings.js';
import { setLocalStorage } from './scripts/storage.js';
import { formatReadingTime } from './scripts/utils.js';

let currentArticle = null;
let currentTab = null;

async function initPopup() {
  // DOM Elements
  const stateScanning = document.getElementById('stateScanning');
  const stateArticle = document.getElementById('stateArticle');
  const stateUnsupported = document.getElementById('stateUnsupported');
  const unsupportedDesc = document.getElementById('unsupportedDesc');
  const selectionFallbackRow = document.getElementById('selectionFallbackRow');

  const siteBadge = document.getElementById('siteBadge');
  const readingTimeBadge = document.getElementById('readingTimeBadge');
  const articleTitle = document.getElementById('articleTitle');
  const articleExcerpt = document.getElementById('articleExcerpt');

  const btnReadNow = document.getElementById('btnReadNow');
  const btnSaveLater = document.getElementById('btnSaveLater');
  const btnSaveText = document.getElementById('btnSaveText');
  const btnReadSelection = document.getElementById('btnReadSelection');
  const btnGoToLibrary = document.getElementById('btnGoToLibrary');
  const openLibraryBtn = document.getElementById('openLibraryBtn');
  const libraryCountText = document.getElementById('libraryCountText');

  const themeDots = document.querySelectorAll('.theme-dot');

  // 1. Initialize user settings and theme selector
  try {
    const settings = await getSettings();
    themeDots.forEach(dot => {
      if (dot.dataset.theme === settings.theme) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }

      dot.addEventListener('click', async () => {
        themeDots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        await saveSettings({ theme: dot.dataset.theme });
      });
    });
  } catch (err) {
    console.warn('[ReadEase Popup] Settings load error:', err);
  }

  // 2. Load library article count
  try {
    const index = await getLibraryIndex();
    const count = index.length;
    libraryCountText.textContent = `Library: ${count} ${count === 1 ? 'article' : 'articles'}`;
  } catch {
    libraryCountText.textContent = 'Library';
  }

  // 3. Library Navigation
  const navigateToLibrary = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('library.html') }, () => {
        if (chrome.runtime?.lastError) {
          console.warn('[ReadEase Popup] Library tab error:', chrome.runtime.lastError.message);
        }
        window.close();
      });
    } else {
      window.location.href = 'library.html';
    }
  };

  openLibraryBtn?.addEventListener('click', navigateToLibrary);
  btnGoToLibrary?.addEventListener('click', navigateToLibrary);

  // 4. Query current tab and execute extraction
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    showUnsupportedState('Chrome extension APIs unavailable in this context.');
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
    if (chrome.runtime?.lastError) {
      console.warn('[ReadEase Popup] Tabs query warning:', chrome.runtime.lastError.message);
    }

    currentTab = tabs?.[0];

    if (!currentTab || !currentTab.url) {
      showUnsupportedState('No active tab detected.');
      return;
    }

    const url = currentTab.url;

    // Check for restricted URLs
    if (
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:') ||
      url.includes('chromewebstore.google.com') ||
      url.includes('chrome.google.com/webstore')
    ) {
      showUnsupportedState('Browser system pages and the Web Store cannot be converted into reader mode.');
      return;
    }

    // Execute in-page extraction script
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['scripts/inpage-extractor.js']
      });

      const extracted = results?.[0]?.result;

      if (!extracted) {
        showUnsupportedState('Could not extract content from this page.');
        return;
      }

      if (!extracted.isArticle) {
        showUnsupportedState(extracted.reason || 'This page does not contain standard article text.');

        // If user highlighted text on the page, offer to read selected text
        if (extracted.selectedText && selectionFallbackRow) {
          selectionFallbackRow.hidden = false;
          btnReadSelection?.addEventListener('click', async () => {
            currentArticle = {
              id: `art-sel-${Date.now()}`,
              isArticle: true,
              isSelection: true,
              url,
              title: `Selection from ${extracted.title || 'Page'}`,
              byline: '',
              publishedTime: new Date().toISOString(),
              siteName: extracted.siteName || '',
              excerpt: extracted.selectedText.slice(0, 160) + '...',
              contentHtml: extracted.selectedText.split(/\n\s*\n/).map(p => `<p>${p.trim()}</p>`).join(''),
              textContent: extracted.selectedText,
              wordCount: extracted.selectedText.split(/\s+/).length,
              readingTime: Math.max(1, Math.ceil(extracted.selectedText.split(/\s+/).length / 225)),
              extractedAt: Date.now()
            };
            await openReaderWithArticle(currentArticle);
          });
        }
        return;
      }

      // Success: Article detected!
      currentArticle = extracted;
      currentArticle.id = currentArticle.id || `art-${Date.now()}`;

      showArticleState(currentArticle);

      // Check if already in library
      try {
        const libraryIndex = await getLibraryIndex();
        const existing = libraryIndex.find(item => item.url === currentArticle.url || item.title === currentArticle.title);
        if (existing) {
          currentArticle.id = existing.id;
          markSavedState(true);
        }
      } catch (idxErr) {
        console.warn('[ReadEase Popup] Library lookup warning:', idxErr);
      }
    } catch (err) {
      console.error('[ReadEase Popup] Extraction error:', err);
      showUnsupportedState('Unable to access this page. The page may restrict script access or be offline.');
    }
  });

  // Action: Read Now
  btnReadNow?.addEventListener('click', async () => {
    if (!currentArticle) return;
    await openReaderWithArticle(currentArticle);
  });

  // Action: Save to Library
  btnSaveLater?.addEventListener('click', async () => {
    if (!currentArticle) return;
    try {
      btnSaveLater.disabled = true;
      btnSaveText.textContent = 'Saving...';

      await saveArticle(currentArticle);
      markSavedState(true);

      // Refresh library counter
      const updatedIndex = await getLibraryIndex();
      libraryCountText.textContent = `Library: ${updatedIndex.length} ${updatedIndex.length === 1 ? 'article' : 'articles'}`;
    } catch (err) {
      console.error('[ReadEase Popup] Save error:', err);
      btnSaveText.textContent = 'Failed to Save';
      btnSaveLater.disabled = false;
    }
  });

  // UI state transition helpers
  function showArticleState(article) {
    if (stateScanning) {
      stateScanning.hidden = true;
      stateScanning.classList.remove('active');
    }
    if (stateUnsupported) {
      stateUnsupported.hidden = true;
      stateUnsupported.classList.remove('active');
    }
    if (stateArticle) {
      stateArticle.hidden = false;
      stateArticle.classList.add('active');
    }

    if (siteBadge) siteBadge.textContent = article.siteName || 'Web Article';
    if (readingTimeBadge) readingTimeBadge.textContent = `⏱️ ${formatReadingTime(article.readingTime || 1)}`;
    if (articleTitle) articleTitle.textContent = article.title || 'Untitled Article';
    if (articleExcerpt) articleExcerpt.textContent = article.excerpt || (article.textContent ? article.textContent.slice(0, 160) + '...' : '');
  }

  function showUnsupportedState(reason) {
    if (stateScanning) {
      stateScanning.hidden = true;
      stateScanning.classList.remove('active');
    }
    if (stateArticle) {
      stateArticle.hidden = true;
      stateArticle.classList.remove('active');
    }
    if (stateUnsupported) {
      stateUnsupported.hidden = false;
      stateUnsupported.classList.add('active');
    }
    if (unsupportedDesc) unsupportedDesc.textContent = reason;
  }

  function markSavedState(isSaved) {
    if (!btnSaveLater || !btnSaveText) return;
    if (isSaved) {
      btnSaveLater.classList.add('saved');
      btnSaveText.textContent = 'Saved in Library ✓';
      btnSaveLater.disabled = true;
    } else {
      btnSaveLater.classList.remove('saved');
      btnSaveText.textContent = 'Save to Library';
      btnSaveLater.disabled = false;
    }
  }

  async function openReaderWithArticle(article) {
    try {
      await saveArticle(article);
    } catch (saveErr) {
      console.warn('[ReadEase Popup] Auto-save error (continuing with active store):', saveErr);
    }

    await setLocalStorage(STORAGE_KEY_ACTIVE, article);

    const readerUrl = chrome.runtime.getURL(`reader.html?id=${encodeURIComponent(article.id)}`);
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: readerUrl }, () => {
        if (chrome.runtime?.lastError) {
          console.warn('[ReadEase Popup] Tab create error:', chrome.runtime.lastError.message);
        }
        window.close();
      });
    } else {
      window.location.href = readerUrl;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  initPopup();
}
