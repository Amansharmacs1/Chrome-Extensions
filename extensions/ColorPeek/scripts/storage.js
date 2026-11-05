/**
 * ColorPeek - Storage Engine
 * Coordinates chrome.storage.local with schema migrations, in-memory fallback,
 * and comprehensive error checking to prevent uncaught runtime errors.
 */

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY_SCHEMA = 'colorpeek_schema_version';

// In-memory fallback for testing or non-extension environments
const memoryStore = {};

/**
 * Checks if chrome.storage.local is available
 * @returns {boolean}
 */
export function hasChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

/**
 * Gets a key from storage
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getStorage(key) {
  if (hasChromeStorage()) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get([key], result => {
          if (chrome.runtime?.lastError) {
            console.warn('[ColorPeek Storage] getStorage warning:', chrome.runtime.lastError.message);
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
        console.warn('[ColorPeek Storage] getStorage thrown:', err);
        resolve(memoryStore[key]);
      }
    });
  }
  return memoryStore[key];
}

/**
 * Sets a key in storage
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
export async function setStorage(key, value) {
  memoryStore[key] = value;
  if (hasChromeStorage()) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime?.lastError) {
            console.warn('[ColorPeek Storage] setStorage warning:', chrome.runtime.lastError.message);
          }
          resolve();
        });
      } catch (err) {
        console.warn('[ColorPeek Storage] setStorage thrown:', err);
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
export async function removeStorage(key) {
  delete memoryStore[key];
  if (hasChromeStorage()) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.remove([key], () => {
          if (chrome.runtime?.lastError) {
            console.warn('[ColorPeek Storage] removeStorage warning:', chrome.runtime.lastError.message);
          }
          resolve();
        });
      } catch (err) {
        console.warn('[ColorPeek Storage] removeStorage thrown:', err);
        resolve();
      }
    });
  }
}

/**
 * Clears all ColorPeek storage
 * @returns {Promise<void>}
 */
export async function clearStorage() {
  for (const k in memoryStore) {
    delete memoryStore[k];
  }
  if (hasChromeStorage()) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.clear(() => {
          if (chrome.runtime?.lastError) {
            console.warn('[ColorPeek Storage] clearStorage warning:', chrome.runtime.lastError.message);
          }
          resolve();
        });
      } catch (err) {
        console.warn('[ColorPeek Storage] clearStorage thrown:', err);
        resolve();
      }
    });
  }
}
