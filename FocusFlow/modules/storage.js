/**
 * FocusFlow - Storage Management Module
 * Manages persistence, default configurations, schema validation, and migrations.
 */

export const SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  SETTINGS: 'focusflow_settings',
  TIMER: 'focusflow_timer',
  TASKS: 'focusflow_tasks',
  HISTORY: 'focusflow_history'
};

export const DEFAULT_SETTINGS = {
  focusDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  notificationsEnabled: true,
  dailyGoalMinutes: 120,
  dailyGoalSessions: 4,
  dailyGoalTasks: 3,
  distractionBlockingEnabled: false,
  blockDuringBreaks: false,
  blockedDomains: [
    'youtube.com',
    'twitter.com',
    'x.com',
    'facebook.com',
    'instagram.com',
    'reddit.com',
    'tiktok.com'
  ],
  devFastTimer: false,
  schemaVersion: SCHEMA_VERSION
};

export const DEFAULT_TIMER_STATE = {
  sessionId: null,
  mode: 'focus', // 'focus' | 'shortBreak' | 'longBreak'
  status: 'idle', // 'idle' | 'running' | 'paused' | 'completed'
  durationMinutes: 25,
  totalSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  startTimestamp: null,
  targetEndTimestamp: null,
  pausedRemainingSeconds: null,
  currentCycle: 1,
  activeTaskId: null,
  lastCompletedSessionId: null
};

/**
 * Migration helper to ensure legacy or corrupted data is gracefully handled.
 * @param {Object} rawData - Object retrieved from chrome.storage.local
 * @returns {Object} Sanitized and migrated storage object
 */
export function migrateStorage(rawData = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...(rawData[STORAGE_KEYS.SETTINGS] || {}) };
  const timer = { ...DEFAULT_TIMER_STATE, ...(rawData[STORAGE_KEYS.TIMER] || {}) };
  const tasks = Array.isArray(rawData[STORAGE_KEYS.TASKS]) ? rawData[STORAGE_KEYS.TASKS] : [];
  const history = Array.isArray(rawData[STORAGE_KEYS.HISTORY]) ? rawData[STORAGE_KEYS.HISTORY] : [];

  // Enforce numbers and constraints on settings
  const toNum = (val, fallback) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  };

  settings.focusDurationMinutes = Math.max(1, Math.min(180, toNum(settings.focusDurationMinutes, 25)));
  settings.shortBreakMinutes = Math.max(1, Math.min(60, toNum(settings.shortBreakMinutes, 5)));
  settings.longBreakMinutes = Math.max(1, Math.min(90, toNum(settings.longBreakMinutes, 15)));
  settings.sessionsBeforeLongBreak = Math.max(1, Math.min(12, toNum(settings.sessionsBeforeLongBreak, 4)));
  settings.dailyGoalMinutes = Math.max(10, Math.min(1440, toNum(settings.dailyGoalMinutes, 120)));
  settings.dailyGoalSessions = Math.max(1, Math.min(50, toNum(settings.dailyGoalSessions, 4)));
  settings.dailyGoalTasks = Math.max(1, Math.min(50, toNum(settings.dailyGoalTasks, 3)));
  settings.blockedDomains = Array.isArray(settings.blockedDomains) ? settings.blockedDomains : DEFAULT_SETTINGS.blockedDomains;
  settings.schemaVersion = SCHEMA_VERSION;

  return {
    [STORAGE_KEYS.SETTINGS]: settings,
    [STORAGE_KEYS.TIMER]: timer,
    [STORAGE_KEYS.TASKS]: tasks,
    [STORAGE_KEYS.HISTORY]: history
  };
}

/**
 * Chrome Storage wrapper with fallback for testing environments.
 */
function getStorageBackend() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return chrome.storage.local;
  }
  // Memory fallback for node tests
  if (!globalThis.__mockStorage) {
    globalThis.__mockStorage = {};
  }
  return {
    get: (keys, callback) => {
      let result = {};
      if (!keys) {
        result = { ...globalThis.__mockStorage };
      } else if (typeof keys === 'string') {
        result[keys] = globalThis.__mockStorage[keys];
      } else if (Array.isArray(keys)) {
        for (const k of keys) {
          result[k] = globalThis.__mockStorage[k];
        }
      } else {
        result = { ...keys };
        for (const k of Object.keys(keys)) {
          if (globalThis.__mockStorage[k] !== undefined) {
            result[k] = globalThis.__mockStorage[k];
          }
        }
      }
      if (typeof callback === 'function') callback(result);
      return Promise.resolve(result);
    },
    set: (items, callback) => {
      Object.assign(globalThis.__mockStorage, items);
      if (typeof callback === 'function') callback();
      return Promise.resolve();
    },
    clear: (callback) => {
      globalThis.__mockStorage = {};
      if (typeof callback === 'function') callback();
      return Promise.resolve();
    }
  };
}

export async function getStorageItem(key) {
  const backend = getStorageBackend();
  return new Promise((resolve) => {
    backend.get([key], (result) => {
      resolve(result ? result[key] : undefined);
    });
  });
}

export async function setStorageItem(key, value) {
  const backend = getStorageBackend();
  return new Promise((resolve) => {
    backend.set({ [key]: value }, () => resolve());
  });
}

export async function loadSettings() {
  const raw = await getStorageItem(STORAGE_KEYS.SETTINGS);
  if (!raw) {
    await saveSettings(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...raw };
}

export async function saveSettings(settings) {
  const validated = { ...DEFAULT_SETTINGS, ...settings, schemaVersion: SCHEMA_VERSION };
  await setStorageItem(STORAGE_KEYS.SETTINGS, validated);
  return validated;
}

export async function loadTimerState() {
  const raw = await getStorageItem(STORAGE_KEYS.TIMER);
  if (!raw) {
    await saveTimerState(DEFAULT_TIMER_STATE);
    return { ...DEFAULT_TIMER_STATE };
  }
  return { ...DEFAULT_TIMER_STATE, ...raw };
}

export async function saveTimerState(timerState) {
  await setStorageItem(STORAGE_KEYS.TIMER, timerState);
  return timerState;
}

export async function loadTasks() {
  const raw = await getStorageItem(STORAGE_KEYS.TASKS);
  return Array.isArray(raw) ? raw : [];
}

export async function saveTasks(tasks) {
  const validated = Array.isArray(tasks) ? tasks : [];
  await setStorageItem(STORAGE_KEYS.TASKS, validated);
  return validated;
}

export async function loadHistory() {
  const raw = await getStorageItem(STORAGE_KEYS.HISTORY);
  return Array.isArray(raw) ? raw : [];
}

export async function appendHistory(record) {
  const history = await loadHistory();
  // Prevent duplicate insertion by session ID
  if (record && record.id && history.some(item => item.id === record.id)) {
    return history;
  }
  history.push(record);
  await setStorageItem(STORAGE_KEYS.HISTORY, history);
  return history;
}

export async function resetAllData() {
  const backend = getStorageBackend();
  await new Promise((resolve) => backend.clear(() => resolve()));
  await saveSettings(DEFAULT_SETTINGS);
  await saveTimerState(DEFAULT_TIMER_STATE);
  await saveTasks([]);
  return {
    settings: DEFAULT_SETTINGS,
    timer: DEFAULT_TIMER_STATE,
    tasks: [],
    history: []
  };
}
