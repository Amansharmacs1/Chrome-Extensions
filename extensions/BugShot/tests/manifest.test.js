/**
 * BugShot - Manifest V3 Specification Tests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

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

export async function runManifestTests() {
  console.log('\n--- Running Manifest V3 Specification Tests ---');

  const manifestPath = path.join(ROOT, 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json exists');

  const content = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(content);
    assert(true, 'manifest.json is valid JSON');
  } catch {
    assert(false, 'manifest.json must parse without syntax error');
    return { passed, failed };
  }

  assert(manifest.manifest_version === 3, 'Manifest version is 3 (MV3)');
  assert(typeof manifest.name === 'string' && manifest.name.includes('BugShot'), 'Extension name contains BugShot');
  assert(manifest.version === '1.0.0', 'Version is 1.0.0');
  assert(typeof manifest.description === 'string' && manifest.description.length > 20, 'Description is descriptive');

  // Icons
  assert(manifest.icons && manifest.icons['16'], 'Icon 16 is declared');
  assert(manifest.icons && manifest.icons['32'], 'Icon 32 is declared');
  assert(manifest.icons && manifest.icons['48'], 'Icon 48 is declared');
  assert(manifest.icons && manifest.icons['128'], 'Icon 128 is declared');

  for (const size of ['16', '32', '48', '128']) {
    const iconFile = path.join(ROOT, manifest.icons[size]);
    assert(fs.existsSync(iconFile), `Icon asset exists: ${manifest.icons[size]}`);
  }

  // Action
  assert(manifest.action && manifest.action.default_popup === 'popup/popup.html', 'Action popup points to popup/popup.html');
  assert(fs.existsSync(path.join(ROOT, 'popup/popup.html')), 'popup/popup.html exists');

  // Background
  assert(manifest.background && manifest.background.service_worker === 'background/service-worker.js', 'Service worker is declared');
  assert(manifest.background && manifest.background.type === 'module', 'Service worker type is module');
  assert(fs.existsSync(path.join(ROOT, 'background/service-worker.js')), 'background/service-worker.js exists');

  // Content scripts
  assert(Array.isArray(manifest.content_scripts) && manifest.content_scripts.length > 0, 'Content scripts are declared');
  assert(manifest.content_scripts[0].matches.includes('<all_urls>'), 'Content script matches all URLs');

  // Permissions
  const expectedPerms = ['activeTab', 'scripting', 'storage', 'unlimitedStorage', 'tabs', 'downloads'];
  for (const perm of expectedPerms) {
    assert(manifest.permissions.includes(perm), `Declares required permission: ${perm}`);
  }

  // Keybindings / Commands
  assert(manifest.commands && manifest.commands._execute_action, 'Shortcut command _execute_action is declared');

  // HTML page verification
  assert(fs.existsSync(path.join(ROOT, 'editor/editor.html')), 'editor/editor.html exists');
  assert(fs.existsSync(path.join(ROOT, 'report/report.html')), 'report/report.html exists');
  assert(fs.existsSync(path.join(ROOT, 'dashboard/dashboard.html')), 'dashboard/dashboard.html exists');

  return { passed, failed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runManifestTests().then(res => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
