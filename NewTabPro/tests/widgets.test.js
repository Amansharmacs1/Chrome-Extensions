/**
 * NewTab Pro - Customizable Widget Registry Unit Tests
 */

import {
  WIDGET_REGISTRY,
  toggleWidget,
  reorderWidget
} from '../modules/widgets.js';
import { DEFAULT_WIDGETS } from '../modules/storage.js';

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

console.log('\n--- Running Widget Registry Tests ---');

// 1. Registry Requirements
assert(WIDGET_REGISTRY.length === 13, 'All 13 widgets registered in system');
const requiredIds = [
  'clock', 'search', 'shortcuts', 'quickTools', 'tasks',
  'progress', 'habits', 'focusTimer', 'scratchpad',
  'calculator', 'worldClock', 'quote', 'weather'
];
for (const id of requiredIds) {
  const reg = WIDGET_REGISTRY.find(w => w.id === id);
  assert(Boolean(reg), `Widget "${id}" is registered`);
  assert(typeof reg.containerId === 'string', `Widget "${id}" has DOM container ID`);
}

// 2. Toggle Widget State
const initial = JSON.parse(JSON.stringify(DEFAULT_WIDGETS));
const toggledWeather = toggleWidget(initial, 'weather', true);
const weatherItem = toggledWeather.find(w => w.id === 'weather');
assert(weatherItem.enabled === true, 'Explicitly enables weather widget');

const toggledClock = toggleWidget(toggledWeather, 'clock');
const clockItem = toggledClock.find(w => w.id === 'clock');
assert(clockItem.enabled === false, 'Toggles clock widget to false');

// 3. Reorder Widgets
const reorderedDown = reorderWidget(initial, 'clock', 'down');
assert(reorderedDown[0].id === 'search', 'Clock moved down, search is first');
assert(reorderedDown[1].id === 'clock', 'Clock is at index 1');

const reorderedUp = reorderWidget(reorderedDown, 'clock', 'up');
assert(reorderedUp[0].id === 'clock', 'Clock moved back up to first place');

// Edge cases: cannot move up from first position
const cantMoveUp = reorderWidget(initial, 'clock', 'up');
assert(cantMoveUp[0].id === 'clock', 'Maintains index when moving up at boundary');

console.log(`Widget Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
