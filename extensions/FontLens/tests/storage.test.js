/**
 * FontLens - Storage Engine Unit Tests
 */

import {
  getPresets,
  savePreset,
  deletePreset,
  getFavorites,
  toggleFavorite,
  isFavorite,
  getRecentFonts,
  addRecentFont,
  clearRecentFonts,
  getSavedComparisons,
  saveComparison,
  deleteComparison,
  getUserSettings,
  saveUserSettings,
  deleteAllData
} from '../scripts/storage.js';

import { createPreset } from '../scripts/presets.js';

export async function runStorageTests() {
  const results = [];

  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    results.push({ name: message, passed: true });
  }

  // 1. Initial storage wipe for test isolation
  await deleteAllData();

  // 2. Presets CRUD
  const initialPresets = await getPresets();
  assert(initialPresets.length >= 5, 'getPresets returns seeded default presets when empty');

  // Attempting to delete a built-in preset should throw
  let builtInDeleteFailed = false;
  try {
    await deletePreset(initialPresets[0].id);
  } catch (err) {
    builtInDeleteFailed = true;
  }
  assert(builtInDeleteFailed, 'deletePreset rejects deletion of built-in presets');

  // Save new custom preset
  const custom = createPreset('My Test Preset', {
    fontFamily: '"DM Sans", sans-serif',
    fontSize: '22px'
  });
  await savePreset(custom);

  const presetsAfterAdd = await getPresets();
  assert(presetsAfterAdd.some(p => p.id === custom.id), 'Custom preset saved in storage');

  // Delete custom preset
  const deleted = await deletePreset(custom.id);
  assert(deleted === true, 'deletePreset successfully removes custom preset');
  const presetsAfterDel = await getPresets();
  assert(!presetsAfterDel.some(p => p.id === custom.id), 'Custom preset no longer in storage');

  // 3. Favorites
  assert((await getFavorites()).length === 0, 'Favorites initially empty');
  assert(await isFavorite('Inter') === false, 'Inter not favorite initially');

  const fav1 = await toggleFavorite('Inter');
  assert(fav1 === true, 'toggleFavorite returns true when added');
  assert(await isFavorite('Inter') === true, 'isFavorite returns true for Inter');

  const fav2 = await toggleFavorite('Inter');
  assert(fav2 === false, 'toggleFavorite returns false when removed');
  assert(await isFavorite('Inter') === false, 'isFavorite returns false after toggle');

  // 4. Recent Fonts History
  await clearRecentFonts();
  assert((await getRecentFonts()).length === 0, 'Recent fonts initially empty');

  await addRecentFont('Merriweather', 'https://example.com/article');
  await addRecentFont('Roboto', 'https://example.com/app');
  await addRecentFont('Merriweather', 'https://example.com/another'); // Deduplication test

  const recents = await getRecentFonts();
  assert(recents.length === 2, 'Recent fonts deduplicates by fontName');
  assert(recents[0].fontName === 'Merriweather', 'Most recent font appears first');
  assert(recents[1].fontName === 'Roboto', 'Second font preserved in order');

  await clearRecentFonts();
  assert((await getRecentFonts()).length === 0, 'clearRecentFonts wipes recent history');

  // 5. Comparisons Snapshots
  assert((await getSavedComparisons()).length === 0, 'Comparisons initially empty');

  const comp = await saveComparison({
    title: 'Landing Page Comparison',
    fonts: [{ fontFamily: 'Inter' }, { fontFamily: 'Roboto' }],
    sampleText: 'Hero Heading'
  });
  assert(typeof comp.id === 'string' && comp.id.startsWith('comp_'), 'saveComparison attaches id');

  const compsList = await getSavedComparisons();
  assert(compsList.length === 1, '1 saved comparison retrieved');
  assert(compsList[0].title === 'Landing Page Comparison', 'Comparison title matches');

  await deleteComparison(comp.id);
  assert((await getSavedComparisons()).length === 0, 'deleteComparison removes snapshot');

  // 6. User Settings
  const defaultSettings = await getUserSettings();
  assert(defaultSettings.theme === 'dark', 'Default theme is dark');
  assert(defaultSettings.highlightColor === '#8B5CF6', 'Default highlight color is #8B5CF6');

  const updatedSettings = await saveUserSettings({ highlightColor: '#10B981' });
  assert(updatedSettings.highlightColor === '#10B981', 'saveUserSettings updates partial setting');
  assert(updatedSettings.theme === 'dark', 'Preserves other settings');

  return results;
}
