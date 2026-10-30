/**
 * ReadEase - Article Manager
 * Coordinates article CRUD, library indexing, status classification,
 * tagging, favorites, reading progress updates, and annotations.
 */

import {
  getLocalStorage,
  setLocalStorage,
  dbSaveArticle,
  dbGetArticle,
  dbDeleteArticle,
  dbGetAllArticles
} from './storage.js';

export const STORAGE_KEY_INDEX = 'readease_library_index';
export const STORAGE_KEY_ACTIVE = 'readease_active_article';

/**
 * Calculates reading status based on progress percentage
 * @param {number} progress
 * @returns {'unread'|'in-progress'|'completed'}
 */
export function classifyReadingStatus(progress = 0) {
  const p = Math.max(0, Math.min(100, Number(progress) || 0));
  if (p >= 90) return 'completed';
  if (p > 5) return 'in-progress';
  return 'unread';
}

/**
 * Creates a lightweight index item from an article for fast library rendering
 * @param {Object} article
 * @returns {Object}
 */
export function createIndexItem(article) {
  return {
    id: article.id,
    title: article.title || 'Untitled Article',
    url: article.url || '',
    siteName: article.siteName || '',
    byline: article.byline || '',
    excerpt: (article.excerpt || '').slice(0, 160),
    wordCount: article.wordCount || 0,
    readingTime: article.readingTime || 1,
    savedAt: article.savedAt || Date.now(),
    lastReadAt: article.lastReadAt || Date.now(),
    progress: article.progress || 0,
    status: article.status || classifyReadingStatus(article.progress || 0),
    favorite: Boolean(article.favorite),
    tags: Array.isArray(article.tags) ? article.tags : [],
    highlightsCount: Array.isArray(article.highlights) ? article.highlights.length : 0
  };
}

/**
 * Gets the current library index from local storage
 * @returns {Promise<Array<Object>>}
 */
export async function getLibraryIndex() {
  const index = await getLocalStorage(STORAGE_KEY_INDEX);
  return Array.isArray(index) ? index : [];
}

/**
 * Saves or updates an article in both IndexedDB and the local storage index
 * @param {Object} articleData
 * @returns {Promise<Object>}
 */
export async function saveArticle(articleData) {
  if (!articleData || !articleData.id) {
    throw new Error('Cannot save article without valid ID');
  }

  // Check if article already exists to preserve tags, favorites, and highlights
  const existing = await dbGetArticle(articleData.id);

  const fullArticle = {
    ...articleData,
    savedAt: existing?.savedAt || articleData.savedAt || Date.now(),
    lastReadAt: Date.now(),
    progress: articleData.progress !== undefined ? articleData.progress : (existing?.progress || 0),
    scrollY: articleData.scrollY !== undefined ? articleData.scrollY : (existing?.scrollY || 0),
    status: articleData.status || (existing?.status || classifyReadingStatus(articleData.progress || 0)),
    favorite: articleData.favorite !== undefined ? articleData.favorite : (existing?.favorite || false),
    tags: articleData.tags || (existing?.tags || []),
    highlights: articleData.highlights || (existing?.highlights || []),
    notes: articleData.notes !== undefined ? articleData.notes : (existing?.notes || '')
  };

  // 1. Save full article content in IndexedDB
  await dbSaveArticle(fullArticle);

  // 2. Update library index in chrome.storage.local
  const index = await getLibraryIndex();
  const existingIdx = index.findIndex(item => item.id === fullArticle.id);
  const indexItem = createIndexItem(fullArticle);

  if (existingIdx >= 0) {
    index[existingIdx] = indexItem;
  } else {
    index.unshift(indexItem);
  }

  await setLocalStorage(STORAGE_KEY_INDEX, index);
  return fullArticle;
}

/**
 * Retrieves a full article by ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getArticle(id) {
  return dbGetArticle(id);
}

/**
 * Deletes an article from both stores
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteArticle(id) {
  if (!id) return false;

  await dbDeleteArticle(id);

  const index = await getLibraryIndex();
  const updatedIndex = index.filter(item => item.id !== id);
  await setLocalStorage(STORAGE_KEY_INDEX, updatedIndex);

  return true;
}

/**
 * Toggles the favorite status of an article
 * @param {string} id
 * @returns {Promise<boolean>} new favorite state
 */
export async function toggleFavorite(id) {
  const article = await dbGetArticle(id);
  if (!article) return false;

  const newFav = !article.favorite;
  article.favorite = newFav;
  await saveArticle(article);
  return newFav;
}

/**
 * Updates reading progress and scroll position
 * @param {string} id
 * @param {number} progressPercent
 * @param {number} scrollY
 * @returns {Promise<void>}
 */
export async function updateArticleProgress(id, progressPercent, scrollY = 0) {
  const article = await dbGetArticle(id);
  if (!article) return;

  const clamped = Math.max(0, Math.min(100, Math.round(progressPercent)));
  article.progress = clamped;
  article.scrollY = Math.max(0, Math.round(scrollY));
  article.status = classifyReadingStatus(clamped);
  article.lastReadAt = Date.now();

  await saveArticle(article);
}

/**
 * Adds a tag to an article
 * @param {string} id
 * @param {string} tag
 * @returns {Promise<Array<string>>} updated tags
 */
export async function addTag(id, tag) {
  const cleanTag = (tag || '').trim().toLowerCase();
  if (!cleanTag) return [];

  const article = await dbGetArticle(id);
  if (!article) return [];

  article.tags = article.tags || [];
  if (!article.tags.includes(cleanTag)) {
    article.tags.push(cleanTag);
    await saveArticle(article);
  }
  return article.tags;
}

/**
 * Removes a tag from an article
 * @param {string} id
 * @param {string} tag
 * @returns {Promise<Array<string>>} updated tags
 */
export async function removeTag(id, tag) {
  const cleanTag = (tag || '').trim().toLowerCase();
  const article = await dbGetArticle(id);
  if (!article || !article.tags) return [];

  article.tags = article.tags.filter(t => t !== cleanTag);
  await saveArticle(article);
  return article.tags;
}

/**
 * Updates an article's personal note
 * @param {string} id
 * @param {string} note
 * @returns {Promise<void>}
 */
export async function updateArticleNote(id, note) {
  const article = await dbGetArticle(id);
  if (!article) return;

  article.notes = (note || '').trim();
  await saveArticle(article);
}

/**
 * Adds a highlight with optional annotation to an article
 * @param {string} id
 * @param {Object} highlight
 * @returns {Promise<Array<Object>>}
 */
export async function addArticleHighlight(id, highlight) {
  const article = await dbGetArticle(id);
  if (!article) return [];

  article.highlights = article.highlights || [];
  article.highlights.push(highlight);
  await saveArticle(article);
  return article.highlights;
}

/**
 * Removes a highlight from an article
 * @param {string} id
 * @param {string} highlightId
 * @returns {Promise<Array<Object>>}
 */
export async function removeArticleHighlight(id, highlightId) {
  const article = await dbGetArticle(id);
  if (!article || !article.highlights) return [];

  article.highlights = article.highlights.filter(h => h.id !== highlightId);
  await saveArticle(article);
  return article.highlights;
}

/**
 * Filters and sorts library index items
 * @param {Array<Object>} items
 * @param {Object} options
 * @param {string} [options.filter='all'] 'all' | 'unread' | 'in-progress' | 'completed' | 'favorites' | tag:string
 * @param {string} [options.sort='recent-saved'] 'recent-saved' | 'recent-read' | 'time-asc' | 'time-desc' | 'title-asc'
 * @returns {Array<Object>}
 */
export function filterAndSortArticles(items = [], options = {}) {
  const { filter = 'all', sort = 'recent-saved' } = options;
  let result = [...items];

  // 1. Filter
  if (filter === 'favorites') {
    result = result.filter(item => item.favorite);
  } else if (filter === 'unread') {
    result = result.filter(item => item.status === 'unread');
  } else if (filter === 'in-progress') {
    result = result.filter(item => item.status === 'in-progress');
  } else if (filter === 'completed') {
    result = result.filter(item => item.status === 'completed');
  } else if (filter && filter !== 'all') {
    // Custom tag filter
    const tagMatch = filter.toLowerCase();
    result = result.filter(item => (item.tags || []).some(t => t.toLowerCase() === tagMatch));
  }

  // 2. Sort
  result.sort((a, b) => {
    switch (sort) {
      case 'recent-read':
        return (b.lastReadAt || 0) - (a.lastReadAt || 0);
      case 'time-asc':
        return (a.readingTime || 0) - (b.readingTime || 0);
      case 'time-desc':
        return (b.readingTime || 0) - (a.readingTime || 0);
      case 'title-asc':
        return (a.title || '').localeCompare(b.title || '');
      case 'recent-saved':
      default:
        return (b.savedAt || 0) - (a.savedAt || 0);
    }
  });

  return result;
}
