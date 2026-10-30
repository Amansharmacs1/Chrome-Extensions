/**
 * FocusFlow - Analytics and Productivity Metrics Module
 * Pure calculation logic for daily goals, 7-day historical trends, and summary metrics.
 */

/**
 * Format timestamp into local YYYY-MM-DD key
 * @param {number|Date} dateOrTs
 * @returns {string} e.g. "2026-10-27"
 */
export function getDateKey(dateOrTs = Date.now()) {
  const d = new Date(dateOrTs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if two timestamps fall on the same local calendar day
 * @param {number} ts1
 * @param {number} ts2
 * @returns {boolean}
 */
export function isSameDay(ts1, ts2) {
  return getDateKey(ts1) === getDateKey(ts2);
}

/**
 * Get start of day (00:00:00.000 local time) for given timestamp
 * @param {number} ts
 * @returns {number}
 */
export function getStartOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Calculate today's summary metrics and daily goal progress
 * @param {Array} history - Array of completed session records
 * @param {Array} tasks - Array of task objects
 * @param {Object} settings - Settings object with daily goals
 * @param {number} now - Reference timestamp
 * @returns {Object}
 */
export function getDailyStats(history = [], tasks = [], settings = {}, now = Date.now()) {
  const safeHistory = Array.isArray(history) ? history : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const todayKey = getDateKey(now);

  // Filter valid focus sessions completed today
  const todaySessions = safeHistory.filter(session => {
    if (!session || session.sessionType !== 'focus') return false;
    const sessionDate = session.completedAt || session.endTime || session.startTime;
    return getDateKey(sessionDate) === todayKey;
  });

  const focusMinutesToday = todaySessions.reduce((acc, curr) => {
    return acc + (Number(curr.durationMinutes) || 0);
  }, 0);

  const focusSessionsToday = todaySessions.length;

  // Filter tasks completed today
  const tasksCompletedToday = safeTasks.filter(task => {
    if (!task || !task.completed || !task.completedAt) return false;
    return getDateKey(task.completedAt) === todayKey;
  }).length;

  const goalMinutes = Number(settings.dailyGoalMinutes) || 120;
  const goalSessions = Number(settings.dailyGoalSessions) || 4;
  const goalTasks = Number(settings.dailyGoalTasks) || 3;

  const minutesPercent = Math.min(100, Math.round((focusMinutesToday / goalMinutes) * 100));
  const sessionsPercent = Math.min(100, Math.round((focusSessionsToday / goalSessions) * 100));
  const tasksPercent = Math.min(100, Math.round((tasksCompletedToday / goalTasks) * 100));

  return {
    todayKey,
    focusMinutesToday,
    focusSessionsToday,
    tasksCompletedToday,
    goalMinutes,
    goalSessions,
    goalTasks,
    minutesPercent,
    sessionsPercent,
    tasksPercent,
    goalsMet: {
      minutes: focusMinutesToday >= goalMinutes,
      sessions: focusSessionsToday >= goalSessions,
      tasks: tasksCompletedToday >= goalTasks
    }
  };
}

/**
 * Generate 7-day focus trend data (from 6 days ago up to today)
 * @param {Array} history
 * @param {number} now
 * @returns {Array<{ dateKey: string, dayLabel: string, dateLabel: string, focusMinutes: number, sessionsCount: number }>}
 */
export function getLast7DaysStats(history = [], now = Date.now()) {
  const safeHistory = Array.isArray(history) ? history : [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = [];

  const nowDate = new Date(now);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(nowDate);
    d.setDate(d.getDate() - i);
    const dateKey = getDateKey(d);
    const dayLabel = dayNames[d.getDay()];
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;

    // Find all focus sessions completed on this day
    const daySessions = safeHistory.filter(s => {
      if (!s || s.sessionType !== 'focus') return false;
      const refTime = s.completedAt || s.endTime || s.startTime;
      return getDateKey(refTime) === dateKey;
    });

    const focusMinutes = daySessions.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);

    days.push({
      dateKey,
      dayLabel,
      dateLabel,
      focusMinutes,
      sessionsCount: daySessions.length,
      isToday: i === 0
    });
  }

  return days;
}

/**
 * Calculate all-time summary statistics
 * @param {Array} history
 * @returns {Object}
 */
export function getAllTimeStats(history = []) {
  const safeHistory = Array.isArray(history) ? history : [];
  const focusSessions = safeHistory.filter(s => s && s.sessionType === 'focus');

  const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);
  const totalSessions = focusSessions.length;
  const averageDurationMinutes = totalSessions > 0 ? Math.round(totalFocusMinutes / totalSessions) : 0;

  // Calculate most productive day of week
  const dayTotals = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (const s of focusSessions) {
    const ref = s.completedAt || s.endTime || s.startTime;
    if (ref) {
      const day = dayNames[new Date(ref).getDay()];
      dayTotals[day] += (Number(s.durationMinutes) || 0);
    }
  }

  let mostProductiveDay = null;
  let maxMinutes = 0;
  for (const [day, mins] of Object.entries(dayTotals)) {
    if (mins > maxMinutes) {
      maxMinutes = mins;
      mostProductiveDay = day;
    }
  }

  return {
    totalFocusMinutes,
    totalSessions,
    averageDurationMinutes,
    mostProductiveDay: maxMinutes > 0 ? mostProductiveDay : null,
    hasData: totalSessions > 0
  };
}

/**
 * Get sorted session timeline for today
 * @param {Array} history
 * @param {number} now
 * @returns {Array}
 */
export function getTodaySessionTimeline(history = [], now = Date.now()) {
  const safeHistory = Array.isArray(history) ? history : [];
  const todayKey = getDateKey(now);

  return safeHistory
    .filter(s => {
      if (!s || s.sessionType !== 'focus') return false;
      const ref = s.completedAt || s.endTime || s.startTime;
      return getDateKey(ref) === todayKey;
    })
    .sort((a, b) => {
      const aTime = a.completedAt || a.endTime || a.startTime || 0;
      const bTime = b.completedAt || b.endTime || b.startTime || 0;
      return bTime - aTime;
    });
}
