/**
 * FontLens - Manifest V3 Schema & Configuration Tests
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export async function runManifestTests() {
  const results = [];

  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    results.push({ name: message, passed: true });
  }

  // 1. Manifest file existence and parsing
  const manifestPath = path.join(rootDir, 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json must exist in extension root');

  const rawJson = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(rawJson);
    assert(true, 'manifest.json is valid JSON');
  } catch (err) {
    assert(false, `manifest.json is valid JSON: ${err.message}`);
  }

  // 2. MV3 Requirements
  assert(manifest.manifest_version === 3, 'manifest_version must be exactly 3');
  assert(typeof manifest.name === 'string' && manifest.name.includes('FontLens'), 'name contains "FontLens"');
  assert(typeof manifest.version === 'string' && /^\d+\.\d+\.\d+$/.test(manifest.version), 'version follows semver');
  assert(typeof manifest.description === 'string' && manifest.description.length > 20, 'description is informative');

  // 3. Permissions Check
  const requiredPerms = ['activeTab', 'scripting', 'storage', 'tabs', 'contextMenus'];
  requiredPerms.forEach(perm => {
    assert(Array.isArray(manifest.permissions) && manifest.permissions.includes(perm), `permissions includes "${perm}"`);
  });

  // Verify no excessive permissions
  assert(!manifest.permissions.includes('<all_urls>'), 'no excessive <all_urls> in permissions list');
  assert(!manifest.permissions.includes('cookies'), 'no cookies permission requested');
  assert(!manifest.permissions.includes('webRequest'), 'no webRequest permission requested');

  // 4. Icons verification
  const expectedSizes = ['16', '32', '48', '128'];
  expectedSizes.forEach(size => {
    assert(manifest.icons && manifest.icons[size], `manifest.icons specifies ${size}px icon`);
    const iconFile = path.join(rootDir, manifest.icons[size]);
    assert(fs.existsSync(iconFile), `icon file ${manifest.icons[size]} exists on disk`);
  });

  // 5. Action and Background
  assert(manifest.action && manifest.action.default_popup, 'action.default_popup is defined');
  const popupHtml = path.join(rootDir, manifest.action.default_popup);
  assert(fs.existsSync(popupHtml), 'popup HTML file exists on disk');

  assert(manifest.background && manifest.background.service_worker, 'background.service_worker is defined');
  assert(manifest.background.type === 'module', 'background worker is configured with type: module');
  const bgFile = path.join(rootDir, manifest.background.service_worker);
  assert(fs.existsSync(bgFile), 'background service worker file exists on disk');

  // 6. Commands
  assert(manifest.commands && manifest.commands['toggle-inspection'], 'commands defines toggle-inspection shortcut');

  // 7. Web accessible resources
  assert(Array.isArray(manifest.web_accessible_resources) && manifest.web_accessible_resources.length > 0, 'web_accessible_resources configured');
  const res = manifest.web_accessible_resources[0].resources;
  assert(res.includes('inspector/inspector.css'), 'web_accessible_resources includes inspector.css');
  assert(res.includes('scanner/scanner.css'), 'web_accessible_resources includes scanner.css');

  return results;
}
