/**
 * BugShot - Technical Metadata Collector & Sanitizer
 * Automatically captures environment, display, browser, and page metrics
 * while strictly scrubbing sensitive URL parameters and query tokens.
 */

const SENSITIVE_PARAM_PATTERNS = [
  /token/i,
  /auth/i,
  /key/i,
  /secret/i,
  /password/i,
  /pwd/i,
  /session/i,
  /jwt/i,
  /signature/i,
  /sig/i,
  /access_token/i,
  /id_token/i
];

/**
 * Strips sensitive authentication and token queries from URLs
 * @param {string} urlString
 * @returns {string}
 */
export function sanitizeUrl(urlString = '') {
  if (!urlString || typeof urlString !== 'string') return '';

  try {
    const url = new URL(urlString);
    let modified = false;

    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_PARAM_PATTERNS.some(pattern => pattern.test(key))) {
        url.searchParams.set(key, '[REDACTED]');
        modified = true;
      }
    }

    return modified ? url.toString() : urlString;
  } catch {
    return urlString;
  }
}

/**
 * Extracts browser name and version from user agent
 * @param {string} ua
 * @returns {{ name: string, version: string }}
 */
export function parseBrowser(ua = '') {
  if (typeof navigator !== 'undefined' && !ua) {
    ua = navigator.userAgent;
  }

  let name = 'Unknown Browser';
  let version = '';

  if (/Edg\/([0-9.]+)/.test(ua)) {
    name = 'Microsoft Edge';
    version = RegExp.$1;
  } else if (/Chrome\/([0-9.]+)/.test(ua)) {
    name = 'Google Chrome';
    version = RegExp.$1;
  } else if (/Firefox\/([0-9.]+)/.test(ua)) {
    name = 'Mozilla Firefox';
    version = RegExp.$1;
  } else if (/Safari\/([0-9.]+)/.test(ua) && !/Chrome/.test(ua)) {
    name = 'Apple Safari';
    version = RegExp.$1;
  } else if (/Brave/.test(ua)) {
    name = 'Brave';
    version = '';
  }

  return { name, version };
}

/**
 * Identifies operating system platform from user agent & navigator
 * @param {string} ua
 * @returns {string}
 */
export function parseOS(ua = '') {
  if (typeof navigator !== 'undefined' && !ua) {
    ua = navigator.userAgent;
  }

  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh|Mac OS X/.test(ua)) return 'macOS';
  if (/Windows NT/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';

  return 'Unknown OS';
}

/**
 * Collects complete technical environment metadata
 * @param {Object} [winObj]
 * @param {Object} [docObj]
 * @param {boolean} [sanitize=true]
 * @returns {import('../src/types').TechnicalMetadata}
 */
export function collectTechnicalMetadata(winObj, docObj, sanitize = true) {
  const win = winObj || (typeof window !== 'undefined' ? window : {});
  const doc = docObj || (typeof document !== 'undefined' ? document : {});
  const nav = win.navigator || (typeof navigator !== 'undefined' ? navigator : {});
  const screen = win.screen || (typeof window !== 'undefined' ? window.screen : {});

  const rawUrl = doc.location ? doc.location.href : (win.location ? win.location.href : '');
  const url = sanitize ? sanitizeUrl(rawUrl) : rawUrl;
  const title = doc.title || '';

  const { name: browserName, version: browserVersion } = parseBrowser(nav.userAgent || '');
  const os = parseOS(nav.userAgent || '');

  const viewportWidth = win.innerWidth || doc.documentElement?.clientWidth || 0;
  const viewportHeight = win.innerHeight || doc.documentElement?.clientHeight || 0;
  const devicePixelRatio = win.devicePixelRatio || 1;

  const screenWidth = screen.width || 0;
  const screenHeight = screen.height || 0;
  const colorDepth = screen.colorDepth || 24;

  const language = nav.language || 'en';
  const online = typeof nav.onLine === 'boolean' ? nav.onLine : true;

  return {
    url,
    title,
    timestamp: Date.now(),
    browserName,
    browserVersion,
    userAgent: nav.userAgent || '',
    os,
    platform: nav.platform || os,
    viewportWidth,
    viewportHeight,
    devicePixelRatio,
    screenWidth,
    screenHeight,
    colorDepth,
    language,
    online
  };
}
