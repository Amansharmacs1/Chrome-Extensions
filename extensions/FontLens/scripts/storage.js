/**
 * FontLens - Centralized Storage Engine
 * Versioned local persistence for typography presets, favorite fonts,
 * recent history, comparison snapshots, and user preferences with memory fallback.
 */

import { DEFAULT_PRESETS, validatePreset } from './presets.js';

export const FONTLENS_SCHEMA_VERSION = 1;

export const STORAGE_KEY_SCHEMA = 'fontlens_schema_version';
export const STORAGE_KEY_PRESETS = 'fontlens_presets';
export const STORAGE_KEY_FAVORITES = 'fontlens_favorites';
export const STORAGE_KEY_RECENT = 'fontlens_recent';
export const STORAGE_KEY_COMPARISONS = 'fontlens_comparisons';
export const STORAGE_KEY_SETTINGS = 'fontlens_settings';

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  defaultSampleText: 'The quick brown fox jumps over the lazy dog.',
  enableHoverTooltips: true,
  autoPinOnInspect: true,
  scanDepthLimit: 1500,
  enableContrastBadges: true,
  highlightColor: '#8B5CF6'
};

// In-memory fallback map for non-extension / Node.js test environments
const memoryStorage = new Map();

/**
 * Checks if chrome.storage.local is accessible
 * @returns {boolean}
 */
export function hasChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

/**
 * Low-level retrieval from storage
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getLocalStorage(key) {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime?.lastError) {
            console.warn(`[FontLens Storage] Get failed for ${key}:`, chrome.runtime.lastError.message);
            resolve(memoryStorage.get(key) || null);
          } else {
            resolve(result ? result[key] : null);
          }
        });
      } catch (err) {
        console.warn(`[FontLens Storage] Exception reading ${key}:`, err);
        resolve(memoryStorage.get(key) || null);
      }
    });
  }
  return memoryStorage.get(key) || null;
}

/**
 * Low-level write to storage
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
export async function setLocalStorage(key, value) {
  memoryStorage.set(key, value);
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime?.lastError) {
            console.warn(`[FontLens Storage] Set warning for ${key}:`, chrome.runtime.lastError.message);
          }
          resolve();
        });
      } catch (err) {
        console.warn(`[FontLens Storage] Exception writing ${key}:`, err);
        resolve();
      }
    });
  }
}

/**
 * Low-level removal from storage
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function removeLocalStorage(key) {
  memoryStorage.delete(key);
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.remove([key], () => {
          resolve();
        });
      } catch {
        resolve();
      }
    });
  }
}

/**
 * Retrieves all presets (seeded with DEFAULT_PRESETS if empty)
 * @returns {Promise<Array<object>>}
 */
export async function getPresets() {
  const stored = await getLocalStorage(STORAGE_KEY_PRESETS);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    await setLocalStorage(STORAGE_KEY_PRESETS, DEFAULT_PRESETS);
    return JSON.parse(JSON.stringify(DEFAULT_PRESETS));
  }
  return stored;
}

/**
 * Saves or updates a preset
 * @param {object} preset
 * @returns {Promise<object>}
 */
export async function savePreset(preset) {
  const validation = validatePreset(preset);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const presets = await getPresets();
  const index = presets.findIndex(p => p.id === preset.id);

  const clean = {
    ...preset,
    updatedAt: Date.now()
  };

  if (index >= 0) {
    presets[index] = clean;
  } else {
    presets.unshift(clean);
  }

  await setLocalStorage(STORAGE_KEY_PRESETS, presets);
  return clean;
}

/**
 * Deletes a preset by ID (cannot delete built-ins)
 * @param {string} presetId
 * @returns {Promise<boolean>}
 */
export async function deletePreset(presetId) {
  if (!presetId) return false;
  const presets = await getPresets();
  const target = presets.find(p => p.id === presetId);
  if (target?.isBuiltIn) {
    throw new Error('Default built-in presets cannot be deleted.');
  }

  const filtered = presets.filter(p => p.id !== presetId);
  await setLocalStorage(STORAGE_KEY_PRESETS, filtered);
  return true;
}

/**
 * Retrieves favorite font names
 * @returns {Promise<string[]>}
 */
export async function getFavorites() {
  const favs = await getLocalStorage(STORAGE_KEY_FAVORITES);
  return Array.isArray(favs) ? favs : [];
}

/**
 * Toggles a font name as favorite
 * @param {string} fontName
 * @returns {Promise<boolean>} new favorite state
 */
export async function toggleFavorite(fontName = '') {
  const clean = fontName.trim();
  if (!clean) return false;

  const favs = await getFavorites();
  const index = favs.indexOf(clean);
  let isNowFav = false;

  if (index >= 0) {
    favs.splice(index, 1);
    isNowFav = false;
  } else {
    favs.push(clean);
    isNowFav = true;
  }

  await setLocalStorage(STORAGE_KEY_FAVORITES, favs);
  return isNowFav;
}

/**
 * Checks if a font name is favorited
 * @param {string} fontName
 * @returns {Promise<boolean>}
 */
export async function isFavorite(fontName = '') {
  const favs = await getFavorites();
  return favs.includes(fontName.trim());
}

/**
 * Retrieves recently inspected font records
 * @returns {Promise<Array<{ fontName: string, timestamp: number, url?: string }>>}
 */
export async function getRecentFonts() {
  const list = await getLocalStorage(STORAGE_KEY_RECENT);
  return Array.isArray(list) ? list : [];
}

/**
 * Records an inspected font into recent history (deduplicated, max 25)
 * @param {string} fontName
 * @param {string} [url='']
 * @returns {Promise<void>}
 */
export async function addRecentFont(fontName = '', url = '') {
  const clean = typeof fontName === 'string' ? fontName.trim() : '';
  if (!clean) return;

  const recents = await getRecentFonts();
  const filtered = recents.filter(r => r && typeof r.fontName === 'string' && r.fontName.toLowerCase() !== clean.toLowerCase());

  filtered.unshift({
    fontName: clean,
    timestamp: Date.now(),
    url
  });

  if (filtered.length > 25) {
    filtered.length = 25;
  }

  await setLocalStorage(STORAGE_KEY_RECENT, filtered);
}

/**
 * Clears recent inspected fonts
 * @returns {Promise<void>}
 */
export async function clearRecentFonts() {
  await removeLocalStorage(STORAGE_KEY_RECENT);
}

/**
 * Retrieves saved comparison snapshots
 * @returns {Promise<Array<object>>}
 */
export async function getSavedComparisons() {
  const comps = await getLocalStorage(STORAGE_KEY_COMPARISONS);
  return Array.isArray(comps) ? comps : [];
}

/**
 * Saves a comparison studio snapshot
 * @param {object} comparison
 * @returns {Promise<object>}
 */
export async function saveComparison(comparison) {
  if (!comparison || !comparison.title) {
    throw new Error('Comparison title is required.');
  }

  const comps = await getSavedComparisons();
  const clean = {
    ...comparison,
    id: comparison.id || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    updatedAt: Date.now(),
    createdAt: comparison.createdAt || Date.now()
  };

  const idx = comps.findIndex(c => c.id === clean.id);
  if (idx >= 0) {
    comps[idx] = clean;
  } else {
    comps.unshift(clean);
  }

  await setLocalStorage(STORAGE_KEY_COMPARISONS, comps);
  return clean;
}

/**
 * Deletes a comparison snapshot by ID
 * @param {string} compId
 * @returns {Promise<boolean>}
 */
export async function deleteComparison(compId) {
  if (!compId) return false;
  const comps = await getSavedComparisons();
  const filtered = comps.filter(c => c.id !== compId);
  await setLocalStorage(STORAGE_KEY_COMPARISONS, filtered);
  return true;
}

/**
 * Retrieves user preferences
 * @returns {Promise<object>}
 */
export async function getUserSettings() {
  const settings = await getLocalStorage(STORAGE_KEY_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {})
  };
}

/**
 * Saves updated user preferences
 * @param {object} partial
 * @returns {Promise<object>}
 */
export async function saveUserSettings(partial = {}) {
  const current = await getUserSettings();
  const updated = { ...current, ...partial };
  await setLocalStorage(STORAGE_KEY_SETTINGS, updated);
  return updated;
}

/**
 * Clears all FontLens stored data
 * @returns {Promise<void>}
 */
export async function deleteAllData() {
  memoryStorage.clear();
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }
}
