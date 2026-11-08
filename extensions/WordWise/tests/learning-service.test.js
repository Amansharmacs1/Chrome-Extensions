/**
 * WordWise - Learning Analytics & Chart Service Tests
 */

import {
  initStorage,
  clearAllData,
  saveWord,
  updateWord,
  saveQuizResult,
  updateSettings,
  recordActivity
} from '../services/storage-service.js';
import { computeLearningStats, generateWeeklyActivitySvg } from '../services/learning-service.js';

export async function runLearningServiceTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Learning Service Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  // Reset storage
  await initStorage();
  await clearAllData();

  // Test with empty state
  const emptyStats = await computeLearningStats();
  assert(emptyStats.totalWords === 0, 'Empty totalWords is 0');
  assert(emptyStats.currentStreak === 0, 'Empty streak is 0');
  assert(emptyStats.averageAccuracy === 0, 'Empty quiz accuracy is 0%');

  // Populate sample vocabulary
  const w1 = await saveWord({
    word: 'ubiquitous',
    definition: 'Present everywhere',
    status: 'learning'
  });
  const w2 = await saveWord({
    word: 'serendipity',
    definition: 'Happy chance',
    status: 'learning'
  });

  // Advance w2 to review status
  await updateWord(w2.item.id, {
    sm2: {
      repetitions: 1,
      interval: 6,
      easeFactor: 2.5,
      nextReviewDate: Date.now() + 6 * 86400000
    },
    status: 'review'
  });

  // Advance a 3rd word to mastered
  const w3 = await saveWord({
    word: 'ephemeral',
    definition: 'Short lived',
    status: 'learning'
  });
  await updateWord(w3.item.id, {
    sm2: {
      repetitions: 5,
      interval: 25,
      easeFactor: 2.7,
      nextReviewDate: Date.now() + 25 * 86400000
    },
    status: 'mastered'
  });

  // Add quiz results
  await saveQuizResult({ score: 9, total: 10 }); // 90%
  await saveQuizResult({ score: 7, total: 10 }); // 70%

  // Update daily goal
  await updateSettings({ dailyGoal: 5 });

  // Compute stats
  const stats = await computeLearningStats();
  assert(stats.totalWords === 3, 'Total words is 3');
  assert(stats.learningCount === 1, 'Learning count is 1');
  assert(stats.reviewCount === 1, 'Review count is 1');
  assert(stats.masteredCount === 1, 'Mastered count is 1');
  assert(stats.averageAccuracy === 80, 'Average quiz accuracy is (9+7)/20 = 80%');
  assert(stats.wordsAddedToday === 3, '3 words added today');
  assert(stats.dailyGoal === 5, 'Daily goal target is 5');
  assert(stats.dailyGoalProgress === 60, 'Daily goal progress is (3/5)*100 = 60%');

  // SVG Chart Generation
  const mockWeeklyActivity = [
    { date: '2026-11-02', count: 0, active: false },
    { date: '2026-11-03', count: 2, active: true },
    { date: '2026-11-04', count: 5, active: true },
    { date: '2026-11-05', count: 0, active: false },
    { date: '2026-11-06', count: 3, active: true },
    { date: '2026-11-07', count: 8, active: true },
    { date: '2026-11-08', count: 4, active: true }
  ];

  const svg = generateWeeklyActivitySvg(mockWeeklyActivity);
  assert(typeof svg === 'string', 'generateWeeklyActivitySvg returns a string');
  assert(svg.startsWith('<svg'), 'SVG starts with <svg tag');
  assert(svg.endsWith('</svg>'), 'SVG ends with </svg> tag');
  assert(svg.includes('class="bar-group"'), 'SVG contains bar groups');
  assert(svg.includes('fill="#8B5CF6"'), 'SVG colors active days with violet accent');
  assert(svg.includes('fill="#334155"'), 'SVG colors inactive days with slate dark');

  // Empty weekly activity returns empty string
  const emptySvg = generateWeeklyActivitySvg([]);
  assert(emptySvg === '', 'Empty activity generates empty string');

  return assertions;
}
