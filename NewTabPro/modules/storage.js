/**
 * NewTab Pro - Storage & State Management
 * Provides a versioned, robust abstraction over chrome.storage.local
 * with fallback to localStorage for test and non-extension environments.
 */

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'newtab_pro_state';

export const DEFAULT_SHORTCUTS = [
  {
    id: 'sc-github',
    title: 'GitHub',
    url: 'https://github.com',
    color: '#24292F',
    sortOrder: 0,
    createdAt: 1700000000000
  },
  {
    id: 'sc-youtube',
    title: 'YouTube',
    url: 'https://youtube.com',
    color: '#FF0000',
    sortOrder: 1,
    createdAt: 1700000001000
  },
  {
    id: 'sc-reddit',
    title: 'Reddit',
    url: 'https://reddit.com',
    color: '#FF4500',
    sortOrder: 2,
    createdAt: 1700000002000
  },
  {
    id: 'sc-gmail',
    title: 'Gmail',
    url: 'https://mail.google.com',
    color: '#EA4335',
    sortOrder: 3,
    createdAt: 1700000003000
  },
  {
    id: 'sc-wikipedia',
    title: 'Wikipedia',
    url: 'https://wikipedia.org',
    color: '#006699',
    sortOrder: 4,
    createdAt: 1700000004000
  },
  {
    id: 'sc-x',
    title: 'X / Twitter',
    url: 'https://x.com',
    color: '#0F1419',
    sortOrder: 5,
    createdAt: 1700000005000
  }
];

export const DEFAULT_WIDGETS = [
  { id: 'clock', name: 'Clock & Greeting', enabled: true, order: 0 },
  { id: 'search', name: 'Search Bar', enabled: true, order: 1 },
  { id: 'shortcuts', name: 'Quick Links', enabled: true, order: 2 },
  { id: 'quickTools', name: 'Browser Launcher Tools', enabled: true, order: 3 },
  { id: 'tasks', name: 'Task Manager', enabled: true, order: 4 },
  { id: 'progress', name: 'Daily Progress Ring', enabled: true, order: 5 },
  { id: 'habits', name: 'Habit Tracker', enabled: false, order: 6 },
  { id: 'focusTimer', name: 'Focus Timer (Pomodoro)', enabled: false, order: 7 },
  { id: 'scratchpad', name: 'Quick Scratchpad', enabled: true, order: 8 },
  { id: 'calculator', name: 'Quick Calculator', enabled: false, order: 9 },
  { id: 'worldClock', name: 'World Clock', enabled: false, order: 10 },
  { id: 'quote', name: 'Daily Quote & Inspiration', enabled: true, order: 11 },
  { id: 'weather', name: 'Weather Conditions', enabled: false, order: 12 }
];

export const INITIAL_HABITS = [
  { id: 'habit-1', title: 'Drink 2L Water', icon: '💧', history: {} },
  { id: 'habit-2', title: 'Read 20 Minutes', icon: '📖', history: {} },
  { id: 'habit-3', title: 'Code / Build', icon: '💻', history: {} },
  { id: 'habit-4', title: 'Stretch / Exercise', icon: '🏃', history: {} }
];

export function getDefaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    preferences: {
      userName: '',
      timeFormat: '12h', // '12h' | '24h'
      showSeconds: false,
      searchEngine: 'google', // 'google' | 'duckduckgo' | 'bing' | 'brave'
      openInNewTab: false,
      theme: 'midnight', // 'midnight' | 'ocean' | 'aurora' | 'light' | 'minimal'
      backgroundPreset: 'mesh-midnight',
      customBackground: '',
      activeTemplate: 'default'
    },
    shortcuts: JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS)),
    tasks: [],
    widgets: JSON.parse(JSON.stringify(DEFAULT_WIDGETS)),
    scratchpad: {
      content: '',
      lastUpdated: null
    },
    weather: {
      enabled: false,
      city: '',
      latitude: null,
      longitude: null,
      unit: 'c', // 'c' | 'f'
      lastFetched: null,
      cachedData: null
    },
    focusTimer: {
      mode: 'focus',
      timeLeft: 1500,
      sessionsCompleted: 0
    },
    habits: JSON.parse(JSON.stringify(INITIAL_HABITS)),
    worldClock: {
      cities: ['lon', 'nyc', 'tyo']
    },
    quote: {
      currentQuoteIndex: 0
    }
  };
}

/**
 * Validates and migrates raw stored state to match current schema
 */
export function migrateState(raw) {
  if (!raw || typeof raw !== 'object') {
    return getDefaultState();
  }

  const defaults = getDefaultState();
  const migrated = { ...defaults };

  // 1. Preferences
  if (raw.preferences && typeof raw.preferences === 'object') {
    migrated.preferences = {
      ...defaults.preferences,
      ...raw.preferences
    };
    if (!['12h', '24h'].includes(migrated.preferences.timeFormat)) {
      migrated.preferences.timeFormat = '12h';
    }
    if (!['google', 'duckduckgo', 'bing', 'brave'].includes(migrated.preferences.searchEngine)) {
      migrated.preferences.searchEngine = 'google';
    }
    if (!['midnight', 'ocean', 'aurora', 'light', 'minimal', 'atmosphere'].includes(migrated.preferences.theme)) {
      migrated.preferences.theme = 'midnight';
    }
  }

  // 2. Shortcuts
  if (Array.isArray(raw.shortcuts)) {
    migrated.shortcuts = raw.shortcuts
      .filter(sc => sc && typeof sc === 'object' && typeof sc.url === 'string' && typeof sc.title === 'string')
      .map((sc, index) => ({
        id: sc.id || `sc-${Date.now()}-${index}`,
        title: String(sc.title).trim() || 'Shortcut',
        url: String(sc.url).trim(),
        color: typeof sc.color === 'string' ? sc.color : '#3B82F6',
        sortOrder: typeof sc.sortOrder === 'number' ? sc.sortOrder : index,
        createdAt: typeof sc.createdAt === 'number' ? sc.createdAt : Date.now()
      }));
  }

  // 3. Tasks
  if (Array.isArray(raw.tasks)) {
    migrated.tasks = raw.tasks
      .filter(t => t && typeof t === 'object' && typeof t.title === 'string')
      .map(t => ({
        id: t.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: String(t.title).trim(),
        completed: Boolean(t.completed),
        createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
        completedAt: t.completed ? (typeof t.completedAt === 'number' ? t.completedAt : Date.now()) : null,
        dateKey: typeof t.dateKey === 'string' ? t.dateKey : new Date().toISOString().slice(0, 10)
      }));
  }

  // 4. Widgets
  if (Array.isArray(raw.widgets)) {
    const rawMap = new Map(raw.widgets.map(w => [w.id, w]));
    migrated.widgets = defaults.widgets.map((defaultW, index) => {
      const existing = rawMap.get(defaultW.id);
      if (existing) {
        return {
          ...defaultW,
          enabled: typeof existing.enabled === 'boolean' ? existing.enabled : defaultW.enabled,
          order: typeof existing.order === 'number' ? existing.order : index
        };
      }
      return defaultW;
    });
    migrated.widgets.sort((a, b) => a.order - b.order);
  }

  // 5. Scratchpad
  if (raw.scratchpad && typeof raw.scratchpad === 'object') {
    migrated.scratchpad = {
      content: typeof raw.scratchpad.content === 'string' ? raw.scratchpad.content : '',
      lastUpdated: typeof raw.scratchpad.lastUpdated === 'number' ? raw.scratchpad.lastUpdated : null
    };
  }

  // 6. Weather
  if (raw.weather && typeof raw.weather === 'object') {
    migrated.weather = {
      ...defaults.weather,
      enabled: Boolean(raw.weather.enabled),
      city: typeof raw.weather.city === 'string' ? raw.weather.city : '',
      latitude: typeof raw.weather.latitude === 'number' ? raw.weather.latitude : null,
      longitude: typeof raw.weather.longitude === 'number' ? raw.weather.longitude : null,
      unit: ['c', 'f'].includes(raw.weather.unit) ? raw.weather.unit : 'c',
      lastFetched: typeof raw.weather.lastFetched === 'number' ? raw.weather.lastFetched : null,
      cachedData: raw.weather.cachedData || null
    };
  }

  // 7. Focus Timer
  if (raw.focusTimer && typeof raw.focusTimer === 'object') {
    migrated.focusTimer = {
      mode: ['focus', 'shortBreak', 'longBreak'].includes(raw.focusTimer.mode) ? raw.focusTimer.mode : 'focus',
      timeLeft: typeof raw.focusTimer.timeLeft === 'number' ? raw.focusTimer.timeLeft : 1500,
      sessionsCompleted: typeof raw.focusTimer.sessionsCompleted === 'number' ? raw.focusTimer.sessionsCompleted : 0
    };
  }

  // 8. Habits
  if (Array.isArray(raw.habits)) {
    migrated.habits = raw.habits
      .filter(h => h && typeof h === 'object' && typeof h.title === 'string')
      .map(h => ({
        id: h.id || `habit-${Date.now()}`,
        title: String(h.title).trim(),
        icon: typeof h.icon === 'string' ? h.icon : '⭐',
        history: (h.history && typeof h.history === 'object') ? h.history : {}
      }));
  }

  // 9. World Clock
  if (raw.worldClock && typeof raw.worldClock === 'object' && Array.isArray(raw.worldClock.cities)) {
    migrated.worldClock = {
      cities: raw.worldClock.cities.filter(c => typeof c === 'string')
    };
  }

  // 10. Quote
  if (raw.quote && typeof raw.quote === 'object') {
    migrated.quote = {
      currentQuoteIndex: typeof raw.quote.currentQuoteIndex === 'number' ? raw.quote.currentQuoteIndex : 0
    };
  }

  migrated.schemaVersion = SCHEMA_VERSION;
  return migrated;
}

/**
 * StorageAdapter handles storage read/write via chrome.storage.local or fallback
 */
export class StorageAdapter {
  constructor() {
    this._isChromeStorageAvailable = (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.local &&
      typeof chrome.storage.local.get === 'function'
    );
    this._listeners = new Set();

    if (this._isChromeStorageAvailable && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[STORAGE_KEY]) {
          const newState = migrateState(changes[STORAGE_KEY].newValue);
          this._notifyListeners(newState);
        }
      });
    } else if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            this._notifyListeners(migrateState(parsed));
          } catch {
            // Ignore parse errors on external events
          }
        }
      });
    }
  }

  /**
   * Load dashboard state
   */
  async load() {
    if (this._isChromeStorageAvailable) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            console.warn('[NewTabPro Storage] Failed to read chrome.storage:', chrome.runtime.lastError);
            resolve(getDefaultState());
            return;
          }
          const raw = result ? result[STORAGE_KEY] : null;
          resolve(migrateState(raw));
        });
      });
    }

    // LocalStorage or memory fallback
    try {
      if (typeof localStorage !== 'undefined') {
        const rawStr = localStorage.getItem(STORAGE_KEY);
        if (rawStr) {
          const parsed = JSON.parse(rawStr);
          return migrateState(parsed);
        }
      }
    } catch (e) {
      console.warn('[NewTabPro Storage] Fallback read error:', e);
    }
    return getDefaultState();
  }

  /**
   * Save dashboard state
   */
  async save(state) {
    const validated = migrateState(state);
    if (this._isChromeStorageAvailable) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [STORAGE_KEY]: validated }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(validated);
        });
      });
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
      }
      return validated;
    } catch (e) {
      console.warn('[NewTabPro Storage] Fallback write error:', e);
      return validated;
    }
  }

  /**
   * Reset state to defaults
   */
  async reset() {
    const defaults = getDefaultState();
    return this.save(defaults);
  }

  /**
   * Register state change listener
   */
  subscribe(fn) {
    if (typeof fn === 'function') {
      this._listeners.add(fn);
    }
    return () => this._listeners.delete(fn);
  }

  _notifyListeners(newState) {
    for (const listener of this._listeners) {
      try {
        listener(newState);
      } catch (err) {
        console.warn('[NewTabPro Storage] Listener error:', err);
      }
    }
  }
}

export const storage = new StorageAdapter();
