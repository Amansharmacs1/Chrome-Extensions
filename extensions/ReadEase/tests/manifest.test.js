/**
 * ReadEase - Manifest V3 Audit Tests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, '..');

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

const manifestPath = path.join(extensionRoot, 'manifest.json');
assert(fs.existsSync(manifestPath), 'manifest.json exists');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// 1. Core Manifest V3 attributes
assert(manifest.manifest_version === 3, 'Manifest version is 3');
assert(manifest.name && manifest.name.includes('ReadEase'), 'Name contains "ReadEase"');
assert(Boolean(manifest.version), 'Version string is present');
assert(Boolean(manifest.description), 'Description is present');

// 2. Action & Popup
assert(Boolean(manifest.action), 'Action object is declared');
assert(manifest.action.default_popup === 'popup.html', 'Action popup points to popup.html');
assert(fs.existsSync(path.join(extensionRoot, 'popup.html')), 'popup.html exists on disk');

// 3. Background Service Worker
assert(Boolean(manifest.background), 'Background object is declared');
assert(manifest.background.service_worker === 'background.js', 'Service worker is background.js');
assert(manifest.background.type === 'module', 'Service worker type is module');
assert(fs.existsSync(path.join(extensionRoot, 'background.js')), 'background.js exists on disk');

// 4. Permissions Least Privilege
assert(Array.isArray(manifest.permissions), 'Permissions is an array');
assert(manifest.permissions.includes('activeTab'), 'Requests activeTab permission');
assert(manifest.permissions.includes('scripting'), 'Requests scripting permission');
assert(manifest.permissions.includes('storage'), 'Requests storage permission');
assert(manifest.permissions.length === 3, 'Permissions strictly limited to ["activeTab", "scripting", "storage"]');
assert(!manifest.permissions.includes('<all_urls>'), 'Does NOT request broad <all_urls>');
assert(!manifest.permissions.includes('history'), 'Does NOT request browsing history');
assert(!manifest.permissions.includes('tabs'), 'Does NOT request broad tabs permission');

// 5. Assets verification
assert(Boolean(manifest.icons), 'Icons dictionary is defined');
for (const size of [16, 32, 48, 128]) {
  const iconRel = manifest.icons[size] || manifest.icons[String(size)];
  assert(Boolean(iconRel), `Icon defined for size ${size}`);
  assert(fs.existsSync(path.join(extensionRoot, iconRel)), `Icon asset exists: ${iconRel}`);
}

// 6. Reader and Library pages exist
assert(fs.existsSync(path.join(extensionRoot, 'reader.html')), 'reader.html exists on disk');
assert(fs.existsSync(path.join(extensionRoot, 'reader.js')), 'reader.js exists on disk');
assert(fs.existsSync(path.join(extensionRoot, 'reader.css')), 'reader.css exists on disk');
assert(fs.existsSync(path.join(extensionRoot, 'library.html')), 'library.html exists on disk');
assert(fs.existsSync(path.join(extensionRoot, 'library.js')), 'library.js exists on disk');
assert(fs.existsSync(path.join(extensionRoot, 'library.css')), 'library.css exists on disk');

console.log(`Manifest Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
