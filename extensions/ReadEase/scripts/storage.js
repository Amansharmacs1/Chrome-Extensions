/**
 * ReadEase - Dual-Tier Storage Engine
 * Coordinates chrome.storage.local (preferences & metadata index)
 * and IndexedDB (full offline article content & annotations).
 */

const DB_NAME = 'ReadEaseDB';
const DB_VERSION = 1;
const STORE_ARTICLES = 'articles';

// In-memory fallback stores for non-extension or Node.js test environments
const memoryStorage = {};
const memoryDb = new Map();

// Cached singleton DB connection to prevent duplicate connection locks
let cachedDb = null;

/**
 * Checks if chrome.storage.local is available
 * @returns {boolean}
 */
export function hasChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

/**
 * Checks if IndexedDB is available
 * @returns {boolean}
 */
export function hasIndexedDB() {
  return typeof indexedDB !== 'undefined';
}

/**
 * Gets a key from chrome.storage.local with memory fallback
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getLocalStorage(key) {
  if (hasChromeStorage()) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get([key], result => {
          if (chrome.runtime?.lastError) {
            console.warn('[ReadEase Storage] getLocalStorage warning:', chrome.runtime.lastError.message);
            resolve(memoryStorage[key]);
            return;
          }
          const val = result ? result[key] : undefined;
          if (val !== undefined) {
            memoryStorage[key] = val;
            resolve(val);
          } else {
            resolve(memoryStorage[key]);
          }
        });
      } catch (err) {
        console.warn('[ReadEase Storage] getLocalStorage thrown:', err);
        resolve(memoryStorage[key]);
      }
    });
  }
  return memoryStorage[key];
}

/**
 * Sets a key in chrome.storage.local with memory fallback
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
export async function setLocalStorage(key, value) {
  memoryStorage[key] = value;
  if (hasChromeStorage()) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime?.lastError) {
            console.warn('[ReadEase Storage] setLocalStorage warning:', chrome.runtime.lastError.message);
          }
          resolve();
        });
      } catch (err) {
        console.warn('[ReadEase Storage] setLocalStorage thrown:', err);
        resolve();
      }
    });
  }
}

/**
 * Removes a key from chrome.storage.local
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function removeLocalStorage(key) {
  delete memoryStorage[key];
  if (hasChromeStorage()) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.remove([key], () => {
          if (chrome.runtime?.lastError) {
            console.warn('[ReadEase Storage] removeLocalStorage warning:', chrome.runtime.lastError.message);
          }
          resolve();
        });
      } catch (err) {
        console.warn('[ReadEase Storage] removeLocalStorage thrown:', err);
        resolve();
      }
    });
  }
}

/**
 * Opens or initializes the IndexedDB database with safety timeout and connection reuse
 * @returns {Promise<IDBDatabase|null>}
 */
export function openDatabase() {
  if (!hasIndexedDB()) {
    return Promise.resolve(null);
  }

  if (cachedDb) {
    try {
      // Test if cached connection is still operational
      cachedDb.transaction(STORE_ARTICLES, 'readonly');
      return Promise.resolve(cachedDb);
    } catch {
      cachedDb = null;
    }
  }

  return new Promise(resolve => {
    let resolved = false;

    // Safety timeout prevents indefinite hang if connection is blocked
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('[ReadEase Storage] IndexedDB open timed out after 1200ms');
        resolve(null);
      }
    }, 1200);

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onblocked = () => {
        console.warn('[ReadEase Storage] IndexedDB version change blocked by another connection');
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
      };

      request.onupgradeneeded = event => {
        try {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_ARTICLES)) {
            const store = db.createObjectStore(STORE_ARTICLES, { keyPath: 'id' });
            store.createIndex('savedAt', 'savedAt', { unique: false });
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('favorite', 'favorite', { unique: false });
          }
        } catch (upgradeErr) {
          console.error('[ReadEase Storage] Upgrade error:', upgradeErr);
        }
      };

      request.onsuccess = event => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          const db = event.target.result;

          db.onversionchange = () => {
            try { db.close(); } catch {}
            cachedDb = null;
          };

          db.onclose = () => {
            cachedDb = null;
          };

          cachedDb = db;
          resolve(db);
        }
      };

      request.onerror = event => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          console.error('[ReadEase Storage] IndexedDB open error:', event.target?.error);
          resolve(null);
        }
      };
    } catch (err) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        console.error('[ReadEase Storage] IndexedDB open threw exception:', err);
        resolve(null);
      }
    }
  });
}

/**
 * Stores full article in IndexedDB (or memory store)
 * @param {Object} article
 * @returns {Promise<boolean>}
 */
export async function dbSaveArticle(article) {
  if (!article || !article.id) return false;

  // Always keep in memory store as immediate synchronous backup
  memoryDb.set(article.id, JSON.parse(JSON.stringify(article)));

  try {
    const db = await openDatabase();
    if (!db) {
      return true;
    }

    return new Promise(resolve => {
      try {
        const tx = db.transaction(STORE_ARTICLES, 'readwrite');
        const store = tx.objectStore(STORE_ARTICLES);
        store.put(article);

        tx.oncomplete = () => resolve(true);
        tx.onerror = err => {
          console.error('[ReadEase Storage] Put error:', err);
          resolve(true); // Return true since memory store has it
        };
      } catch (err) {
        console.error('[ReadEase Storage] Transaction error:', err);
        resolve(true);
      }
    });
  } catch (err) {
    console.error('[ReadEase Storage] dbSaveArticle error:', err);
    return true;
  }
}

/**
 * Retrieves full article from IndexedDB (or memory store)
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function dbGetArticle(id) {
  if (!id) return null;

  try {
    const db = await openDatabase();
    if (!db) {
      return memoryDb.get(id) || null;
    }

    return new Promise(resolve => {
      try {
        const tx = db.transaction(STORE_ARTICLES, 'readonly');
        const store = tx.objectStore(STORE_ARTICLES);
        const req = store.get(id);

        req.onsuccess = () => resolve(req.result || memoryDb.get(id) || null);
        req.onerror = () => resolve(memoryDb.get(id) || null);
      } catch (err) {
        console.warn('[ReadEase Storage] dbGetArticle transaction error:', err);
        resolve(memoryDb.get(id) || null);
      }
    });
  } catch (err) {
    console.warn('[ReadEase Storage] dbGetArticle error:', err);
    return memoryDb.get(id) || null;
  }
}

/**
 * Retrieves all full articles from IndexedDB (or memory store)
 * @returns {Promise<Array<Object>>}
 */
export async function dbGetAllArticles() {
  try {
    const db = await openDatabase();
    if (!db) {
      return Array.from(memoryDb.values());
    }

    return new Promise(resolve => {
      try {
        const tx = db.transaction(STORE_ARTICLES, 'readonly');
        const store = tx.objectStore(STORE_ARTICLES);
        const req = store.getAll();

        req.onsuccess = () => {
          const results = req.result || [];
          if (results.length === 0 && memoryDb.size > 0) {
            resolve(Array.from(memoryDb.values()));
          } else {
            resolve(results);
          }
        };
        req.onerror = () => resolve(Array.from(memoryDb.values()));
      } catch {
        resolve(Array.from(memoryDb.values()));
      }
    });
  } catch {
    return Array.from(memoryDb.values());
  }
}

/**
 * Deletes an article from IndexedDB (or memory store)
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function dbDeleteArticle(id) {
  if (!id) return false;
  memoryDb.delete(id);

  try {
    const db = await openDatabase();
    if (!db) {
      return true;
    }

    return new Promise(resolve => {
      try {
        const tx = db.transaction(STORE_ARTICLES, 'readwrite');
        const store = tx.objectStore(STORE_ARTICLES);
        store.delete(id);

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(true);
      } catch {
        resolve(true);
      }
    });
  } catch {
    return true;
  }
}

/**
 * Clears all articles from database (used in reset or replace import)
 * @returns {Promise<boolean>}
 */
export async function dbClearArticles() {
  memoryDb.clear();

  try {
    const db = await openDatabase();
    if (!db) {
      return true;
    }

    return new Promise(resolve => {
      try {
        const tx = db.transaction(STORE_ARTICLES, 'readwrite');
        const store = tx.objectStore(STORE_ARTICLES);
        store.clear();

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(true);
      } catch {
        resolve(true);
      }
    });
  } catch {
    return true;
  }
}
