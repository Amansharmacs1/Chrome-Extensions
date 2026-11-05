/**
 * ViewPortX - Storage & Settings Engine
 * Manages chrome.storage.local with schema migrations, in-memory fallbacks,
 * device profiles, site-specific overrides, and user preferences.
 */

export const STORAGE_KEY_SETTINGS = 'viewportx_settings';
export const STORAGE_KEY_SITES = 'viewportx_site_prefs';
export const STORAGE_KEY_ACTIVE = 'viewportx_active_state';
export const STORAGE_KEY_DEVICES = 'viewportx_device_profiles';

const memoryStore = {};

export function hasChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

export const DEFAULT_DEVICE_PROFILES = [
  { id: 'dev-small-mob', name: 'Small Mobile', width: 320, height: 640, category: 'mobile', dpr: 2 },
  { id: 'dev-mob', name: 'Mobile', width: 375, height: 812, category: 'mobile', dpr: 3 },
  { id: 'dev-std-mob', name: 'Standard Mobile', width: 390, height: 844, category: 'mobile', dpr: 3 },
  { id: 'dev-large-mob', name: 'Large Mobile', width: 430, height: 932, category: 'mobile', dpr: 3 },
  { id: 'dev-tablet', name: 'Tablet', width: 768, height: 1024, category: 'tablet', dpr: 2 },
  { id: 'dev-laptop', name: 'Laptop', width: 1366, height: 768, category: 'laptop', dpr: 1 },
  { id: 'dev-desktop', name: 'Desktop', width: 1440, height: 900, category: 'desktop', dpr: 1 }
];

export const DEFAULT_SETTINGS = {
  autoScan: true,
  autoApplySafeFixes: true,
  requireApproval: false,
  sessionOnly: true,
  rememberPerSite: false,
  highlightIssues: true,
  maxElementsScanned: 1000,
  emulationDpr: 2,
  theme: 'dark'
};

/**
 * Retrieves a key from chrome.storage.local or memory fallback
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getLocalStorage(key) {
  if (hasChromeStorage()) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get([key], result => {
          if (chrome.runtime?.lastError) {
            console.warn('[ViewPortX Storage] get error:', chrome.runtime.lastError.message);
            resolve(memoryStore[key]);
            return;
          }
          const val = result ? result[key] : undefined;
          if (val !== undefined) {
            memoryStore[key] = val;
            resolve(val);
          } else {
            resolve(memoryStore[key]);
          }
        });
      } catch (err) {
        console.warn('[ViewPortX Storage] get thrown:', err);
        resolve(memoryStore[key]);
      }
    });
  }
  return memoryStore[key];
}

/**
 * Sets a key in chrome.storage.local and memory fallback
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
export async function setLocalStorage(key, value) {
  memoryStore[key] = value;
  if (hasChromeStorage()) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime?.lastError) {
            console.warn('[ViewPortX Storage] set error:', chrome.runtime.lastError.message);
          }
          resolve();
        });
      } catch (err) {
        console.warn('[ViewPortX Storage] set thrown:', err);
        resolve();
      }
    });
  }
}

/**
 * Removes a key from storage
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function removeLocalStorage(key) {
  delete memoryStore[key];
  if (hasChromeStorage()) {
    return new Promise(resolve => {
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
 * Clears all storage keys
 * @returns {Promise<void>}
 */
export async function clearLocalStorage() {
  Object.keys(memoryStore).forEach(k => delete memoryStore[k]);
  if (hasChromeStorage()) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.clear(() => resolve());
      } catch {
        resolve();
      }
    });
  }
}

/**
 * Gets user settings with defaults applied
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
export async function getSettings() {
  const stored = await getLocalStorage(STORAGE_KEY_SETTINGS);
  if (!stored || typeof stored !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

/**
 * Updates settings with partial values
 * @param {Partial<typeof DEFAULT_SETTINGS>} partial
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
export async function saveSettings(partial = {}) {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await setLocalStorage(STORAGE_KEY_SETTINGS, updated);
  return updated;
}

/**
 * Gets device profiles or initial defaults
 * @returns {Promise<Array<typeof DEFAULT_DEVICE_PROFILES[0]>>}
 */
export async function getDeviceProfiles() {
  const stored = await getLocalStorage(STORAGE_KEY_DEVICES);
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }
  return [...DEFAULT_DEVICE_PROFILES];
}

/**
 * Saves or updates device profiles
 * @param {Array<any>} profiles
 * @returns {Promise<void>}
 */
export async function saveDeviceProfiles(profiles) {
  if (Array.isArray(profiles)) {
    await setLocalStorage(STORAGE_KEY_DEVICES, profiles);
  }
}

/**
 * Saves site preferences (e.g. approved transformations for a hostname)
 * @param {string} hostname
 * @param {Object} prefs
 * @returns {Promise<void>}
 */
export async function saveSitePrefs(hostname, prefs) {
  if (!hostname) return;
  const allSites = (await getLocalStorage(STORAGE_KEY_SITES)) || {};
  allSites[hostname] = {
    ...allSites[hostname],
    ...prefs,
    updatedAt: Date.now()
  };
  await setLocalStorage(STORAGE_KEY_SITES, allSites);
}

/**
 * Gets saved preferences for a specific hostname
 * @param {string} hostname
 * @returns {Promise<Object|null>}
 */
export async function getSitePrefs(hostname) {
  if (!hostname) return null;
  const allSites = (await getLocalStorage(STORAGE_KEY_SITES)) || {};
  return allSites[hostname] || null;
}

export const DEVICE_PROFILES = DEFAULT_DEVICE_PROFILES;
export const getViewPortXSettings = getSettings;
export const saveViewPortXSettings = saveSettings;
export const getSiteOverrides = getSitePrefs;
export const saveSiteOverrides = saveSitePrefs;

