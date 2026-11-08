/**
 * WordWise - Storage Service
 * Centralized, schema-versioned persistence layer managing vocabulary,
 * dictionary cache, daily word records, flashcard SM-2 schedules,
 * quiz history, learning activities, and user settings.
 * Includes in-memory fallback for testing in Node.js environments.
 */

export const WORDWISE_SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  SCHEMA: 'wordwise_schema',
  VOCABULARY: 'wordwise_vocab',
  CACHE: 'wordwise_cache',
  DAILY: 'wordwise_daily',
  ACTIVITY: 'wordwise_activity',
  QUIZ_HISTORY: 'wordwise_quiz_history',
  SETTINGS: 'wordwise_settings'
};

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  speechVoice: 'default',
  speechRate: 0.9,
  autoPronounce: false,
  dailyGoal: 5,
  enableContextMenu: true,
  enableDoubleclickLookup: false,
  cardReviewBatchSize: 20
};

// In-memory fallback map for non-extension / Node.js test environments
const memoryStore = new Map();

/**
 * Checks if chrome.storage.local is available
 * @returns {boolean}
 */
export function isChromeStorageAvailable() {
  return typeof chrome !== 'undefined' &&
         chrome.storage !== undefined &&
         chrome.storage.local !== undefined;
}

/**
 * Low-level storage get helper
 * @param {string|string[]} keys
 * @returns {Promise<any>}
 */
export function storageGet(keys) {
  return new Promise((resolve) => {
    if (isChromeStorageAvailable()) {
      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime?.lastError) {
            console.warn('[WordWise Storage] Get error:', chrome.runtime.lastError);
            resolve({});
          } else {
            resolve(result || {});
          }
        });
      } catch (err) {
        console.warn('[WordWise Storage] Exception in storageGet:', err);
        resolve({});
      }
    } else {
      if (Array.isArray(keys)) {
        const res = {};
        for (const k of keys) {
          if (memoryStore.has(k)) {
            res[k] = JSON.parse(JSON.stringify(memoryStore.get(k)));
          }
        }
        resolve(res);
      } else if (typeof keys === 'string') {
        const res = {};
        if (memoryStore.has(keys)) {
          res[keys] = JSON.parse(JSON.stringify(memoryStore.get(keys)));
        }
        resolve(res);
      } else {
        resolve({});
      }
    }
  });
}

/**
 * Low-level storage set helper
 * @param {object} items
 * @returns {Promise<void>}
 */
export function storageSet(items) {
  return new Promise((resolve) => {
    if (isChromeStorageAvailable()) {
      try {
        chrome.storage.local.set(items, () => {
          if (chrome.runtime?.lastError) {
            console.warn('[WordWise Storage] Set error:', chrome.runtime.lastError);
          }
          resolve();
        });
      } catch (err) {
        console.warn('[WordWise Storage] Exception in storageSet:', err);
        resolve();
      }
    } else {
      for (const [k, v] of Object.entries(items)) {
        memoryStore.set(k, JSON.parse(JSON.stringify(v)));
      }
      resolve();
    }
  });
}

/**
 * Low-level storage remove helper
 * @param {string|string[]} keys
 * @returns {Promise<void>}
 */
export function storageRemove(keys) {
  return new Promise((resolve) => {
    if (isChromeStorageAvailable()) {
      try {
        chrome.storage.local.remove(keys, () => {
          resolve();
        });
      } catch {
        resolve();
      }
    } else {
      const arr = Array.isArray(keys) ? keys : [keys];
      for (const k of arr) {
        memoryStore.delete(k);
      }
      resolve();
    }
  });
}

/**
 * Initializes storage with default values and performs schema migrations if needed
 */
export async function initStorage() {
  const data = await storageGet([STORAGE_KEYS.SCHEMA, STORAGE_KEYS.SETTINGS]);
  if (!data[STORAGE_KEYS.SCHEMA]) {
    await storageSet({
      [STORAGE_KEYS.SCHEMA]: WORDWISE_SCHEMA_VERSION,
      [STORAGE_KEYS.VOCABULARY]: [],
      [STORAGE_KEYS.CACHE]: {},
      [STORAGE_KEYS.ACTIVITY]: {},
      [STORAGE_KEYS.QUIZ_HISTORY]: [],
      [STORAGE_KEYS.SETTINGS]: { ...DEFAULT_SETTINGS }
    });
  } else if (!data[STORAGE_KEYS.SETTINGS]) {
    await storageSet({ [STORAGE_KEYS.SETTINGS]: { ...DEFAULT_SETTINGS } });
  }
}

/**
 * Normalizes a vocabulary word key for duplicate detection
 * @param {string} word
 * @returns {string}
 */
export function normalizeWordKey(word = '') {
  return String(word).trim().toLowerCase();
}

/**
 * Retrieves all saved vocabulary items
 * @returns {Promise<Array<object>>}
 */
export async function getVocabulary() {
  const result = await storageGet(STORAGE_KEYS.VOCABULARY);
  return Array.isArray(result[STORAGE_KEYS.VOCABULARY]) ? result[STORAGE_KEYS.VOCABULARY] : [];
}

/**
 * Finds a saved word by exact string match (case-insensitive)
 * @param {string} word
 * @returns {Promise<object|null>}
 */
export async function getWordByText(word = '') {
  const key = normalizeWordKey(word);
  if (!key) return null;
  const list = await getVocabulary();
  return list.find(item => normalizeWordKey(item.word) === key) || null;
}

/**
 * Saves a new vocabulary entry (prevents duplicates)
 * @param {object} wordData
 * @returns {Promise<{ success: boolean, item?: object, isDuplicate?: boolean, error?: string }>}
 */
export async function saveWord(wordData) {
  if (!wordData || !wordData.word) {
    return { success: false, error: 'Word data must contain a valid word string.' };
  }

  const cleanWord = String(wordData.word).trim();
  const key = normalizeWordKey(cleanWord);
  if (!key) {
    return { success: false, error: 'Word string cannot be empty.' };
  }

  const vocab = await getVocabulary();
  const existingIndex = vocab.findIndex(item => normalizeWordKey(item.word) === key);

  if (existingIndex !== -1) {
    return {
      success: false,
      isDuplicate: true,
      item: vocab[existingIndex],
      error: `"${cleanWord}" is already in your vocabulary library.`
    };
  }

  const now = Date.now();
  const newItem = {
    id: `vocab_${key}_${now}`,
    word: key,
    displayWord: cleanWord,
    phonetic: wordData.phonetic || '',
    partOfSpeech: wordData.partOfSpeech || 'unknown',
    definitions: Array.isArray(wordData.definitions) ? wordData.definitions : (wordData.definition ? [wordData.definition] : []),
    examples: Array.isArray(wordData.examples) ? wordData.examples : (wordData.example ? [wordData.example] : []),
    synonyms: Array.isArray(wordData.synonyms) ? wordData.synonyms : [],
    antonyms: Array.isArray(wordData.antonyms) ? wordData.antonyms : [],
    audioUrl: wordData.audioUrl || null,
    notes: wordData.notes || '',
    customExample: wordData.customExample || '',
    tags: Array.isArray(wordData.tags) ? wordData.tags : [],
    status: wordData.status || 'learning', // 'learning' | 'review' | 'mastered'
    isFavorite: Boolean(wordData.isFavorite),
    dateAdded: now,
    lastReviewed: null,
    sm2: {
      repetitions: 0,
      interval: 1, // days
      easeFactor: 2.5,
      nextReviewDate: now + 86400000 // due in 1 day
    },
    contextSentence: wordData.contextSentence || '',
    pageTitle: wordData.pageTitle || '',
    sourceUrl: wordData.sourceUrl || ''
  };

  vocab.unshift(newItem);
  await storageSet({ [STORAGE_KEYS.VOCABULARY]: vocab });

  // Record activity
  await recordActivity('word_saved', { word: cleanWord, id: newItem.id });

  return { success: true, item: newItem };
}

/**
 * Updates an existing vocabulary entry
 * @param {string} id
 * @param {object} patch
 * @returns {Promise<{ success: boolean, item?: object, error?: string }>}
 */
export async function updateWord(id, patch = {}) {
  if (!id) return { success: false, error: 'Missing word ID.' };
  const vocab = await getVocabulary();
  const idx = vocab.findIndex(w => w.id === id);

  if (idx === -1) {
    return { success: false, error: 'Word not found.' };
  }

  const current = vocab[idx];
  const updated = {
    ...current,
    ...patch,
    id: current.id, // prevent overwriting primary id
    word: current.word // retain normalized key
  };

  if (patch.sm2) {
    updated.sm2 = { ...current.sm2, ...patch.sm2 };
  }

  vocab[idx] = updated;
  await storageSet({ [STORAGE_KEYS.VOCABULARY]: vocab });

  return { success: true, item: updated };
}

/**
 * Deletes a word from vocabulary by ID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteWord(id) {
  if (!id) return false;
  const vocab = await getVocabulary();
  const filtered = vocab.filter(w => w.id !== id);
  if (filtered.length === vocab.length) return false;

  await storageSet({ [STORAGE_KEYS.VOCABULARY]: filtered });
  return true;
}

/**
 * Retrieves cached dictionary entry for a word (if not expired, max 30 days)
 * @param {string} word
 * @returns {Promise<object|null>}
 */
export async function getCachedDefinition(word = '') {
  const key = normalizeWordKey(word);
  if (!key) return null;

  const result = await storageGet(STORAGE_KEYS.CACHE);
  const cache = result[STORAGE_KEYS.CACHE] || {};
  const entry = cache[key];

  if (!entry) return null;

  // Max age: 30 days (30 * 24 * 60 * 60 * 1000 = 2592000000 ms)
  const maxAge = 2592000000;
  if (Date.now() - entry.timestamp > maxAge) {
    delete cache[key];
    await storageSet({ [STORAGE_KEYS.CACHE]: cache });
    return null;
  }

  return entry.data;
}

/**
 * Caches dictionary definition for a word
 * @param {string} word
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function setCachedDefinition(word = '', data = {}) {
  const key = normalizeWordKey(word);
  if (!key || !data) return;

  const result = await storageGet(STORAGE_KEYS.CACHE);
  const cache = result[STORAGE_KEYS.CACHE] || {};

  cache[key] = {
    timestamp: Date.now(),
    data
  };

  // Limit cache entries to 500
  const keys = Object.keys(cache);
  if (keys.length > 500) {
    const oldestKey = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)[0];
    delete cache[oldestKey];
  }

  await storageSet({ [STORAGE_KEYS.CACHE]: cache });
}

/**
 * Clears the online dictionary response cache
 * @returns {Promise<void>}
 */
export async function clearDefinitionCache() {
  await storageSet({ [STORAGE_KEYS.CACHE]: {} });
}

/**
 * Gets or sets the stable daily word record for a given day
 * @param {string} dateString "YYYY-MM-DD"
 * @param {function} wordSelectorFn function to pick a word if none saved today
 * @returns {Promise<object>}
 */
export async function getDailyWordRecord(dateString, wordSelectorFn) {
  const result = await storageGet(STORAGE_KEYS.DAILY);
  const daily = result[STORAGE_KEYS.DAILY] || {};

  if (daily.dateString === dateString && daily.word) {
    return daily;
  }

  const newWord = await wordSelectorFn();
  const record = {
    dateString,
    timestamp: Date.now(),
    word: newWord
  };

  await storageSet({ [STORAGE_KEYS.DAILY]: record });
  return record;
}

/**
 * Records a learning activity event for streak calculations
 * @param {'word_saved'|'flashcard_review'|'quiz_completed'} type
 * @param {object} [details={}]
 * @returns {Promise<void>}
 */
export async function recordActivity(type, details = {}) {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const result = await storageGet(STORAGE_KEYS.ACTIVITY);
  const activities = result[STORAGE_KEYS.ACTIVITY] || {};

  const dayEvents = Array.isArray(activities[today]) ? activities[today] : [];
  dayEvents.push({
    type,
    timestamp: Date.now(),
    details
  });

  activities[today] = dayEvents;
  await storageSet({ [STORAGE_KEYS.ACTIVITY]: activities });
}

/**
 * Calculates learning activity streaks and weekly stats
 * @returns {Promise<{ currentStreak: number, longestStreak: number, activeDaysTotal: number, weeklyActivity: Array<{ date: string, count: number, active: boolean }> }>}
 */
export async function getStreakData() {
  const result = await storageGet(STORAGE_KEYS.ACTIVITY);
  const activities = result[STORAGE_KEYS.ACTIVITY] || {};

  const activeDates = Object.keys(activities)
    .filter(d => Array.isArray(activities[d]) && activities[d].length > 0)
    .sort();

  const activeDaysTotal = activeDates.length;

  // Generate today & yesterday strings in UTC
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Calculate current streak
  let currentStreak = 0;
  const activeSet = new Set(activeDates);

  let checkDate = new Date(today);
  if (!activeSet.has(todayStr)) {
    // If not active today yet, check if yesterday was active to continue streak
    if (activeSet.has(yesterdayStr)) {
      checkDate = new Date(yesterday);
    } else {
      checkDate = null;
    }
  }

  if (checkDate) {
    while (true) {
      const dStr = checkDate.toISOString().slice(0, 10);
      if (activeSet.has(dStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  for (const dStr of activeDates) {
    const curDate = new Date(dStr + 'T00:00:00Z');
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffMs = curDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / 86400000);
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    prevDate = curDate;
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  // Weekly activity (last 7 days including today)
  const weeklyActivity = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = activities[dateStr] ? activities[dateStr].length : 0;
    weeklyActivity.push({
      date: dateStr,
      count,
      active: count > 0
    });
  }

  return {
    currentStreak,
    longestStreak,
    activeDaysTotal,
    weeklyActivity
  };
}

/**
 * Saves a completed quiz result into history
 * @param {object} quizResult
 * @returns {Promise<void>}
 */
export async function saveQuizResult(quizResult) {
  if (!quizResult) return;
  const result = await storageGet(STORAGE_KEYS.QUIZ_HISTORY);
  const history = Array.isArray(result[STORAGE_KEYS.QUIZ_HISTORY]) ? result[STORAGE_KEYS.QUIZ_HISTORY] : [];

  const entry = {
    id: `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    mode: quizResult.mode || 'meaning',
    score: quizResult.score || 0,
    total: quizResult.total || 0,
    accuracy: quizResult.total > 0 ? Math.round((quizResult.score / quizResult.total) * 100) : 0,
    durationSeconds: quizResult.durationSeconds || 0
  };

  history.unshift(entry);
  if (history.length > 100) history.length = 100;

  await storageSet({ [STORAGE_KEYS.QUIZ_HISTORY]: history });
  await recordActivity('quiz_completed', { mode: entry.mode, score: entry.score, total: entry.total });
}

/**
 * Gets historical quiz results
 * @returns {Promise<Array<object>>}
 */
export async function getQuizHistory() {
  const result = await storageGet(STORAGE_KEYS.QUIZ_HISTORY);
  return Array.isArray(result[STORAGE_KEYS.QUIZ_HISTORY]) ? result[STORAGE_KEYS.QUIZ_HISTORY] : [];
}

/**
 * Gets user settings with defaults merged
 * @returns {Promise<object>}
 */
export async function getSettings() {
  const result = await storageGet(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
}

/**
 * Updates user settings
 * @param {object} newSettings
 * @returns {Promise<object>}
 */
export async function updateSettings(newSettings = {}) {
  const current = await getSettings();
  const merged = { ...current, ...newSettings };
  await storageSet({ [STORAGE_KEYS.SETTINGS]: merged });
  return merged;
}

/**
 * Exports all user data for backup
 * @returns {Promise<object>}
 */
export async function exportAllData() {
  const data = await storageGet([
    STORAGE_KEYS.SCHEMA,
    STORAGE_KEYS.VOCABULARY,
    STORAGE_KEYS.ACTIVITY,
    STORAGE_KEYS.QUIZ_HISTORY,
    STORAGE_KEYS.SETTINGS
  ]);

  return {
    app: 'WordWise',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    schemaVersion: WORDWISE_SCHEMA_VERSION,
    data: {
      vocabulary: data[STORAGE_KEYS.VOCABULARY] || [],
      activity: data[STORAGE_KEYS.ACTIVITY] || {},
      quizHistory: data[STORAGE_KEYS.QUIZ_HISTORY] || [],
      settings: data[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS
    }
  };
}

/**
 * Imports vocabulary data with duplicate prevention and validation
 * @param {object} importPayload
 * @param {'merge'|'overwrite'} [mode='merge']
 * @returns {Promise<{ success: boolean, importedCount: number, duplicateCount: number, error?: string }>}
 */
export async function importData(importPayload, mode = 'merge') {
  if (!importPayload || typeof importPayload !== 'object') {
    return { success: false, importedCount: 0, duplicateCount: 0, error: 'Invalid backup file format.' };
  }

  const rawVocab = importPayload.data?.vocabulary || importPayload.vocabulary || (Array.isArray(importPayload) ? importPayload : null);
  if (!Array.isArray(rawVocab)) {
    return { success: false, importedCount: 0, duplicateCount: 0, error: 'No valid vocabulary list found in imported payload.' };
  }

  const currentVocab = mode === 'overwrite' ? [] : await getVocabulary();
  const existingMap = new Map();
  for (const item of currentVocab) {
    existingMap.set(normalizeWordKey(item.word), item);
  }

  let importedCount = 0;
  let duplicateCount = 0;

  for (const item of rawVocab) {
    if (!item || !item.word) continue;
    const key = normalizeWordKey(item.word);
    if (!key) continue;

    if (existingMap.has(key)) {
      duplicateCount++;
      continue;
    }

    const now = Date.now();
    const validated = {
      id: item.id || `vocab_${key}_${now}`,
      word: key,
      displayWord: item.displayWord || item.word,
      phonetic: item.phonetic || '',
      partOfSpeech: item.partOfSpeech || 'unknown',
      definitions: Array.isArray(item.definitions) ? item.definitions : (item.definition ? [item.definition] : []),
      examples: Array.isArray(item.examples) ? item.examples : (item.example ? [item.example] : []),
      synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
      antonyms: Array.isArray(item.antonyms) ? item.antonyms : [],
      audioUrl: item.audioUrl || null,
      notes: item.notes || '',
      customExample: item.customExample || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      status: ['learning', 'review', 'mastered'].includes(item.status) ? item.status : 'learning',
      isFavorite: Boolean(item.isFavorite),
      dateAdded: item.dateAdded || now,
      lastReviewed: item.lastReviewed || null,
      sm2: {
        repetitions: item.sm2?.repetitions || 0,
        interval: item.sm2?.interval || 1,
        easeFactor: item.sm2?.easeFactor || 2.5,
        nextReviewDate: item.sm2?.nextReviewDate || now + 86400000
      },
      contextSentence: item.contextSentence || '',
      pageTitle: item.pageTitle || '',
      sourceUrl: item.sourceUrl || ''
    };

    currentVocab.push(validated);
    existingMap.set(key, validated);
    importedCount++;
  }

  await storageSet({ [STORAGE_KEYS.VOCABULARY]: currentVocab });

  // If payload contains quiz history or activity and mode is overwrite, restore them
  if (mode === 'overwrite') {
    if (importPayload.data?.activity) {
      await storageSet({ [STORAGE_KEYS.ACTIVITY]: importPayload.data.activity });
    }
    if (importPayload.data?.quizHistory) {
      await storageSet({ [STORAGE_KEYS.QUIZ_HISTORY]: importPayload.data.quizHistory });
    }
    if (importPayload.data?.settings) {
      await storageSet({ [STORAGE_KEYS.SETTINGS]: importPayload.data.settings });
    }
  }

  return { success: true, importedCount, duplicateCount };
}

/**
 * Clears all user data (vocabulary, history, caches)
 * @returns {Promise<void>}
 */
export async function clearAllData() {
  await storageRemove([
    STORAGE_KEYS.VOCABULARY,
    STORAGE_KEYS.CACHE,
    STORAGE_KEYS.DAILY,
    STORAGE_KEYS.ACTIVITY,
    STORAGE_KEYS.QUIZ_HISTORY
  ]);
  await storageSet({
    [STORAGE_KEYS.SCHEMA]: WORDWISE_SCHEMA_VERSION,
    [STORAGE_KEYS.VOCABULARY]: [],
    [STORAGE_KEYS.CACHE]: {},
    [STORAGE_KEYS.ACTIVITY]: {},
    [STORAGE_KEYS.QUIZ_HISTORY]: [],
    [STORAGE_KEYS.SETTINGS]: { ...DEFAULT_SETTINGS }
  });
}
