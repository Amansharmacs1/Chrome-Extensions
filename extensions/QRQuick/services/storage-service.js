/**
 * QRQuick - Centralized Storage Engine
 * Versioned local persistence layer managing QR History, Scan Records,
 * Custom Styling Presets, and User Settings via chrome.storage.local
 * with automatic in-memory fallback for Node.js test environments.
 */

export const QRQUICK_SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  SCHEMA: 'qrquick_schema_version',
  HISTORY: 'qrquick_history',
  SCAN_HISTORY: 'qrquick_scan_history',
  PRESETS: 'qrquick_presets',
  SETTINGS: 'qrquick_settings'
};

export const DEFAULT_SETTINGS = {
  defaultFormat: 'png',     // 'png' | 'svg' | 'jpeg'
  defaultSize: 512,         // 256 | 512 | 1024 | 2048
  defaultEcLevel: 'M',      // 'L' | 'M' | 'Q' | 'H'
  promptConfirmOnUrl: true, // Warn and confirm before opening scanned URLs
  theme: 'dark',
  autoSaveScans: true,
  autoSaveGenerated: true
};

// Built-in professional presets
export const DEFAULT_PRESETS = [
  {
    id: 'preset_classic_dark',
    name: 'Classic Dark',
    fgColor: '#0F172A',
    bgColor: '#FFFFFF',
    pattern: 'square',
    eyeOuter: 'square',
    eyeInner: 'square',
    margin: 4,
    ecLevel: 'M',
    isBuiltIn: true
  },
  {
    id: 'preset_electric_cyan',
    name: 'Electric Cyan',
    fgColor: '#06B6D4',
    bgColor: '#0B0F19',
    pattern: 'rounded',
    eyeOuter: 'rounded',
    eyeInner: 'circle',
    margin: 4,
    ecLevel: 'Q',
    isBuiltIn: true
  },
  {
    id: 'preset_ocean_breeze',
    name: 'Ocean Gradient',
    fgColor: '#0284C7',
    fgColorSecondary: '#06B6D4',
    isGradient: true,
    gradientType: 'linear',
    bgColor: '#FFFFFF',
    pattern: 'dots',
    eyeOuter: 'circle',
    eyeInner: 'circle',
    margin: 4,
    ecLevel: 'Q',
    isBuiltIn: true
  },
  {
    id: 'preset_sunset_violet',
    name: 'Sunset Glow',
    fgColor: '#8B5CF6',
    fgColorSecondary: '#EC4899',
    isGradient: true,
    gradientType: 'linear',
    bgColor: '#0F172A',
    pattern: 'rounded',
    eyeOuter: 'rounded',
    eyeInner: 'diamond',
    margin: 4,
    ecLevel: 'H',
    isBuiltIn: true
  },
  {
    id: 'preset_minimal_mono',
    name: 'Minimal Mono',
    fgColor: '#1E293B',
    bgColor: '#F8FAFC',
    pattern: 'dots',
    eyeOuter: 'rounded',
    eyeInner: 'square',
    margin: 4,
    ecLevel: 'M',
    isBuiltIn: true
  }
];

// In-memory fallback for testing in Node.js
const memoryStorage = new Map();

/**
 * Storage read adapter
 * @param {string|string[]} keys
 * @returns {Promise<object>}
 */
async function storageGet(keys) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (res) => resolve(res || {}));
    });
  }
  const result = {};
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const k of keyList) {
    if (memoryStorage.has(k)) {
      result[k] = JSON.parse(JSON.stringify(memoryStorage.get(k)));
    }
  }
  return result;
}

/**
 * Storage write adapter
 * @param {object} items
 * @returns {Promise<void>}
 */
async function storageSet(items) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime?.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
  for (const [k, v] of Object.entries(items)) {
    memoryStorage.set(k, JSON.parse(JSON.stringify(v)));
  }
}

/**
 * Storage remove adapter
 * @param {string|string[]} keys
 * @returns {Promise<void>}
 */
async function storageRemove(keys) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => resolve());
    });
  }
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const k of keyList) {
    memoryStorage.delete(k);
  }
}

/**
 * Initializes storage with default values and performs schema migrations if needed
 * @returns {Promise<void>}
 */
export async function initStorage() {
  const result = await storageGet(STORAGE_KEYS.SCHEMA);
  if (!result[STORAGE_KEYS.SCHEMA]) {
    await storageSet({
      [STORAGE_KEYS.SCHEMA]: QRQUICK_SCHEMA_VERSION,
      [STORAGE_KEYS.HISTORY]: [],
      [STORAGE_KEYS.SCAN_HISTORY]: [],
      [STORAGE_KEYS.PRESETS]: DEFAULT_PRESETS,
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS
    });
  }
}

/**
 * Retrieves all generated QR history items (sorted newest first)
 * @returns {Promise<Array<object>>}
 */
export async function getHistory() {
  const res = await storageGet(STORAGE_KEYS.HISTORY);
  return Array.isArray(res[STORAGE_KEYS.HISTORY]) ? res[STORAGE_KEYS.HISTORY] : [];
}

/**
 * Saves a new generated QR code into history
 * @param {object} item
 * @returns {Promise<object>} Saved item
 */
export async function saveHistoryItem(item) {
  if (!item || !item.payload) {
    throw new Error('History item must contain a payload.');
  }

  const history = await getHistory();
  const now = Date.now();
  const id = item.id || `qr_${now}_${Math.random().toString(36).substring(2, 7)}`;

  const newItem = {
    id,
    type: item.type || 'text',
    title: item.title || item.payload.slice(0, 40),
    payload: item.payload,
    timestamp: item.timestamp || now,
    isFavorite: Boolean(item.isFavorite),
    options: item.options || {},
    thumbnailDataUrl: item.thumbnailDataUrl || null
  };

  // Limit history items to 200 to stay well within Chrome storage quotas
  history.unshift(newItem);
  if (history.length > 200) {
    // Keep favorites, prune oldest non-favorites
    const favs = history.filter(h => h.isFavorite);
    const nonFavs = history.filter(h => !h.isFavorite).slice(0, 200 - favs.length);
    history.length = 0;
    history.push(...favs, ...nonFavs);
    history.sort((a, b) => b.timestamp - a.timestamp);
  }

  await storageSet({ [STORAGE_KEYS.HISTORY]: history });
  return newItem;
}

/**
 * Updates an existing history item
 * @param {string} id
 * @param {object} patch
 * @returns {Promise<object|null>}
 */
export async function updateHistoryItem(id, patch = {}) {
  const history = await getHistory();
  const idx = history.findIndex(h => h.id === id);
  if (idx === -1) return null;

  history[idx] = {
    ...history[idx],
    ...patch,
    id // prevent ID overwrite
  };

  await storageSet({ [STORAGE_KEYS.HISTORY]: history });
  return history[idx];
}

/**
 * Deletes a single history item by ID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteHistoryItem(id) {
  const history = await getHistory();
  const filtered = history.filter(h => h.id !== id);
  if (filtered.length === history.length) return false;

  await storageSet({ [STORAGE_KEYS.HISTORY]: filtered });
  return true;
}

/**
 * Clears all generated QR history (preserves favorites if requested)
 * @param {boolean} [preserveFavorites=false]
 * @returns {Promise<void>}
 */
export async function clearHistory(preserveFavorites = false) {
  if (preserveFavorites) {
    const history = await getHistory();
    const favs = history.filter(h => h.isFavorite);
    await storageSet({ [STORAGE_KEYS.HISTORY]: favs });
  } else {
    await storageSet({ [STORAGE_KEYS.HISTORY]: [] });
  }
}

/**
 * Retrieves all scanned QR items (sorted newest first)
 * @returns {Promise<Array<object>>}
 */
export async function getScanHistory() {
  const res = await storageGet(STORAGE_KEYS.SCAN_HISTORY);
  return Array.isArray(res[STORAGE_KEYS.SCAN_HISTORY]) ? res[STORAGE_KEYS.SCAN_HISTORY] : [];
}

/**
 * Saves a new scanned QR code into scan history
 * @param {object} scanData
 * @returns {Promise<object>} Saved scan record
 */
export async function saveScanResult(scanData) {
  if (!scanData || !scanData.decodedText) {
    throw new Error('Scan result must contain decodedText.');
  }

  const scans = await getScanHistory();
  const now = Date.now();
  const id = scanData.id || `scan_${now}_${Math.random().toString(36).substring(2, 7)}`;

  const newScan = {
    id,
    decodedText: scanData.decodedText,
    recognizedType: scanData.recognizedType || 'text',
    title: scanData.title || scanData.decodedText.slice(0, 40),
    isUrl: Boolean(scanData.isUrl),
    timestamp: scanData.timestamp || now,
    isFavorite: Boolean(scanData.isFavorite)
  };

  scans.unshift(newScan);
  if (scans.length > 200) {
    scans.length = 200;
  }

  await storageSet({ [STORAGE_KEYS.SCAN_HISTORY]: scans });
  return newScan;
}

/**
 * Deletes a single scan history item
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteScanItem(id) {
  const scans = await getScanHistory();
  const filtered = scans.filter(s => s.id !== id);
  if (filtered.length === scans.length) return false;

  await storageSet({ [STORAGE_KEYS.SCAN_HISTORY]: filtered });
  return true;
}

/**
 * Clears all scan history
 * @returns {Promise<void>}
 */
export async function clearScanHistory() {
  await storageSet({ [STORAGE_KEYS.SCAN_HISTORY]: [] });
}

/**
 * Retrieves styling presets
 * @returns {Promise<Array<object>>}
 */
export async function getPresets() {
  const res = await storageGet(STORAGE_KEYS.PRESETS);
  const userPresets = Array.isArray(res[STORAGE_KEYS.PRESETS]) ? res[STORAGE_KEYS.PRESETS] : [];
  // Ensure default presets are always present
  const defaultIds = new Set(DEFAULT_PRESETS.map(p => p.id));
  const customOnly = userPresets.filter(p => !defaultIds.has(p.id));
  return [...DEFAULT_PRESETS, ...customOnly];
}

/**
 * Saves a custom styling preset
 * @param {object} preset
 * @returns {Promise<object>}
 */
export async function savePreset(preset) {
  if (!preset || !preset.name) {
    throw new Error('Preset must have a name.');
  }

  const presets = await getPresets();
  const id = preset.id || `preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newPreset = {
    ...preset,
    id,
    isBuiltIn: false
  };

  const existingIdx = presets.findIndex(p => p.id === id);
  if (existingIdx !== -1) {
    presets[existingIdx] = newPreset;
  } else {
    presets.push(newPreset);
  }

  await storageSet({ [STORAGE_KEYS.PRESETS]: presets });
  return newPreset;
}

/**
 * Deletes a custom preset (built-ins cannot be deleted)
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deletePreset(id) {
  if (DEFAULT_PRESETS.some(p => p.id === id)) {
    return false; // Cannot delete built-ins
  }

  const presets = await getPresets();
  const filtered = presets.filter(p => p.id !== id);
  await storageSet({ [STORAGE_KEYS.PRESETS]: filtered });
  return true;
}

/**
 * Retrieves user settings
 * @returns {Promise<object>}
 */
export async function getSettings() {
  const res = await storageGet(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(res[STORAGE_KEYS.SETTINGS] || {}) };
}

/**
 * Updates user settings
 * @param {object} patch
 * @returns {Promise<object>}
 */
export async function updateSettings(patch = {}) {
  const current = await getSettings();
  const updated = { ...current, ...patch };
  await storageSet({ [STORAGE_KEYS.SETTINGS]: updated });
  return updated;
}

/**
 * Computes dashboard usage statistics
 * @returns {Promise<{ totalGenerated: number, totalScanned: number, totalFavorites: number, recentActivityCount: number }>}
 */
export async function getStorageStats() {
  const history = await getHistory();
  const scans = await getScanHistory();

  const totalGenerated = history.length;
  const totalScanned = scans.length;
  const genFavs = history.filter(h => h.isFavorite).length;
  const scanFavs = scans.filter(s => s.isFavorite).length;
  const totalFavorites = genFavs + scanFavs;

  const oneDayAgo = Date.now() - 86400000;
  const recentGen = history.filter(h => h.timestamp >= oneDayAgo).length;
  const recentScans = scans.filter(s => s.timestamp >= oneDayAgo).length;

  return {
    totalGenerated,
    totalScanned,
    totalFavorites,
    recentActivityCount: recentGen + recentScans
  };
}

/**
 * Exports complete backup payload of all user data
 * @returns {Promise<object>}
 */
export async function exportAllData() {
  const data = await storageGet([
    STORAGE_KEYS.SCHEMA,
    STORAGE_KEYS.HISTORY,
    STORAGE_KEYS.SCAN_HISTORY,
    STORAGE_KEYS.PRESETS,
    STORAGE_KEYS.SETTINGS
  ]);

  return {
    app: 'QRQuick',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    schemaVersion: QRQUICK_SCHEMA_VERSION,
    data: {
      history: data[STORAGE_KEYS.HISTORY] || [],
      scanHistory: data[STORAGE_KEYS.SCAN_HISTORY] || [],
      presets: data[STORAGE_KEYS.PRESETS] || DEFAULT_PRESETS,
      settings: data[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS
    }
  };
}

/**
 * Resets all user storage to clean state
 * @returns {Promise<void>}
 */
export async function clearAllData() {
  await storageRemove([
    STORAGE_KEYS.HISTORY,
    STORAGE_KEYS.SCAN_HISTORY,
    STORAGE_KEYS.PRESETS,
    STORAGE_KEYS.SETTINGS
  ]);
  await storageSet({
    [STORAGE_KEYS.SCHEMA]: QRQUICK_SCHEMA_VERSION,
    [STORAGE_KEYS.HISTORY]: [],
    [STORAGE_KEYS.SCAN_HISTORY]: [],
    [STORAGE_KEYS.PRESETS]: DEFAULT_PRESETS,
    [STORAGE_KEYS.SETTINGS]: { ...DEFAULT_SETTINGS }
  });
}
