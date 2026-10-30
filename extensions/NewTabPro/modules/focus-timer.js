/**
 * NewTab Pro - Focus Timer (Pomodoro) Engine
 * Supports 25m Focus, 5m Short Break, and 15m Long Break intervals with session counting.
 */

export const TIMER_MODES = {
  focus: { id: 'focus', name: 'Focus', defaultSeconds: 25 * 60 },
  shortBreak: { id: 'shortBreak', name: 'Short Break', defaultSeconds: 5 * 60 },
  longBreak: { id: 'longBreak', name: 'Long Break', defaultSeconds: 15 * 60 }
};

export class FocusTimer {
  constructor({
    mode = 'focus',
    timeLeft = TIMER_MODES.focus.defaultSeconds,
    sessionsCompleted = 0,
    onTick,
    onComplete
  } = {}) {
    this.mode = TIMER_MODES[mode] ? mode : 'focus';
    this.timeLeft = timeLeft;
    this.totalDuration = TIMER_MODES[this.mode].defaultSeconds;
    this.sessionsCompleted = sessionsCompleted;
    this.isRunning = false;
    this.intervalId = null;

    this.onTick = onTick || (() => {});
    this.onComplete = onComplete || (() => {});
  }

  setMode(modeId) {
    if (!TIMER_MODES[modeId]) return;
    this.pause();
    this.mode = modeId;
    this.totalDuration = TIMER_MODES[modeId].defaultSeconds;
    this.timeLeft = this.totalDuration;
    this.onTick(this.getState());
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.onTick(this.getState());
      } else {
        this.pause();
        if (this.mode === 'focus') {
          this.sessionsCompleted++;
        }
        this.onComplete(this.getState());
      }
    }, 1000);

    this.onTick(this.getState());
  }

  pause() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.onTick(this.getState());
  }

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  reset() {
    this.pause();
    this.timeLeft = TIMER_MODES[this.mode].defaultSeconds;
    this.totalDuration = this.timeLeft;
    this.onTick(this.getState());
  }

  getState() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    const pad = (n) => String(n).padStart(2, '0');
    const formatted = `${pad(minutes)}:${pad(seconds)}`;
    const progressPercent = this.totalDuration === 0 ? 0 : Math.round(((this.totalDuration - this.timeLeft) / this.totalDuration) * 100);

    return {
      mode: this.mode,
      modeName: TIMER_MODES[this.mode].name,
      timeLeft: this.timeLeft,
      totalDuration: this.totalDuration,
      formatted,
      isRunning: this.isRunning,
      progressPercent,
      sessionsCompleted: this.sessionsCompleted
    };
  }

  static formatSeconds(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
