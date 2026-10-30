/**
 * WebNotes — URL Utility Module
 * 
 * Handles URL normalization, domain extraction, and identity comparison.
 * Designed to accurately associate notes with the correct webpages.
 */

// Known tracking parameters to strip (conservative list)
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
  'msclkid', 'twclid', 'li_fat_id',
  'mc_cid', 'mc_eid',
  '_ga', '_gl', '_hsenc', '_hsmi', '__hstc', '__hsfp', 'hsCtaTracking',
  'ref', 'ref_', 'ref_src', 'ref_url',
  'igshid', 'si',
  'spm', 'scm', 'algo_pvid', 'algo_expid',
  'oly_enc_id', 'oly_anon_id',
  'vero_id', 'vero_conv',
  'wickedid',
  'yclid',
  'rb_clickid',
  'sxsrf'
]);

/**
 * Normalize a URL for page identity.
 * - Removes fragments (#...).
 * - Strips known tracking query parameters.
 * - Preserves meaningful query parameters and path.
 * - Returns null for invalid or unsupported URLs.
 * 
 * @param {string} rawUrl - The raw URL string.
 * @returns {string|null} Normalized URL or null.
 */
export function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Only support http/https
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Remove fragment
  url.hash = '';

  // Strip tracking parameters
  const paramsToDelete = [];
  for (const key of url.searchParams.keys()) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      paramsToDelete.push(key);
    }
  }
  for (const key of paramsToDelete) {
    url.searchParams.delete(key);
  }

  // Sort remaining params for consistency
  url.searchParams.sort();

  // Normalize trailing slash: keep it only if path is just "/"
  let result = url.toString();

  return result;
}

/**
 * Extract the domain (hostname) from a URL.
 * 
 * @param {string} rawUrl - The raw URL string.
 * @returns {string|null} Domain or null.
 */
export function extractDomain(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  try {
    const url = new URL(rawUrl.trim());
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Extract the registrable domain (e.g., "example.com" from "sub.example.com").
 * This is a simplified approach — true public suffix matching would require a PSL database.
 * We keep subdomains distinct to avoid confusing "mail.google.com" with "docs.google.com".
 * 
 * @param {string} rawUrl - The raw URL string.
 * @returns {string|null} Domain or null.
 */
export function extractBaseDomain(rawUrl) {
  return extractDomain(rawUrl);
}

/**
 * Check whether a URL is a restricted Chrome internal page.
 * Notes cannot be created on these pages.
 * 
 * @param {string} rawUrl - The URL to check.
 * @returns {boolean} True if the URL is a restricted Chrome page.
 */
export function isRestrictedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return true;

  const trimmed = rawUrl.trim().toLowerCase();

  const restrictedPrefixes = [
    'chrome://',
    'chrome-extension://',
    'chrome-search://',
    'chrome-devtools://',
    'devtools://',
    'about:',
    'edge://',
    'brave://',
    'opera://',
    'vivaldi://',
    'view-source:',
    'data:',
    'blob:',
    'javascript:',
    'file://'
  ];

  for (const prefix of restrictedPrefixes) {
    if (trimmed.startsWith(prefix)) return true;
  }

  // Chrome Web Store
  if (trimmed.includes('chrome.google.com/webstore')) return true;

  return false;
}

/**
 * Check if two URLs refer to the same page (after normalization).
 * 
 * @param {string} url1 
 * @param {string} url2 
 * @returns {boolean}
 */
export function isSamePage(url1, url2) {
  const n1 = normalizeUrl(url1);
  const n2 = normalizeUrl(url2);
  if (!n1 || !n2) return false;
  return n1 === n2;
}

/**
 * Check if two URLs belong to the same domain.
 * 
 * @param {string} url1 
 * @param {string} url2 
 * @returns {boolean}
 */
export function isSameDomain(url1, url2) {
  const d1 = extractDomain(url1);
  const d2 = extractDomain(url2);
  if (!d1 || !d2) return false;
  return d1 === d2;
}

/**
 * Format a URL for display (truncate if too long).
 * 
 * @param {string} rawUrl 
 * @param {number} maxLength 
 * @returns {string}
 */
export function formatUrlForDisplay(rawUrl, maxLength = 60) {
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl);
    let display = url.hostname + url.pathname;
    if (display.endsWith('/')) display = display.slice(0, -1);
    if (url.search) display += url.search;
    if (display.length > maxLength) {
      return display.substring(0, maxLength - 1) + '…';
    }
    return display;
  } catch {
    return rawUrl.length > maxLength ? rawUrl.substring(0, maxLength - 1) + '…' : rawUrl;
  }
}

// Export the tracking params set for testing
export { TRACKING_PARAMS };
