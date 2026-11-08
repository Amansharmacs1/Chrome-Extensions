/**
 * WordWise - Quiz Interface Controller
 */

import { getVocabulary, saveQuizResult, getStreakData } from '../services/storage-service.js';
import { getCuratedDataset } from '../services/dictionary-service.js';
import { generateQuiz, evaluateAnswer } from './quiz-engine.js';

let questions = [];
let currentIndex = 0;
let currentScore = 0;
let activeMode = 'mixed';
let hasAnsweredCurrent = false;

document.addEventListener('DOMContentLoaded', async () => {
  initQuiz();
});

function initQuiz() {
  bindModeTabs();
  bindControls();

  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get('mode');
  if (modeParam && ['mixed', 'meaning', 'word', 'cloze', 'synonym'].includes(modeParam)) {
    activeMode = modeParam;
    updateActiveTabUI(modeParam);
  }

  startQuizSession(activeMode);
}

/**
 * Initializes and starts a new quiz session
 * @param {string} mode
 */
async function startQuizSession(mode = 'mixed') {
  activeMode = mode;
  currentIndex = 0;
  currentScore = 0;
  hasAnsweredCurrent = false;

  const userVocab = await getVocabulary();
  const fallbackVocab = await getCuratedDataset();

  questions = generateQuiz({
    mode,
    userVocab,
    fallbackVocab,
    questionCount: 10
  });

  document.getElementById('questionCard').hidden = false;
  document.getElementById('quizSummaryView').hidden = true;
  document.getElementById('quizProgressWrap').hidden = false;

  const scoreEl = document.getElementById('currentScore');
  if (scoreEl) scoreEl.textContent = '0';

  if (questions.length === 0) {
    showNoQuestionsView();
  } else {
    renderCurrentQuestion();
  }
}

function showNoQuestionsView() {
  const card = document.getElementById('questionCard');
  if (card) {
    card.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 36px; margin-bottom: 12px;">📚</div>
        <h2 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 8px;">Not Enough Words for this Mode</h2>
        <p style="font-size: 13px; color: #94A3B8; max-width: 400px; margin: 0 auto 20px;">
          To take a synonym or cloze quiz, you need saved words with synonyms or sample sentences. Try "Mixed" or look up new words.
        </p>
        <button id="btnSwitchMixed" class="action-btn primary">Switch to Mixed Mode</button>
      </div>
    `;
    document.getElementById('btnSwitchMixed')?.addEventListener('click', () => {
      updateActiveTabUI('mixed');
      startQuizSession('mixed');
    });
  }
}

/**
 * Renders the question, prompt, and choices
 */
function renderCurrentQuestion() {
  if (currentIndex >= questions.length) {
    finishQuiz();
    return;
  }

  const q = questions[currentIndex];
  hasAnsweredCurrent = false;

  // Update progress bar & counter
  const total = questions.length;
  const currentNum = currentIndex + 1;
  const counterText = document.getElementById('questionCounterText');
  const progressFill = document.getElementById('quizProgressFill');

  if (counterText) counterText.textContent = `Question ${currentNum} of ${total}`;
  if (progressFill) progressFill.style.width = `${Math.round((currentNum / total) * 100)}%`;

  // Mode badge
  const modeBadge = document.getElementById('questionModeBadge');
  if (modeBadge) {
    const labels = {
      meaning: 'Meaning Challenge',
      word: 'Word Challenge',
      cloze: 'Fill in the Blank',
      synonym: 'Synonym Challenge'
    };
    modeBadge.textContent = labels[q.mode] || 'Vocabulary Challenge';
  }

  // Prompt
  const promptEl = document.getElementById('questionPrompt');
  if (promptEl) promptEl.textContent = q.prompt;

  // Options
  const grid = document.getElementById('optionsGrid');
  if (grid) {
    grid.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];

    q.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `
        <span class="option-letter">${letters[idx] || (idx + 1)}</span>
        <span>${escapeHtml(optText)}</span>
      `;
      btn.addEventListener('click', () => handleOptionSelect(idx));
      grid.appendChild(btn);
    });
  }

  // Hide feedback banner
  const feedback = document.getElementById('feedbackBanner');
  if (feedback) feedback.hidden = true;
}

/**
 * Evaluates the selected option and provides immediate visual feedback
 * @param {number} selectedIndex
 */
function handleOptionSelect(selectedIndex) {
  if (hasAnsweredCurrent) return;
  hasAnsweredCurrent = true;

  const q = questions[currentIndex];
  const evalResult = evaluateAnswer(q, selectedIndex);

  const optionButtons = document.querySelectorAll('.option-btn');
  optionButtons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === evalResult.correctIndex) {
      btn.classList.add('correct');
    } else if (idx === selectedIndex && !evalResult.isCorrect) {
      btn.classList.add('wrong');
    }
  });

  if (evalResult.isCorrect) {
    currentScore++;
    const scoreEl = document.getElementById('currentScore');
    if (scoreEl) scoreEl.textContent = currentScore;
  }

  // Show feedback banner
  const feedback = document.getElementById('feedbackBanner');
  const icon = document.getElementById('feedbackStatusIcon');
  const title = document.getElementById('feedbackStatusTitle');
  const text = document.getElementById('feedbackExplanation');

  if (feedback && icon && title && text) {
    feedback.hidden = false;
    feedback.className = `feedback-banner ${evalResult.isCorrect ? 'correct' : 'wrong'}`;
    icon.textContent = evalResult.isCorrect ? '✓' : '✕';
    title.textContent = evalResult.isCorrect ? 'Correct!' : 'Incorrect';
    text.textContent = evalResult.explanation;
  }
}

/**
 * Completes the quiz session, saves history, and renders summary
 */
async function finishQuiz() {
  document.getElementById('questionCard').hidden = true;
  document.getElementById('quizProgressWrap').hidden = true;

  const summary = document.getElementById('quizSummaryView');
  if (summary) summary.hidden = false;

  const total = questions.length;
  const accuracy = total > 0 ? Math.round((currentScore / total) * 100) : 0;

  // Save in local storage history
  await saveQuizResult({
    mode: activeMode,
    score: currentScore,
    total,
    accuracy
  });

  const finalScoreText = document.getElementById('finalScoreText');
  const finalAccuracyText = document.getElementById('finalAccuracyText');
  const finalStreakText = document.getElementById('finalStreakText');
  const headline = document.getElementById('summaryHeadline');
  const sub = document.getElementById('summarySub');
  const trophy = document.getElementById('summaryTrophy');

  if (finalScoreText) finalScoreText.textContent = `${currentScore} / ${total}`;
  if (finalAccuracyText) finalAccuracyText.textContent = `${accuracy}%`;

  const streak = await getStreakData();
  if (finalStreakText) finalStreakText.textContent = `🔥 ${streak.currentStreak}`;

  if (accuracy >= 80) {
    if (trophy) trophy.textContent = '🏆';
    if (headline) headline.textContent = 'Outstanding Mastery!';
    if (sub) sub.textContent = 'You demonstrated excellent recall and semantic understanding.';
  } else if (accuracy >= 50) {
    if (trophy) trophy.textContent = '👏';
    if (headline) headline.textContent = 'Great Effort!';
    if (sub) sub.textContent = 'Keep practicing with flashcards to strengthen your retention.';
  } else {
    if (trophy) trophy.textContent = '💪';
    if (headline) headline.textContent = 'Keep Learning!';
    if (sub) sub.textContent = 'Regular spaced repetition will turn these challenging words into second nature.';
  }
}

function bindModeTabs() {
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      if (mode) {
        updateActiveTabUI(mode);
        startQuizSession(mode);
      }
    });
  });
}

function updateActiveTabUI(mode) {
  document.querySelectorAll('.mode-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });
}

function bindControls() {
  document.getElementById('btnNextQuestion')?.addEventListener('click', () => {
    currentIndex++;
    renderCurrentQuestion();
  });

  document.getElementById('btnRetryQuiz')?.addEventListener('click', () => {
    startQuizSession(activeMode);
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (!hasAnsweredCurrent) {
      if (['1', 'a', 'A'].includes(e.key)) handleOptionSelect(0);
      else if (['2', 'b', 'B'].includes(e.key)) handleOptionSelect(1);
      else if (['3', 'c', 'C'].includes(e.key)) handleOptionSelect(2);
      else if (['4', 'd', 'D'].includes(e.key)) handleOptionSelect(3);
    } else {
      if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        currentIndex++;
        renderCurrentQuestion();
      }
    }
  });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
