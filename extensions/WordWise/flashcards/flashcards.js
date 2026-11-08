/**
 * WordWise - Flashcard Workspace Controller
 */

import { getVocabulary, updateWord, recordActivity, getStreakData } from '../services/storage-service.js';
import { getDueWords, calculateNextReview } from './scheduler.js';
import { playPronunciation } from '../services/audio-service.js';

let deck = [];
let currentIndex = 0;
let isFlipped = false;
let sessionStats = {
  reviewedCount: 0,
  ratings: { again: 0, hard: 0, good: 0, easy: 0 }
};

document.addEventListener('DOMContentLoaded', async () => {
  initFlashcards();
});

async function initFlashcards() {
  bindControls();
  await loadDeck();
}

/**
 * Loads vocabulary and prepares the active study deck based on selected filter
 */
async function loadDeck() {
  const modeSelect = document.getElementById('selectSessionMode');
  const mode = modeSelect?.value || 'due';

  const vocab = await getVocabulary();
  let filtered = [];

  switch (mode) {
    case 'due':
      filtered = getDueWords(vocab);
      break;
    case 'all':
      filtered = [...vocab];
      break;
    case 'learning':
      filtered = vocab.filter(w => w.status === 'learning');
      break;
    case 'favorites':
      filtered = vocab.filter(w => w.isFavorite);
      break;
    default:
      filtered = getDueWords(vocab);
  }

  deck = filtered;
  currentIndex = 0;
  isFlipped = false;
  sessionStats = {
    reviewedCount: 0,
    ratings: { again: 0, hard: 0, good: 0, easy: 0 }
  };

  const dueCount = getDueWords(vocab).length;
  const dueIndicator = document.getElementById('sessionDueText');
  if (dueIndicator) {
    dueIndicator.textContent = dueCount === 1 ? '1 due today' : `${dueCount} due today`;
  }

  if (deck.length === 0) {
    showEmptyState(mode);
  } else {
    showWorkspace();
    renderCurrentCard();
  }
}

/**
 * Shows empty state when no cards match current filter
 * @param {string} mode
 */
function showEmptyState(mode) {
  document.getElementById('progressBarWrap').hidden = true;
  document.getElementById('flashcardContainer').hidden = true;
  document.getElementById('sessionSummaryView').hidden = true;

  const emptyView = document.getElementById('emptyStateView');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptyMessage = document.getElementById('emptyMessage');

  emptyView.hidden = false;

  if (mode === 'due') {
    emptyTitle.textContent = 'All caught up!';
    emptyMessage.textContent = 'You have zero flashcards due for review today. Great work maintaining your vocabulary memory!';
  } else if (mode === 'favorites') {
    emptyTitle.textContent = 'No Favorite Words Yet';
    emptyMessage.textContent = 'You haven’t starred any words as favorites yet. Star words in the dictionary or library to study them here.';
  } else {
    emptyTitle.textContent = 'Your Vocabulary is Empty';
    emptyMessage.textContent = 'You haven’t saved any words yet. Discover words while reading or search the dictionary to build your deck.';
  }
}

function showWorkspace() {
  document.getElementById('progressBarWrap').hidden = false;
  document.getElementById('flashcardContainer').hidden = false;
  document.getElementById('emptyStateView').hidden = true;
  document.getElementById('sessionSummaryView').hidden = true;
}

/**
 * Renders the front and back of the current card
 */
function renderCurrentCard() {
  if (currentIndex >= deck.length) {
    showSummaryScreen();
    return;
  }

  const card = deck[currentIndex];
  isFlipped = false;

  // Reset 3D flip transform
  const flipCard = document.getElementById('flipCard');
  flipCard?.classList.remove('flipped');

  // Toggle buttons
  const btnReveal = document.getElementById('btnFlipCard');
  const sm2Buttons = document.getElementById('sm2ButtonsRow');
  if (btnReveal) btnReveal.hidden = false;
  if (sm2Buttons) sm2Buttons.hidden = true;

  // Update progress
  const progressText = document.getElementById('sessionProgressText');
  const progressFill = document.getElementById('progressFill');
  const total = deck.length;
  const currentNum = currentIndex + 1;
  const pct = Math.round((currentNum / total) * 100);

  if (progressText) progressText.textContent = `Card ${currentNum} of ${total}`;
  if (progressFill) progressFill.style.width = `${pct}%`;

  // 1. Front Face
  const frontWord = document.getElementById('cardWordTitle');
  const frontPos = document.getElementById('cardPosBadge');
  const frontPhonetic = document.getElementById('cardPhonetic');
  const frontRep = document.getElementById('cardRepetitions');

  if (frontWord) frontWord.textContent = card.displayWord || card.word;
  if (frontPos) frontPos.textContent = card.partOfSpeech || 'word';
  if (frontPhonetic) frontPhonetic.textContent = card.phonetic || '';
  if (frontRep) frontRep.textContent = `Review #${card.sm2?.repetitions || 0}`;

  // Audio button
  const audioBtn = document.getElementById('btnCardAudio');
  if (audioBtn) {
    audioBtn.onclick = (e) => {
      e.stopPropagation();
      playPronunciation({
        audioUrl: card.audioUrl,
        word: card.word
      });
    };
  }

  // 2. Back Face
  const backWord = document.getElementById('backWordTitle');
  const backPos = document.getElementById('backCardPos');
  const backStatus = document.getElementById('backCardStatus');
  const backDef = document.getElementById('backDefinition');
  const backEx = document.getElementById('backExample');
  const backExSec = document.getElementById('backExampleSection');
  const backSynSec = document.getElementById('backSynonymsSection');
  const backSynWrap = document.getElementById('backSynonymsWrap');
  const backNotesSec = document.getElementById('backNotesSection');
  const backNotes = document.getElementById('backNotesText');

  if (backWord) backWord.textContent = card.displayWord || card.word;
  if (backPos) backPos.textContent = card.partOfSpeech || 'word';
  if (backStatus) backStatus.textContent = card.status || 'learning';

  const def = Array.isArray(card.definitions) && card.definitions.length > 0
    ? card.definitions[0]
    : (card.definition || 'No definition saved.');
  if (backDef) backDef.textContent = def;

  const example = Array.isArray(card.examples) && card.examples.length > 0
    ? card.examples[0]
    : (card.customExample || card.example || card.contextSentence);

  if (example && backEx && backExSec) {
    backExSec.hidden = false;
    backEx.textContent = `“${example}”`;
  } else if (backExSec) {
    backExSec.hidden = true;
  }

  if (Array.isArray(card.synonyms) && card.synonyms.length > 0 && backSynWrap && backSynSec) {
    backSynSec.hidden = false;
    backSynWrap.innerHTML = '';
    card.synonyms.slice(0, 6).forEach(s => {
      const p = document.createElement('span');
      p.className = 'back-pill';
      p.textContent = s;
      backSynWrap.appendChild(p);
    });
  } else if (backSynSec) {
    backSynSec.hidden = true;
  }

  if (card.notes && backNotes && backNotesSec) {
    backNotesSec.hidden = false;
    backNotes.textContent = card.notes;
  } else if (backNotesSec) {
    backNotesSec.hidden = true;
  }

  // Preview upcoming interval labels on SM-2 buttons
  updateIntervalPreview(card);
}

/**
 * Calculates and displays the next review interval directly on the rating buttons
 */
function updateIntervalPreview(card) {
  const currentSm2 = card.sm2 || { repetitions: 0, interval: 1, easeFactor: 2.5 };

  const hardCalc = calculateNextReview(currentSm2, 'hard');
  const goodCalc = calculateNextReview(currentSm2, 'good');
  const easyCalc = calculateNextReview(currentSm2, 'easy');

  const subHard = document.getElementById('subHardInterval');
  const subGood = document.getElementById('subGoodInterval');
  const subEasy = document.getElementById('subEasyInterval');

  if (subHard) subHard.textContent = formatIntervalShort(hardCalc.interval);
  if (subGood) subGood.textContent = formatIntervalShort(goodCalc.interval);
  if (subEasy) subEasy.textContent = formatIntervalShort(easyCalc.interval);
}

function formatIntervalShort(days) {
  if (days <= 1) return '1d';
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return `${months}mo`;
}

/**
 * Flips the card to reveal answer
 */
function flipCurrentCard() {
  if (isFlipped) return;
  isFlipped = true;

  const flipCard = document.getElementById('flipCard');
  flipCard?.classList.add('flipped');

  const btnReveal = document.getElementById('btnFlipCard');
  const sm2Buttons = document.getElementById('sm2ButtonsRow');
  if (btnReveal) btnReveal.hidden = true;
  if (sm2Buttons) sm2Buttons.hidden = false;
}

/**
 * Handles SM-2 rating choice ('again', 'hard', 'good', 'easy')
 * @param {'again'|'hard'|'good'|'easy'} rating
 */
async function submitRating(rating) {
  if (currentIndex >= deck.length) return;
  const card = deck[currentIndex];

  const currentSm2 = card.sm2 || { repetitions: 0, interval: 1, easeFactor: 2.5 };
  const updatedSm2 = calculateNextReview(currentSm2, rating);

  // Update in storage
  await updateWord(card.id, {
    sm2: {
      repetitions: updatedSm2.repetitions,
      interval: updatedSm2.interval,
      easeFactor: updatedSm2.easeFactor,
      nextReviewDate: updatedSm2.nextReviewDate
    },
    status: updatedSm2.status,
    lastReviewed: Date.now()
  });

  // Track session telemetry
  sessionStats.reviewedCount++;
  sessionStats.ratings[rating]++;
  await recordActivity('flashcard_review', { word: card.word, rating });

  // Advance
  currentIndex++;
  renderCurrentCard();
}

/**
 * Displays completion summary screen
 */
async function showSummaryScreen() {
  document.getElementById('progressBarWrap').hidden = true;
  document.getElementById('flashcardContainer').hidden = true;
  document.getElementById('emptyStateView').hidden = true;

  const summaryView = document.getElementById('sessionSummaryView');
  summaryView.hidden = false;

  const sumTotal = document.getElementById('sumTotalReviewed');
  const sumGoodRate = document.getElementById('sumGoodRate');
  const sumStreak = document.getElementById('sumStreak');

  if (sumTotal) sumTotal.textContent = sessionStats.reviewedCount;

  const positive = sessionStats.ratings.good + sessionStats.ratings.easy;
  const ratePct = sessionStats.reviewedCount > 0
    ? Math.round((positive / sessionStats.reviewedCount) * 100)
    : 100;
  if (sumGoodRate) sumGoodRate.textContent = `${ratePct}%`;

  const streak = await getStreakData();
  if (sumStreak) sumStreak.textContent = `🔥 ${streak.currentStreak}`;
}

/**
 * Binds user clicks and keyboard shortcuts
 */
function bindControls() {
  // Flip card on click
  document.getElementById('flipCard')?.addEventListener('click', () => {
    if (!isFlipped) {
      flipCurrentCard();
    }
  });

  document.getElementById('btnFlipCard')?.addEventListener('click', () => {
    flipCurrentCard();
  });

  // Rating buttons
  document.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rating = btn.dataset.rating;
      if (rating) submitRating(rating);
    });
  });

  // Session mode dropdown
  document.getElementById('selectSessionMode')?.addEventListener('change', () => {
    loadDeck();
  });

  document.getElementById('btnStudyAllAnyway')?.addEventListener('click', () => {
    const sel = document.getElementById('selectSessionMode');
    if (sel) sel.value = 'all';
    loadDeck();
  });

  document.getElementById('btnRestartSession')?.addEventListener('click', () => {
    loadDeck();
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!isFlipped) {
        flipCurrentCard();
      }
    } else if (isFlipped) {
      if (e.key === '1') {
        submitRating('again');
      } else if (e.key === '2') {
        submitRating('hard');
      } else if (e.key === '3') {
        submitRating('good');
      } else if (e.key === '4') {
        submitRating('easy');
      }
    }
  });
}
