/**
 * ColorPeek - Palette Manager & History Tests
 */

import {
  getPalettes,
  createPalette,
  renamePalette,
  deletePalette,
  addColorToPalette,
  removeColorFromPalette,
  reorderPaletteColors,
  getRecentColors,
  addRecentColor,
  clearRecentColors,
  getActiveColor,
  setActiveColor
} from '../scripts/palette-manager.js';
import { clearStorage } from '../scripts/storage.js';

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

console.log('\n--- Running Palette Manager Tests ---');

async function runTests() {
  await clearStorage();

  // 1. Initial Defaults
  const initialPalettes = await getPalettes();
  assert(Array.isArray(initialPalettes) && initialPalettes.length >= 2, 'Initializes with default starter palettes');
  assert(initialPalettes[0].colors.length > 0, 'Starter palette contains starter colors');

  // 2. Create Palette
  const newPal = await createPalette('Brand Redesign');
  assert(newPal.name === 'Brand Redesign', 'Creates palette with custom name');
  assert(Boolean(newPal.id), 'Assigns unique ID to created palette');

  const afterCreate = await getPalettes();
  assert(afterCreate.some(p => p.id === newPal.id), 'New palette exists in saved list');

  // 3. Rename Palette
  const renameSuccess = await renamePalette(newPal.id, 'Brand V2');
  assert(renameSuccess, 'renamePalette returns true on success');
  const renamedPalettes = await getPalettes();
  const renamed = renamedPalettes.find(p => p.id === newPal.id);
  assert(renamed && renamed.name === 'Brand V2', 'Palette name updated in storage');

  // 4. Add Color to Palette
  const added = await addColorToPalette(newPal.id, {
    hex: '#3B82F6',
    name: 'Electric Blue',
    note: 'Primary call to action'
  });
  assert(added && added.hex === '#3B82F6', 'Adds color entry to target palette');

  const addedSecond = await addColorToPalette(newPal.id, {
    hex: '#06B6D4',
    name: 'Cyan Accent'
  });
  assert(addedSecond && addedSecond.hex === '#06B6D4', 'Adds second color entry');

  const palsWithColors = await getPalettes();
  const palObj = palsWithColors.find(p => p.id === newPal.id);
  assert(palObj.colors.length === 2, 'Palette reflects 2 added colors');

  // 5. Reorder Colors in Palette
  const reorderOk = await reorderPaletteColors(newPal.id, 0, 1);
  assert(reorderOk, 'reorderPaletteColors returns true');
  const palsReordered = await getPalettes();
  const reorderedPal = palsReordered.find(p => p.id === newPal.id);
  assert(reorderedPal.colors[0].hex === '#06B6D4', 'Colors correctly swapped position in palette');

  // 6. Remove Color from Palette
  const removeOk = await removeColorFromPalette(newPal.id, added.id);
  assert(removeOk, 'removeColorFromPalette returns true on removal');
  const palsAfterRemove = await getPalettes();
  const palAfterDel = palsAfterRemove.find(p => p.id === newPal.id);
  assert(palAfterDel.colors.length === 1, 'Color count decremented after removal');

  // 7. Delete Palette
  const deleteOk = await deletePalette(newPal.id);
  assert(deleteOk, 'deletePalette returns true');
  const palsAfterDelete = await getPalettes();
  assert(!palsAfterDelete.some(p => p.id === newPal.id), 'Deleted palette no longer exists in list');

  // 8. Recent Colors History with Deduplication
  await clearRecentColors();
  let recents = await getRecentColors();
  assert(recents.length === 0, 'Recent colors list starts clean after clear');

  await addRecentColor('#FF0000', 'manual');
  await addRecentColor('#00FF00', 'eyedropper');
  await addRecentColor('#0000FF', 'inspector');
  recents = await getRecentColors();
  assert(recents.length === 3, 'Recorded 3 recent picks');
  assert(recents[0].hex === '#0000FF', 'Latest color placed at front of recents');

  // Deduplication test: re-adding #FF0000 should move it to front, not duplicate
  await addRecentColor('#FF0000', 'eyedropper');
  recents = await getRecentColors();
  assert(recents.length === 3, 'Deduplication policy prevents duplicate entry for same HEX');
  assert(recents[0].hex === '#FF0000', 'Deduplicated color moved to position 0');
  assert(recents[0].source === 'eyedropper', 'Updated source to latest pick source');

  // 9. Active Selected Color
  await setActiveColor('#8B5CF6');
  const activeCol = await getActiveColor();
  assert(activeCol === '#8B5CF6', 'Sets and retrieves active color');

  console.log(`Palette Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
