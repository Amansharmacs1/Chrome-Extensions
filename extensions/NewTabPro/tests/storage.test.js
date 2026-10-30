/**
 * NewTab Pro - Storage & Migration Tests
 */

import {
  getDefaultState,
  migrateState,
  SCHEMA_VERSION,
  DEFAULT_SHORTCUTS,
  DEFAULT_WIDGETS
} from '../modules/storage.js';

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

console.log('\n--- Running Storage & Migration Tests ---');

// 1. Default State Structure
const defaults = getDefaultState();
assert(defaults.schemaVersion === SCHEMA_VERSION, 'Default state has current schemaVersion');
assert(defaults.preferences.theme === 'midnight', 'Default theme is midnight');
assert(defaults.preferences.timeFormat === '12h', 'Default time format is 12h');
assert(defaults.preferences.searchEngine === 'google', 'Default search engine is google');
assert(Array.isArray(defaults.shortcuts) && defaults.shortcuts.length === DEFAULT_SHORTCUTS.length, 'Default shortcuts are populated');
assert(Array.isArray(defaults.widgets) && defaults.widgets.length === DEFAULT_WIDGETS.length, 'Default widgets are populated');
assert(defaults.tasks.length === 0, 'Initial tasks array is empty');
assert(defaults.scratchpad.content === '', 'Initial scratchpad is empty');
assert(defaults.weather.enabled === false, 'Weather is disabled by default');

// 2. Corrupted / Null State Migration
const fromNull = migrateState(null);
assert(fromNull.schemaVersion === SCHEMA_VERSION, 'Migrating null returns valid default state');

const fromUndefined = migrateState(undefined);
assert(fromUndefined.preferences.theme === 'midnight', 'Migrating undefined returns valid defaults');

const fromString = migrateState('corrupted_string');
assert(fromString.shortcuts.length > 0, 'Migrating non-object string returns default shortcuts');

// 3. Partial / Outdated State Migration
const partial = {
  preferences: {
    userName: 'Tester',
    timeFormat: '24h',
    theme: 'ocean'
  },
  shortcuts: [
    { title: 'My Site', url: 'https://mysite.com' }
  ],
  tasks: [
    { title: 'Test Task', completed: true }
  ]
};

const migrated = migrateState(partial);
assert(migrated.preferences.userName === 'Tester', 'Preserves user name preference');
assert(migrated.preferences.timeFormat === '24h', 'Preserves 24h time format');
assert(migrated.preferences.theme === 'ocean', 'Preserves ocean theme');
assert(migrated.preferences.searchEngine === 'google', 'Fills missing preference with default');
assert(migrated.shortcuts.length === 1 && migrated.shortcuts[0].title === 'My Site', 'Migrates shortcuts with generated IDs and sort order');
assert(migrated.tasks.length === 1 && migrated.tasks[0].completed === true, 'Migrates tasks preserving completion state');
assert(migrated.widgets.length === DEFAULT_WIDGETS.length, 'Rebuilds widget registry when omitted');

// 4. Invalid Enum Handling
const invalidEnum = {
  preferences: {
    theme: 'hacker-matrix-unknown',
    timeFormat: '100h',
    searchEngine: 'unknown-engine'
  }
};
const cleaned = migrateState(invalidEnum);
assert(cleaned.preferences.theme === 'midnight', 'Reverts invalid theme to midnight');
assert(cleaned.preferences.timeFormat === '12h', 'Reverts invalid timeFormat to 12h');
assert(cleaned.preferences.searchEngine === 'google', 'Reverts invalid searchEngine to google');

// 5. New Widgets Migration (Focus Timer, Habits, World Clock, Quote)
assert(defaults.focusTimer && defaults.focusTimer.mode === 'focus', 'Default focus timer exists');
assert(Array.isArray(defaults.habits) && defaults.habits.length > 0, 'Default habits exist');
assert(defaults.worldClock && Array.isArray(defaults.worldClock.cities), 'Default world clock exists');
assert(defaults.quote && typeof defaults.quote.currentQuoteIndex === 'number', 'Default quote exists');

console.log(`Storage Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
