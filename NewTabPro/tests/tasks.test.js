/**
 * NewTab Pro - Task & Productivity Unit Tests
 */

import {
  getDateKey,
  createTask,
  toggleTask,
  updateTaskTitle,
  deleteTask,
  clearCompletedTasks,
  filterTasks,
  calculateProgress
} from '../modules/tasks.js';

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

console.log('\n--- Running Tasks & Productivity Tests ---');

// 1. Date Key Formatting
const d = new Date('2026-10-29T12:00:00');
assert(getDateKey(d) === '2026-10-29', 'Formats date key as YYYY-MM-DD');

// 2. Task Creation
const t1 = createTask('Review Pull Request', '2026-10-29');
assert(t1.id.startsWith('task-'), 'Generates valid task ID');
assert(t1.title === 'Review Pull Request', 'Preserves task title');
assert(t1.completed === false, 'New tasks are incomplete by default');
assert(t1.completedAt === null, 'completedAt is initially null');
assert(t1.dateKey === '2026-10-29', 'Assigns correct date key');

let emptyThrew = false;
try {
  createTask('   ');
} catch {
  emptyThrew = true;
}
assert(emptyThrew, 'Rejects empty task title');

// 3. Toggle Completion
const list = [t1];
const toggledOnce = toggleTask(list, t1.id);
assert(toggledOnce[0].completed === true, 'Toggles task to completed');
assert(typeof toggledOnce[0].completedAt === 'number', 'Sets completion timestamp');

const toggledBack = toggleTask(toggledOnce, t1.id);
assert(toggledBack[0].completed === false, 'Toggles task back to incomplete');
assert(toggledBack[0].completedAt === null, 'Resets completedAt to null');

// 4. Update Title
const updated = updateTaskTitle(toggledBack, t1.id, 'Review PR #42');
assert(updated[0].title === 'Review PR #42', 'Updates task title');

// 5. Filtering
const t2 = createTask('Fix bug', '2026-10-29');
const t3 = createTask('Deploy release', '2026-10-29');
const allTasks = [
  { ...t1, completed: true },
  { ...t2, completed: false },
  { ...t3, completed: false },
  createTask('Yesterday task', '2026-10-28')
];

const todayAll = filterTasks(allTasks, 'all', '2026-10-29');
assert(todayAll.length === 3, 'Filters all tasks for today');

const todayPending = filterTasks(allTasks, 'pending', '2026-10-29');
assert(todayPending.length === 2, 'Filters pending tasks for today');

const todayCompleted = filterTasks(allTasks, 'completed', '2026-10-29');
assert(todayCompleted.length === 1 && todayCompleted[0].id === t1.id, 'Filters completed tasks for today');

// 6. Progress Calculation
const p0 = calculateProgress([], '2026-10-29');
assert(p0.total === 0 && p0.percentage === 0, 'Handles zero tasks without division by zero');

const pStats = calculateProgress(allTasks, '2026-10-29');
assert(pStats.total === 3, 'Calculates correct total count');
assert(pStats.completed === 1, 'Calculates correct completed count');
assert(pStats.pending === 2, 'Calculates correct pending count');
assert(pStats.percentage === 33, 'Calculates 33% completion rate rounded');

// 7. Clear Completed
const cleared = clearCompletedTasks(allTasks, '2026-10-29');
assert(cleared.length === 3, 'Removes completed tasks for date');
assert(!cleared.some(t => t.id === t1.id), 'Target completed task removed');

// 8. Delete Task
const remaining = deleteTask(cleared, t2.id);
assert(remaining.length === 2, 'Deletes specific task by ID');

console.log(`Tasks Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
