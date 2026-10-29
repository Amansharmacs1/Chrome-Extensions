/**
 * NewTab Pro - Search & Navigation Engine
 * Safely constructs search URLs from an allowlist of engines
 * and handles direct URL navigation with strict protocol sanitization.
 */

export const SEARCH_ENGINES = {
  google: {
    name: 'Google',
    placeholder: 'Search Google or type a URL...',
    buildUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    placeholder: 'Search DuckDuckGo or type a URL...',
    buildUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
  },
  bing: {
    name: 'Bing',
    placeholder: 'Search Bing or type a URL...',
    buildUrl: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`
  },
  brave: {
    name: 'Brave Search',
    placeholder: 'Search Brave or type a URL...',
    buildUrl: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`
  }
};

export const DEFAULT_SEARCH_ENGINE = 'google';

/**
 * Checks if input matches a URL or domain pattern
 * @param {string} input
 * @returns {boolean}
 */
export function isLikelyUrl(input) {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();

  // If contains spaces, it's a search query, not a URL
  if (/\s/.test(trimmed)) return false;

  // Strict check for dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('about:')
  ) {
    return false;
  }

  // Explicit http/https URL
  if (/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed)) {
    return true;
  }

  // Localhost with optional port
  if (/^localhost(:\d+)?(\/[^\s]*)?$/i.test(trimmed)) {
    return true;
  }

  // Domain pattern with valid TLD, e.g. "github.com", "sub.domain.co.uk/path?x=1"
  const domainPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+(\/[^\s]*)?$/i;
  return domainPattern.test(trimmed);
}

/**
 * Sanitizes and normalizes a destination URL
 * Rejects non-HTTP/HTTPS schemes
 * @param {string} input
 * @returns {string|null}
 */
export function sanitizeUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Block dangerous schemes explicitly
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('about:')
  ) {
    return null;
  }

  // If already starts with http/https
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.href;
      }
    } catch {
      return null;
    }
  }

  // If it's a valid domain without protocol, prepend https://
  if (isLikelyUrl(trimmed)) {
    try {
      const parsed = new URL(`https://${trimmed}`);
      return parsed.href;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Resolves user query into either a direct URL navigation or search query URL
 * @param {string} query
 * @param {string} engineId
 * @returns {{ type: 'url'|'search', targetUrl: string }}
 */
export function resolveSearchQuery(query, engineId = 'google') {
  if (!query || typeof query !== 'string') {
    return { type: 'search', targetUrl: SEARCH_ENGINES.google.buildUrl('') };
  }

  const trimmed = query.trim();
  if (isLikelyUrl(trimmed)) {
    const validUrl = sanitizeUrl(trimmed);
    if (validUrl) {
      return { type: 'url', targetUrl: validUrl };
    }
  }

  const engine = SEARCH_ENGINES[engineId] || SEARCH_ENGINES[DEFAULT_SEARCH_ENGINE];
  return {
    type: 'search',
    targetUrl: engine.buildUrl(trimmed)
  };
}
