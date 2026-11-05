/**
 * ColorPeek - Storage Engine Tests
 */

import { getStorage, setStorage, removeStorage, clearStorage } from '../scripts/storage.js';

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

console.log('\n--- Running Storage Engine Tests ---');

async function runTests() {
  await clearStorage();

  // 1. Initial State
  const valInitial = await getStorage('non_existent_key');
  assert(valInitial === undefined, 'Non-existent key returns undefined');

  // 2. Set and Get Object
  const testPayload = { theme: 'dark', format: 'hex', colorsCount: 42 };
  await setStorage('test_settings', testPayload);
  const retrieved = await getStorage('test_settings');
  assert(retrieved && retrieved.colorsCount === 42, 'Sets and retrieves structured object');

  // 3. Update Existing Key
  await setStorage('test_settings', { theme: 'light', format: 'rgb' });
  const updated = await getStorage('test_settings');
  assert(updated && updated.theme === 'light', 'Updates existing key value in storage');

  // 4. Remove Key
  await removeStorage('test_settings');
  const afterRemove = await getStorage('test_settings');
  assert(afterRemove === undefined, 'Removes key from storage');

  // 5. Multiple Keys & Clear
  await setStorage('k1', 'val1');
  await setStorage('k2', 'val2');
  assert((await getStorage('k1')) === 'val1', 'Key 1 stored');
  assert((await getStorage('k2')) === 'val2', 'Key 2 stored');

  await clearStorage();
  assert((await getStorage('k1')) === undefined, 'Clear clears key 1');
  assert((await getStorage('k2')) === undefined, 'Clear clears key 2');

  console.log(`Storage Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
