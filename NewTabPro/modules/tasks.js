/**
 * NewTab Pro - Task & Productivity Engine
 * Handles daily task creation, completion toggles, filtering, and progress tracking.
 */

/**
 * Returns current local date key formatted as YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates a new task record
 * @param {string} title
 * @param {string} [dateKey]
 * @returns {Object}
 */
export function createTask(title, dateKey = getDateKey()) {
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) {
    throw new Error('Task title cannot be empty.');
  }

  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: cleanTitle,
    completed: false,
    createdAt: Date.now(),
    completedAt: null,
    dateKey: dateKey || getDateKey()
  };
}

/**
 * Toggles completion status of a task
 * @param {Array} tasks
 * @param {string} id
 * @returns {Array}
 */
export function toggleTask(tasks, id) {
  return tasks.map(t => {
    if (t.id !== id) return t;
    const completed = !t.completed;
    return {
      ...t,
      completed,
      completedAt: completed ? Date.now() : null
    };
  });
}

/**
 * Updates title of a task
 * @param {Array} tasks
 * @param {string} id
 * @param {string} newTitle
 * @returns {Array}
 */
export function updateTaskTitle(tasks, id, newTitle) {
  const clean = (newTitle || '').trim();
  if (!clean) return tasks;

  return tasks.map(t => {
    if (t.id !== id) return t;
    return { ...t, title: clean };
  });
}

/**
 * Removes a task by ID
 * @param {Array} tasks
 * @param {string} id
 * @returns {Array}
 */
export function deleteTask(tasks, id) {
  return tasks.filter(t => t.id !== id);
}

/**
 * Clears completed tasks for a specific dateKey or all completed tasks
 * @param {Array} tasks
 * @param {string} [dateKey]
 * @returns {Array}
 */
export function clearCompletedTasks(tasks, dateKey = null) {
  if (dateKey) {
    return tasks.filter(t => !(t.completed && t.dateKey === dateKey));
  }
  return tasks.filter(t => !t.completed);
}

/**
 * Filters tasks by filter mode ('all', 'pending', 'completed') and optional dateKey
 * @param {Array} tasks
 * @param {'all'|'pending'|'completed'} filter
 * @param {string} [dateKey]
 * @returns {Array}
 */
export function filterTasks(tasks, filter = 'all', dateKey = null) {
  let list = Array.isArray(tasks) ? tasks : [];
  if (dateKey) {
    list = list.filter(t => t.dateKey === dateKey);
  }

  if (filter === 'pending') {
    return list.filter(t => !t.completed);
  }
  if (filter === 'completed') {
    return list.filter(t => t.completed);
  }
  return list;
}

/**
 * Calculates progress statistics for tasks
 * @param {Array} tasks
 * @param {string} [dateKey]
 * @returns {{ total: number, completed: number, pending: number, percentage: number }}
 */
export function calculateProgress(tasks, dateKey = null) {
  const list = dateKey
    ? (Array.isArray(tasks) ? tasks.filter(t => t.dateKey === dateKey) : [])
    : (Array.isArray(tasks) ? tasks : []);

  const total = list.length;
  const completed = list.filter(t => t.completed).length;
  const pending = total - completed;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    pending,
    percentage
  };
}
