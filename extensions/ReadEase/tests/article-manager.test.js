/**
 * ReadEase - Article Manager Unit Tests
 */

import {
  classifyReadingStatus,
  createIndexItem,
  saveArticle,
  getArticle,
  deleteArticle,
  toggleFavorite,
  updateArticleProgress,
  addTag,
  removeTag,
  filterAndSortArticles,
  getLibraryIndex
} from '../scripts/article-manager.js';
import { dbClearArticles, removeLocalStorage } from '../scripts/storage.js';

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

console.log('\n--- Running Article Manager Tests ---');

async function runTests() {
  await dbClearArticles();
  await removeLocalStorage('readease_library_index');

  // 1. Reading Status Classification
  assert(classifyReadingStatus(0) === 'unread', '0% progress classifies as unread');
  assert(classifyReadingStatus(4) === 'unread', '4% progress classifies as unread');
  assert(classifyReadingStatus(10) === 'in-progress', '10% progress classifies as in-progress');
  assert(classifyReadingStatus(50) === 'in-progress', '50% progress classifies as in-progress');
  assert(classifyReadingStatus(90) === 'completed', '90% progress classifies as completed');
  assert(classifyReadingStatus(100) === 'completed', '100% progress classifies as completed');

  // 2. Index Item Generation
  const rawArt = {
    id: 'art-201',
    title: 'Functional Programming in JavaScript',
    url: 'https://js.org/fp',
    siteName: 'js.org',
    byline: 'Dan A.',
    excerpt: 'An exploration of pure functions and monads in modern JavaScript.',
    wordCount: 1200,
    readingTime: 6,
    progress: 45,
    favorite: true,
    tags: ['javascript', 'fp'],
    highlights: [{ id: 'hl-1', text: 'pure functions' }]
  };

  const indexItem = createIndexItem(rawArt);
  assert(indexItem.id === 'art-201', 'Index item contains correct ID');
  assert(indexItem.title === 'Functional Programming in JavaScript', 'Index item contains title');
  assert(indexItem.highlightsCount === 1, 'Index item counts highlights');
  assert(indexItem.status === 'in-progress', 'Index item derives in-progress status');
  assert(indexItem.favorite === true, 'Index item preserves favorite state');

  // 3. Save Article & Index Synchronization
  const saved = await saveArticle(rawArt);
  assert(saved.id === 'art-201', 'saveArticle returns article with ID');

  const loaded = await getArticle('art-201');
  assert(loaded && loaded.byline === 'Dan A.', 'Article loaded from database matches saved record');

  const libraryIndex = await getLibraryIndex();
  assert(libraryIndex.length === 1 && libraryIndex[0].id === 'art-201', 'Library index reflects newly saved article');

  // 4. Favorite Toggle
  const isFav = await toggleFavorite('art-201');
  assert(isFav === false, 'Toggles favorite from true to false');
  const favCheck = await getArticle('art-201');
  assert(favCheck.favorite === false, 'Article in database reflects updated favorite state');

  // 5. Tag Management
  const tagsAfterAdd = await addTag('art-201', 'Functional');
  assert(tagsAfterAdd.includes('functional'), 'Adds normalized lowercase tag');

  // Duplicate prevention
  const tagsAfterDup = await addTag('art-201', 'functional');
  assert(tagsAfterDup.filter(t => t === 'functional').length === 1, 'Prevents duplicate tags');

  const tagsAfterRemove = await removeTag('art-201', 'javascript');
  assert(!tagsAfterRemove.includes('javascript'), 'Removes requested tag');

  // 6. Reading Progress Updates
  await updateArticleProgress('art-201', 95, 1400);
  const updatedProgressArticle = await getArticle('art-201');
  assert(updatedProgressArticle.progress === 95, 'Updates reading progress to 95%');
  assert(updatedProgressArticle.scrollY === 1400, 'Updates scrollY position');
  assert(updatedProgressArticle.status === 'completed', 'Automatically transitions to completed status at 95%');

  // 7. Filtering & Sorting
  const testSet = [
    { id: '1', title: 'Algorithms', status: 'unread', readingTime: 10, savedAt: 1000, lastReadAt: 500, favorite: false, tags: ['cs'] },
    { id: '2', title: 'Data Structures', status: 'in-progress', readingTime: 4, savedAt: 2000, lastReadAt: 2500, favorite: true, tags: ['cs'] },
    { id: '3', title: 'Web Performance', status: 'completed', readingTime: 2, savedAt: 3000, lastReadAt: 3000, favorite: true, tags: ['web'] }
  ];

  const unreadOnly = filterAndSortArticles(testSet, { filter: 'unread' });
  assert(unreadOnly.length === 1 && unreadOnly[0].id === '1', 'Filters unread articles');

  const favOnly = filterAndSortArticles(testSet, { filter: 'favorites' });
  assert(favOnly.length === 2, 'Filters favorites articles (count: 2)');

  const tagFiltered = filterAndSortArticles(testSet, { filter: 'web' });
  assert(tagFiltered.length === 1 && tagFiltered[0].id === '3', 'Filters by custom tag #web');

  const sortedTimeAsc = filterAndSortArticles(testSet, { sort: 'time-asc' });
  assert(sortedTimeAsc[0].id === '3' && sortedTimeAsc[2].id === '1', 'Sorts reading time ascending (2m < 10m)');

  const sortedTitle = filterAndSortArticles(testSet, { sort: 'title-asc' });
  assert(sortedTitle[0].title === 'Algorithms' && sortedTitle[2].title === 'Web Performance', 'Sorts alphabetically A-Z');

  // 8. Delete Article
  const delRes = await deleteArticle('art-201');
  assert(delRes === true, 'deleteArticle returns true');
  const indexAfterDelete = await getLibraryIndex();
  assert(indexAfterDelete.length === 0, 'Library index is empty after deleting article');

  console.log(`Article Manager Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
