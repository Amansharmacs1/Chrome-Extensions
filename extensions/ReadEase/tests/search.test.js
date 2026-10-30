/**
 * ReadEase - Search, Tagging & Backup Unit Tests
 */

import {
  searchArticles,
  extractUniqueTags,
  exportLibraryData,
  validateImportJSON,
  importLibraryData
} from '../scripts/search.js';
import { dbSaveArticle, dbClearArticles, removeLocalStorage } from '../scripts/storage.js';
import { getLibraryIndex } from '../scripts/article-manager.js';

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

console.log('\n--- Running Search, Tags & Backup Tests ---');

async function runTests() {
  const dataset = [
    {
      id: 'a1',
      title: 'Building Distributed Systems',
      byline: 'Leslie Lamport',
      siteName: 'acm.org',
      url: 'https://acm.org/distributed',
      excerpt: 'Clock synchronization and consensus protocols.',
      notes: 'Study Paxos algorithm',
      tags: ['distributed', 'systems', 'cs'],
      highlights: [{ text: 'logical clocks', note: 'Essential distributed concept' }]
    },
    {
      id: 'a2',
      title: 'CSS Grid Mastery',
      byline: 'Rachel Andrew',
      siteName: 'smashingmagazine.com',
      url: 'https://smashingmagazine.com/css-grid',
      excerpt: 'Modern flexible two-dimensional grid layouts.',
      notes: 'Use fr units for flexible track allocation',
      tags: ['css', 'frontend', 'design'],
      highlights: []
    },
    {
      id: 'a3',
      title: 'V8 Garbage Collection Internals',
      byline: 'Mathias Bynens',
      siteName: 'v8.dev',
      url: 'https://v8.dev/blog/gc',
      excerpt: 'Scavenge and Mark-Sweep garbage collectors in Chrome V8.',
      notes: 'Generational hypothesis',
      tags: ['javascript', 'v8', 'performance'],
      highlights: [{ text: 'generational hypothesis', note: 'Young generation collection' }]
    }
  ];

  // 1. Search by title
  const rTitle = searchArticles(dataset, 'Distributed');
  assert(rTitle.length === 1 && rTitle[0].id === 'a1', 'Finds article by title match');

  // 2. Search by author
  const rAuthor = searchArticles(dataset, 'Rachel');
  assert(rAuthor.length === 1 && rAuthor[0].id === 'a2', 'Finds article by author byline');

  // 3. Search by domain
  const rDomain = searchArticles(dataset, 'v8.dev');
  assert(rDomain.length === 1 && rDomain[0].id === 'a3', 'Finds article by domain');

  // 4. Search by tag
  const rTag = searchArticles(dataset, 'frontend');
  assert(rTag.length === 1 && rTag[0].id === 'a2', 'Finds article by tag');

  // 5. Search by personal note
  const rNote = searchArticles(dataset, 'Paxos');
  assert(rNote.length === 1 && rNote[0].id === 'a1', 'Finds article by user note');

  // 6. Search by highlight note
  const rHlNote = searchArticles(dataset, 'Young generation');
  assert(rHlNote.length === 1 && rHlNote[0].id === 'a3', 'Finds article by highlight annotation');

  // 7. Case-insensitivity & multi-token search
  const rMulti = searchArticles(dataset, 'systems lamport');
  assert(rMulti.length === 1 && rMulti[0].id === 'a1', 'Multi-token search matches across title and author');

  // 8. Empty query returns full list
  const rEmpty = searchArticles(dataset, '');
  assert(rEmpty.length === 3, 'Empty query returns entire collection');

  // 9. Unique Tag Extraction
  const tags = extractUniqueTags(dataset);
  assert(tags.length === 9, 'Extracts 9 unique tags across dataset');
  assert(tags.some(t => t.tag === 'distributed'), 'Tag list contains "distributed"');
  assert(tags.some(t => t.tag === 'javascript'), 'Tag list contains "javascript"');

  // 10. Backup Export Schema
  await dbClearArticles();
  await dbSaveArticle(dataset[0]);
  await dbSaveArticle(dataset[1]);

  const exported = await exportLibraryData();
  assert(exported.version === 1, 'Exported backup has version 1');
  assert(Array.isArray(exported.articles), 'Exported backup contains articles array');
  assert(exported.articles.length === 2, 'Exported backup contains 2 articles');
  assert(Boolean(exported.exportedAt), 'Exported backup includes timestamp');

  // 11. Import Validation
  const validCheck = validateImportJSON(exported);
  assert(validCheck.valid === true, 'validateImportJSON approves valid backup');
  assert(validCheck.preview.articleCount === 2, 'Preview identifies 2 articles');

  const invalidJson = validateImportJSON('malformed { json');
  assert(invalidJson.valid === false, 'Rejects malformed JSON string');

  const missingVer = validateImportJSON({ articles: [] });
  assert(missingVer.valid === false, 'Rejects payload missing version');

  const missingArts = validateImportJSON({ version: 1 });
  assert(missingArts.valid === false, 'Rejects payload missing articles array');

  // 12. Import Execution (Merge vs Replace)
  await dbClearArticles();
  await removeLocalStorage('readease_library_index');

  const mergeResult = await importLibraryData({
    data: {
      version: 1,
      articles: [dataset[0], dataset[2]]
    },
    mode: 'merge'
  });

  assert(mergeResult.importedCount === 2, 'Imports 2 articles via merge');
  const indexAfterMerge = await getLibraryIndex();
  assert(indexAfterMerge.length === 2, 'Library index reflects 2 imported articles');

  // Replace mode
  const replaceResult = await importLibraryData({
    data: {
      version: 1,
      articles: [dataset[1]]
    },
    mode: 'replace'
  });

  assert(replaceResult.importedCount === 1, 'Imports 1 article via replace');
  const indexAfterReplace = await getLibraryIndex();
  assert(indexAfterReplace.length === 1 && indexAfterReplace[0].id === 'a2', 'Replace mode clears previous articles and sets new index');

  console.log(`Search & Backup Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
