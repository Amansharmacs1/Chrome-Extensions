/**
 * ViewPortX - Storage Engine Unit Tests
 * Validates default settings, persistence fallback, site overrides, and device profiles.
 */

import {
  getViewPortXSettings,
  saveViewPortXSettings,
  getSiteOverrides,
  saveSiteOverrides,
  DEVICE_PROFILES,
  DEFAULT_SETTINGS
} from '../scripts/storage.js';

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

console.log('\n--- Running Storage Engine Unit Tests ---');

// 1. Device Profiles Check
assert(Array.isArray(DEVICE_PROFILES) && DEVICE_PROFILES.length >= 6, 'Contains at least 6 standard device profiles');
const smallMob = DEVICE_PROFILES.find(d => d.width === 320);
assert(smallMob !== undefined, 'Includes 320px small mobile profile');
const desktop = DEVICE_PROFILES.find(d => d.width === 1440);
assert(desktop !== undefined, 'Includes 1440px desktop profile');

// 2. Default Settings
assert(typeof DEFAULT_SETTINGS.autoScan === 'boolean', 'Default autoScan is boolean');
assert(typeof DEFAULT_SETTINGS.rememberPerSite === 'boolean', 'Default rememberPerSite is boolean');
assert(DEFAULT_SETTINGS.maxElementsScanned >= 500, 'Default maxElementsScanned is at least 500');

// 3. Settings Retrieval & Saving
const initialSettings = await getViewPortXSettings();
assert(initialSettings.theme === 'dark', 'Initial theme defaults to dark');

await saveViewPortXSettings({ theme: 'midnight', autoScan: true });
const updatedSettings = await getViewPortXSettings();
assert(updatedSettings.theme === 'midnight', 'Theme successfully updated to midnight');
assert(updatedSettings.autoScan === true, 'autoScan successfully updated to true');

// 4. Site Overrides
const initialOverrides = await getSiteOverrides('example.com');
assert(initialOverrides === null, 'Initial site overrides are null');

const mockRules = {
  customCss: '.hero { max-width: 100%; }',
  enabled: true
};
await saveSiteOverrides('example.com', mockRules);

const savedOverrides = await getSiteOverrides('example.com');
assert(savedOverrides !== null, 'Site overrides successfully saved and retrieved');
assert(savedOverrides.customCss === mockRules.customCss, 'Custom CSS preserved in site overrides');

console.log(`\nStorage Engine Unit Tests Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
