/**
 * FocusFlow - Timer Calculations and State Transition Module
 * Pure functional state transitions and timestamp math designed for MV3 service workers.
 */

export const SESSION_MODES = {
  FOCUS: 'focus',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak'
};

export const SESSION_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed'
};

/**
 * Format seconds into MM:SS string
 * @param {number} totalSeconds
 * @returns {string} e.g. "25:00"
 */
export function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Human-readable label for session mode
 * @param {string} mode
 * @returns {string}
 */
export function formatModeLabel(mode) {
  switch (mode) {
    case SESSION_MODES.SHORT_BREAK:
      return 'Short Break';
    case SESSION_MODES.LONG_BREAK:
      return 'Long Break';
    case SESSION_MODES.FOCUS:
    default:
      return 'Focus Session';
  }
}

/**
 * Returns duration in seconds for given mode from settings
 * @param {string} mode
 * @param {Object} settings
 * @returns {number} duration in seconds
 */
export function getDurationSeconds(mode, settings) {
  if (settings.devFastTimer) {
    return 10; // 10 seconds for rapid testing
  }
  switch (mode) {
    case SESSION_MODES.SHORT_BREAK:
      return (Number(settings.shortBreakMinutes) || 5) * 60;
    case SESSION_MODES.LONG_BREAK:
      return (Number(settings.longBreakMinutes) || 15) * 60;
    case SESSION_MODES.FOCUS:
    default:
      return (Number(settings.focusDurationMinutes) || 25) * 60;
  }
}

/**
 * Calculate remaining seconds from current state and timestamp.
 * Resilient to service worker sleep, time drift, and pause states.
 * @param {Object} state
 * @param {number} now
 * @returns {number}
 */
export function calculateRemainingSeconds(state, now = Date.now()) {
  if (!state) return 0;

  if (state.status === SESSION_STATUS.IDLE) {
    return state.remainingSeconds !== undefined ? state.remainingSeconds : state.totalSeconds;
  }

  if (state.status === SESSION_STATUS.PAUSED) {
    return Math.max(0, state.pausedRemainingSeconds ?? state.remainingSeconds ?? 0);
  }

  if (state.status === SESSION_STATUS.COMPLETED) {
    return 0;
  }

  if (state.status === SESSION_STATUS.RUNNING) {
    if (!state.targetEndTimestamp) {
      return state.remainingSeconds || 0;
    }
    const diffMs = state.targetEndTimestamp - now;
    return Math.max(0, Math.ceil(diffMs / 1000));
  }

  return 0;
}

/**
 * Transition state into 'running'
 * @param {Object} currentState
 * @param {Object} settings
 * @param {number} now
 * @returns {Object} new timer state
 */
export function startSession(currentState, settings, now = Date.now()) {
  const mode = currentState.mode || SESSION_MODES.FOCUS;
  const totalSeconds = getDurationSeconds(mode, settings);
  const durationMinutes = Math.round(totalSeconds / 60);
  const sessionId = `ff_${now}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    ...currentState,
    sessionId,
    mode,
    status: SESSION_STATUS.RUNNING,
    durationMinutes,
    totalSeconds,
    remainingSeconds: totalSeconds,
    startTimestamp: now,
    targetEndTimestamp: now + (totalSeconds * 1000),
    pausedRemainingSeconds: null
  };
}

/**
 * Transition state into 'paused'
 * @param {Object} currentState
 * @param {number} now
 * @returns {Object} new timer state
 */
export function pauseSession(currentState, now = Date.now()) {
  if (currentState.status !== SESSION_STATUS.RUNNING) {
    return currentState;
  }
  const remaining = calculateRemainingSeconds(currentState, now);
  return {
    ...currentState,
    status: SESSION_STATUS.PAUSED,
    pausedRemainingSeconds: remaining,
    remainingSeconds: remaining,
    targetEndTimestamp: null
  };
}

/**
 * Transition paused state into 'running'
 * @param {Object} currentState
 * @param {number} now
 * @returns {Object} new timer state
 */
export function resumeSession(currentState, now = Date.now()) {
  if (currentState.status !== SESSION_STATUS.PAUSED) {
    return currentState;
  }
  const remaining = Math.max(1, currentState.pausedRemainingSeconds ?? currentState.remainingSeconds);
  return {
    ...currentState,
    status: SESSION_STATUS.RUNNING,
    remainingSeconds: remaining,
    targetEndTimestamp: now + (remaining * 1000),
    pausedRemainingSeconds: null
  };
}

/**
 * Reset timer to idle for current mode
 * @param {Object} currentState
 * @param {Object} settings
 * @returns {Object} new timer state
 */
export function resetSession(currentState, settings) {
  const mode = currentState.mode || SESSION_MODES.FOCUS;
  const totalSeconds = getDurationSeconds(mode, settings);
  return {
    ...currentState,
    sessionId: null,
    status: SESSION_STATUS.IDLE,
    totalSeconds,
    remainingSeconds: totalSeconds,
    startTimestamp: null,
    targetEndTimestamp: null,
    pausedRemainingSeconds: null
  };
}

/**
 * Advance to next session mode on explicit skip
 * @param {Object} currentState
 * @param {Object} settings
 * @returns {Object} new timer state
 */
export function skipSession(currentState, settings) {
  let nextMode = SESSION_MODES.FOCUS;
  let nextCycle = currentState.currentCycle || 1;

  if (currentState.mode === SESSION_MODES.FOCUS) {
    const cycleThreshold = Number(settings.sessionsBeforeLongBreak) || 4;
    if (nextCycle >= cycleThreshold) {
      nextMode = SESSION_MODES.LONG_BREAK;
      nextCycle = 1;
    } else {
      nextMode = SESSION_MODES.SHORT_BREAK;
      nextCycle += 1;
    }
  } else {
    nextMode = SESSION_MODES.FOCUS;
  }

  const totalSeconds = getDurationSeconds(nextMode, settings);

  return {
    ...currentState,
    sessionId: null,
    mode: nextMode,
    currentCycle: nextCycle,
    status: SESSION_STATUS.IDLE,
    totalSeconds,
    remainingSeconds: totalSeconds,
    startTimestamp: null,
    targetEndTimestamp: null,
    pausedRemainingSeconds: null
  };
}

/**
 * Complete current session, produce historical record (for focus only), and plan next mode
 * @param {Object} currentState
 * @param {Object} settings
 * @param {number} now
 * @returns {{ nextState: Object, completedRecord: Object|null }}
 */
export function completeSession(currentState, settings, now = Date.now()) {
  let completedRecord = null;
  let nextMode = SESSION_MODES.FOCUS;
  let nextCycle = currentState.currentCycle || 1;

  if (currentState.mode === SESSION_MODES.FOCUS) {
    // Only record focus sessions as completed productive units
    const actualDurationMinutes = Math.max(1, Math.round((currentState.totalSeconds || 25 * 60) / 60));
    completedRecord = {
      id: currentState.sessionId || `session_${now}`,
      startTime: currentState.startTimestamp || (now - (currentState.totalSeconds * 1000)),
      endTime: now,
      completedAt: now,
      durationMinutes: actualDurationMinutes,
      sessionType: SESSION_MODES.FOCUS,
      taskId: currentState.activeTaskId || null
    };

    const cycleThreshold = Number(settings.sessionsBeforeLongBreak) || 4;
    if (nextCycle >= cycleThreshold) {
      nextMode = SESSION_MODES.LONG_BREAK;
      nextCycle = 1;
    } else {
      nextMode = SESSION_MODES.SHORT_BREAK;
      nextCycle += 1;
    }
  } else {
    // Break finished, cycle remains pointing to the upcoming focus session
    nextMode = SESSION_MODES.FOCUS;
  }

  const nextTotalSeconds = getDurationSeconds(nextMode, settings);
  const shouldAutoStart = nextMode === SESSION_MODES.FOCUS ? settings.autoStartFocus : settings.autoStartBreaks;

  let nextState;
  if (shouldAutoStart) {
    const newSessionId = `ff_${now}_${Math.random().toString(36).substring(2, 7)}`;
    nextState = {
      ...currentState,
      sessionId: newSessionId,
      mode: nextMode,
      currentCycle: nextCycle,
      status: SESSION_STATUS.RUNNING,
      totalSeconds: nextTotalSeconds,
      remainingSeconds: nextTotalSeconds,
      startTimestamp: now,
      targetEndTimestamp: now + (nextTotalSeconds * 1000),
      pausedRemainingSeconds: null,
      lastCompletedSessionId: currentState.sessionId
    };
  } else {
    nextState = {
      ...currentState,
      sessionId: null,
      mode: nextMode,
      currentCycle: nextCycle,
      status: SESSION_STATUS.IDLE,
      totalSeconds: nextTotalSeconds,
      remainingSeconds: nextTotalSeconds,
      startTimestamp: null,
      targetEndTimestamp: null,
      pausedRemainingSeconds: null,
      lastCompletedSessionId: currentState.sessionId
    };
  }

  return { nextState, completedRecord };
}
