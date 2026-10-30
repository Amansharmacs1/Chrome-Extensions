/**
 * ReadEase - Storage Engine Unit Tests
 */

import {
  getLocalStorage,
  setLocalStorage,
  removeLocalStorage,
  dbSaveArticle,
  dbGetArticle,
  dbGetAllArticles,
  dbDeleteArticle,
  dbClearArticles
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

console.log('\n--- Running Storage Engine Tests ---');

async function runTests() {
  // 1. Local Storage fallback / get / set / remove
  await setLocalStorage('test_key', { hello: 'world', count: 42 });
  const retrieved = await getLocalStorage('test_key');
  assert(retrieved && retrieved.count === 42, 'Sets and retrieves object from storage');

  await removeLocalStorage('test_key');
  const afterRemove = await getLocalStorage('test_key');
  assert(afterRemove === undefined, 'Removes key from storage');

  // 2. Database save and retrieval
  await dbClearArticles();
  const initialList = await dbGetAllArticles();
  assert(initialList.length === 0, 'Database starts clean after clear');

  const testArticle = {
    id: 'art-100',
    title: 'Testing Offline Storage in ReadEase',
    url: 'https://example.com/offline',
    wordCount: 500,
    readingTime: 3,
    savedAt: 1700000000000,
    contentHtml: '<p>Offline article text</p>',
    highlights: []
  };

  const saveSuccess = await dbSaveArticle(testArticle);
  assert(saveSuccess === true, 'Saves full article into database');

  const loaded = await dbGetArticle('art-100');
  assert(loaded && loaded.title === 'Testing Offline Storage in ReadEase', 'Retrieves article by ID');
  assert(loaded.contentHtml === '<p>Offline article text</p>', 'Preserves full content HTML');

  // 3. Database GetAll
  const testArticle2 = {
    id: 'art-101',
    title: 'Second Article',
    url: 'https://example.com/second',
    wordCount: 300,
    savedAt: 1700000001000
  };
  await dbSaveArticle(testArticle2);

  const allArticles = await dbGetAllArticles();
  assert(allArticles.length === 2, 'getAllArticles returns both articles');

  // 4. Delete article
  const delSuccess = await dbDeleteArticle('art-100');
  assert(delSuccess === true, 'Deletes article by ID');

  const afterDelete = await dbGetArticle('art-100');
  assert(afterDelete === null, 'Deleted article is no longer retrievable');

  const remaining = await dbGetAllArticles();
  assert(remaining.length === 1 && remaining[0].id === 'art-101', 'Remaining article is intact');

  // 5. Clear all
  await dbClearArticles();
  const cleared = await dbGetAllArticles();
  assert(cleared.length === 0, 'dbClearArticles empties the database');

  console.log(`Storage Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
