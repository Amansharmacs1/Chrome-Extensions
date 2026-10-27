/**
 * FocusFlow - Manifest V3 Compliance and Security Audit Test
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function run() {
  console.log('🧪 Testing Manifest V3 Compliance & Permissions...');

  const manifestPath = path.resolve(__dirname, '../manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');

  const raw = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    assert.fail(`manifest.json is not valid JSON: ${err.message}`);
  }

  // 1. MV3 Manifest standard
  assert.strictEqual(manifest.manifest_version, 3, 'Must be Manifest V3');
  assert.ok(manifest.name, 'Manifest name must be defined');
  assert.ok(manifest.version, 'Manifest version must be defined');
  assert.ok(manifest.description, 'Manifest description must be defined');

  // 2. Action & Popup
  assert.ok(manifest.action, 'Action property must be defined');
  assert.strictEqual(manifest.action.default_popup, 'popup.html');
  const popupPath = path.resolve(__dirname, '../popup.html');
  assert.ok(fs.existsSync(popupPath), 'popup.html referenced by manifest must exist');

  // 3. Background Service Worker
  assert.ok(manifest.background, 'Background configuration must exist');
  assert.strictEqual(manifest.background.service_worker, 'background.js');
  assert.strictEqual(manifest.background.type, 'module');
  const bgPath = path.resolve(__dirname, '../background.js');
  assert.ok(fs.existsSync(bgPath), 'background.js referenced by manifest must exist');

  // 4. Permissions Audit
  const allowedPermissions = new Set([
    'storage',
    'alarms',
    'notifications',
    'declarativeNetRequest'
  ]);

  assert.ok(Array.isArray(manifest.permissions), 'Permissions must be an array');
  for (const perm of manifest.permissions) {
    assert.ok(
      allowedPermissions.has(perm),
      `Permission "${perm}" is not in the strictly approved minimal permission set!`
    );
  }

  // Ensure high-risk or invasive permissions are NOT present
  const prohibitedPermissions = ['tabs', '<all_urls>', 'webRequest', 'webRequestBlocking', 'cookies', 'history'];
  for (const bad of prohibitedPermissions) {
    assert.ok(!manifest.permissions.includes(bad), `Unjustified permission found: ${bad}`);
  }

  // 5. Icons check
  assert.ok(manifest.icons, 'Icons must be defined');
  for (const size of [16, 32, 48, 128]) {
    const iconRel = manifest.icons[size] || manifest.icons[String(size)];
    assert.ok(iconRel, `Icon ${size} must be declared in manifest`);
    const iconAbs = path.resolve(__dirname, '..', iconRel);
    assert.ok(fs.existsSync(iconAbs), `Icon file ${iconRel} must exist on disk`);
  }

  console.log('✅ All Manifest V3 & Security Audit tests passed!');
}
