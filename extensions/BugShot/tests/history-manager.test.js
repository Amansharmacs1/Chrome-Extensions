/**
 * BugShot - History Manager Tests
 */

import { HistoryManager } from '../editor/history-manager.js';
import { fileURLToPath } from 'url';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

export async function runHistoryTests() {
  console.log('\n--- Running History Manager Tests ---');

  const history = new HistoryManager(5);

  assert(!history.canUndo(), 'Initially cannot undo');
  assert(!history.canRedo(), 'Initially cannot redo');

  // Push baseline initial state
  history.push([]);
  assert(!history.canUndo(), 'Cannot undo with only 1 state (baseline)');

  // Push shape 1
  history.push([{ id: 1, type: 'arrow' }]);
  assert(history.canUndo(), 'Can undo after second state pushed');
  assert(!history.canRedo(), 'Cannot redo before any undo');

  // Push shape 2
  history.push([{ id: 1, type: 'arrow' }, { id: 2, type: 'rect' }]);
  assert(history.undoStack.length === 3, 'Undo stack has 3 states');

  // Undo
  const stateAfterUndo = history.undo();
  assert(stateAfterUndo && stateAfterUndo.length === 1, 'Undo restored previous state of length 1');
  assert(stateAfterUndo[0].id === 1, 'Restored state has id 1');
  assert(history.canRedo(), 'Can redo after undoing');

  // Redo
  const stateAfterRedo = history.redo();
  assert(stateAfterRedo && stateAfterRedo.length === 2, 'Redo reapplied state of length 2');
  assert(!history.canRedo(), 'Cannot redo after reaching top of redo stack');

  // Invalidation of redo stack on new action
  history.undo();
  assert(history.canRedo(), 'Can redo before new action');
  history.push([{ id: 3, type: 'circle' }]);
  assert(!history.canRedo(), 'New push invalidates redo stack');

  // Max capacity enforcement
  const capHistory = new HistoryManager(3);
  capHistory.push(1);
  capHistory.push(2);
  capHistory.push(3);
  capHistory.push(4);
  capHistory.push(5);
  assert(capHistory.undoStack.length === 3, 'Max capacity is strictly enforced at 3 items');
  assert(capHistory.undoStack[2] === 5, 'Top of stack is most recent item (5)');

  // Callback notification
  let notificationCount = 0;
  let lastNotification = null;
  history.setOnChange((status) => {
    notificationCount++;
    lastNotification = status;
  });
  history.push([{ id: 99 }]);
  assert(notificationCount > 0, 'Callback is notified on push');
  assert(typeof lastNotification?.canUndo === 'boolean', 'Notification provides canUndo');
  assert(typeof lastNotification?.canRedo === 'boolean', 'Notification provides canRedo');

  // Clear
  history.clear();
  assert(!history.canUndo(), 'Cannot undo after clear');
  assert(!history.canRedo(), 'Cannot redo after clear');

  return { passed, failed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runHistoryTests().then(res => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
