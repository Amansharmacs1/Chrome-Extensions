/**
 * FocusFlow - Distraction Blocker and DeclarativeNetRequest Manager
 * Handles domain validation, sanitization, dynamic rule generation, and rule synchronization.
 */

export const RULE_ID_BASE = 2000;

export const PROTECTED_DOMAINS = new Set([
  'chrome',
  'chromewebstore.google.com',
  'chrome.google.com',
  'extensions',
  'newtab',
  'settings'
]);

/**
 * Normalize user domain input (strips protocol, port, path, trailing slash, queries)
 * @param {string} input
 * @returns {string}
 */
export function normalizeDomain(input = '') {
  if (typeof input !== 'string') return '';

  let cleaned = input.trim().toLowerCase();

  // Strip protocol if present
  cleaned = cleaned.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');

  // Strip path, query, hash
  cleaned = cleaned.split('/')[0];
  cleaned = cleaned.split('?')[0];
  cleaned = cleaned.split('#')[0];

  // Strip port
  cleaned = cleaned.split(':')[0];

  // Strip leading/trailing dots and whitespace
  cleaned = cleaned.replace(/^\.+|\.+$/g, '');

  // Strip leading 'www.' for consistency
  if (cleaned.startsWith('www.')) {
    cleaned = cleaned.slice(4);
  }

  return cleaned;
}

/**
 * Validate domain string format
 * @param {string} domain
 * @returns {boolean}
 */
export function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;

  const normalized = normalizeDomain(domain);
  if (!normalized || normalized.length > 253) return false;

  // Domain cannot be in protected list
  if (PROTECTED_DOMAINS.has(normalized)) return false;

  // Reject internal chrome or file schemes
  if (normalized.startsWith('chrome') || normalized.includes('localhost') || normalized === '127.0.0.1') {
    return false;
  }

  // Must contain at least one dot separating labels
  const parts = normalized.split('.');
  if (parts.length < 2) return false;

  // Validate each label according to RFC 1035
  const labelRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  for (const part of parts) {
    if (!part || !labelRegex.test(part)) {
      return false;
    }
  }

  // TLD cannot be purely numeric
  const tld = parts[parts.length - 1];
  if (/^\d+$/.test(tld) || tld.length < 2) {
    return false;
  }

  return true;
}

/**
 * Build declarativeNetRequest dynamic rule definitions from a list of domains
 * @param {string[]} domains
 * @param {number} startId
 * @returns {Array<Object>}
 */
export function buildDynamicRules(domains = [], startId = RULE_ID_BASE) {
  const validDomains = Array.from(new Set(
    domains
      .map(normalizeDomain)
      .filter(isValidDomain)
  ));

  return validDomains.map((domain, index) => ({
    id: startId + index,
    priority: 1,
    action: {
      type: 'block'
    },
    condition: {
      urlFilter: `||${domain}`,
      resourceTypes: ['main_frame', 'sub_frame']
    }
  }));
}

/**
 * Synchronize declarativeNetRequest dynamic rules with active session status
 * @param {Object} options
 * @param {boolean} options.shouldBlock - Whether blocking rules should currently be active
 * @param {string[]} options.domains - List of user-configured domains
 * @returns {Promise<{ active: boolean, ruleCount: number, error?: string }>}
 */
export async function syncBlockingRules({ shouldBlock, domains = [] }) {
  if (typeof chrome === 'undefined' || !chrome.declarativeNetRequest || !chrome.declarativeNetRequest.updateDynamicRules) {
    // Graceful fallback for non-extension environments (e.g. testing)
    return {
      active: Boolean(shouldBlock),
      ruleCount: shouldBlock ? domains.length : 0
    };
  }

  try {
    // Retrieve existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(r => r.id);

    if (!shouldBlock || !domains.length) {
      if (existingRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingRuleIds,
          addRules: []
        });
      }
      return { active: false, ruleCount: 0 };
    }

    const newRules = buildDynamicRules(domains, RULE_ID_BASE);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: newRules
    });

    return { active: true, ruleCount: newRules.length };
  } catch (err) {
    console.error('[FocusFlow Blocker] Error synchronizing rules:', err);
    return { active: false, ruleCount: 0, error: err.message };
  }
}
