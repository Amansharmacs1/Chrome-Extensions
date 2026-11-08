/**
 * WordWise - Learning Analytics & Settings Controller
 * Handles user metrics, streak analytics, settings adjustments,
 * and data backup/reset operations.
 */

import {
  getSettings,
  updateSettings,
  exportAllData,
  clearAllData,
  clearDefinitionCache
} from '../services/storage-service.js';
import { computeLearningStats, generateWeeklyActivitySvg } from '../services/learning-service.js';

// DOM Elements
const valCurrentStreak = document.getElementById('valCurrentStreak');
const valLongestStreak = document.getElementById('valLongestStreak');
const valActiveDays = document.getElementById('valActiveDays');
const valTotalWords = document.getElementById('valTotalWords');
const goalProgressFill = document.getElementById('goalProgressFill');
const goalNote = document.getElementById('goalNote');
const valQuizAccuracy = document.getElementById('valQuizAccuracy');
const quizCountNote = document.getElementById('quizCountNote');
const valMasteryRate = document.getElementById('valMasteryRate');
const masteryCountNote = document.getElementById('masteryCountNote');

const weeklyChartBox = document.getElementById('weeklyChartBox');
const countStageLearning = document.getElementById('countStageLearning');
const countStageReview = document.getElementById('countStageReview');
const countStageMastered = document.getElementById('countStageMastered');

const settingDailyGoal = document.getElementById('settingDailyGoal');
const settingSpeechRate = document.getElementById('settingSpeechRate');
const btnExportFullBackup = document.getElementById('btnExportFullBackup');
const btnClearCache = document.getElementById('btnClearCache');
const btnDeleteAll = document.getElementById('btnDeleteAll');

/**
 * Initializes dashboard data and event handlers
 */
async function initDashboard() {
  await renderAnalytics();
  await loadSettings();
  bindEvents();
}

/**
 * Calculates and displays learning analytics metrics
 */
async function renderAnalytics() {
  const stats = await computeLearningStats();

  // Streak metrics
  if (valCurrentStreak) valCurrentStreak.textContent = `${stats.currentStreak} Day${stats.currentStreak === 1 ? '' : 's'}`;
  if (valLongestStreak) valLongestStreak.textContent = stats.longestStreak;
  if (valActiveDays) valActiveDays.textContent = stats.activeDaysTotal;

  // Total words & daily goal
  if (valTotalWords) valTotalWords.textContent = stats.totalWords;
  if (goalProgressFill) goalProgressFill.style.width = `${stats.dailyGoalProgress}%`;
  if (goalNote) goalNote.textContent = `Goal: ${stats.wordsAddedToday}/${stats.dailyGoal} words today`;

  // Quiz statistics
  if (valQuizAccuracy) valQuizAccuracy.textContent = `${stats.averageAccuracy}%`;
  if (quizCountNote) {
    quizCountNote.textContent = `Across ${stats.totalQuizzes} quiz session${stats.totalQuizzes === 1 ? '' : 's'}`;
  }

  // Mastery percentage
  const totalVocab = stats.totalWords;
  const masteryPercent = totalVocab > 0 ? Math.round((stats.masteredCount / totalVocab) * 100) : 0;
  if (valMasteryRate) valMasteryRate.textContent = `${masteryPercent}%`;
  if (masteryCountNote) {
    masteryCountNote.textContent = `${stats.masteredCount} mastered / ${stats.reviewCount} review`;
  }

  // Retention stages breakdown
  if (countStageLearning) {
    countStageLearning.textContent = `${stats.learningCount} word${stats.learningCount === 1 ? '' : 's'}`;
  }
  if (countStageReview) {
    countStageReview.textContent = `${stats.reviewCount} word${stats.reviewCount === 1 ? '' : 's'}`;
  }
  if (countStageMastered) {
    countStageMastered.textContent = `${stats.masteredCount} word${stats.masteredCount === 1 ? '' : 's'}`;
  }

  // Weekly SVG activity chart
  if (weeklyChartBox) {
    weeklyChartBox.innerHTML = generateWeeklyActivitySvg(stats.weeklyActivity);
  }
}

/**
 * Loads user preferences into form controls
 */
async function loadSettings() {
  const settings = await getSettings();

  if (settingDailyGoal) {
    settingDailyGoal.value = String(settings.dailyGoal || 5);
  }

  if (settingSpeechRate) {
    settingSpeechRate.value = String(settings.speechRate || 0.9);
  }
}

/**
 * Binds UI action handlers
 */
function bindEvents() {
  // Update daily goal
  if (settingDailyGoal) {
    settingDailyGoal.addEventListener('change', async (e) => {
      const val = parseInt(e.target.value, 10);
      await updateSettings({ dailyGoal: val });
      await renderAnalytics();
    });
  }

  // Update speech synthesis speed
  if (settingSpeechRate) {
    settingSpeechRate.addEventListener('change', async (e) => {
      const val = parseFloat(e.target.value);
      await updateSettings({ speechRate: val });
    });
  }

  // Full backup JSON export
  if (btnExportFullBackup) {
    btnExportFullBackup.addEventListener('click', async () => {
      try {
        const backupData = await exportAllData();
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `wordwise_full_backup_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const originalText = btnExportFullBackup.textContent;
        btnExportFullBackup.textContent = '✓ Backup Exported';
        setTimeout(() => {
          btnExportFullBackup.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error('Failed to export backup:', err);
        alert('Failed to generate full data backup.');
      }
    });
  }

  // Clear dictionary response cache
  if (btnClearCache) {
    btnClearCache.addEventListener('click', async () => {
      try {
        await clearDefinitionCache();
        const originalText = btnClearCache.textContent;
        btnClearCache.textContent = '✓ Cache Cleared';
        setTimeout(() => {
          btnClearCache.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error('Failed to clear cache:', err);
        alert('Failed to clear dictionary cache.');
      }
    });
  }

  // Permanent erase all data
  if (btnDeleteAll) {
    btnDeleteAll.addEventListener('click', async () => {
      const confirmed = window.confirm(
        'Are you sure you want to permanently erase ALL WordWise data?\n\n' +
        'This will remove all saved vocabulary words, your learning streak, and your quiz history. ' +
        'This action cannot be undone.'
      );

      if (confirmed) {
        try {
          await clearAllData();
          await renderAnalytics();
          await loadSettings();
          alert('All WordWise user data has been reset.');
        } catch (err) {
          console.error('Failed to reset data:', err);
          alert('Failed to reset all data.');
        }
      }
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initDashboard);
