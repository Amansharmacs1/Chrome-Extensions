/**
 * ReadEase - Common Utilities
 * String manipulation, date formatting, DOM helpers, and WPM calculators.
 */

/**
 * Escapes HTML characters in text to prevent XSS
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str = '') {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strips HTML tags from a string and returns plain text
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html = '') {
  if (typeof html !== 'string') return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Counts words in a string accurately across languages and whitespace
 * @param {string} text
 * @returns {number}
 */
export function countWords(text = '') {
  if (!text || typeof text !== 'string') return 0;
  const clean = text.trim();
  if (!clean) return 0;
  // Match words including hyphenated compound words and contractions
  const matches = clean.match(/[\p{L}\p{N}]+(?:['\-][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

/**
 * Calculates estimated reading time in minutes
 * @param {number|string} wordsOrText
 * @param {number} [wpm=225]
 * @returns {number} estimated minutes (minimum 1 min if words > 0)
 */
export function calculateReadingTime(wordsOrText, wpm = 225) {
  const words = typeof wordsOrText === 'number' ? wordsOrText : countWords(wordsOrText);
  if (words <= 0) return 0;
  const rate = Math.max(100, Math.min(500, Number(wpm) || 225));
  const minutes = Math.ceil(words / rate);
  return Math.max(1, minutes);
}

/**
 * Formats reading time into a human-friendly string
 * @param {number} minutes
 * @returns {string} e.g. "4 min read"
 */
export function formatReadingTime(minutes = 1) {
  const m = Math.max(1, Math.round(minutes));
  return `${m} min read`;
}

/**
 * Extracts a clean domain from a URL
 * @param {string} url
 * @returns {string} e.g. "nytimes.com", "developer.mozilla.org"
 */
export function extractDomain(url = '') {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Formats a timestamp into a readable relative or absolute date
 * @param {number|string|Date} timestamp
 * @returns {string}
 */
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay === 0) {
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    return `${diffHour}h ago`;
  }
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Generates a unique ID with an optional prefix
 * @param {string} [prefix='re']
 * @returns {string}
 */
export function generateId(prefix = 're') {
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}-${time}-${rand}`;
}

/**
 * Debounce helper
 * @param {Function} fn
 * @param {number} delayMs
 * @returns {Function}
 */
export function debounce(fn, delayMs = 250) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delayMs);
  };
}
