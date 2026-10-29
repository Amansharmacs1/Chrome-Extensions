/**
 * NewTab Pro - Shortcuts & Quick Links Unit Tests
 */

import {
  getInitials,
  getDeterministicColor,
  createShortcut,
  updateShortcut,
  removeShortcut,
  reorderShortcut,
  PALETTE_COLORS
} from '../modules/shortcuts.js';

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

console.log('\n--- Running Shortcuts Tests ---');

// 1. Initials Generation
assert(getInitials('GitHub') === 'GI', 'Derives 2-letter prefix for single word');
assert(getInitials('Google Docs') === 'GD', 'Derives initials from multi-word title');
assert(getInitials('X') === 'X', 'Handles single character title');
assert(getInitials('', 'https://reddit.com') === 'RE', 'Falls back to domain when title is empty');

// 2. Deterministic Colors
const c1 = getDeterministicColor('GitHub');
const c2 = getDeterministicColor('GitHub');
assert(c1 === c2, 'Deterministic color is reproducible for same seed');
assert(PALETTE_COLORS.includes(c1), 'Color belongs to approved palette');

// 3. Shortcut Creation
const sc1 = createShortcut({
  title: ' Hacker News ',
  url: 'news.ycombinator.com',
  color: '#FF6600',
  sortOrder: 0
});

assert(sc1.id.startsWith('sc-'), 'Generates unique shortcut ID');
assert(sc1.title === 'Hacker News', 'Trims title');
assert(sc1.url === 'https://news.ycombinator.com/', 'Normalizes URL with HTTPS');
assert(sc1.color === '#FF6600', 'Applies custom color');
assert(sc1.sortOrder === 0, 'Assigns sort order');

// 4. Invalid URL rejection
let threw = false;
try {
  createShortcut({ title: 'Bad', url: 'javascript:alert(1)' });
} catch {
  threw = true;
}
assert(threw, 'Throws error when attempting to create shortcut with invalid or dangerous URL');

// 5. Updating Shortcuts
const list = [sc1];
const updated = updateShortcut(list, sc1.id, {
  title: 'HN Frontpage',
  url: 'https://news.ycombinator.com/news'
});
assert(updated[0].title === 'HN Frontpage', 'Updates shortcut title');
assert(updated[0].url === 'https://news.ycombinator.com/news', 'Updates shortcut URL');

// 6. Reordering Shortcuts
const sc2 = createShortcut({ title: 'Reddit', url: 'https://reddit.com', sortOrder: 1 });
const sc3 = createShortcut({ title: 'MDN', url: 'https://developer.mozilla.org', sortOrder: 2 });
const initialList = [sc1, sc2, sc3];

const movedUp = reorderShortcut(initialList, sc2.id, 'up');
assert(movedUp[0].id === sc2.id, 'Moves item up in order');
assert(movedUp[0].sortOrder === 0 && movedUp[1].sortOrder === 1, 'Recalculates sequential sortOrders');

const movedDown = reorderShortcut(movedUp, sc2.id, 'down');
assert(movedDown[1].id === sc2.id, 'Moves item back down');

// 7. Removing Shortcuts
const pruned = removeShortcut(movedDown, sc2.id);
assert(pruned.length === 2, 'Removes requested shortcut');
assert(!pruned.some(s => s.id === sc2.id), 'Shortcut ID is no longer present');
assert(pruned[0].sortOrder === 0 && pruned[1].sortOrder === 1, 'Sort orders reindexed sequentially');

console.log(`Shortcuts Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
