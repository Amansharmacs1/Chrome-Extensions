/**
 * NewTab Pro - Quick Links & Shortcuts Engine
 * Manages shortcut data, validation, initials generation, and ordering.
 */

import { sanitizeUrl } from './search.js';

export const PALETTE_COLORS = [
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#6366F1', // Indigo
  '#14B8A6'  // Teal
];

/**
 * Derives a 1-2 letter initial string from a title or domain
 * @param {string} title
 * @param {string} url
 * @returns {string}
 */
export function getInitials(title = '', url = '') {
  const cleanTitle = (title || '').trim();
  if (cleanTitle) {
    const words = cleanTitle.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    if (cleanTitle.length >= 2) {
      return cleanTitle.slice(0, 2).toUpperCase();
    }
    return cleanTitle.slice(0, 1).toUpperCase();
  }

  // Derive from URL domain
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host.slice(0, 2).toUpperCase();
  } catch {
    return 'LK';
  }
}

/**
 * Returns a deterministic color based on title or URL
 * @param {string} seed
 * @returns {string}
 */
export function getDeterministicColor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE_COLORS.length;
  return PALETTE_COLORS[index];
}

/**
 * Validates and creates a new shortcut object
 * @param {Object} input
 * @param {string} input.title
 * @param {string} input.url
 * @param {string} [input.color]
 * @param {number} [input.sortOrder]
 * @returns {Object}
 */
export function createShortcut({ title, url, color, sortOrder = 0 }) {
  const sanitizedUrl = sanitizeUrl(url);
  if (!sanitizedUrl) {
    throw new Error('Please enter a valid web URL starting with http:// or https://');
  }

  const cleanTitle = (title || '').trim();
  let finalTitle = cleanTitle;
  if (!finalTitle) {
    try {
      finalTitle = new URL(sanitizedUrl).hostname.replace(/^www\./, '');
    } catch {
      finalTitle = 'Shortcut';
    }
  }

  return {
    id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: finalTitle,
    url: sanitizedUrl,
    color: color || getDeterministicColor(finalTitle),
    sortOrder,
    createdAt: Date.now()
  };
}

/**
 * Updates an existing shortcut
 * @param {Array} shortcuts
 * @param {string} id
 * @param {Object} updates
 * @returns {Array}
 */
export function updateShortcut(shortcuts, id, updates) {
  return shortcuts.map(sc => {
    if (sc.id !== id) return sc;
    const next = { ...sc };

    if (typeof updates.title === 'string') {
      const clean = updates.title.trim();
      if (clean) next.title = clean;
    }

    if (typeof updates.url === 'string') {
      const sanitized = sanitizeUrl(updates.url);
      if (sanitized) next.url = sanitized;
    }

    if (typeof updates.color === 'string' && updates.color) {
      next.color = updates.color;
    }

    return next;
  });
}

/**
 * Removes a shortcut by ID
 * @param {Array} shortcuts
 * @param {string} id
 * @returns {Array}
 */
export function removeShortcut(shortcuts, id) {
  return shortcuts
    .filter(sc => sc.id !== id)
    .map((sc, index) => ({ ...sc, sortOrder: index }));
}

/**
 * Moves a shortcut up or down in order
 * @param {Array} shortcuts
 * @param {string} id
 * @param {'up'|'down'} direction
 * @returns {Array}
 */
export function reorderShortcut(shortcuts, id, direction) {
  const list = [...shortcuts].sort((a, b) => a.sortOrder - b.order);
  const index = list.findIndex(sc => sc.id === id);
  if (index === -1) return list;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= list.length) return list;

  const [moved] = list.splice(index, 1);
  list.splice(targetIndex, 0, moved);

  return list.map((sc, i) => ({ ...sc, sortOrder: i }));
}
