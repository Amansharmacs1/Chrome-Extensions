/**
 * ReadEase - Library Search, Filter & Backup Engine
 * Fast in-memory full-text search, tag indexing, JSON export and safe import validation.
 */

import {
  dbGetAllArticles,
  dbSaveArticle,
  dbClearArticles,
  getLocalStorage,
  setLocalStorage
} from './storage.js';
import { STORAGE_KEY_INDEX, createIndexItem } from './article-manager.js';

/**
 * Searches across an array of article items using multiple weighted fields
 * @param {Array<Object>} articles
 * @param {string} query
 * @returns {Array<Object>}
 */
export function searchArticles(articles = [], query = '') {
  const cleanQuery = (query || '').trim().toLowerCase();
  if (!cleanQuery) return articles;

  const tokens = cleanQuery.split(/\s+/).filter(Boolean);

  return articles.filter(article => {
    const title = (article.title || '').toLowerCase();
    const byline = (article.byline || '').toLowerCase();
    const siteName = (article.siteName || '').toLowerCase();
    const url = (article.url || '').toLowerCase();
    const excerpt = (article.excerpt || '').toLowerCase();
    const notes = (article.notes || '').toLowerCase();
    const tags = Array.isArray(article.tags) ? article.tags.join(' ').toLowerCase() : '';

    // Highlights notes search
    const hlNotes = Array.isArray(article.highlights)
      ? article.highlights.map(h => (h.note || '') + ' ' + (h.text || '')).join(' ').toLowerCase()
      : '';

    const searchableText = `${title} ${byline} ${siteName} ${url} ${excerpt} ${notes} ${tags} ${hlNotes}`;

    // Every token must match
    return tokens.every(token => searchableText.includes(token));
  });
}

/**
 * Collects all unique tags with count from an array of articles
 * @param {Array<Object>} articles
 * @returns {Array<{ tag: string, count: number }>}
 */
export function extractUniqueTags(articles = []) {
  const map = new Map();

  for (const article of articles) {
    if (Array.isArray(article.tags)) {
      for (const t of article.tags) {
        const clean = t.trim().toLowerCase();
        if (clean) {
          map.set(clean, (map.get(clean) || 0) + 1);
        }
      }
    }
  }

  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Exports all saved articles, highlights, and preferences into a versioned JSON object
 * @returns {Promise<Object>}
 */
export async function exportLibraryData() {
  const articles = await dbGetAllArticles();
  const settings = await getLocalStorage('readease_settings') || {};

  return {
    version: 1,
    generator: 'ReadEase Chrome Extension',
    exportedAt: new Date().toISOString(),
    stats: {
      totalArticles: articles.length,
      totalHighlights: articles.reduce((acc, a) => acc + (a.highlights?.length || 0), 0)
    },
    settings,
    articles
  };
}

/**
 * Validates an import JSON payload
 * @param {string|Object} rawInput
 * @returns {{ valid: boolean, error?: string, preview?: Object, data?: Object }}
 */
export function validateImportJSON(rawInput) {
  let parsed = null;

  try {
    parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
  } catch (err) {
    return { valid: false, error: 'Invalid JSON format. Please select a valid ReadEase backup file.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Backup data must be a JSON object.' };
  }

  if (typeof parsed.version !== 'number' || parsed.version < 1) {
    return { valid: false, error: 'Unsupported or missing schema version in backup file.' };
  }

  if (!Array.isArray(parsed.articles)) {
    return { valid: false, error: 'Backup is missing the articles collection.' };
  }

  // Sanity check on article objects
  for (const a of parsed.articles) {
    if (!a || typeof a !== 'object' || !a.id || !a.title) {
      return { valid: false, error: 'One or more articles in the backup are malformed.' };
    }
  }

  const preview = {
    articleCount: parsed.articles.length,
    exportedAt: parsed.exportedAt || 'Unknown',
    hasSettings: Boolean(parsed.settings)
  };

  return { valid: true, preview, data: parsed };
}

/**
 * Imports articles into the library with merge or replace options
 * @param {Object} options
 * @param {Object} options.data Validated backup payload
 * @param {'merge'|'replace'} [options.mode='merge']
 * @returns {Promise<{ importedCount: number, updatedSettings: boolean }>}
 */
export async function importLibraryData({ data, mode = 'merge' }) {
  if (!data || !Array.isArray(data.articles)) {
    throw new Error('Invalid data payload for import');
  }

  if (mode === 'replace') {
    await dbClearArticles();
  }

  let importedCount = 0;
  const newIndex = [];

  for (const article of data.articles) {
    await dbSaveArticle(article);
    newIndex.push(createIndexItem(article));
    importedCount++;
  }

  // Update library index
  if (mode === 'replace') {
    await setLocalStorage(STORAGE_KEY_INDEX, newIndex);
  } else {
    // Merge index preserving order
    const currentIndex = (await getLocalStorage(STORAGE_KEY_INDEX)) || [];
    const existingMap = new Map(currentIndex.map(item => [item.id, item]));

    for (const item of newIndex) {
      existingMap.set(item.id, item);
    }

    const merged = Array.from(existingMap.values()).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    await setLocalStorage(STORAGE_KEY_INDEX, merged);
  }

  // Restore settings if present
  let updatedSettings = false;
  if (data.settings && typeof data.settings === 'object') {
    await setLocalStorage('readease_settings', data.settings);
    updatedSettings = true;
  }

  return { importedCount, updatedSettings };
}
