/**
 * Test Suite: Manifest V3 Validity & Security Conformance
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function run() {
  console.log('--- Running Manifest V3 Tests ---');

  const manifestPath = path.resolve(__dirname, '../manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json must exist');

  const raw = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (e) {
    assert.fail(`manifest.json is not valid JSON: ${e.message}`);
  }

  // 1. Manifest version
  assert.strictEqual(manifest.manifest_version, 3, 'Must be Manifest V3');

  // 2. Metadata
  assert(manifest.name && manifest.name.length > 0, 'Name must be specified');
  assert(manifest.version && /^\d+\.\d+\.\d+$/.test(manifest.version), 'Version must be semver');

  // 3. Icons
  assert(manifest.icons, 'Icons must be defined');
  ['16', '48', '128'].forEach((size) => {
    assert(manifest.icons[size], `Icon size ${size} must be defined`);
    const iconFile = path.resolve(__dirname, '..', manifest.icons[size]);
    assert(fs.existsSync(iconFile), `Icon file ${manifest.icons[size]} must exist on disk`);
  });

  // 4. Action Popup
  assert(manifest.action && manifest.action.default_popup, 'default_popup must be specified');
  const popupFile = path.resolve(__dirname, '..', manifest.action.default_popup);
  assert(fs.existsSync(popupFile), 'popup.html must exist on disk');

  // 5. Background service worker
  assert(manifest.background && manifest.background.service_worker, 'service_worker must be specified');
  const workerFile = path.resolve(__dirname, '..', manifest.background.service_worker);
  assert(fs.existsSync(workerFile), 'background.js must exist on disk');

  // 6. Content Scripts
  assert(Array.isArray(manifest.content_scripts) && manifest.content_scripts.length >= 2, 'Must have at least 2 content script configs (MAIN and ISOLATED)');

  const mainScriptConfig = manifest.content_scripts.find(c => c.world === 'MAIN');
  assert(mainScriptConfig, 'Must have a content script configured with world: MAIN');
  assert.strictEqual(mainScriptConfig.run_at, 'document_start', 'MAIN script must run at document_start');

  mainScriptConfig.js.forEach(file => {
    const fPath = path.resolve(__dirname, '..', file);
    assert(fs.existsSync(fPath), `MAIN script file ${file} must exist`);
  });

  const isolatedScriptConfig = manifest.content_scripts.find(c => !c.world || c.world === 'ISOLATED');
  assert(isolatedScriptConfig, 'Must have an ISOLATED content script');
  isolatedScriptConfig.js.forEach(file => {
    const fPath = path.resolve(__dirname, '..', file);
    assert(fs.existsSync(fPath), `ISOLATED script file ${file} must exist`);
  });

  // 7. Name & Host Permissions
  assert.strictEqual(manifest.name, 'MeetMorph', 'Extension name must be MeetMorph');
  assert(Array.isArray(manifest.host_permissions), 'host_permissions must be an array');
  const meetMatches = manifest.host_permissions.some(p => p.includes('meet.google.com'));
  assert(meetMatches, 'host_permissions must include meet.google.com');
  const omeTvMatches = manifest.host_permissions.some(p => p.includes('ome.tv'));
  assert(omeTvMatches, 'host_permissions must include ome.tv');

  // Verify content script matching for Google Meet
  manifest.content_scripts.forEach((cs, idx) => {
    assert(cs.matches.some(m => m.includes('meet.google.com')), `Content script ${idx} must match meet.google.com`);
  });

  // 8. Security Checks: No eval or remote scripts
  assert(!manifest.content_security_policy || !manifest.content_security_policy.extension_pages || !manifest.content_security_policy.extension_pages.includes('unsafe-eval'), 'Must not allow unsafe-eval');

  console.log('✅ All Manifest V3 tests passed.');
}

module.exports = { run };
if (require.main === module) run();
