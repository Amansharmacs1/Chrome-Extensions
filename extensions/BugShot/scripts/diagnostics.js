/**
 * BugShot - Diagnostics Engine
 * Formats, filters, and manages console error logs and network request insights
 * while safeguarding against credential leakage in stack traces and query strings.
 */

import { sanitizeUrl } from './metadata.js';

/**
 * Creates a structured ConsoleLogEntry
 * @param {'error'|'warn'|'info'} level
 * @param {string} message
 * @param {string} [stack]
 * @param {string} [source]
 * @param {number} [line]
 * @param {number} [col]
 * @returns {import('../src/types').ConsoleLogEntry}
 */
export function createConsoleLogEntry(level, message, stack = '', source = '', line = 0, col = 0) {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    level,
    message: String(message || 'Unknown error').trim(),
    stack: stack ? String(stack).trim() : undefined,
    source: source ? sanitizeUrl(source) : undefined,
    line: line || undefined,
    col: col || undefined,
    included: true
  };
}

/**
 * Creates a structured NetworkDiagnosticEntry
 * @param {string} url
 * @param {number} [status]
 * @param {string} [statusText]
 * @param {string} [resourceType]
 * @param {number} [duration]
 * @param {string} [failureReason]
 * @returns {import('../src/types').NetworkDiagnosticEntry}
 */
export function createNetworkDiagnosticEntry(url, status, statusText = '', resourceType = 'fetch', duration = 0, failureReason = '') {
  return {
    id: `net_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    url: sanitizeUrl(url),
    status: typeof status === 'number' ? status : undefined,
    statusText: statusText || (status ? `HTTP ${status}` : 'Network Error'),
    resourceType,
    duration: duration ? Math.round(duration) : undefined,
    failureReason: failureReason || (status && status >= 400 ? `Failed with status ${status}` : 'Request failed or blocked'),
    included: true
  };
}

/**
 * Inspects performance.getEntriesByType('resource') on the page for HTTP 4xx/5xx or failed loads
 * @param {Window} win
 * @returns {import('../src/types').NetworkDiagnosticEntry[]}
 */
export function collectResourceFailures(win) {
  if (!win || !win.performance || typeof win.performance.getEntriesByType !== 'function') {
    return [];
  }

  const entries = win.performance.getEntriesByType('resource');
  const failures = [];

  for (const entry of entries) {
    // Some browsers expose responseStatus on PerformanceResourceTiming
    const status = entry.responseStatus;
    if (typeof status === 'number' && status >= 400) {
      failures.push(
        createNetworkDiagnosticEntry(
          entry.name,
          status,
          `HTTP ${status}`,
          entry.initiatorType || 'resource',
          entry.duration
        )
      );
    }
  }

  return failures;
}
