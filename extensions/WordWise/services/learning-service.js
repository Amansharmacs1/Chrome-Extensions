/**
 * WordWise - Learning Analytics Service
 * Computes vocabulary mastery distribution, streak metrics,
 * weekly activity charts, and quiz performance telemetry.
 */

import { getVocabulary, getStreakData, getQuizHistory, getSettings } from './storage-service.js';

/**
 * Calculates complete learning progress statistics
 * @returns {Promise<object>}
 */
export async function computeLearningStats() {
  const vocab = await getVocabulary();
  const streak = await getStreakData();
  const quizHistory = await getQuizHistory();
  const settings = await getSettings();

  const totalWords = vocab.length;
  let learningCount = 0;
  let reviewCount = 0;
  let masteredCount = 0;
  let dueTodayCount = 0;
  let favoriteCount = 0;

  const now = Date.now();
  const dueCutoff = now + 3600000; // within next hour

  for (const item of vocab) {
    if (item.status === 'mastered') {
      masteredCount++;
    } else if (item.status === 'review') {
      reviewCount++;
    } else {
      learningCount++;
    }

    if (item.isFavorite) {
      favoriteCount++;
    }

    if (!item.sm2 || !item.sm2.nextReviewDate || item.sm2.nextReviewDate <= dueCutoff) {
      dueTodayCount++;
    }
  }

  // Quiz statistics
  const totalQuizzes = quizHistory.length;
  let totalScore = 0;
  let totalQuestions = 0;

  for (const q of quizHistory) {
    totalScore += q.score || 0;
    totalQuestions += q.total || 0;
  }

  const averageAccuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

  // Words added today
  const todayStr = new Date().toISOString().slice(0, 10);
  const wordsAddedToday = vocab.filter(item => {
    if (!item.dateAdded) return false;
    return new Date(item.dateAdded).toISOString().slice(0, 10) === todayStr;
  }).length;

  // Daily goal progress (e.g. 3 out of 5 words)
  const dailyGoal = settings.dailyGoal || 5;
  const dailyGoalProgress = Math.min(100, Math.round((wordsAddedToday / dailyGoal) * 100));

  return {
    totalWords,
    learningCount,
    reviewCount,
    masteredCount,
    dueTodayCount,
    favoriteCount,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    activeDaysTotal: streak.activeDaysTotal,
    weeklyActivity: streak.weeklyActivity,
    totalQuizzes,
    averageAccuracy,
    wordsAddedToday,
    dailyGoal,
    dailyGoalProgress
  };
}

/**
 * Generates an SVG bar chart for weekly activity
 * @param {Array<{ date: string, count: number, active: boolean }>} weeklyActivity
 * @param {number} [height=80]
 * @param {number} [width=300]
 * @returns {string} SVG markup string
 */
export function generateWeeklyActivitySvg(weeklyActivity = [], width = 280, height = 70) {
  if (!Array.isArray(weeklyActivity) || weeklyActivity.length === 0) return '';

  const maxCount = Math.max(1, ...weeklyActivity.map(w => w.count));
  const barWidth = 24;
  const gap = (width - weeklyActivity.length * barWidth) / (weeklyActivity.length - 1);

  const bars = weeklyActivity.map((day, idx) => {
    const x = Math.round(idx * (barWidth + gap));
    const barHeight = Math.max(4, Math.round((day.count / maxCount) * (height - 24)));
    const y = height - 20 - barHeight;

    const dayName = new Date(day.date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'narrow' });
    const fill = day.active ? '#8B5CF6' : '#334155';

    return `
      <g class="bar-group" data-date="${day.date}" data-count="${day.count}">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${fill}" />
        <text x="${x + barWidth / 2}" y="${height - 6}" font-size="10" text-anchor="middle" fill="#94A3B8" font-family="system-ui, sans-serif">${dayName}</text>
      </g>
    `;
  }).join('');

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}
