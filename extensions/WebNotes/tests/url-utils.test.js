/**
 * WebNotes — URL Utilities Tests
 */

import {
  normalizeUrl, extractDomain, isRestrictedUrl,
  isSamePage, isSameDomain, formatUrlForDisplay
} from '../scripts/url-utils.js';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(`  FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    errors.push(`  FAIL: ${message}\n    Expected: ${JSON.stringify(expected)}\n    Actual:   ${JSON.stringify(actual)}`);
  }
}

// ---- normalizeUrl ----

assertEqual(normalizeUrl(null), null, 'normalizeUrl: null input returns null');
assertEqual(normalizeUrl(''), null, 'normalizeUrl: empty string returns null');
assertEqual(normalizeUrl('  '), null, 'normalizeUrl: whitespace returns null');
assertEqual(normalizeUrl('not-a-url'), null, 'normalizeUrl: invalid URL returns null');
assertEqual(normalizeUrl('ftp://example.com'), null, 'normalizeUrl: non-http URL returns null');

// Fragment removal
{
  const result = normalizeUrl('https://example.com/page#section');
  assert(!result.includes('#'), 'normalizeUrl: removes fragment');
}

// Tracking parameter removal
{
  const result = normalizeUrl('https://example.com/page?utm_source=google&q=test&fbclid=abc');
  assert(!result.includes('utm_source'), 'normalizeUrl: removes utm_source');
  assert(!result.includes('fbclid'), 'normalizeUrl: removes fbclid');
  assert(result.includes('q=test'), 'normalizeUrl: preserves meaningful params');
}

// Preserves path
{
  const result = normalizeUrl('https://example.com/a/b/c');
  assert(result.includes('/a/b/c'), 'normalizeUrl: preserves path');
}

// Preserves meaningful query params
{
  const result = normalizeUrl('https://example.com/search?q=hello+world&page=2');
  assert(result.includes('q=hello'), 'normalizeUrl: preserves search query');
  assert(result.includes('page=2'), 'normalizeUrl: preserves pagination');
}

// Consistent sorting of params
{
  const r1 = normalizeUrl('https://example.com?b=2&a=1');
  const r2 = normalizeUrl('https://example.com?a=1&b=2');
  assertEqual(r1, r2, 'normalizeUrl: sorts query params consistently');
}

// ---- extractDomain ----

assertEqual(extractDomain(null), null, 'extractDomain: null returns null');
assertEqual(extractDomain(''), null, 'extractDomain: empty returns null');
assertEqual(extractDomain('not-url'), null, 'extractDomain: invalid returns null');
assertEqual(extractDomain('https://example.com/page'), 'example.com', 'extractDomain: extracts domain');
assertEqual(extractDomain('https://SUB.Example.COM/'), 'sub.example.com', 'extractDomain: lowercases domain');
assertEqual(extractDomain('https://mail.google.com'), 'mail.google.com', 'extractDomain: preserves subdomain');

// ---- isRestrictedUrl ----

assert(isRestrictedUrl(null), 'isRestrictedUrl: null is restricted');
assert(isRestrictedUrl(''), 'isRestrictedUrl: empty is restricted');
assert(isRestrictedUrl('chrome://settings'), 'isRestrictedUrl: chrome:// is restricted');
assert(isRestrictedUrl('chrome-extension://abc'), 'isRestrictedUrl: extension URL is restricted');
assert(isRestrictedUrl('about:blank'), 'isRestrictedUrl: about: is restricted');
assert(isRestrictedUrl('devtools://devtools'), 'isRestrictedUrl: devtools is restricted');
assert(isRestrictedUrl('data:text/html,hello'), 'isRestrictedUrl: data: is restricted');
assert(isRestrictedUrl('javascript:void(0)'), 'isRestrictedUrl: javascript: is restricted');
assert(!isRestrictedUrl('https://example.com'), 'isRestrictedUrl: https is not restricted');
assert(!isRestrictedUrl('http://localhost:3000'), 'isRestrictedUrl: localhost is not restricted');

// ---- isSamePage ----

assert(isSamePage('https://example.com/page', 'https://example.com/page'), 'isSamePage: identical URLs');
assert(isSamePage('https://example.com/page#a', 'https://example.com/page#b'), 'isSamePage: same page different fragments');
assert(isSamePage('https://example.com/?utm_source=x', 'https://example.com/'), 'isSamePage: same page different tracking params');
assert(!isSamePage('https://example.com/a', 'https://example.com/b'), 'isSamePage: different paths are different');
assert(!isSamePage('https://a.com', 'https://b.com'), 'isSamePage: different domains are different');
assert(!isSamePage('', 'https://example.com'), 'isSamePage: empty URL is not same');

// ---- isSameDomain ----

assert(isSameDomain('https://example.com/a', 'https://example.com/b'), 'isSameDomain: same domain different paths');
assert(!isSameDomain('https://a.example.com', 'https://b.example.com'), 'isSameDomain: different subdomains are different');
assert(!isSameDomain('https://google.com', 'https://example.com'), 'isSameDomain: different domains');

// ---- formatUrlForDisplay ----

{
  const result = formatUrlForDisplay('https://example.com/very/long/path/to/page');
  assert(typeof result === 'string', 'formatUrlForDisplay: returns string');
  assert(result.length <= 60, 'formatUrlForDisplay: respects max length');
}

assertEqual(formatUrlForDisplay(''), '', 'formatUrlForDisplay: empty returns empty');
assertEqual(formatUrlForDisplay(null), '', 'formatUrlForDisplay: null returns empty');

// ---- Report ----

console.log(`\nURL Utilities Tests: ${passed} passed, ${failed} failed`);
if (errors.length > 0) {
  console.log(errors.join('\n'));
}

export { passed, failed };
