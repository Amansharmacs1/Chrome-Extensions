/**
 * WordWise - Manifest V3 Configuration & Integrity Tests
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, '..');

export async function runManifestTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Manifest Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  const manifestPath = path.join(extensionRoot, 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json exists in extension root');

  const content = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(content);
    assert(true, 'manifest.json is valid JSON');
  } catch (e) {
    assert(false, `manifest.json JSON parse error: ${e.message}`);
  }

  // MV3 specs
  assert(manifest.manifest_version === 3, 'Manifest version is 3');
  assert(typeof manifest.name === 'string' && manifest.name.includes('WordWise'), 'Extension name is WordWise');
  assert(typeof manifest.version === 'string' && /^\d+\.\d+\.\d+$/.test(manifest.version), 'Extension version is semver');
  assert(typeof manifest.description === 'string' && manifest.description.length > 20, 'Description is descriptive');

  // Icons
  assert(manifest.icons && typeof manifest.icons === 'object', 'icons object defined');
  const iconSizes = ['16', '32', '48', '128'];
  for (const size of iconSizes) {
    assert(typeof manifest.icons[size] === 'string', `Icon ${size} defined in manifest`);
    const iconFile = path.join(extensionRoot, manifest.icons[size]);
    assert(fs.existsSync(iconFile), `Icon file ${manifest.icons[size]} exists on disk`);
  }

  // Action
  assert(manifest.action && typeof manifest.action === 'object', 'action defined');
  assert(typeof manifest.action.default_popup === 'string', 'default_popup defined');
  const popupHtml = path.join(extensionRoot, manifest.action.default_popup);
  assert(fs.existsSync(popupHtml), `Popup file ${manifest.action.default_popup} exists on disk`);

  // Service Worker
  assert(manifest.background && typeof manifest.background === 'object', 'background defined');
  assert(manifest.background.service_worker === 'background/service-worker.js', 'service_worker path is correct');
  assert(manifest.background.type === 'module', 'service_worker type is module');
  const swFile = path.join(extensionRoot, manifest.background.service_worker);
  assert(fs.existsSync(swFile), 'background/service-worker.js exists on disk');

  // Permissions
  assert(Array.isArray(manifest.permissions), 'permissions is an array');
  assert(manifest.permissions.includes('storage'), 'storage permission granted');
  assert(manifest.permissions.includes('activeTab'), 'activeTab permission granted');
  assert(manifest.permissions.includes('contextMenus'), 'contextMenus permission granted');

  // Host Permissions
  assert(Array.isArray(manifest.host_permissions), 'host_permissions is an array');
  assert(manifest.host_permissions.some(h => h.includes('dictionaryapi.dev')), 'Free Dictionary API host permitted');

  // Content Scripts
  assert(Array.isArray(manifest.content_scripts) && manifest.content_scripts.length > 0, 'content_scripts configured');
  const cs = manifest.content_scripts[0];
  for (const js of cs.js || []) {
    assert(fs.existsSync(path.join(extensionRoot, js)), `Content script ${js} exists on disk`);
  }
  for (const css of cs.css || []) {
    assert(fs.existsSync(path.join(extensionRoot, css)), `Content css ${css} exists on disk`);
  }

  // Web Accessible Resources
  assert(Array.isArray(manifest.web_accessible_resources) && manifest.web_accessible_resources.length > 0, 'web_accessible_resources configured');

  // Data daily-words.json
  const dailyWordsFile = path.join(extensionRoot, 'data', 'daily-words.json');
  assert(fs.existsSync(dailyWordsFile), 'data/daily-words.json exists on disk');
  const dailyWords = JSON.parse(fs.readFileSync(dailyWordsFile, 'utf8'));
  assert(Array.isArray(dailyWords) && dailyWords.length >= 100, `Curated daily words has ${dailyWords?.length} words (>= 100)`);

  return assertions;
}
