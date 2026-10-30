/**
 * NewTab Pro - Habit Tracker & Streaks Unit Tests
 */

import {
  createHabit,
  toggleHabitForToday,
  calculateStreak,
  deleteHabit,
  DEFAULT_HABITS
} from '../modules/habits.js';

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}`);
    failed++;
  }
}

console.log('\n--- Running Habit Tracker & Streaks Tests ---');

// 1. Habit Creation
const h1 = createHabit('Drink 2L Water', '💧');
assert(h1.id.startsWith('habit-'), 'Generates unique habit ID');
assert(h1.title === 'Drink 2L Water', 'Assigns habit title');
assert(h1.icon === '💧', 'Assigns emoji icon');
assert(typeof h1.history === 'object', 'Initializes empty history');

let threw = false;
try {
  createHabit('   ');
} catch {
  threw = true;
}
assert(threw, 'Rejects empty habit title');

// 2. Toggle Today
const habits = [h1];
const toggled = toggleHabitForToday(habits, h1.id, '2026-10-29');
assert(toggled[0].history['2026-10-29'] === true, 'Marks habit completed for date');

const untoggled = toggleHabitForToday(toggled, h1.id, '2026-10-29');
assert(!untoggled[0].history['2026-10-29'], 'Toggles habit back to incomplete');

// 3. Streak Calculations
const habitWithHistory = {
  id: 'h-streak',
  title: 'Meditate',
  icon: '🧘',
  history: {
    '2026-10-29': true,
    '2026-10-28': true,
    '2026-10-27': true,
    '2026-10-25': true // Missed 2026-10-26
  }
};

const streak = calculateStreak(habitWithHistory, '2026-10-29');
assert(streak === 3, 'Calculates consecutive streak stopping at broken day (3 days)');

const noHistoryHabit = { id: 'h-empty', history: {} };
assert(calculateStreak(noHistoryHabit, '2026-10-29') === 0, 'Zero streak for empty history');

// 4. Deleting Habits
const list = [...DEFAULT_HABITS];
const initialLen = list.length;
const pruned = deleteHabit(list, list[0].id);
assert(pruned.length === initialLen - 1, 'Deletes target habit successfully');

console.log(`Habit Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
