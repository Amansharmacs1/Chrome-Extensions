/**
 * ReadEase - Reading Progress & Reading Time Unit Tests
 */

import {
  calculateScrollProgress,
  calculateRemainingReadingTime,
  formatRemainingTime
} from '../scripts/reading-progress.js';
import {
  countWords,
  calculateReadingTime,
  formatReadingTime,
  extractDomain,
  formatDate
} from '../scripts/utils.js';

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

console.log('\n--- Running Reading Progress & Time Tests ---');

// 1. Word Count
assert(countWords('The quick brown fox jumps over the lazy dog.') === 9, 'Counts 9 words in standard sentence');
assert(countWords('') === 0, 'Empty string returns 0 words');
assert(countWords('   ') === 0, 'Whitespace returns 0 words');
assert(countWords('state-of-the-art multi-threading') === 2, 'Counts hyphenated compound words');
assert(countWords('Paragraph one.\n\nParagraph two with more details.') === 7, 'Counts multiline paragraphs accurately');

// 2. Reading Time Calculation
assert(calculateReadingTime(225, 225) === 1, '225 words at 225 WPM is exactly 1 minute');
assert(calculateReadingTime(450, 225) === 2, '450 words at 225 WPM is 2 minutes');
assert(calculateReadingTime(100, 225) === 1, 'Short text (< 225 words) rounds up to minimum 1 minute');
assert(calculateReadingTime(0, 225) === 0, '0 words is 0 minutes');
assert(calculateReadingTime(900, 300) === 3, '900 words at 300 WPM is 3 minutes');

// 3. Formatting
assert(formatReadingTime(1) === '1 min read', 'Formats 1 min read');
assert(formatReadingTime(5) === '5 min read', 'Formats 5 min read');

// 4. Scroll Progress Math
const mockWindow0 = { scrollTop: 0, scrollHeight: 1000, clientHeight: 500 };
assert(calculateScrollProgress(mockWindow0) === 0, 'Scroll at top is 0% progress');

const mockWindowHalf = { scrollTop: 250, scrollHeight: 1000, clientHeight: 500 };
assert(calculateScrollProgress(mockWindowHalf) === 50, 'Scroll at midpoint is 50% progress');

const mockWindowBottom = { scrollTop: 500, scrollHeight: 1000, clientHeight: 500 };
assert(calculateScrollProgress(mockWindowBottom) === 100, 'Scroll at bottom is 100% progress');

// 5. Remaining Reading Time
assert(calculateRemainingReadingTime(10, 0) === 10, '0% progress has full 10 minutes remaining');
assert(calculateRemainingReadingTime(10, 50) === 5, '50% progress on 10 min article has 5 minutes remaining');
assert(calculateRemainingReadingTime(10, 95) === 0, '95% progress completes remaining reading time');
assert(formatRemainingTime(4) === '4 min left', 'Formats 4 min left');
assert(formatRemainingTime(0) === 'Completed', 'Formats 0 as Completed');

// 6. Domain Extraction
assert(extractDomain('https://www.nytimes.com/2026/10/article.html') === 'nytimes.com', 'Strips www. prefix from domain');
assert(extractDomain('https://developer.mozilla.org/en-US/') === 'developer.mozilla.org', 'Extracts subdomain accurately');
assert(extractDomain('invalid-url') === '', 'Handles invalid URL safely');

// 7. Date Formatting
const now = Date.now();
assert(formatDate(now) === 'Just now', 'Formats recent timestamp as Just now');
assert(formatDate(now - 1000 * 60 * 5) === '5m ago', 'Formats 5 minutes ago');
assert(formatDate(now - 1000 * 60 * 60 * 3) === '3h ago', 'Formats 3 hours ago');

console.log(`Reading Progress Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
