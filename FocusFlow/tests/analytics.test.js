/**
 * FocusFlow - Analytics Unit Tests
 */

import assert from 'node:assert';
import {
  getDateKey,
  isSameDay,
  getStartOfDay,
  getDailyStats,
  getLast7DaysStats,
  getAllTimeStats,
  getTodaySessionTimeline
} from '../modules/analytics.js';

export function run() {
  console.log('🧪 Testing Analytics Module...');

  // Fixed reference: 2026-10-27 10:00:00
  const now = new Date('2026-10-27T10:00:00').getTime();
  const todayKey = getDateKey(now);
  assert.strictEqual(todayKey, '2026-10-27');

  // Midnight boundary test
  const morning = new Date('2026-10-27T00:01:00').getTime();
  const yesterdayNight = new Date('2026-10-26T23:59:00').getTime();
  assert.strictEqual(isSameDay(now, morning), true);
  assert.strictEqual(isSameDay(now, yesterdayNight), false);

  const sod = getStartOfDay(now);
  const sodDate = new Date(sod);
  assert.strictEqual(sodDate.getHours(), 0);
  assert.strictEqual(sodDate.getMinutes(), 0);
  assert.strictEqual(sodDate.getSeconds(), 0);

  // 1. Zero data test
  const emptyDaily = getDailyStats([], [], { dailyGoalMinutes: 120, dailyGoalSessions: 4, dailyGoalTasks: 3 }, now);
  assert.strictEqual(emptyDaily.focusMinutesToday, 0);
  assert.strictEqual(emptyDaily.focusSessionsToday, 0);
  assert.strictEqual(emptyDaily.tasksCompletedToday, 0);
  assert.strictEqual(emptyDaily.minutesPercent, 0);

  const emptyAllTime = getAllTimeStats([]);
  assert.strictEqual(emptyAllTime.totalFocusMinutes, 0);
  assert.strictEqual(emptyAllTime.totalSessions, 0);
  assert.strictEqual(emptyAllTime.averageDurationMinutes, 0);
  assert.strictEqual(emptyAllTime.mostProductiveDay, null);

  // 2. Real records calculation
  const mockHistory = [
    // Today session 1: 25 mins
    { id: 's1', sessionType: 'focus', durationMinutes: 25, completedAt: now - 3600 * 1000, taskId: 't1' },
    // Today session 2: 25 mins
    { id: 's2', sessionType: 'focus', durationMinutes: 25, completedAt: now - 1800 * 1000, taskId: 't1' },
    // Today break session: 5 mins (MUST NOT COUNT AS FOCUS!)
    { id: 's3', sessionType: 'shortBreak', durationMinutes: 5, completedAt: now - 1500 * 1000 },
    // Yesterday session: 50 mins
    { id: 's4', sessionType: 'focus', durationMinutes: 50, completedAt: yesterdayNight, taskId: 't2' }
  ];

  const mockTasks = [
    { id: 't1', title: 'Task 1', completed: true, completedAt: now - 1800 * 1000 },
    { id: 't2', title: 'Task 2', completed: true, completedAt: yesterdayNight },
    { id: 't3', title: 'Task 3', completed: false, completedAt: null }
  ];

  const settings = {
    dailyGoalMinutes: 100,
    dailyGoalSessions: 4,
    dailyGoalTasks: 2
  };

  const daily = getDailyStats(mockHistory, mockTasks, settings, now);
  assert.strictEqual(daily.focusMinutesToday, 50, 'Must aggregate today focus sessions (25 + 25)');
  assert.strictEqual(daily.focusSessionsToday, 2, 'Must count 2 focus sessions today');
  assert.strictEqual(daily.tasksCompletedToday, 1, 'Only Task 1 was completed today');
  assert.strictEqual(daily.minutesPercent, 50, '50 mins / 100 mins goal = 50%');
  assert.strictEqual(daily.sessionsPercent, 50, '2 / 4 sessions = 50%');
  assert.strictEqual(daily.tasksPercent, 50, '1 / 2 tasks = 50%');

  // 3. 7-Day Stats
  const sevenDays = getLast7DaysStats(mockHistory, now);
  assert.strictEqual(sevenDays.length, 7);
  assert.strictEqual(sevenDays[6].isToday, true);
  assert.strictEqual(sevenDays[6].focusMinutes, 50);
  assert.strictEqual(sevenDays[5].focusMinutes, 50); // Yesterday
  assert.strictEqual(sevenDays[0].focusMinutes, 0);

  // 4. All-time stats
  const allTime = getAllTimeStats(mockHistory);
  assert.strictEqual(allTime.totalFocusMinutes, 100);
  assert.strictEqual(allTime.totalSessions, 3); // s1, s2, s4 (s3 was break!)
  assert.strictEqual(allTime.averageDurationMinutes, 33); // 100 / 3 = 33.3 -> 33
  assert.ok(allTime.mostProductiveDay !== null);

  // 5. Timeline sorting
  const timeline = getTodaySessionTimeline(mockHistory, now);
  assert.strictEqual(timeline.length, 2);
  assert.strictEqual(timeline[0].id, 's2'); // More recent
  assert.strictEqual(timeline[1].id, 's1');

  console.log('✅ All Analytics tests passed!');
}
