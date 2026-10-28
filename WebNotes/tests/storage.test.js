/**
 * WebNotes — Storage Module Tests
 */

import {
  generateId, now, validateNote, validateHighlight,
  createNote, createHighlight, normalizeTags,
  storageGet, storageSet, storageClear, _resetMemoryStore,
  initializeStorage, getAllNotes, saveNote, updateNote, deleteNote,
  getNotesForPage, getNotesForDomain, getNotesForContext, getNotesByTag,
  toggleFavorite, togglePin,
  getAllHighlights, saveHighlight, deleteHighlight, getHighlightsForPage,
  getAllTags, getStorageStats, getSettings, updateSettings
} from '../scripts/storage.js';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(message);
    console.error(`  FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('Testing WebNotes Storage Module...');
  _resetMemoryStore();

  // 1. generateId
  const id1 = generateId();
  const id2 = generateId();
  assert(typeof id1 === 'string' && id1.length > 5, 'generateId returns non-empty string');
  assert(id1 !== id2, 'generateId produces unique ids');

  // 2. now
  const t = now();
  assert(!isNaN(Date.parse(t)), 'now() returns valid ISO date string');

  // 3. normalizeTags
  assert(JSON.stringify(normalizeTags(['Tech', ' AI ', 'tech', 'CODE', ''])) === JSON.stringify(['tech', 'ai', 'code']), 'normalizeTags trims, lowercases, and deduplicates');
  assert(JSON.stringify(normalizeTags(null)) === '[]', 'normalizeTags handles null gracefully');
  assert(JSON.stringify(normalizeTags(['  '])) === '[]', 'normalizeTags drops whitespace-only tags');

  // 4. validateNote
  assert(validateNote(createNote({ title: 'T', body: 'B' })), 'createNote produces valid note');
  assert(!validateNote(null), 'validateNote rejects null');
  assert(!validateNote({}), 'validateNote rejects empty object');
  assert(!validateNote({ id: '1', body: 'b', createdAt: '2026-01-01', scope: 'invalid' }), 'validateNote rejects invalid scope');

  // 5. validateHighlight
  const validH = createHighlight({ selectedText: 'Sample quote', sourceUrl: 'https://example.com' });
  assert(validateHighlight(validH), 'createHighlight produces valid highlight');
  assert(!validateHighlight(null), 'validateHighlight rejects null');
  assert(!validateHighlight({ id: '1' }), 'validateHighlight rejects incomplete highlight');

  // 6. initializeStorage & Settings
  _resetMemoryStore();
  await initializeStorage();
  const settings = await getSettings();
  assert(settings.theme === 'dark', 'initializeStorage sets default dark theme');
  assert(settings.defaultScope === 'page', 'default scope is page');

  await updateSettings({ theme: 'light', defaultScope: 'domain' });
  const updatedSettings = await getSettings();
  assert(updatedSettings.theme === 'light' && updatedSettings.defaultScope === 'domain', 'updateSettings updates settings correctly');

  // 7. Note CRUD
  _resetMemoryStore();
  await initializeStorage();

  const noteA = createNote({
    title: 'Note 1',
    body: 'Content for page A',
    pageUrl: 'https://developer.mozilla.org/en-US/docs/Web/API',
    domain: 'developer.mozilla.org',
    pageTitle: 'MDN Web Docs',
    tags: ['docs', 'api', 'web'],
    scope: 'page'
  });
  await saveNote(noteA);

  const noteB = createNote({
    title: 'Note 2',
    body: 'Domain wide note',
    pageUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    domain: 'developer.mozilla.org',
    pageTitle: 'JavaScript | MDN',
    tags: ['js', 'docs'],
    scope: 'domain'
  });
  await saveNote(noteB);

  const noteC = createNote({
    title: 'GitHub Note',
    body: 'Repo research',
    pageUrl: 'https://github.com/trending',
    domain: 'github.com',
    pageTitle: 'Trending Repositories',
    tags: ['github', 'open-source'],
    scope: 'page'
  });
  await saveNote(noteC);

  let allNotes = await getAllNotes();
  assert(allNotes.length === 3, 'getAllNotes returns 3 notes');

  // 8. Page & Domain Queries
  const mdnPageNotes = await getNotesForPage('https://developer.mozilla.org/en-US/docs/Web/API');
  assert(mdnPageNotes.length === 1, 'getNotesForPage returns exactly 1 page-scoped note');

  const mdnContextNotes = await getNotesForContext('https://developer.mozilla.org/en-US/docs/Web/API', 'developer.mozilla.org');
  assert(mdnContextNotes.length === 2, 'getNotesForContext returns page note + domain note');

  const mdnDomainNotes = await getNotesForDomain('developer.mozilla.org');
  assert(mdnDomainNotes.length === 1, 'getNotesForDomain returns domain-scoped notes for developer.mozilla.org');

  // 9. Tag queries
  const docsNotes = await getNotesByTag('docs');
  assert(docsNotes.length === 2, 'getNotesByTag returns matching notes');

  const tagsList = await getAllTags();
  assert(tagsList.includes('docs') && tagsList.includes('github') && tagsList.includes('js'), 'getAllTags lists all tags across notes');

  // 10. Update, Favorite, Pin, Delete
  const updatedNote = await updateNote(noteA.id, { title: 'Updated Title' });
  assert(updatedNote.title === 'Updated Title', 'updateNote updates title');

  const favNote = await toggleFavorite(noteA.id);
  assert(favNote.isFavorite === true, 'toggleFavorite sets isFavorite to true');
  const unfavNote = await toggleFavorite(noteA.id);
  assert(unfavNote.isFavorite === false, 'toggleFavorite toggles isFavorite back to false');

  const pinnedNote = await togglePin(noteB.id);
  assert(pinnedNote.isPinned === true, 'togglePin sets isPinned to true');

  const deleteSuccess = await deleteNote(noteC.id);
  assert(deleteSuccess === true, 'deleteNote deletes note successfully');
  allNotes = await getAllNotes();
  assert(allNotes.length === 2, 'getAllNotes returns 2 notes after deletion');

  // 11. Highlight CRUD
  const h1 = createHighlight({
    selectedText: 'JavaScript is a scripting language',
    userNote: 'Key definition',
    sourceUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    sourceTitle: 'JavaScript | MDN'
  });
  await saveHighlight(h1);

  const h2 = createHighlight({
    selectedText: 'Python is dynamically typed',
    sourceUrl: 'https://python.org',
    sourceTitle: 'Python'
  });
  await saveHighlight(h2);

  let highlights = await getAllHighlights();
  assert(highlights.length === 2, 'getAllHighlights returns 2 highlights');

  const mdnHighlights = await getHighlightsForPage('https://developer.mozilla.org/en-US/docs/Web/JavaScript');
  assert(mdnHighlights.length === 1 && mdnHighlights[0].selectedText.includes('JavaScript is a scripting language'), 'getHighlightsForPage returns matching highlight');

  await deleteHighlight(h2.id);
  highlights = await getAllHighlights();
  assert(highlights.length === 1, 'deleteHighlight removes highlight');

  // 12. Storage stats
  const stats = await getStorageStats();
  assert(stats.noteCount === 2, 'stats noteCount is 2');
  assert(stats.highlightCount === 1, 'stats highlightCount is 1');
  assert(stats.pageScopeCount === 1, 'stats pageScopeCount is 1');
  assert(stats.domainScopeCount === 1, 'stats domainScopeCount is 1');
  assert(stats.tagCount > 0, 'stats tagCount > 0');

  console.log(`Storage Tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
