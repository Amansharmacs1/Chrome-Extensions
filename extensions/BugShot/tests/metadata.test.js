/**
 * BugShot - Metadata & URL Sanitization Tests
 */

import { sanitizeUrl, parseBrowser, parseOS } from '../scripts/metadata.js';
import { fileURLToPath } from 'url';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

export async function runMetadataTests() {
  console.log('\n--- Running Metadata & URL Sanitization Tests ---');

  // URL Sanitization
  const cleanUrl = 'https://example.com/dashboard?view=grid&sort=asc';
  assert(sanitizeUrl(cleanUrl) === cleanUrl, 'Preserves normal query parameters');

  const tokenUrl = 'https://example.com/api?user=john&token=secret12345&tab=home';
  const sanitizedToken = sanitizeUrl(tokenUrl);
  assert(sanitizedToken.includes('token=%5BREDACTED%5D') || sanitizedToken.includes('token=[REDACTED]'), 'Redacts token query parameter');
  assert(sanitizedToken.includes('user=john'), 'Preserves non-sensitive query parameter user=john');

  const authUrl = 'https://auth.service.com/callback?auth_key=98765&session_id=abcxyz';
  const sanitizedAuth = sanitizeUrl(authUrl);
  assert(!sanitizedAuth.includes('98765'), 'Redacts auth_key query parameter');
  assert(!sanitizedAuth.includes('abcxyz'), 'Redacts session_id query parameter');

  const passwordUrl = 'https://service.com/login?username=alice&password=mypassword';
  const sanitizedPassword = sanitizeUrl(passwordUrl);
  assert(!sanitizedPassword.includes('mypassword'), 'Redacts password query parameter');

  assert(sanitizeUrl('') === '', 'Handles empty URL safely');
  assert(sanitizeUrl('not-a-valid-url') === 'not-a-valid-url', 'Returns non-standard URL string unchanged');

  // Browser parser
  const chromeUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const chromeRes = parseBrowser(chromeUa);
  assert(chromeRes.name === 'Google Chrome', 'Identifies Google Chrome browser');
  assert(chromeRes.version === '120.0.0.0', 'Extracts Chrome version');

  const edgeUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91';
  const edgeRes = parseBrowser(edgeUa);
  assert(edgeRes.name === 'Microsoft Edge', 'Identifies Microsoft Edge browser');
  assert(edgeRes.version === '120.0.2210.91', 'Extracts Edge version');

  const firefoxUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0';
  const firefoxRes = parseBrowser(firefoxUa);
  assert(firefoxRes.name === 'Mozilla Firefox', 'Identifies Mozilla Firefox');

  const safariUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15';
  const safariRes = parseBrowser(safariUa);
  assert(safariRes.name === 'Apple Safari', 'Identifies Apple Safari');

  // OS parser
  assert(parseOS(chromeUa) === 'macOS', 'Identifies macOS from User Agent');
  assert(parseOS(edgeUa) === 'Windows', 'Identifies Windows from User Agent');
  assert(parseOS('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36') === 'Linux', 'Identifies Linux from User Agent');
  assert(parseOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)') === 'iOS', 'Identifies iOS from User Agent');
  assert(parseOS('Mozilla/5.0 (Linux; Android 14; Pixel 8)') === 'Android', 'Identifies Android from User Agent');

  return { passed, failed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMetadataTests().then(res => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
