/**
 * WebNotes — Storage Module
 * 
 * Handles all Chrome storage operations with schema versioning,
 * data validation, and migration support.
 */

const STORAGE_KEYS = {
  NOTES: 'webnotes_notes',
  HIGHLIGHTS: 'webnotes_highlights',
  SETTINGS: 'webnotes_settings',
  SCHEMA_VERSION: 'webnotes_schema_version'
};

const CURRENT_SCHEMA_VERSION = 1;

const DEFAULT_SETTINGS = {
  defaultScope: 'page',
  confirmBeforeDelete: true,
  showTimestamps: true,
  theme: 'dark'
};

/**
 * Generate a unique identifier.
 * @returns {string}
 */
export function generateId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  const extra = Math.random().toString(36).substring(2, 6);
  return `${timestamp}-${randomPart}-${extra}`;
}

/**
 * Get the current ISO timestamp.
 * @returns {string}
 */
export function now() {
  return new Date().toISOString();
}

/**
 * Validate a note object has required fields.
 * @param {Object} note
 * @returns {boolean}
 */
export function validateNote(note) {
  if (!note || typeof note !== 'object') return false;
  if (!note.id || typeof note.id !== 'string') return false;
  if (typeof note.body !== 'string') return false;
  if (!note.createdAt || typeof note.createdAt !== 'string') return false;
  if (!['page', 'domain'].includes(note.scope)) return false;
  return true;
}

/**
 * Validate a highlight object has required fields.
 * @param {Object} highlight
 * @returns {boolean}
 */
export function validateHighlight(highlight) {
  if (!highlight || typeof highlight !== 'object') return false;
  if (!highlight.id || typeof highlight.id !== 'string') return false;
  if (!highlight.selectedText || typeof highlight.selectedText !== 'string') return false;
  if (!highlight.sourceUrl || typeof highlight.sourceUrl !== 'string') return false;
  if (!highlight.createdAt || typeof highlight.createdAt !== 'string') return false;
  return true;
}

/**
 * Create a default note object.
 * @param {Object} params
 * @returns {Object}
 */
export function createNote({
  title = '',
  body = '',
  scope = 'page',
  pageUrl = '',
  domain = '',
  pageTitle = '',
  tags = [],
  isFavorite = false,
  isPinned = false
} = {}) {
  const timestamp = now();
  return {
    id: generateId(),
    title: title.trim(),
    body: body,
    scope,
    pageUrl,
    domain,
    pageTitle,
    tags: normalizeTags(tags),
    isFavorite,
    isPinned,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

/**
 * Create a highlight/quotation object.
 * @param {Object} params
 * @returns {Object}
 */
export function createHighlight({
  selectedText = '',
  userNote = '',
  sourceUrl = '',
  sourceTitle = '',
  contextBefore = '',
  contextAfter = ''
} = {}) {
  const timestamp = now();
  return {
    id: generateId(),
    selectedText,
    userNote: userNote.trim(),
    sourceUrl,
    sourceTitle,
    contextBefore,
    contextAfter,
    createdAt: timestamp
  };
}

/**
 * Normalize tags array — lowercase, trimmed, unique, non-empty.
 * @param {Array<string>} tags
 * @returns {Array<string>}
 */
export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const result = [];
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const normalized = tag.trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

// ============================================================
// Chrome Storage Abstraction
// ============================================================

/**
 * Wrapper around chrome.storage.local.get.
 * Falls back to an in-memory store for testing.
 */
let memoryStore = {};

function isChrome() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}

export async function storageGet(keys) {
  if (isChrome()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  }
  // In-memory fallback for testing
  const result = {};
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const k of keyList) {
    if (k in memoryStore) {
      result[k] = JSON.parse(JSON.stringify(memoryStore[k]));
    }
  }
  return result;
}

export async function storageSet(data) {
  if (isChrome()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }
  // In-memory fallback
  for (const [key, val] of Object.entries(data)) {
    memoryStore[key] = JSON.parse(JSON.stringify(val));
  }
}

export async function storageClear() {
  if (isChrome()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }
  memoryStore = {};
}

// For test environment
export function _resetMemoryStore() {
  memoryStore = {};
}

// ============================================================
// High-level Storage Operations
// ============================================================

/**
 * Initialize storage with defaults if not yet set.
 */
export async function initializeStorage() {
  const result = await storageGet([STORAGE_KEYS.SCHEMA_VERSION, STORAGE_KEYS.NOTES, STORAGE_KEYS.HIGHLIGHTS, STORAGE_KEYS.SETTINGS]);
  
  const updates = {};
  
  if (!result[STORAGE_KEYS.SCHEMA_VERSION]) {
    updates[STORAGE_KEYS.SCHEMA_VERSION] = CURRENT_SCHEMA_VERSION;
  } else if (result[STORAGE_KEYS.SCHEMA_VERSION] < CURRENT_SCHEMA_VERSION) {
    await migrateSchema(result[STORAGE_KEYS.SCHEMA_VERSION], CURRENT_SCHEMA_VERSION);
    updates[STORAGE_KEYS.SCHEMA_VERSION] = CURRENT_SCHEMA_VERSION;
  }

  if (!result[STORAGE_KEYS.NOTES]) {
    updates[STORAGE_KEYS.NOTES] = [];
  }

  if (!result[STORAGE_KEYS.HIGHLIGHTS]) {
    updates[STORAGE_KEYS.HIGHLIGHTS] = [];
  }

  if (!result[STORAGE_KEYS.SETTINGS]) {
    updates[STORAGE_KEYS.SETTINGS] = { ...DEFAULT_SETTINGS };
  }

  if (Object.keys(updates).length > 0) {
    await storageSet(updates);
  }
}

/**
 * Migrate from one schema version to another.
 * @param {number} fromVersion
 * @param {number} toVersion
 */
async function migrateSchema(fromVersion, toVersion) {
  // Future migrations go here
  // For v1, no migrations needed
}

// ============================================================
// Notes CRUD
// ============================================================

/**
 * Get all notes.
 * @returns {Promise<Array>}
 */
export async function getAllNotes() {
  const result = await storageGet(STORAGE_KEYS.NOTES);
  const notes = result[STORAGE_KEYS.NOTES] || [];
  return notes.filter(n => validateNote(n));
}

/**
 * Get notes for a specific normalized URL.
 * @param {string} normalizedUrl
 * @returns {Promise<Array>}
 */
export async function getNotesForPage(normalizedUrl) {
  const notes = await getAllNotes();
  return notes.filter(n => n.scope === 'page' && n.pageUrl === normalizedUrl);
}

/**
 * Get notes for a specific domain.
 * @param {string} domain
 * @returns {Promise<Array>}
 */
export async function getNotesForDomain(domain) {
  const notes = await getAllNotes();
  return notes.filter(n => n.scope === 'domain' && n.domain === domain);
}

/**
 * Get notes relevant to a page (both page-specific and domain notes).
 * @param {string} normalizedUrl
 * @param {string} domain
 * @returns {Promise<Array>}
 */
export async function getNotesForContext(normalizedUrl, domain) {
  const notes = await getAllNotes();
  return notes.filter(n => {
    if (n.scope === 'page' && n.pageUrl === normalizedUrl) return true;
    if (n.scope === 'domain' && n.domain === domain) return true;
    return false;
  });
}

/**
 * Get a note by ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getNoteById(id) {
  const notes = await getAllNotes();
  return notes.find(n => n.id === id) || null;
}

/**
 * Save a new note.
 * @param {Object} note
 * @returns {Promise<Object>}
 */
export async function saveNote(note) {
  if (!validateNote(note)) {
    throw new Error('Invalid note data');
  }
  const notes = await getAllNotes();
  notes.push(note);
  await storageSet({ [STORAGE_KEYS.NOTES]: notes });
  return note;
}

/**
 * Update an existing note.
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<Object|null>}
 */
export async function updateNote(id, updates) {
  const notes = await getAllNotes();
  const index = notes.findIndex(n => n.id === id);
  if (index === -1) return null;

  const existing = notes[index];
  const updated = {
    ...existing,
    ...updates,
    id: existing.id, // Prevent ID overwrite
    createdAt: existing.createdAt, // Prevent creation date overwrite
    updatedAt: now()
  };

  if (updates.tags) {
    updated.tags = normalizeTags(updates.tags);
  }

  if (!validateNote(updated)) {
    throw new Error('Invalid note update');
  }

  notes[index] = updated;
  await storageSet({ [STORAGE_KEYS.NOTES]: notes });
  return updated;
}

/**
 * Delete a note by ID.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteNote(id) {
  const notes = await getAllNotes();
  const filtered = notes.filter(n => n.id !== id);
  if (filtered.length === notes.length) return false;
  await storageSet({ [STORAGE_KEYS.NOTES]: filtered });
  return true;
}

/**
 * Toggle favorite status.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function toggleFavorite(id) {
  const note = await getNoteById(id);
  if (!note) return null;
  return updateNote(id, { isFavorite: !note.isFavorite });
}

/**
 * Toggle pinned status.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function togglePin(id) {
  const note = await getNoteById(id);
  if (!note) return null;
  return updateNote(id, { isPinned: !note.isPinned });
}

// ============================================================
// Highlights CRUD
// ============================================================

/**
 * Get all highlights.
 * @returns {Promise<Array>}
 */
export async function getAllHighlights() {
  const result = await storageGet(STORAGE_KEYS.HIGHLIGHTS);
  const highlights = result[STORAGE_KEYS.HIGHLIGHTS] || [];
  return highlights.filter(h => validateHighlight(h));
}

/**
 * Save a highlight.
 * @param {Object} highlight
 * @returns {Promise<Object>}
 */
export async function saveHighlight(highlight) {
  if (!validateHighlight(highlight)) {
    throw new Error('Invalid highlight data');
  }
  const highlights = await getAllHighlights();
  highlights.push(highlight);
  await storageSet({ [STORAGE_KEYS.HIGHLIGHTS]: highlights });
  return highlight;
}

/**
 * Delete a highlight by ID.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteHighlight(id) {
  const highlights = await getAllHighlights();
  const filtered = highlights.filter(h => h.id !== id);
  if (filtered.length === highlights.length) return false;
  await storageSet({ [STORAGE_KEYS.HIGHLIGHTS]: filtered });
  return true;
}

/**
 * Update a highlight's user note.
 * @param {string} id
 * @param {string} userNote
 * @returns {Promise<Object|null>}
 */
export async function updateHighlightNote(id, userNote) {
  const highlights = await getAllHighlights();
  const index = highlights.findIndex(h => h.id === id);
  if (index === -1) return null;
  highlights[index].userNote = userNote.trim();
  await storageSet({ [STORAGE_KEYS.HIGHLIGHTS]: highlights });
  return highlights[index];
}

/**
 * Get highlights for a specific page URL.
 * @param {string} sourceUrl
 * @returns {Promise<Array>}
 */
export async function getHighlightsForPage(sourceUrl) {
  const highlights = await getAllHighlights();
  return highlights.filter(h => h.sourceUrl === sourceUrl);
}

// ============================================================
// Settings
// ============================================================

/**
 * Get current settings.
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  const result = await storageGet(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
}

/**
 * Update settings.
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateSettings(updates) {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await storageSet({ [STORAGE_KEYS.SETTINGS]: updated });
  return updated;
}

/**
 * Reset all data with confirmation.
 * @returns {Promise<void>}
 */
export async function resetAllData() {
  await storageSet({
    [STORAGE_KEYS.NOTES]: [],
    [STORAGE_KEYS.HIGHLIGHTS]: [],
    [STORAGE_KEYS.SETTINGS]: { ...DEFAULT_SETTINGS },
    [STORAGE_KEYS.SCHEMA_VERSION]: CURRENT_SCHEMA_VERSION
  });
}

// ============================================================
// Tags
// ============================================================

/**
 * Get all unique tags from all notes.
 * @returns {Promise<Array<string>>}
 */
export async function getAllTags() {
  const notes = await getAllNotes();
  const tagSet = new Set();
  for (const note of notes) {
    if (Array.isArray(note.tags)) {
      for (const tag of note.tags) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Get notes matching a specific tag.
 * @param {string} tag
 * @returns {Promise<Array>}
 */
export async function getNotesByTag(tag) {
  const notes = await getAllNotes();
  const normalized = tag.trim().toLowerCase();
  return notes.filter(n => Array.isArray(n.tags) && n.tags.includes(normalized));
}

/**
 * Calculate storage summary statistics.
 * @returns {Promise<Object>}
 */
export async function getStorageStats() {
  const notes = await getAllNotes();
  const highlights = await getAllHighlights();
  const tags = await getAllTags();

  return {
    noteCount: notes.length,
    highlightCount: highlights.length,
    tagCount: tags.length,
    pageScopeCount: notes.filter(n => n.scope === 'page').length,
    domainScopeCount: notes.filter(n => n.scope === 'domain').length,
    favoriteCount: notes.filter(n => n.isFavorite).length,
    pinnedCount: notes.filter(n => n.isPinned).length
  };
}

export { STORAGE_KEYS, CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS };
