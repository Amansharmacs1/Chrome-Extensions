/**
 * WebNotes — Search & Filter Module Tests
 */

import {
  searchNotes,
  searchHighlights,
  filterNotes,
  sortNotes
} from '../scripts/search.js';

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

function runTests() {
  console.log('Testing WebNotes Search & Filter Module...');

  const sampleNotes = [
    {
      id: 'n1',
      title: 'JavaScript Async/Await Patterns',
      body: 'Always wrap in try/catch or handle promise rejection properly.',
      scope: 'page',
      pageUrl: 'https://javascript.info/async-await',
      domain: 'javascript.info',
      pageTitle: 'Async/await - JavaScript Info',
      tags: ['javascript', 'promises', 'async'],
      isFavorite: true,
      isPinned: false,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-03T10:00:00.000Z'
    },
    {
      id: 'n2',
      title: 'CSS Grid Layout Guide',
      body: 'grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))',
      scope: 'domain',
      pageUrl: 'https://css-tricks.com/snippets/css/complete-guide-grid/',
      domain: 'css-tricks.com',
      pageTitle: 'A Complete Guide to CSS Grid | CSS-Tricks',
      tags: ['css', 'layout', 'design'],
      isFavorite: false,
      isPinned: true,
      createdAt: '2026-01-02T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z'
    },
    {
      id: 'n3',
      title: 'Chrome MV3 Service Worker Gotchas',
      body: 'Remember service workers are ephemeral and will terminate when idle.',
      scope: 'page',
      pageUrl: 'https://developer.chrome.com/docs/extensions/mv3/service_workers/',
      domain: 'developer.chrome.com',
      pageTitle: 'Manage events with service workers - Chrome Developers',
      tags: ['chrome', 'extension', 'mv3', 'javascript'],
      isFavorite: true,
      isPinned: false,
      createdAt: '2026-01-04T10:00:00.000Z',
      updatedAt: '2026-01-04T10:00:00.000Z'
    }
  ];

  const sampleHighlights = [
    {
      id: 'h1',
      selectedText: 'The await operator is used to wait for a Promise and get its fulfillment value.',
      userNote: 'MDN definition of await',
      sourceUrl: 'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Operators/await',
      sourceTitle: 'await - JavaScript | MDN',
      createdAt: '2026-01-01T10:00:00.000Z'
    },
    {
      id: 'h2',
      selectedText: 'Extensions Manifest V3 moves away from background pages to service workers.',
      userNote: 'Architecture note',
      sourceUrl: 'https://developer.chrome.com/docs/extensions/mv3/intro/',
      sourceTitle: 'Welcome to Manifest V3',
      createdAt: '2026-01-02T10:00:00.000Z'
    }
  ];

  // 1. searchNotes
  assert(searchNotes(sampleNotes, '').length === 3, 'Empty query returns all notes');
  assert(searchNotes(sampleNotes, null).length === 3, 'Null query returns all notes');
  assert(searchNotes(sampleNotes, '   ').length === 3, 'Whitespace query returns all notes');

  // Search by title
  const titleSearch = searchNotes(sampleNotes, 'Async');
  assert(titleSearch.length === 1 && titleSearch[0].id === 'n1', 'searchNotes matches in title');

  // Search by body
  const bodySearch = searchNotes(sampleNotes, 'ephemeral');
  assert(bodySearch.length === 1 && bodySearch[0].id === 'n3', 'searchNotes matches in body');

  // Search by domain
  const domainSearch = searchNotes(sampleNotes, 'css-tricks');
  assert(domainSearch.length === 1 && domainSearch[0].id === 'n2', 'searchNotes matches in domain');

  // Search by tag
  const tagSearch = searchNotes(sampleNotes, 'javascript');
  assert(tagSearch.length === 2, 'searchNotes matches in tags array');

  // Case insensitivity
  const caseSearch = searchNotes(sampleNotes, 'CHROME');
  assert(caseSearch.length === 1 && caseSearch[0].id === 'n3', 'searchNotes is case-insensitive');

  // 2. searchHighlights
  assert(searchHighlights(sampleHighlights, '').length === 2, 'Empty highlight query returns all');
  const quoteSearch = searchHighlights(sampleHighlights, 'fulfillment');
  assert(quoteSearch.length === 1 && quoteSearch[0].id === 'h1', 'searchHighlights matches selectedText');
  const userNoteSearch = searchHighlights(sampleHighlights, 'architecture');
  assert(userNoteSearch.length === 1 && userNoteSearch[0].id === 'h2', 'searchHighlights matches userNote');
  const titleSearchH = searchHighlights(sampleHighlights, 'manifest');
  assert(titleSearchH.length === 1 && titleSearchH[0].id === 'h2', 'searchHighlights matches sourceTitle');

  // 3. filterNotes
  // Scope filter
  assert(filterNotes(sampleNotes, { scope: 'domain' }).length === 1, 'filterNotes filters by scope');
  assert(filterNotes(sampleNotes, { scope: 'page' }).length === 2, 'filterNotes filters by page scope');

  // Domain filter
  assert(filterNotes(sampleNotes, { domain: 'javascript.info' }).length === 1, 'filterNotes filters by domain');

  // PageUrl filter
  assert(filterNotes(sampleNotes, { pageUrl: 'https://css-tricks.com/snippets/css/complete-guide-grid/' }).length === 1, 'filterNotes filters by exact pageUrl');

  // Tag filter
  assert(filterNotes(sampleNotes, { tag: 'layout' }).length === 1, 'filterNotes filters by tag');
  assert(filterNotes(sampleNotes, { tag: 'JAVASCRIPT' }).length === 2, 'filterNotes tag matching is case-insensitive');

  // Favorites filter
  assert(filterNotes(sampleNotes, { favoritesOnly: true }).length === 2, 'filterNotes filters favoritesOnly');

  // Pinned filter
  assert(filterNotes(sampleNotes, { pinnedOnly: true }).length === 1, 'filterNotes filters pinnedOnly');

  // 4. sortNotes
  // Pinned notes always come first
  const sortedUpdated = sortNotes(sampleNotes, 'updatedAt', 'desc');
  assert(sortedUpdated[0].id === 'n2', 'Pinned notes always sort first regardless of date');
  assert(sortedUpdated[1].id === 'n3', 'Second note is newest updated among unpinned');

  // Sort by title asc
  const sortedTitle = sortNotes(sampleNotes, 'title', 'asc');
  assert(sortedTitle[0].id === 'n2', 'Pinned notes still first in title sort');
  // Among non-pinned: 'Chrome MV3...' ('n3') comes before 'JavaScript Async...' ('n1')
  assert(sortedTitle[1].id === 'n3' && sortedTitle[2].id === 'n1', 'Unpinned notes sorted alphabetically by title');

  // Sort by createdAt asc
  const sortedCreatedAsc = sortNotes(sampleNotes, 'createdAt', 'asc');
  assert(sortedCreatedAsc[0].id === 'n2', 'Pinned notes remain first');
  assert(sortedCreatedAsc[1].id === 'n1', 'Oldest unpinned note comes first in asc order');

  console.log(`Search & Filter Tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runTests();
