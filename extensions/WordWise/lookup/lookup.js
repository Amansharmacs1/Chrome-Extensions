/**
 * WordWise - Full Lookup Interface Controller
 */

import { lookupWord } from '../services/dictionary-service.js';
import { saveWord, updateWord, getWordByText, getVocabulary } from '../services/storage-service.js';
import { playPronunciation, stopAudio } from '../services/audio-service.js';

let currentWordData = null;
let currentContextMeta = null;
let isAlreadySaved = false;
let savedWordId = null;

const RECENT_SEARCHES_STORAGE_KEY = 'wordwise_recent_lookups';

document.addEventListener('DOMContentLoaded', async () => {
  initLookupPage();
});

function initLookupPage() {
  bindFormEvents();
  bindNavigation();
  loadRecentSearches();

  // Parse URL search parameters
  const params = new URLSearchParams(window.location.search);
  const wordParam = params.get('word');
  const sentenceParam = params.get('sentence');
  const pageTitleParam = params.get('pageTitle');
  const sourceUrlParam = params.get('sourceUrl');

  if (wordParam) {
    executeLookup(wordParam, {
      sentence: sentenceParam,
      pageTitle: pageTitleParam,
      sourceUrl: sourceUrlParam
    });
  } else {
    // Default focus search
    document.getElementById('lookupSearchInput')?.focus();
  }
}

/**
 * Executes a dictionary lookup
 * @param {string} rawWord
 * @param {object} [contextMeta]
 */
async function executeLookup(rawWord = '', contextMeta = {}) {
  const word = String(rawWord).trim();
  if (!word) return;

  currentContextMeta = contextMeta;

  // Update input text
  const searchInput = document.getElementById('lookupSearchInput');
  if (searchInput) searchInput.value = word;

  // Update view states
  showView('loading');
  const loadingTitle = document.getElementById('loadingTitle');
  if (loadingTitle) loadingTitle.textContent = `Looking up "${word}"...`;

  try {
    const result = await lookupWord(word);

    if (!result || !result.found) {
      showErrorView(word, result?.message);
      return;
    }

    currentWordData = result.data;
    await renderWordDefinition(result.data, contextMeta);
    recordRecentSearch(word);
    showView('definition');
  } catch (err) {
    console.error('[WordWise Lookup] Error:', err);
    showErrorView(word, err.message);
  }
}

/**
 * Renders the full normalized word definition
 * @param {object} data
 * @param {object} contextMeta
 */
async function renderWordDefinition(data, contextMeta = {}) {
  document.title = `${data.displayWord || data.word} — WordWise Dictionary`;

  // 1. Hero Card
  const titleEl = document.getElementById('heroWordTitle');
  const phoneticEl = document.getElementById('heroPhonetic');
  const audioSourceBadge = document.getElementById('audioSourceBadge');
  const offlineNotice = document.getElementById('offlineNotice');

  if (titleEl) titleEl.textContent = data.displayWord || data.word;
  if (phoneticEl) {
    phoneticEl.textContent = data.phonetic || '';
    phoneticEl.hidden = !data.phonetic;
  }

  if (audioSourceBadge) {
    if (data.audioUrl) {
      audioSourceBadge.textContent = 'Authentic audio';
      audioSourceBadge.hidden = false;
    } else {
      audioSourceBadge.textContent = 'Synthesized voice';
      audioSourceBadge.hidden = false;
    }
  }

  if (offlineNotice) {
    offlineNotice.hidden = !data.isOfflineFallback;
  }

  // 2. Audio Button
  const btnAudio = document.getElementById('btnHeroAudio');
  if (btnAudio) {
    btnAudio.onclick = () => {
      const btnText = document.getElementById('audioButtonText');
      playPronunciation({
        audioUrl: data.audioUrl,
        word: data.word,
        onStateChange: ({ state, label }) => {
          if (state === 'playing') {
            btnAudio.style.background = '#8B5CF6';
            btnAudio.style.color = '#FFFFFF';
            if (btnText) btnText.textContent = 'Playing...';
          } else {
            btnAudio.style.background = '';
            btnAudio.style.color = '';
            if (btnText) btnText.textContent = 'Pronounce';
          }
        }
      });
    };
  }

  // 3. Context Sentence
  const contextSection = document.getElementById('contextSentenceSection');
  const contextTextEl = document.getElementById('contextSentenceText');
  const contextLinkRow = document.getElementById('contextSourceLinkRow');
  const contextSourceLink = document.getElementById('contextSourceLink');

  const sentence = contextMeta.sentence;
  if (sentence && sentence.trim()) {
    contextSection.hidden = false;
    contextTextEl.innerHTML = formatHighlightedSentence(sentence, data.word);

    if (contextMeta.sourceUrl) {
      contextLinkRow.hidden = false;
      contextSourceLink.href = contextMeta.sourceUrl;
      contextSourceLink.textContent = contextMeta.pageTitle || contextMeta.sourceUrl;
    } else {
      contextLinkRow.hidden = true;
    }
  } else {
    contextSection.hidden = true;
  }

  // 4. Meanings grouped by Part of Speech
  const container = document.getElementById('meaningsContainer');
  if (container) {
    container.innerHTML = '';

    if (Array.isArray(data.meanings) && data.meanings.length > 0) {
      data.meanings.forEach((m) => {
        const block = document.createElement('section');
        block.className = 'meaning-block';

        const posHeader = `
          <div class="meaning-pos-header">
            <span class="pos-pill">${escapeHtml(m.partOfSpeech)}</span>
          </div>
        `;

        let defsHtml = '<ol class="definitions-list">';
        m.definitions.forEach((d, idx) => {
          defsHtml += `
            <li class="definition-item">
              <span class="def-num">${idx + 1}.</span>
              <div class="def-content">
                <div class="def-text">${escapeHtml(d.definition)}</div>
                ${d.example ? `<div class="def-example">“${escapeHtml(d.example)}”</div>` : ''}
              </div>
            </li>
          `;
        });
        defsHtml += '</ol>';

        block.innerHTML = posHeader + defsHtml;
        container.appendChild(block);
      });
    } else {
      container.innerHTML = '<div class="state-sub">No structured definitions found for this entry.</div>';
    }
  }

  // 5. Synonyms & Antonyms
  const synCard = document.getElementById('synonymsCard');
  const synPills = document.getElementById('synonymsPills');
  const antGroup = document.getElementById('antonymsGroup');
  const antPills = document.getElementById('antonymsPills');

  const hasSyns = Array.isArray(data.allSynonyms) && data.allSynonyms.length > 0;
  const hasAnts = Array.isArray(data.allAntonyms) && data.allAntonyms.length > 0;

  if (hasSyns || hasAnts) {
    synCard.hidden = false;

    if (hasSyns && synPills) {
      synPills.innerHTML = '';
      data.allSynonyms.slice(0, 15).forEach(s => {
        const pill = document.createElement('button');
        pill.className = 'synonym-pill';
        pill.textContent = s;
        pill.addEventListener('click', () => executeLookup(s));
        synPills.appendChild(pill);
      });
    }

    if (hasAnts && antPills && antGroup) {
      antGroup.hidden = false;
      antPills.innerHTML = '';
      data.allAntonyms.slice(0, 15).forEach(a => {
        const pill = document.createElement('button');
        pill.className = 'synonym-pill';
        pill.textContent = a;
        pill.addEventListener('click', () => executeLookup(a));
        antPills.appendChild(pill);
      });
    } else if (antGroup) {
      antGroup.hidden = true;
    }
  } else if (synCard) {
    synCard.hidden = true;
  }

  // 6. Check if word is already in vocabulary library and update form
  await syncSavedStatus(data.word);
}

/**
 * Checks if word is already saved and fills sidebar inputs
 * @param {string} word
 */
async function syncSavedStatus(word) {
  const existing = await getWordByText(word);
  const saveActionBtn = document.getElementById('btnOpenSaveModal');
  const saveActionText = document.getElementById('saveActionText');
  const saveActionIcon = document.getElementById('saveActionIcon');
  const btnSaveSidebar = document.getElementById('btnSaveSidebar');
  const statusMsg = document.getElementById('saveStatusIndicator');

  const notesInput = document.getElementById('inputCustomNotes');
  const exampleInput = document.getElementById('inputCustomExample');
  const tagsInput = document.getElementById('inputTags');
  const statusSelect = document.getElementById('selectStatus');
  const favCheck = document.getElementById('checkFavorite');

  if (existing) {
    isAlreadySaved = true;
    savedWordId = existing.id;

    if (saveActionBtn && saveActionText && saveActionIcon) {
      saveActionBtn.classList.add('saved');
      saveActionIcon.textContent = '✓';
      saveActionText.textContent = 'Saved in Vocabulary';
    }

    if (btnSaveSidebar) btnSaveSidebar.textContent = 'Update Vocabulary Record';
    if (statusMsg) statusMsg.textContent = `Saved on ${new Date(existing.dateAdded).toLocaleDateString()}. Next SM-2 review in ${existing.sm2?.interval || 1} day(s).`;

    if (notesInput) notesInput.value = existing.notes || '';
    if (exampleInput) exampleInput.value = existing.customExample || '';
    if (tagsInput) tagsInput.value = Array.isArray(existing.tags) ? existing.tags.join(', ') : '';
    if (statusSelect) statusSelect.value = existing.status || 'learning';
    if (favCheck) favCheck.checked = Boolean(existing.isFavorite);
  } else {
    isAlreadySaved = false;
    savedWordId = null;

    if (saveActionBtn && saveActionText && saveActionIcon) {
      saveActionBtn.classList.remove('saved');
      saveActionIcon.textContent = '+';
      saveActionText.textContent = 'Save to Vocabulary';
    }

    if (btnSaveSidebar) btnSaveSidebar.textContent = 'Save Word';
    if (statusMsg) statusMsg.textContent = 'Save this word to activate spaced repetition flashcards and quizzes.';

    if (notesInput) notesInput.value = '';
    if (exampleInput) exampleInput.value = '';
    if (tagsInput) tagsInput.value = '';
    if (statusSelect) statusSelect.value = 'learning';
    if (favCheck) favCheck.checked = false;
  }
}

/**
 * Handles saving or updating the current word
 */
async function handleSaveWord() {
  if (!currentWordData) return;

  const btn = document.getElementById('btnSaveSidebar');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving...';
  }

  const notes = document.getElementById('inputCustomNotes')?.value.trim() || '';
  const customExample = document.getElementById('inputCustomExample')?.value.trim() || '';
  const rawTags = document.getElementById('inputTags')?.value || '';
  const tags = rawTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
  const status = document.getElementById('selectStatus')?.value || 'learning';
  const isFavorite = Boolean(document.getElementById('checkFavorite')?.checked);

  if (isAlreadySaved && savedWordId) {
    // Update existing record
    const updateRes = await updateWord(savedWordId, {
      notes,
      customExample,
      tags,
      status,
      isFavorite,
      contextSentence: currentContextMeta?.sentence || undefined,
      sourceUrl: currentContextMeta?.sourceUrl || undefined,
      pageTitle: currentContextMeta?.pageTitle || undefined
    });

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Updated! ✓';
      setTimeout(() => { btn.textContent = 'Update Vocabulary Record'; }, 1500);
    }
  } else {
    // Save new record
    const saveRes = await saveWord({
      word: currentWordData.word,
      displayWord: currentWordData.displayWord || currentWordData.word,
      phonetic: currentWordData.phonetic || '',
      partOfSpeech: currentWordData.meanings?.[0]?.partOfSpeech || 'unknown',
      definitions: currentWordData.allDefinitions || [],
      examples: currentWordData.allExamples || [],
      synonyms: currentWordData.allSynonyms || [],
      antonyms: currentWordData.allAntonyms || [],
      audioUrl: currentWordData.audioUrl || null,
      notes,
      customExample,
      tags,
      status,
      isFavorite,
      contextSentence: currentContextMeta?.sentence || '',
      sourceUrl: currentContextMeta?.sourceUrl || '',
      pageTitle: currentContextMeta?.pageTitle || ''
    });

    if (saveRes.success) {
      isAlreadySaved = true;
      savedWordId = saveRes.item?.id;

      const saveActionBtn = document.getElementById('btnOpenSaveModal');
      const saveActionText = document.getElementById('saveActionText');
      const saveActionIcon = document.getElementById('saveActionIcon');
      if (saveActionBtn && saveActionText && saveActionIcon) {
        saveActionBtn.classList.add('saved');
        saveActionIcon.textContent = '✓';
        saveActionText.textContent = 'Saved in Vocabulary';
      }

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Saved! ✓';
        setTimeout(() => { btn.textContent = 'Update Vocabulary Record'; }, 1500);
      }
    } else {
      if (btn) {
        btn.disabled = false;
        btn.textContent = saveRes.isDuplicate ? 'Already in Library ✓' : 'Failed to save';
      }
    }
  }
}

/**
 * Switch view states between loading, definition, and error
 * @param {'loading'|'definition'|'error'} view
 */
function showView(view) {
  const loadingView = document.getElementById('loadingView');
  const definitionView = document.getElementById('definitionView');
  const errorView = document.getElementById('errorView');

  if (loadingView) loadingView.hidden = view !== 'loading';
  if (definitionView) definitionView.hidden = view !== 'definition';
  if (errorView) errorView.hidden = view !== 'error';
}

function showErrorView(word, customMessage) {
  showView('error');
  const title = document.getElementById('errorTitle');
  const msg = document.getElementById('errorMessage');
  if (title) title.textContent = `No entry found for "${word}"`;
  if (msg) msg.textContent = customMessage || 'Verify your spelling or try looking up a base/root form.';
}

/**
 * Recent searches history management
 */
function recordRecentSearch(word) {
  const clean = word.trim().toLowerCase();
  if (!clean) return;

  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(w => w.toLowerCase() !== clean);
    filtered.unshift(word);
    if (filtered.length > 10) filtered.length = 10;
    localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(filtered));
    loadRecentSearches();
  } catch {}
}

function loadRecentSearches() {
  const listEl = document.getElementById('recentLookupsList');
  if (!listEl) return;

  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];

    if (list.length === 0) {
      listEl.innerHTML = '<li class="empty-list-item">No recent searches yet.</li>';
      return;
    }

    listEl.innerHTML = '';
    list.forEach(w => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'recent-item-btn';
      btn.innerHTML = `<span>${escapeHtml(w)}</span><span style="color:#64748B;">→</span>`;
      btn.addEventListener('click', () => executeLookup(w));
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  } catch {
    listEl.innerHTML = '<li class="empty-list-item">No recent searches yet.</li>';
  }
}

/**
 * Event bindings
 */
function bindFormEvents() {
  document.getElementById('lookupSearchForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('lookupSearchInput')?.value.trim();
    if (query) executeLookup(query);
  });

  document.getElementById('btnSaveSidebar')?.addEventListener('click', handleSaveWord);

  document.getElementById('btnOpenSaveModal')?.addEventListener('click', () => {
    // Scroll sidebar into view or trigger save
    handleSaveWord();
  });

  document.getElementById('btnClearHistory')?.addEventListener('click', () => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
      loadRecentSearches();
    } catch {}
  });

  document.getElementById('btnRetryLookup')?.addEventListener('click', () => {
    const query = document.getElementById('lookupSearchInput')?.value.trim();
    if (query) executeLookup(query);
  });
}

function bindNavigation() {
  document.getElementById('brandLink')?.addEventListener('click', () => {
    window.location.href = chrome.runtime.getURL('library/library.html');
  });

  document.getElementById('btnHeaderLibrary')?.addEventListener('click', () => {
    window.location.href = chrome.runtime.getURL('library/library.html');
  });

  document.getElementById('btnHeaderFlashcards')?.addEventListener('click', () => {
    window.location.href = chrome.runtime.getURL('flashcards/flashcards.html');
  });

  document.getElementById('btnHeaderQuiz')?.addEventListener('click', () => {
    window.location.href = chrome.runtime.getURL('quizzes/quiz.html');
  });
}

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
