/**
 * WebNotes — Search Module
 * 
 * Local search engine for notes and highlights.
 * Case-insensitive, searches across titles, bodies, tags, and source pages.
 */

/**
 * Search notes by query string.
 * @param {Array} notes - Array of note objects.
 * @param {string} query - Search query.
 * @returns {Array} Matching notes.
 */
export function searchNotes(notes, query) {
  if (!query || typeof query !== 'string') return notes;
  
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return notes;

  return notes.filter(note => {
    const title = (note.title || '').toLowerCase();
    const body = (note.body || '').toLowerCase();
    const pageTitle = (note.pageTitle || '').toLowerCase();
    const pageUrl = (note.pageUrl || '').toLowerCase();
    const domain = (note.domain || '').toLowerCase();
    const tags = (note.tags || []).join(' ').toLowerCase();

    return (
      title.includes(trimmed) ||
      body.includes(trimmed) ||
      pageTitle.includes(trimmed) ||
      pageUrl.includes(trimmed) ||
      domain.includes(trimmed) ||
      tags.includes(trimmed)
    );
  });
}

/**
 * Search highlights by query string.
 * @param {Array} highlights - Array of highlight objects.
 * @param {string} query - Search query.
 * @returns {Array} Matching highlights.
 */
export function searchHighlights(highlights, query) {
  if (!query || typeof query !== 'string') return highlights;
  
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return highlights;

  return highlights.filter(h => {
    const text = (h.selectedText || '').toLowerCase();
    const note = (h.userNote || '').toLowerCase();
    const title = (h.sourceTitle || '').toLowerCase();
    const url = (h.sourceUrl || '').toLowerCase();

    return (
      text.includes(trimmed) ||
      note.includes(trimmed) ||
      title.includes(trimmed) ||
      url.includes(trimmed)
    );
  });
}

/**
 * Filter notes by criteria.
 * @param {Array} notes
 * @param {Object} filters
 * @returns {Array}
 */
export function filterNotes(notes, filters = {}) {
  let result = [...notes];

  if (filters.scope) {
    result = result.filter(n => n.scope === filters.scope);
  }

  if (filters.domain) {
    result = result.filter(n => n.domain === filters.domain);
  }

  if (filters.pageUrl) {
    result = result.filter(n => n.pageUrl === filters.pageUrl);
  }

  if (filters.tag) {
    const tagLower = filters.tag.toLowerCase();
    result = result.filter(n => 
      Array.isArray(n.tags) && n.tags.includes(tagLower)
    );
  }

  if (filters.favoritesOnly) {
    result = result.filter(n => n.isFavorite);
  }

  if (filters.pinnedOnly) {
    result = result.filter(n => n.isPinned);
  }

  return result;
}

/**
 * Sort notes by a given criterion.
 * @param {Array} notes
 * @param {string} sortBy - 'updatedAt' | 'createdAt' | 'title'
 * @param {string} order - 'asc' | 'desc'
 * @returns {Array}
 */
export function sortNotes(notes, sortBy = 'updatedAt', order = 'desc') {
  const sorted = [...notes];
  
  // Pinned notes always come first
  sorted.sort((a, b) => {
    // Pinned first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Then sort by criterion
    let comparison = 0;

    if (sortBy === 'title') {
      const titleA = (a.title || a.body || '').toLowerCase();
      const titleB = (b.title || b.body || '').toLowerCase();
      comparison = titleA.localeCompare(titleB);
    } else if (sortBy === 'createdAt') {
      comparison = new Date(a.createdAt) - new Date(b.createdAt);
    } else {
      // Default: updatedAt
      comparison = new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt);
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}
