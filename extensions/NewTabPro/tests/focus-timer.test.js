/**
 * NewTab Pro - Focus Timer (Pomodoro) Unit Tests
 */

import { FocusTimer, TIMER_MODES } from '../modules/focus-timer.js';

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

console.log('\n--- Running Focus Timer Unit Tests ---');

// 1. Initial State
const timer = new FocusTimer({ mode: 'focus' });
const s0 = timer.getState();
assert(s0.mode === 'focus', 'Initial mode is focus');
assert(s0.timeLeft === 1500, 'Initial duration is 25 minutes (1500s)');
assert(s0.formatted === '25:00', 'Formats 1500s as 25:00');
assert(s0.isRunning === false, 'Timer starts paused');
assert(s0.progressPercent === 0, 'Progress starts at 0%');

// 2. Mode Switching
timer.setMode('shortBreak');
const sShort = timer.getState();
assert(sShort.mode === 'shortBreak', 'Switched to shortBreak mode');
assert(sShort.timeLeft === 300, 'Short break is 5 minutes (300s)');
assert(sShort.formatted === '05:00', 'Formats 300s as 05:00');

timer.setMode('longBreak');
const sLong = timer.getState();
assert(sLong.timeLeft === 900, 'Long break is 15 minutes (900s)');
assert(sLong.formatted === '15:00', 'Formats 900s as 15:00');

// 3. Formatting Helper
assert(FocusTimer.formatSeconds(125) === '02:05', 'Formats arbitrary seconds (125s -> 02:05)');
assert(FocusTimer.formatSeconds(0) === '00:00', 'Formats 0s as 00:00');

// 4. Reset Operation
timer.timeLeft = 50;
timer.reset();
assert(timer.getState().timeLeft === TIMER_MODES.longBreak.defaultSeconds, 'Reset restores full mode duration');

console.log(`Focus Timer Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
