/**
 * BugShot - Centralized Storage Engine
 * Versioned persistence layer managing Bug Reports, Screenshots,
 * Active Capture Sessions, and User Preferences via chrome.storage.local
 * with automated in-memory fallback for testing environments.
 */

export const BUGSHOT_SCHEMA_VERSION = 1;

export const STORAGE_KEY_SCHEMA = 'bugshot_schema_version';
export const STORAGE_KEY_REPORTS = 'bugshot_reports';
export const STORAGE_KEY_SESSION = 'bugshot_active_session';
export const STORAGE_KEY_SETTINGS = 'bugshot_settings';

export const DEFAULT_PREFERENCES = {
  theme: 'dark',
  defaultSeverity: 'medium',
  defaultPriority: 'P2',
  autoCaptureConsole: true,
  autoCaptureNetwork: true,
  sanitizeUrlParams: true,
  includeTimestampInExportFilename: true,
  maxStoredReports: 50
};

// In-memory fallback map for non-extension or testing environments
const memoryStorage = new Map();

const IDB_NAME = 'BugShotDB';
const IDB_VERSION = 1;
const IDB_STORE = 'keyval';

let cachedIdb = null;

/**
 * Opens or retrieves cached IndexedDB connection
 * @returns {Promise<IDBDatabase|null>}
 */
function openIdb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (cachedIdb) return Promise.resolve(cachedIdb);

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = (e) => {
        cachedIdb = e.target.result;
        resolve(cachedIdb);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Saves a key-value pair in IndexedDB fallback
 */
async function setIdb(key, value) {
  const db = await openIdb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Retrieves a key-value pair from IndexedDB fallback
 */
async function getIdb(key) {
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Removes a key-value pair from IndexedDB fallback
 */
async function removeIdb(key) {
  const db = await openIdb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Checks whether chrome.storage.local is accessible
 * @returns {boolean}
 */
export function hasChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

/**
 * Low-level retrieval from storage with chrome.storage.local and IndexedDB tiers
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getLocalStorage(key) {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([key], async (result) => {
          if (chrome.runtime?.lastError) {
            console.warn(`[BugShot Storage] Get failed for ${key}:`, chrome.runtime.lastError.message);
            const idbVal = await getIdb(key);
            resolve(idbVal !== null ? idbVal : (memoryStorage.get(key) || null));
          } else {
            const val = result ? result[key] : null;
            if (val !== null && val !== undefined) {
              resolve(val);
            } else {
              const idbVal = await getIdb(key);
              resolve(idbVal !== null ? idbVal : (memoryStorage.get(key) || null));
            }
          }
        });
      } catch (err) {
        console.warn(`[BugShot Storage] Exception reading ${key}:`, err);
        getIdb(key).then(idbVal => resolve(idbVal !== null ? idbVal : (memoryStorage.get(key) || null)));
      }
    });
  }
  const idbVal = await getIdb(key);
  return idbVal !== null ? idbVal : (memoryStorage.get(key) || null);
}

/**
 * Low-level write to storage with automated quota defense and IndexedDB fallback
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
export async function setLocalStorage(key, value) {
  memoryStorage.set(key, value);
  await setIdb(key, value).catch(() => {});

  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime?.lastError) {
            const errMsg = chrome.runtime.lastError.message || '';
            // If quota exceeded, data is safely saved in high-capacity IndexedDB tier
            if (errMsg.includes('quota') || errMsg.includes('Quota') || errMsg.includes('kQuotaBytes')) {
              console.warn(`[BugShot Storage] chrome.storage.local quota exceeded for ${key}. Preserved safely in high-capacity IndexedDB tier.`);
              // If storing active session, write a slim reference to local storage
              if (key === STORAGE_KEY_SESSION && value && value.annotatedScreenshot && value.rawScreenshot) {
                const slim = { ...value, rawScreenshot: value.annotatedScreenshot };
                chrome.storage.local.set({ [key]: slim }, () => {});
              }
              resolve();
            } else {
              console.error(`[BugShot Storage] Set failed for ${key}:`, errMsg);
              reject(new Error(errMsg));
            }
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error(`[BugShot Storage] Exception writing ${key}:`, err);
        resolve(); // Preserved in memoryStorage and IndexedDB
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
  await removeIdb(key).catch(() => {});
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
 * Retrieves all stored bug reports
 * @returns {Promise<import('../src/types').BugReport[]>}
 */
export async function getReports() {
  const reports = await getLocalStorage(STORAGE_KEY_REPORTS);
  return Array.isArray(reports) ? reports : [];
}

/**
 * Retrieves a single report by ID
 * @param {string} reportId
 * @returns {Promise<import('../src/types').BugReport|null>}
 */
export async function getReportById(reportId) {
  if (!reportId) return null;
  const reports = await getReports();
  return reports.find(r => r.id === reportId) || null;
}

/**
 * Saves or updates a bug report with storage quota defense
 * @param {import('../src/types').BugReport} report
 * @returns {Promise<import('../src/types').BugReport>}
 */
export async function saveReport(report) {
  if (!report || !report.id) {
    throw new Error('Invalid report object: id is required.');
  }

  const reports = await getReports();
  const index = reports.findIndex(r => r.id === report.id);

  const cleanReport = {
    ...report,
    updatedAt: Date.now()
  };

  if (index >= 0) {
    reports[index] = cleanReport;
  } else {
    reports.unshift(cleanReport);
  }

  // Enforce max stored reports ceiling from settings
  const prefs = await getUserPreferences();
  const max = prefs.maxStoredReports || 50;
  if (reports.length > max) {
    reports.length = max;
  }

  await setLocalStorage(STORAGE_KEY_REPORTS, reports);
  return cleanReport;
}

/**
 * Deletes a bug report by ID
 * @param {string} reportId
 * @returns {Promise<boolean>}
 */
export async function deleteReport(reportId) {
  if (!reportId) return false;
  const reports = await getReports();
  const filtered = reports.filter(r => r.id !== reportId);
  await setLocalStorage(STORAGE_KEY_REPORTS, filtered);
  return true;
}

/**
 * Duplicates an existing report with fresh IDs and timestamps
 * @param {string} reportId
 * @returns {Promise<import('../src/types').BugReport|null>}
 */
export async function duplicateReport(reportId) {
  const original = await getReportById(reportId);
  if (!original) return null;

  const duplicate = {
    ...JSON.parse(JSON.stringify(original)),
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: `${original.title} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  return await saveReport(duplicate);
}

/**
 * Retrieves the currently active capture session
 * @returns {Promise<import('../src/types').CaptureSession|null>}
 */
export async function getActiveSession() {
  return await getLocalStorage(STORAGE_KEY_SESSION);
}

/**
 * Saves a new active capture session
 * @param {import('../src/types').CaptureSession} session
 * @returns {Promise<void>}
 */
export async function saveActiveSession(session) {
  await setLocalStorage(STORAGE_KEY_SESSION, session);
}

/**
 * Clears the active capture session
 * @returns {Promise<void>}
 */
export async function clearActiveSession() {
  await removeLocalStorage(STORAGE_KEY_SESSION);
}

/**
 * Retrieves user preferences
 * @returns {Promise<import('../src/types').UserPreferences>}
 */
export async function getUserPreferences() {
  const settings = await getLocalStorage(STORAGE_KEY_SETTINGS);
  return {
    ...DEFAULT_PREFERENCES,
    ...(settings || {})
  };
}

/**
 * Saves updated user preferences
 * @param {Partial<import('../src/types').UserPreferences>} partial
 * @returns {Promise<import('../src/types').UserPreferences>}
 */
export async function saveUserPreferences(partial = {}) {
  const current = await getUserPreferences();
  const updated = { ...current, ...partial };
  await setLocalStorage(STORAGE_KEY_SETTINGS, updated);
  return updated;
}

/**
 * Calculates current bytes in use across chrome.storage.local
 * @returns {Promise<{ bytesInUse: number, formatted: string }>}
 */
export async function getStorageUsage() {
  if (hasChromeStorage() && typeof chrome.storage.local.getBytesInUse === 'function') {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytes) => {
        const kb = (bytes / 1024).toFixed(1);
        const mb = (bytes / (1024 * 1024)).toFixed(2);
        resolve({
          bytesInUse: bytes,
          formatted: bytes > 1024 * 1024 ? `${mb} MB` : `${kb} KB`
        });
      });
    });
  }

  // Memory fallback estimate
  let totalBytes = 0;
  for (const [k, v] of memoryStorage.entries()) {
    totalBytes += (k.length + JSON.stringify(v || '').length) * 2;
  }
  return {
    bytesInUse: totalBytes,
    formatted: `${(totalBytes / 1024).toFixed(1)} KB`
  };
}

/**
 * Clears all BugShot data completely
 * @returns {Promise<void>}
 */
export async function deleteAllData() {
  memoryStorage.clear();
  const db = await openIdb();
  if (db) {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
    } catch {}
  }
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }
}
