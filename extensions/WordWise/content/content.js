/**
 * WordWise - Content Script
 * Handles context sentence extraction, selection detection,
 * and isolated Shadow DOM floating definition card injection.
 */

(function () {
  // Prevent duplicate execution
  if (window.__WORDWISE_CONTENT_SCRIPT_INITIALIZED__) return;
  window.__WORDWISE_CONTENT_SCRIPT_INITIALIZED__ = true;

  /**
   * Intelligently extracts the full surrounding sentence around selected text
   * @param {Selection} selection
   * @returns {string} Enclosing sentence or empty string
   */
  function extractSurroundingSentence(selection) {
    if (!selection || selection.rangeCount === 0) return '';
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    // Retrieve text content from text node or immediate block parent
    let text = '';
    if (container.nodeType === Node.TEXT_NODE) {
      text = container.textContent || '';
    } else if (container.nodeType === Node.ELEMENT_NODE) {
      // Find deepest block container
      text = container.innerText || container.textContent || '';
    }

    if (!text) return '';

    const selectedText = selection.toString().trim();
    if (!selectedText) return '';

    const idx = text.indexOf(selectedText);
    if (idx === -1) {
      // Fallback: simple text truncation around selected text
      return selectedText;
    }

    // Find sentence start (look backwards for punctuation . ! ? or start of text)
    let start = 0;
    for (let i = idx - 1; i >= 0; i--) {
      const ch = text[i];
      if (ch === '.' || ch === '!' || ch === '?' || ch === '\n') {
        start = i + 1;
        break;
      }
    }

    // Find sentence end (look forwards for punctuation . ! ? or end of text)
    let end = text.length;
    for (let i = idx + selectedText.length; i < text.length; i++) {
      const ch = text[i];
      if (ch === '.' || ch === '!' || ch === '?' || ch === '\n') {
        end = i + 1;
        break;
      }
    }

    const sentence = text.substring(start, end).trim();
    // Cap sentence at reasonable length (max 300 chars)
    if (sentence.length > 300) {
      const localStart = Math.max(0, idx - 80);
      const localEnd = Math.min(text.length, idx + selectedText.length + 80);
      return '...' + text.substring(localStart, localEnd).trim() + '...';
    }

    return sentence;
  }

  /**
   * Highlights the selected word within a sentence string safely
   * @param {string} sentence
   * @param {string} word
   * @returns {string} Safe HTML with word wrapped in .wordwise-highlight
   */
  function formatHighlightedSentence(sentence = '', word = '') {
    if (!sentence || !word) return '';
    const escapedSentence = escapeHtml(sentence);
    const escapedWord = escapeHtml(word);
    const regex = new RegExp(`(\\b${escapedWord}\\b)`, 'i');
    return escapedSentence.replace(regex, '<span class="wordwise-highlight">$1</span>');
  }

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Floating Definition Card Component (Isolated via Shadow DOM)
   */
  class InPageLookupCard {
    constructor() {
      this.hostEl = null;
      this.shadowRoot = null;
      this.cardEl = null;
      this.currentWordData = null;
    }

    close() {
      if (this.hostEl) {
        this.hostEl.remove();
        this.hostEl = null;
        this.shadowRoot = null;
        this.cardEl = null;
      }
    }

    render(word, sentence, lookupResult = null, isLoading = false) {
      this.close();

      const host = document.createElement('div');
      host.id = 'wordwise-overlay-host';
      (document.body || document.documentElement).appendChild(host);

      this.hostEl = host;
      this.shadowRoot = host.attachShadow({ mode: 'open' });

      // Link stylesheet
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('content/content.css');
      this.shadowRoot.appendChild(link);

      const card = document.createElement('div');
      card.className = 'wordwise-card';

      if (isLoading) {
        card.innerHTML = `
          <div class="wordwise-header">
            <div class="wordwise-brand">
              <svg class="wordwise-logo-icon" viewBox="0 0 128 128">
                <rect width="128" height="128" rx="28" fill="#1E1B4B"/>
                <path d="M 28 36 L 46 88 L 64 48 L 82 88 L 100 36" fill="none" stroke="#8B5CF6" stroke-width="12" stroke-linecap="round"/>
              </svg>
              <span class="wordwise-brand-title">WordWise</span>
              <span class="wordwise-brand-badge">Looking up...</span>
            </div>
            <button class="wordwise-close-btn" id="btnWordwiseClose">&times;</button>
          </div>
          <div class="wordwise-body" style="align-items: center; justify-content: center; min-height: 120px;">
            <div class="wordwise-loading-spinner"></div>
            <div style="font-size: 13px; color: #94A3B8; margin-top: 8px;">Searching dictionary for "${escapeHtml(word)}"...</div>
          </div>
        `;
      } else if (!lookupResult || !lookupResult.found) {
        const errorMsg = lookupResult?.message || `No definition found for "${word}".`;
        card.innerHTML = `
          <div class="wordwise-header">
            <div class="wordwise-brand">
              <svg class="wordwise-logo-icon" viewBox="0 0 128 128">
                <rect width="128" height="128" rx="28" fill="#1E1B4B"/>
                <path d="M 28 36 L 46 88 L 64 48 L 82 88 L 100 36" fill="none" stroke="#8B5CF6" stroke-width="12" stroke-linecap="round"/>
              </svg>
              <span class="wordwise-brand-title">WordWise</span>
            </div>
            <button class="wordwise-close-btn" id="btnWordwiseClose">&times;</button>
          </div>
          <div class="wordwise-body">
            <div class="wordwise-word-title">${escapeHtml(word)}</div>
            <div class="wordwise-definition" style="border-left-color: #EF4444;">
              ${escapeHtml(errorMsg)}
            </div>
            ${sentence ? `
              <div class="wordwise-context-box">
                <div class="wordwise-context-lbl">Contextual Sentence</div>
                <div class="wordwise-context-text">${formatHighlightedSentence(sentence, word)}</div>
              </div>
            ` : ''}
          </div>
          <div class="wordwise-footer">
            <button class="wordwise-btn wordwise-btn-secondary" id="btnOpenFullLookup">Open Dictionary</button>
          </div>
        `;
      } else {
        const d = lookupResult.data;
        this.currentWordData = d;
        const primaryMeaning = d.meanings?.[0];
        const primaryDef = primaryMeaning?.definitions?.[0]?.definition || d.allDefinitions?.[0] || 'Definition unavailable.';
        const pos = primaryMeaning?.partOfSpeech || 'word';

        card.innerHTML = `
          <div class="wordwise-header">
            <div class="wordwise-brand">
              <svg class="wordwise-logo-icon" viewBox="0 0 128 128">
                <rect width="128" height="128" rx="28" fill="#1E1B4B"/>
                <path d="M 28 36 L 46 88 L 64 48 L 82 88 L 100 36" fill="none" stroke="#8B5CF6" stroke-width="12" stroke-linecap="round"/>
              </svg>
              <span class="wordwise-brand-title">WordWise</span>
              ${d.isOfflineFallback ? '<span class="wordwise-brand-badge" style="background:#334155; color:#94A3B8;">Offline</span>' : ''}
            </div>
            <button class="wordwise-close-btn" id="btnWordwiseClose">&times;</button>
          </div>
          <div class="wordwise-body">
            <div class="wordwise-word-row">
              <div>
                <div class="wordwise-word-title">${escapeHtml(d.displayWord || d.word)}</div>
                ${d.phonetic ? `<div class="wordwise-phonetic">${escapeHtml(d.phonetic)}</div>` : ''}
              </div>
              <button class="wordwise-btn wordwise-btn-secondary" id="btnPronounceAudio" style="flex:0; padding:6px 10px; font-size:11px;" title="Listen to pronunciation">
                🔊
              </button>
            </div>
            <div>
              <span class="wordwise-pos-tag">${escapeHtml(pos)}</span>
            </div>
            <div class="wordwise-definition">
              ${escapeHtml(primaryDef)}
            </div>
            ${sentence ? `
              <div class="wordwise-context-box">
                <div class="wordwise-context-lbl">Sentence Context</div>
                <div class="wordwise-context-text">${formatHighlightedSentence(sentence, word)}</div>
              </div>
            ` : ''}
          </div>
          <div class="wordwise-footer">
            <button class="wordwise-btn wordwise-btn-primary" id="btnSaveToVocab">
              <span>+ Save Word</span>
            </button>
            <button class="wordwise-btn wordwise-btn-secondary" id="btnOpenFullLookup">
              <span>Details ↗</span>
            </button>
          </div>
        `;
      }

      this.shadowRoot.appendChild(card);
      this.cardEl = card;
      this.bindEvents(word, sentence, lookupResult);
    }

    bindEvents(word, sentence, lookupResult) {
      if (!this.shadowRoot) return;

      this.shadowRoot.getElementById('btnWordwiseClose')?.addEventListener('click', () => {
        this.close();
      });

      this.shadowRoot.getElementById('btnOpenFullLookup')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          action: 'OPEN_LOOKUP_TAB',
          params: {
            word,
            sentence,
            pageTitle: document.title,
            sourceUrl: window.location.href
          }
        });
        this.close();
      });

      this.shadowRoot.getElementById('btnPronounceAudio')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          action: 'PLAY_AUDIO',
          word,
          audioUrl: lookupResult?.data?.audioUrl || null
        });
      });

      this.shadowRoot.getElementById('btnSaveToVocab')?.addEventListener('click', async () => {
        const btn = this.shadowRoot.getElementById('btnSaveToVocab');
        if (!btn || !lookupResult?.data) return;

        btn.disabled = true;
        btn.innerHTML = '<span>Saving...</span>';

        const d = lookupResult.data;
        chrome.runtime.sendMessage({
          action: 'SAVE_VOCAB_WORD',
          payload: {
            word: d.word,
            displayWord: d.displayWord || d.word,
            phonetic: d.phonetic || '',
            partOfSpeech: d.meanings?.[0]?.partOfSpeech || 'unknown',
            definitions: d.allDefinitions || [],
            examples: d.allExamples || [],
            synonyms: d.allSynonyms || [],
            antonyms: d.allAntonyms || [],
            audioUrl: d.audioUrl || null,
            contextSentence: sentence || '',
            pageTitle: document.title || '',
            sourceUrl: window.location.href || ''
          }
        }, (response) => {
          if (response?.success) {
            btn.innerHTML = '<span>Saved! ✓</span>';
            btn.style.backgroundColor = '#10B981';
            setTimeout(() => this.close(), 1200);
          } else if (response?.isDuplicate) {
            btn.innerHTML = '<span>Already Saved ✓</span>';
            btn.style.backgroundColor = '#6366F1';
            setTimeout(() => this.close(), 1400);
          } else {
            btn.disabled = false;
            btn.innerHTML = '<span>Failed to save</span>';
          }
        });
      });
    }
  }

  const lookupCard = new InPageLookupCard();

  // Listen for messages from background service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return false;

    switch (message.action) {
      case 'GET_SELECTION_CONTEXT': {
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString().trim() : '';
        const sentence = extractSurroundingSentence(selection);

        sendResponse({
          word: selectedText,
          sentence,
          pageTitle: document.title,
          sourceUrl: window.location.href
        });
        return true;
      }

      case 'SHOW_INPAGE_CARD': {
        lookupCard.render(message.word, message.sentence, message.lookupResult, message.isLoading);
        sendResponse({ displayed: true });
        return true;
      }

      case 'CLOSE_INPAGE_CARD': {
        lookupCard.close();
        sendResponse({ closed: true });
        return true;
      }
    }
  });

  // Close card when pressing Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      lookupCard.close();
    }
  });
})();
