/**
 * NewTab Pro - Habit Tracker & Daily Streaks Engine
 * Tracks recurring daily habits, calculates consecutive streaks, and maintains date history.
 */

import { getDateKey } from './tasks.js';

export const DEFAULT_HABITS = [
  { id: 'habit-1', title: 'Drink 2L Water', icon: '💧', history: {} },
  { id: 'habit-2', title: 'Read 20 Minutes', icon: '📖', history: {} },
  { id: 'habit-3', title: 'Code / Build', icon: '💻', history: {} },
  { id: 'habit-4', title: 'Stretch / Exercise', icon: '🏃', history: {} }
];

/**
 * Calculates current consecutive streak for a habit
 * @param {Object} habit
 * @param {string} [todayKey]
 * @returns {number}
 */
export function calculateStreak(habit, todayKey = getDateKey()) {
  if (!habit || !habit.history || typeof habit.history !== 'object') return 0;

  const history = habit.history;
  let streak = 0;

  const today = new Date(todayKey);
  const isDoneToday = Boolean(history[todayKey]);

  if (isDoneToday) {
    streak = 1;
  }

  // Check backward from yesterday
  let checkDate = new Date(today);
  checkDate.setDate(checkDate.getDate() - 1);

  while (true) {
    const key = getDateKey(checkDate);
    if (history[key]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Creates a new habit
 * @param {string} title
 * @param {string} [icon]
 * @returns {Object}
 */
export function createHabit(title, icon = '⭐') {
  const clean = (title || '').trim();
  if (!clean) {
    throw new Error('Habit title cannot be empty.');
  }

  return {
    id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: clean,
    icon: icon || '⭐',
    history: {}
  };
}

/**
 * Toggles today's completion for a habit
 * @param {Array} habits
 * @param {string} id
 * @param {string} [todayKey]
 * @returns {Array}
 */
export function toggleHabitForToday(habits, id, todayKey = getDateKey()) {
  return habits.map(h => {
    if (h.id !== id) return h;
    const history = { ...(h.history || {}) };
    if (history[todayKey]) {
      delete history[todayKey];
    } else {
      history[todayKey] = true;
    }
    return {
      ...h,
      history
    };
  });
}

/**
 * Deletes a habit
 * @param {Array} habits
 * @param {string} id
 * @returns {Array}
 */
export function deleteHabit(habits, id) {
  return habits.filter(h => h.id !== id);
}
