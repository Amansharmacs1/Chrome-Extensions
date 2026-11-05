/**
 * ColorPeek - Security & Sanitization Tests
 */

import { parseColor, sanitizeCssVarName } from '../scripts/color-converter.js';
import { escapeHtml } from '../scripts/utils.js';

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

console.log('\n--- Running Security & Input Validation Tests ---');

// 1. CSS Custom Property Name Sanitization
assert(sanitizeCssVarName('brand-color') === '--brand-color', 'Prepends -- prefix when missing');
assert(sanitizeCssVarName('--custom_val') === '--custom_val', 'Preserves valid --custom_val');

// Injection attacks in CSS variable name
const injectionVar = sanitizeCssVarName('color; background: url(evil.com); --evil');
assert(!injectionVar.includes(';'), 'Strips semicolons from CSS variable name');
assert(!injectionVar.includes('('), 'Strips parentheses from CSS variable name');
assert(!injectionVar.includes(' '), 'Strips spaces from CSS variable name');
assert(injectionVar.startsWith('--'), 'Sanitized variable starts with --');

// 2. HTML Entity Escaping (Prevent XSS in names & notes)
const dangerousHtml = '<script>alert("xss")</script>&<img src="x" onerror="evil()"/>';
const escaped = escapeHtml(dangerousHtml);
assert(!escaped.includes('<script>'), 'Escapes script opening tag');
assert(escaped.includes('&lt;script&gt;'), 'Replaces < and > with &lt; and &gt;');
assert(escaped.includes('&quot;'), 'Escapes double quotes');
assert(escaped.includes('&amp;'), 'Escapes ampersands');

// 3. Malicious Color Strings Rejection
const maliciousColors = [
  'javascript:alert(1)',
  '<svg onload=alert(1)>',
  'url(https://evil.com)',
  'expression(alert(1))',
  '#"><script>',
  'rgb(255, 255, 255); evil();',
  'hsl(0, 0%, 0%) DROP TABLE users;'
];

for (const malicious of maliciousColors) {
  const result = parseColor(malicious);
  assert(result === null, `Safely rejects malicious color injection: "${malicious.slice(0, 20)}..."`);
}

// 4. Numeric Bounds and Overflow Protection
const overflowRgb = parseColor('rgb(999999, -500, 300)');
assert(overflowRgb && overflowRgb.r === 255 && overflowRgb.g === 0 && overflowRgb.b === 255, 'Clamps extreme channel values to [0, 255]');

const overflowAlpha = parseColor('rgba(100, 100, 100, 5.5)');
assert(overflowAlpha && overflowAlpha.a === 1, 'Clamps alpha > 1 to 1.0');

const underflowAlpha = parseColor('rgba(100, 100, 100, -2.5)');
assert(underflowAlpha && underflowAlpha.a === 0, 'Clamps negative alpha to 0.0');

console.log(`Security Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
