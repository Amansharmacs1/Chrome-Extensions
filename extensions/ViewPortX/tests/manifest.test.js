/**
 * ViewPortX - Manifest V3 Audit Tests
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
assert(manifest.name && manifest.name.includes('ViewPortX'), 'Name contains "ViewPortX"');
assert(typeof manifest.version === 'string' && manifest.version.length > 0, 'Version string is present');
assert(typeof manifest.description === 'string' && manifest.description.length > 10, 'Description is descriptive');

// 3. Action / Popup
assert(manifest.action && manifest.action.default_popup === 'popup.html', 'Action popup points to popup.html');
assert(fs.existsSync(path.join(rootDir, 'popup.html')), 'popup.html exists');
assert(fs.existsSync(path.join(rootDir, 'popup.css')), 'popup.css exists');
assert(fs.existsSync(path.join(rootDir, 'popup.js')), 'popup.js exists');

// 4. Background Service Worker
assert(manifest.background && manifest.background.service_worker === 'background.js', 'Service worker points to background.js');
assert(manifest.background.type === 'module', 'Service worker type is "module"');
assert(fs.existsSync(path.join(rootDir, 'background.js')), 'background.js exists');

// 5. Dashboard Workstation
assert(fs.existsSync(path.join(rootDir, 'dashboard.html')), 'dashboard.html exists');
assert(fs.existsSync(path.join(rootDir, 'dashboard.css')), 'dashboard.css exists');
assert(fs.existsSync(path.join(rootDir, 'dashboard.js')), 'dashboard.js exists');

// 6. Content Script Bridge
assert(fs.existsSync(path.join(rootDir, 'content.js')), 'content.js exists');

// Verify content.js is safe for multiple injections without identifier collision
const contentCode = fs.readFileSync(path.join(rootDir, 'content.js'), 'utf8');
assert(!contentCode.includes('import(') || contentCode.includes('import.meta'), 'content.js does not rely on fragile runtime network dynamic imports');
assert(contentCode.includes('__VIEWPORTX_CONTENT_SCRIPT_INITIALIZED__'), 'content.js includes idempotency guard');

// 7. Icons
const iconSizes = ['16', '32', '48', '128'];
for (const size of iconSizes) {
  assert(manifest.icons && manifest.icons[size], `manifest.icons specifies ${size}x${size} icon`);
  const iconPath = path.join(rootDir, manifest.icons[size]);
  assert(fs.existsSync(iconPath), `Icon file exists: ${manifest.icons[size]}`);
}

// 8. Minimal Required Permissions
const requiredPermissions = ['activeTab', 'scripting', 'storage', 'tabs'];
for (const perm of requiredPermissions) {
  assert(manifest.permissions && manifest.permissions.includes(perm), `Permission "${perm}" is declared`);
}

// 9. Web Accessible Resources
assert(Array.isArray(manifest.web_accessible_resources) && manifest.web_accessible_resources.length > 0, 'web_accessible_resources is defined');
const hasScripts = manifest.web_accessible_resources.some(r => r.resources.includes('scripts/*'));
assert(hasScripts, 'scripts/* is listed in web_accessible_resources');

console.log(`\nManifest Audit Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
