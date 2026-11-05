/**
 * ColorPeek - Manifest V3 Audit Tests
 * Verifies extension packaging, permissions, icons, and configuration.
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

// 1. Read manifest.json
const manifestPath = path.join(rootDir, 'manifest.json');
assert(fs.existsSync(manifestPath), 'manifest.json exists on disk');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// 2. Schema properties
assert(manifest.manifest_version === 3, 'Manifest version is 3');
assert(manifest.name && manifest.name.includes('ColorPeek'), 'Name contains "ColorPeek"');
assert(typeof manifest.version === 'string' && manifest.version.length > 0, 'Version string is present');
assert(typeof manifest.description === 'string' && manifest.description.length > 10, 'Description is descriptive');

// 3. Action declaration
assert(Boolean(manifest.action), 'Action object is declared');
assert(manifest.action.default_popup === 'popup.html', 'Action popup points to popup.html');
assert(fs.existsSync(path.join(rootDir, manifest.action.default_popup)), 'popup.html file exists on disk');

// 4. Background service worker
assert(Boolean(manifest.background), 'Background object is declared');
assert(manifest.background.service_worker === 'background.js', 'Service worker is background.js');
assert(manifest.background.type === 'module', 'Service worker type is module');
assert(fs.existsSync(path.join(rootDir, manifest.background.service_worker)), 'background.js file exists on disk');

// 5. Permissions audit
assert(Array.isArray(manifest.permissions), 'Permissions is an array');
assert(manifest.permissions.includes('storage'), 'Requests storage permission for palettes');
assert(manifest.permissions.includes('activeTab'), 'Requests activeTab permission for sampling');
assert(manifest.permissions.includes('scripting'), 'Requests scripting permission for inspector');
assert(!manifest.permissions.includes('<all_urls>'), 'Does NOT request broad <all_urls>');
assert(!manifest.permissions.includes('tabs'), 'Does NOT request broad tabs browsing history');
assert(!manifest.host_permissions, 'Does NOT request host_permissions');

// 6. Icon assets audit
assert(Boolean(manifest.icons), 'Icons dictionary is declared');
const requiredSizes = ['16', '32', '48', '128'];
for (const size of requiredSizes) {
  assert(Boolean(manifest.icons[size]), `Icon defined for size ${size}`);
  const iconFile = path.join(rootDir, manifest.icons[size]);
  assert(fs.existsSync(iconFile), `Icon file exists on disk: ${manifest.icons[size]}`);
}

// 7. Core files audit
const expectedFiles = [
  'popup.html', 'popup.css', 'popup.js',
  'dashboard.html', 'dashboard.css', 'dashboard.js',
  'scripts/color-converter.js',
  'scripts/contrast-checker.js',
  'scripts/harmonies.js',
  'scripts/palette-manager.js',
  'scripts/css-exporter.js',
  'scripts/storage.js',
  'scripts/eyedropper.js',
  'scripts/element-inspector.js',
  'scripts/utils.js'
];

for (const file of expectedFiles) {
  assert(fs.existsSync(path.join(rootDir, file)), `Core file exists: ${file}`);
}

console.log(`Manifest Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
