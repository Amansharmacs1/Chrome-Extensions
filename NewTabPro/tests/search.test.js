/**
 * NewTab Pro - Search & Safe URL Navigation Tests
 */

import {
  SEARCH_ENGINES,
  isLikelyUrl,
  sanitizeUrl,
  resolveSearchQuery
} from '../modules/search.js';

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}`);
    failed++;
  }
}

console.log('\n--- Running Search & URL Navigation Tests ---');

// 1. Supported Search Engine Registry
assert(Boolean(SEARCH_ENGINES.google), 'Google engine exists');
assert(Boolean(SEARCH_ENGINES.duckduckgo), 'DuckDuckGo engine exists');
assert(Boolean(SEARCH_ENGINES.bing), 'Bing engine exists');
assert(Boolean(SEARCH_ENGINES.brave), 'Brave engine exists');

// 2. Safe Query Construction
const query = 'javascript web standards & chrome v3';
const googleUrl = SEARCH_ENGINES.google.buildUrl(query);
assert(googleUrl.startsWith('https://www.google.com/search?q='), 'Google URL structure matches');
assert(googleUrl.includes('javascript%20web%20standards%20%26%20chrome%20v3'), 'Query is URI-encoded');

const ddgUrl = SEARCH_ENGINES.duckduckgo.buildUrl('privacy search');
assert(ddgUrl.startsWith('https://duckduckgo.com/?q='), 'DuckDuckGo URL structure matches');

// 3. URL Detection
assert(isLikelyUrl('https://github.com'), 'Detects full https URL');
assert(isLikelyUrl('http://example.com/test?a=1'), 'Detects full http URL');
assert(isLikelyUrl('github.com'), 'Detects domain without protocol');
assert(isLikelyUrl('sub.domain.co.uk/path'), 'Detects subdomains and paths');
assert(isLikelyUrl('localhost:3000'), 'Detects localhost with port');

assert(!isLikelyUrl('how to learn javascript'), 'Rejects normal multi-word queries with spaces');
assert(!isLikelyUrl('test query'), 'Rejects spaced search terms');

// 4. Strict Protocol Sanitization & Dangerous Scheme Blocking
assert(sanitizeUrl('https://github.com') === 'https://github.com/', 'Allows valid HTTPS URL');
assert(sanitizeUrl('github.com') === 'https://github.com/', 'Prepends https:// to naked domains');
assert(sanitizeUrl('http://localhost:8080') === 'http://localhost:8080/', 'Allows localhost');

assert(sanitizeUrl('javascript:alert(1)') === null, 'Rejects dangerous javascript: scheme');
assert(sanitizeUrl('data:text/html,<script>alert(1)</script>') === null, 'Rejects data: scheme');
assert(sanitizeUrl('vbscript:msgbox(1)') === null, 'Rejects vbscript: scheme');
assert(sanitizeUrl('file:///etc/passwd') === null, 'Rejects file: scheme');

// 5. Query Resolution
const directNav = resolveSearchQuery('github.com', 'google');
assert(directNav.type === 'url', 'Resolves domain as direct URL navigation');
assert(directNav.targetUrl === 'https://github.com/', 'Navigates to safe HTTPS target');

const searchNav = resolveSearchQuery('learn rust programming', 'brave');
assert(searchNav.type === 'search', 'Resolves search terms as search query');
assert(searchNav.targetUrl.startsWith('https://search.brave.com/search?q='), 'Uses selected search engine');

// Fallback on unknown engine
const fallbackNav = resolveSearchQuery('test query', 'unsupported-engine');
assert(fallbackNav.type === 'search', 'Falls back safely on unknown search engine');
assert(fallbackNav.targetUrl.startsWith('https://www.google.com/search?q='), 'Falls back to default engine (Google)');

console.log(`Search Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
