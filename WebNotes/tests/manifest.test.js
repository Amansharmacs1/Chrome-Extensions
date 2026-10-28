/**
 * WebNotes — Manifest & Configuration Tests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(message);
    console.error(`  FAIL: ${message}`);
  }
}

function runTests() {
  console.log('Testing WebNotes Manifest & Packaging...');

  const manifestPath = path.join(rootDir, 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json exists');

  const raw = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(raw);
    assert(true, 'manifest.json parses as valid JSON');
  } catch (err) {
    assert(false, `manifest.json is valid JSON: ${err.message}`);
    process.exit(1);
  }

  // Basic metadata
  assert(manifest.manifest_version === 3, 'manifest_version is 3');
  assert(typeof manifest.name === 'string' && manifest.name.includes('WebNotes'), 'name contains "WebNotes"');
  assert(typeof manifest.version === 'string' && /^\d+\.\d+\.\d+$/.test(manifest.version), 'version follows semver format');
  assert(typeof manifest.description === 'string' && manifest.description.length > 10, 'description is descriptive');

  // Icons check
  assert(manifest.icons && typeof manifest.icons === 'object', 'manifest.icons object exists');
  for (const size of ['16', '32', '48', '128']) {
    const iconRel = manifest.icons[size];
    assert(typeof iconRel === 'string', `Icon for size ${size} specified`);
    const iconPath = path.join(rootDir, iconRel);
    assert(fs.existsSync(iconPath), `Icon file exists: ${iconRel}`);
    const stat = fs.statSync(iconPath);
    assert(stat.size > 0, `Icon file is non-empty: ${iconRel} (${stat.size} bytes)`);
  }

  // Action check
  assert(manifest.action && typeof manifest.action === 'object', 'action configuration exists');
  assert(typeof manifest.action.default_popup === 'string', 'action.default_popup is specified');
  const popupPath = path.join(rootDir, manifest.action.default_popup);
  assert(fs.existsSync(popupPath), `default_popup file exists: ${manifest.action.default_popup}`);

  // Background check
  assert(manifest.background && typeof manifest.background === 'object', 'background configuration exists');
  assert(manifest.background.service_worker === 'background.js', 'background service worker is background.js');
  assert(manifest.background.type === 'module', 'background service worker uses ES module type');
  const bgPath = path.join(rootDir, manifest.background.service_worker);
  assert(fs.existsSync(bgPath), 'background.js file exists');

  // Permissions check
  const requiredPerms = ['storage', 'activeTab', 'contextMenus', 'scripting'];
  assert(Array.isArray(manifest.permissions), 'permissions is an array');
  for (const perm of requiredPerms) {
    assert(manifest.permissions.includes(perm), `Permission included: ${perm}`);
  }

  // Filesystem checks for critical files
  const criticalFiles = [
    'popup.html',
    'popup.css',
    'popup.js',
    'dashboard.html',
    'dashboard.css',
    'dashboard.js',
    'scripts/storage.js',
    'scripts/url-utils.js',
    'scripts/search.js',
    'scripts/export-import.js'
  ];

  for (const file of criticalFiles) {
    const filePath = path.join(rootDir, file);
    assert(fs.existsSync(filePath), `Critical source file exists: ${file}`);
  }

  console.log(`Manifest & Packaging Tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runTests();
