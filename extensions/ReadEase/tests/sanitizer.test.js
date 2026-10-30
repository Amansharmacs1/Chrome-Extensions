/**
 * ReadEase - HTML Sanitization Unit Tests
 */

import {
  sanitizeHtml,
  sanitizeHtmlFallback,
  isSafeUrl,
  sanitizeAttribute,
  ALLOWED_TAGS
} from '../scripts/sanitizer.js';

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

console.log('\n--- Running HTML Sanitization Tests ---');

// 1. Script tag removal
const xssScript = '<p>Normal text</p><script>alert("XSS")</script><p>Safe paragraph</p>';
const cleanScript = sanitizeHtmlFallback(xssScript);
assert(!cleanScript.includes('<script'), 'Strips <script> tags completely');
assert(!cleanScript.includes('alert('), 'Strips script executable body');
assert(cleanScript.includes('Safe paragraph'), 'Preserves legitimate paragraph content');

// 2. Event handler removal
const xssEvent = '<p onclick="stealCookies()" onmouseover="hack()">Click me</p><img src="pic.jpg" onerror="evil()">';
const cleanEvent = sanitizeHtmlFallback(xssEvent);
assert(!cleanEvent.includes('onclick'), 'Strips inline onclick event handlers');
assert(!cleanEvent.includes('onmouseover'), 'Strips inline onmouseover event handlers');
assert(!cleanEvent.includes('onerror'), 'Strips inline onerror event handlers');

// 3. Dangerous URL schemes in href and src
assert(!isSafeUrl('javascript:alert(1)'), 'Rejects javascript: scheme in URLs');
assert(!isSafeUrl('vbscript:msgbox(1)'), 'Rejects vbscript: scheme in URLs');
assert(!isSafeUrl('file:///etc/passwd'), 'Rejects file: scheme in URLs');
assert(!isSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), 'Rejects data:text/html in URLs');

assert(isSafeUrl('https://example.com/article'), 'Accepts https: URL');
assert(isSafeUrl('http://example.com/blog'), 'Accepts http: URL');
assert(isSafeUrl('mailto:author@example.com'), 'Accepts mailto: URL');
assert(isSafeUrl('/relative/path/image.jpg'), 'Accepts relative URL');
assert(isSafeUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==', true), 'Accepts safe image data URI for images');

// 4. Attribute sanitizer function
assert(sanitizeAttribute('a', 'onclick', 'bad()') === null, 'sanitizeAttribute rejects onclick');
assert(sanitizeAttribute('a', 'href', 'javascript:evil()') === null, 'sanitizeAttribute rejects javascript: href');
assert(sanitizeAttribute('a', 'href', 'https://safe.com') === 'https://safe.com', 'sanitizeAttribute preserves safe href');
assert(sanitizeAttribute('img', 'src', 'https://safe.com/img.png') === 'https://safe.com/img.png', 'sanitizeAttribute preserves safe img src');
assert(sanitizeAttribute('div', 'data-custom', 'test-val') === 'test-val', 'sanitizeAttribute allows safe data-* attributes');

// 5. Allowed Tags Whitelist
assert(ALLOWED_TAGS.has('p'), 'Allowed tags includes paragraph');
assert(ALLOWED_TAGS.has('h1'), 'Allowed tags includes h1');
assert(ALLOWED_TAGS.has('pre'), 'Allowed tags includes pre');
assert(ALLOWED_TAGS.has('code'), 'Allowed tags includes code');
assert(ALLOWED_TAGS.has('blockquote'), 'Allowed tags includes blockquote');
assert(ALLOWED_TAGS.has('figure'), 'Allowed tags includes figure');
assert(ALLOWED_TAGS.has('figcaption'), 'Allowed tags includes figcaption');
assert(ALLOWED_TAGS.has('img'), 'Allowed tags includes img');
assert(ALLOWED_TAGS.has('table'), 'Allowed tags includes table');
assert(!ALLOWED_TAGS.has('script'), 'Allowed tags excludes script');
assert(!ALLOWED_TAGS.has('iframe'), 'Allowed tags excludes iframe');
assert(!ALLOWED_TAGS.has('form'), 'Allowed tags excludes form');

console.log(`Sanitization Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
