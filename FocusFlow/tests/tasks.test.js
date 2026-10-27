/**
 * FocusFlow - Task Management Unit Tests
 */

import assert from 'node:assert';
import {
  TASK_PRIORITIES,
  TASK_FILTERS,
  validateTaskInput,
  createTask,
  updateTask,
  toggleTaskCompletion,
  incrementTaskSession,
  deleteTask,
  filterTasks,
  reorderTask
} from '../modules/tasks.js';

export function run() {
  console.log('🧪 Testing Tasks Module...');

  // 1. Validation
  const valid = validateTaskInput({ title: 'Finish Math Homework', priority: 'high', estimatedSessions: 3 });
  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.sanitized.title, 'Finish Math Homework');
  assert.strictEqual(valid.sanitized.priority, 'high');
  assert.strictEqual(valid.sanitized.estimatedSessions, 3);

  const empty = validateTaskInput({ title: '   ' });
  assert.strictEqual(empty.valid, false);

  const fallbackPrio = validateTaskInput({ title: 'Read Book', priority: 'unknown' });
  assert.strictEqual(fallbackPrio.sanitized.priority, TASK_PRIORITIES.MEDIUM);

  // 2. Creation
  const now = 1700000000000;
  const task1 = createTask({ title: 'Write Report', priority: 'high' }, now);
  assert.ok(task1.id.startsWith('task_'));
  assert.strictEqual(task1.title, 'Write Report');
  assert.strictEqual(task1.completed, false);
  assert.strictEqual(task1.completedSessions, 0);
  assert.strictEqual(task1.createdAt, now);

  // 3. Toggle Completion
  const t2 = createTask({ title: 'Fix Bug' }, now);
  let taskList = [task1, t2];

  taskList = toggleTaskCompletion(taskList, task1.id, now + 5000);
  const foundTask1 = taskList.find(t => t.id === task1.id);
  assert.strictEqual(foundTask1.completed, true);
  assert.strictEqual(foundTask1.completedAt, now + 5000);

  // Toggle back to pending
  taskList = toggleTaskCompletion(taskList, task1.id, now + 10000);
  assert.strictEqual(taskList.find(t => t.id === task1.id).completed, false);
  assert.strictEqual(taskList.find(t => t.id === task1.id).completedAt, null);

  // 4. Increment Task Sessions
  taskList = incrementTaskSession(taskList, t2.id);
  assert.strictEqual(taskList.find(t => t.id === t2.id).completedSessions, 1);
  taskList = incrementTaskSession(taskList, t2.id);
  assert.strictEqual(taskList.find(t => t.id === t2.id).completedSessions, 2);

  // 5. Update Task
  taskList = updateTask(taskList, t2.id, { title: 'Fix Critical Production Bug', priority: 'high' });
  assert.strictEqual(taskList.find(t => t.id === t2.id).title, 'Fix Critical Production Bug');
  assert.strictEqual(taskList.find(t => t.id === t2.id).priority, 'high');

  // 6. Delete Task
  taskList = deleteTask(taskList, task1.id);
  assert.strictEqual(taskList.length, 1);
  assert.strictEqual(taskList[0].id, t2.id);

  // 7. Filter Tasks
  const itemA = { id: 'a', title: 'A', completed: false };
  const itemB = { id: 'b', title: 'B', completed: true };
  const itemC = { id: 'c', title: 'C', completed: false };
  const testItems = [itemA, itemB, itemC];

  assert.strictEqual(filterTasks(testItems, TASK_FILTERS.ALL).length, 3);
  assert.strictEqual(filterTasks(testItems, TASK_FILTERS.PENDING).length, 2);
  assert.strictEqual(filterTasks(testItems, TASK_FILTERS.COMPLETED).length, 1);

  // 8. Reorder Tasks
  const reordered = reorderTask(testItems, 'c', 'up');
  assert.deepStrictEqual(reordered.map(x => x.id), ['a', 'c', 'b']);

  // Move top item up (out of bounds check)
  const unchanged = reorderTask(reordered, 'a', 'up');
  assert.deepStrictEqual(unchanged.map(x => x.id), ['a', 'c', 'b']);

  console.log('✅ All Tasks tests passed!');
}
