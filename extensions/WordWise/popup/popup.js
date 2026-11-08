/**
 * WordWise - Popup Dashboard Controller
 */

import { getDailyWordRecord, saveWord, getWordByText, getVocabulary } from '../services/storage-service.js';
import { getCuratedDataset } from '../services/dictionary-service.js';
import { computeLearningStats } from '../services/learning-service.js';
import { playPronunciation } from '../services/audio-service.js';

let currentDailyWord = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initPopup();
});

async function initPopup() {
  bindSearch();
  bindNavigation();
  await loadStats();
  await loadDailyWord();
}

/**
 * Loads learning statistics and streak counter
 */
async function loadStats() {
  try {
    const stats = await computeLearningStats();

    const streakCount = document.getElementById('streakCount');
    if (streakCount) streakCount.textContent = stats.currentStreak;

    const statTotalWords = document.getElementById('statTotalWords');
    if (statTotalWords) statTotalWords.textContent = stats.totalWords;

    const statDueCards = document.getElementById('statDueCards');
    if (statDueCards) statDueCards.textContent = stats.dueTodayCount;

    const statMastered = document.getElementById('statMastered');
    if (statMastered) statMastered.textContent = stats.masteredCount;

    const flashcardsDueSub = document.getElementById('flashcardsDueSub');
    if (flashcardsDueSub) {
      flashcardsDueSub.textContent = stats.dueTodayCount === 1
        ? '1 card due'
        : `${stats.dueTodayCount} cards due`;
    }
  } catch (err) {
    console.warn('[WordWise Popup] Stats load error:', err);
  }
}

/**
 * Deterministically picks a daily word from curated dataset based on date string
 */
async function selectCuratedDailyWord(dateStr) {
  const dataset = await getCuratedDataset();
  if (!dataset || dataset.length === 0) {
    return {
      word: 'perseverance',
      phonetic: '/ˌpɜː.sɪˈvɪə.rəns/',
      partOfSpeech: 'noun',
      definition: 'Persistence in doing something despite difficulty or delay in achieving success.',
      example: 'Her perseverance through rigorous research led to a medical breakthrough.',
      synonyms: ['tenacity', 'determination', 'resolve'],
      antonyms: ['apathy', 'hesitation', 'indifference'],
      usageTip: 'A foundational quality for language mastery.'
    };
  }

  // Hash date string to integer index
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }

  const idx = Math.abs(hash) % dataset.length;
  return dataset[idx];
}

/**
 * Loads and renders the Word of the Day
 */
async function loadDailyWord() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateLabel = `${monthNames[today.getMonth()]} ${today.getDate()}`;
  const dailyDateLabel = document.getElementById('dailyDateLabel');
  if (dailyDateLabel) dailyDateLabel.textContent = dateLabel;

  try {
    const record = await getDailyWordRecord(dateStr, () => selectCuratedDailyWord(dateStr));
    const word = record.word;
    currentDailyWord = word;

    const titleEl = document.getElementById('dailyWordTitle');
    const posEl = document.getElementById('dailyPosBadge');
    const phoneticEl = document.getElementById('dailyPhonetic');
    const defEl = document.getElementById('dailyDefinition');
    const exTextEl = document.getElementById('dailyExampleText');

    if (titleEl) titleEl.textContent = word.word.charAt(0).toUpperCase() + word.word.slice(1);
    if (posEl) posEl.textContent = word.partOfSpeech || 'word';
    if (phoneticEl) phoneticEl.textContent = word.phonetic || '';
    if (defEl) defEl.textContent = word.definition || '';
    if (exTextEl) exTextEl.textContent = word.example || '';

    // Check if word is already saved in user library
    const existing = await getWordByText(word.word);
    const saveBtn = document.getElementById('btnSaveDaily');
    const saveText = document.getElementById('saveDailyText');
    const saveIcon = document.getElementById('saveDailyIcon');

    if (existing && saveBtn && saveText && saveIcon) {
      saveBtn.classList.add('saved');
      saveIcon.textContent = '✓';
      saveText.textContent = 'Saved in Library';
      saveBtn.disabled = true;
    } else if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>Saving...</span>';

        const saveRes = await saveWord({
          word: word.word,
          displayWord: word.word.charAt(0).toUpperCase() + word.word.slice(1),
          phonetic: word.phonetic || '',
          partOfSpeech: word.partOfSpeech || 'unknown',
          definitions: [word.definition],
          examples: word.example ? [word.example] : [],
          synonyms: word.synonyms || [],
          antonyms: word.antonyms || [],
          tags: ['daily-word'],
          notes: word.usageTip ? `Usage tip: ${word.usageTip}` : ''
        });

        if (saveRes.success) {
          saveBtn.classList.add('saved');
          saveBtn.innerHTML = '<span>✓ Saved to Library</span>';
          await loadStats();
        } else if (saveRes.isDuplicate) {
          saveBtn.classList.add('saved');
          saveBtn.innerHTML = '<span>✓ Saved in Library</span>';
        } else {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<span>+ Save to Library</span>';
        }
      });
    }

    // Audio pronunciation button
    const audioBtn = document.getElementById('btnDailyAudio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        playPronunciation({
          audioUrl: word.audioUrl || null,
          word: word.word,
          onStateChange: ({ state }) => {
            if (state === 'playing') {
              audioBtn.style.background = '#8B5CF6';
              audioBtn.style.color = '#FFFFFF';
            } else {
              audioBtn.style.background = '';
              audioBtn.style.color = '';
            }
          }
        });
      });
    }

    // Full Details button
    const exploreBtn = document.getElementById('btnExploreDaily');
    if (exploreBtn) {
      exploreBtn.addEventListener('click', () => {
        openLookup(word.word);
      });
    }
  } catch (err) {
    console.warn('[WordWise Popup] Daily word load error:', err);
  }
}

/**
 * Handles search input and form submission
 */
function bindSearch() {
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input?.value.trim();
    if (!query) return;
    openLookup(query);
  });
}

function openLookup(word) {
  const url = chrome.runtime.getURL(`lookup/lookup.html?word=${encodeURIComponent(word)}`);
  chrome.tabs.create({ url });
  window.close();
}

/**
 * Binds navigation buttons to open corresponding tabs
 */
function bindNavigation() {
  document.getElementById('btnOpenDashboard')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
    window.close();
  });

  document.getElementById('btnNavFlashcards')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('flashcards/flashcards.html') });
    window.close();
  });

  document.getElementById('btnNavQuiz')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('quizzes/quiz.html') });
    window.close();
  });

  document.getElementById('btnNavLibrary')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
    window.close();
  });

  document.getElementById('btnNavAnalytics')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
    window.close();
  });
}
