/**
 * FocusFlow - Timer Unit Tests
 */

import assert from 'node:assert';
import {
  SESSION_MODES,
  SESSION_STATUS,
  formatTime,
  formatModeLabel,
  getDurationSeconds,
  calculateRemainingSeconds,
  startSession,
  pauseSession,
  resumeSession,
  resetSession,
  skipSession,
  completeSession
} from '../modules/timer.js';

export function run() {
  console.log('🧪 Testing Timer Module...');

  const mockSettings = {
    focusDurationMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
    devFastTimer: false
  };

  // 1. formatTime
  assert.strictEqual(formatTime(1500), '25:00');
  assert.strictEqual(formatTime(300), '05:00');
  assert.strictEqual(formatTime(59), '00:59');
  assert.strictEqual(formatTime(0), '00:00');
  assert.strictEqual(formatTime(-10), '00:00');

  // 2. formatModeLabel
  assert.strictEqual(formatModeLabel(SESSION_MODES.FOCUS), 'Focus Session');
  assert.strictEqual(formatModeLabel(SESSION_MODES.SHORT_BREAK), 'Short Break');
  assert.strictEqual(formatModeLabel(SESSION_MODES.LONG_BREAK), 'Long Break');

  // 3. getDurationSeconds
  assert.strictEqual(getDurationSeconds(SESSION_MODES.FOCUS, mockSettings), 1500);
  assert.strictEqual(getDurationSeconds(SESSION_MODES.SHORT_BREAK, mockSettings), 300);
  assert.strictEqual(getDurationSeconds(SESSION_MODES.LONG_BREAK, mockSettings), 900);

  // Fast dev timer duration test
  const fastSettings = { ...mockSettings, devFastTimer: true };
  assert.strictEqual(getDurationSeconds(SESSION_MODES.FOCUS, fastSettings), 10);

  // 4. startSession
  const baseIdleState = {
    sessionId: null,
    mode: SESSION_MODES.FOCUS,
    status: SESSION_STATUS.IDLE,
    totalSeconds: 1500,
    remainingSeconds: 1500,
    currentCycle: 1,
    activeTaskId: 'task_123'
  };

  const t0 = 1000000000000;
  const started = startSession(baseIdleState, mockSettings, t0);
  assert.strictEqual(started.status, SESSION_STATUS.RUNNING);
  assert.ok(started.sessionId.startsWith('ff_'));
  assert.strictEqual(started.startTimestamp, t0);
  assert.strictEqual(started.targetEndTimestamp, t0 + 1500 * 1000);
  assert.strictEqual(started.activeTaskId, 'task_123');

  // 5. calculateRemainingSeconds while running
  const tMid = t0 + 500 * 1000; // 500 seconds elapsed
  const remMid = calculateRemainingSeconds(started, tMid);
  assert.strictEqual(remMid, 1000);

  // Time elapsed past target
  const tEnd = t0 + 1600 * 1000;
  const remEnd = calculateRemainingSeconds(started, tEnd);
  assert.strictEqual(remEnd, 0);

  // 6. pauseSession
  const paused = pauseSession(started, tMid);
  assert.strictEqual(paused.status, SESSION_STATUS.PAUSED);
  assert.strictEqual(paused.pausedRemainingSeconds, 1000);
  assert.strictEqual(paused.targetEndTimestamp, null);
  // While paused, advance time by 200s; remaining should stay 1000!
  assert.strictEqual(calculateRemainingSeconds(paused, tMid + 200 * 1000), 1000);

  // 7. resumeSession
  const tResume = tMid + 300 * 1000;
  const resumed = resumeSession(paused, tResume);
  assert.strictEqual(resumed.status, SESSION_STATUS.RUNNING);
  assert.strictEqual(resumed.targetEndTimestamp, tResume + 1000 * 1000);
  assert.strictEqual(resumed.pausedRemainingSeconds, null);

  // 8. resetSession
  const reset = resetSession(resumed, mockSettings);
  assert.strictEqual(reset.status, SESSION_STATUS.IDLE);
  assert.strictEqual(reset.sessionId, null);
  assert.strictEqual(reset.remainingSeconds, 1500);

  // 9. skipSession (from focus cycle 1 -> short break cycle 2)
  const skipped = skipSession(started, mockSettings);
  assert.strictEqual(skipped.mode, SESSION_MODES.SHORT_BREAK);
  assert.strictEqual(skipped.currentCycle, 2);
  assert.strictEqual(skipped.status, SESSION_STATUS.IDLE);
  assert.strictEqual(skipped.remainingSeconds, 300);

  // 10. completeSession: 4-cycle Pomodoro progression
  // Cycle 1: Focus completed -> Short break (cycle 2)
  const c1 = completeSession(started, mockSettings, t0 + 1500 * 1000);
  assert.ok(c1.completedRecord);
  assert.strictEqual(c1.completedRecord.sessionType, SESSION_MODES.FOCUS);
  assert.strictEqual(c1.completedRecord.durationMinutes, 25);
  assert.strictEqual(c1.nextState.mode, SESSION_MODES.SHORT_BREAK);
  assert.strictEqual(c1.nextState.currentCycle, 2);

  // Short break completed -> Focus (cycle 2)
  const breakState = {
    ...c1.nextState,
    status: SESSION_STATUS.RUNNING,
    totalSeconds: 300,
    remainingSeconds: 300
  };
  const cBreak = completeSession(breakState, mockSettings, t0 + 1800 * 1000);
  assert.strictEqual(cBreak.completedRecord, null, 'Break session must not create focus completion record');
  assert.strictEqual(cBreak.nextState.mode, SESSION_MODES.FOCUS);
  assert.strictEqual(cBreak.nextState.currentCycle, 2);

  // Cycle 4: Focus completed -> Long break (cycle resets to 1)
  const cycle4State = {
    ...started,
    currentCycle: 4
  };
  const c4 = completeSession(cycle4State, mockSettings, t0 + 2000 * 1000);
  assert.strictEqual(c4.nextState.mode, SESSION_MODES.LONG_BREAK);
  assert.strictEqual(c4.nextState.currentCycle, 1);
  assert.strictEqual(c4.nextState.totalSeconds, 900);

  console.log('✅ All Timer tests passed!');
}
