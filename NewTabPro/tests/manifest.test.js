/**
 * NewTab Pro - Manifest V3 Audit Tests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

console.log('\n--- Running Manifest V3 Audit Tests ---');

try {
  const manifestPath = path.join(rootDir, 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json exists');

  const content = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert(content.manifest_version === 3, 'Manifest version is 3');
  assert(typeof content.name === 'string' && content.name.includes('NewTab Pro'), 'Name contains "NewTab Pro"');
  assert(typeof content.version === 'string', 'Version string is present');
  assert(typeof content.description === 'string' && content.description.length > 10, 'Description is descriptive');

  // URL Override
  assert(content.chrome_url_overrides && content.chrome_url_overrides.newtab === 'newtab.html', 'chrome_url_overrides.newtab points to newtab.html');
  assert(fs.existsSync(path.join(rootDir, 'newtab.html')), 'newtab.html file exists on disk');

  // Minimal Permissions
  assert(Array.isArray(content.permissions), 'Permissions is an array');
  assert(content.permissions.length === 1 && content.permissions[0] === 'storage', 'Permissions strictly limited to ["storage"]');
  assert(!content.host_permissions, 'No broad host_permissions requested');
  assert(!content.background, 'No unnecessary background service worker overhead');

  // Icons
  assert(content.icons && content.icons['16'] && content.icons['48'] && content.icons['128'], 'Icons map specifies 16, 48, and 128');
  for (const size of ['16', '32', '48', '128']) {
    if (content.icons[size]) {
      const iconFile = path.join(rootDir, content.icons[size]);
      assert(fs.existsSync(iconFile), `Icon assets file exists: ${content.icons[size]}`);
    }
  }
} catch (err) {
  assert(false, `Unexpected manifest test exception: ${err.message}`);
}

console.log(`Manifest Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
