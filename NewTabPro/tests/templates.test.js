/**
 * NewTab Pro - Workspace Templates Unit Tests
 */

import { DASHBOARD_TEMPLATES, applyTemplateToState } from '../modules/templates.js';
import { getDefaultState } from '../modules/storage.js';

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

console.log('\n--- Running Workspace Templates Tests ---');

// 1. Template Registry
const templateKeys = ['default', 'minimalist', 'developer', 'student', 'habits', 'executive'];
for (const key of templateKeys) {
  const tpl = DASHBOARD_TEMPLATES[key];
  assert(Boolean(tpl), `Template "${key}" exists`);
  assert(typeof tpl.name === 'string', `Template "${key}" has display name`);
  assert(typeof tpl.theme === 'string', `Template "${key}" defines theme`);
  assert(typeof tpl.widgets === 'object', `Template "${key}" defines widget visibility`);
}

// 2. Applying Zen Minimalist Template
const initial = getDefaultState();
const zen = applyTemplateToState(initial, 'minimalist');
assert(zen.preferences.theme === 'minimal', 'Zen template sets minimal theme');
assert(zen.preferences.backgroundPreset === 'pure-dark', 'Zen template sets pure-dark background');

const zenWidgets = new Map(zen.widgets.map(w => [w.id, w.enabled]));
assert(zenWidgets.get('clock') === true, 'Clock enabled in Zen template');
assert(zenWidgets.get('search') === true, 'Search enabled in Zen template');
assert(zenWidgets.get('focusTimer') === true, 'Focus timer enabled in Zen template');
assert(zenWidgets.get('shortcuts') === false, 'Shortcuts disabled in Zen template');
assert(zenWidgets.get('tasks') === false, 'Tasks disabled in Zen template');

// 3. Applying Developer Template with Shortcut Replacements
const dev = applyTemplateToState(initial, 'developer', true);
assert(dev.preferences.theme === 'aurora', 'Developer template sets aurora theme');
assert(dev.shortcuts.some(sc => sc.title === 'GitHub'), 'Developer template populates GitHub shortcut');
assert(dev.shortcuts.some(sc => sc.title === 'Stack Overflow'), 'Developer template populates StackOverflow shortcut');

// 4. Applying Student Template
const student = applyTemplateToState(initial, 'student', false);
assert(student.preferences.theme === 'light', 'Student template sets light theme');
const studentWidgets = new Map(student.widgets.map(w => [w.id, w.enabled]));
assert(studentWidgets.get('calculator') === true, 'Calculator enabled for students');
assert(studentWidgets.get('focusTimer') === true, 'Pomodoro timer enabled for students');

console.log(`Templates Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
