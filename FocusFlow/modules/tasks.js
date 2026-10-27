/**
 * FocusFlow - Task Management Module
 * Pure business logic for task CRUD, prioritization, progress tracking, and filtering.
 */

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

export const TASK_FILTERS = {
  ALL: 'all',
  PENDING: 'pending',
  COMPLETED: 'completed'
};

/**
 * Validate and sanitize task input
 * @param {Object} input
 * @returns {{ valid: boolean, error?: string, sanitized?: Object }}
 */
export function validateTaskInput(input = {}) {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid task object' };
  }

  const title = String(input.title || '').trim();
  if (!title) {
    return { valid: false, error: 'Task title is required' };
  }
  if (title.length > 200) {
    return { valid: false, error: 'Task title must be under 200 characters' };
  }

  const notes = String(input.notes || '').trim().slice(0, 1000);
  const priority = [TASK_PRIORITIES.LOW, TASK_PRIORITIES.MEDIUM, TASK_PRIORITIES.HIGH].includes(input.priority)
    ? input.priority
    : TASK_PRIORITIES.MEDIUM;

  const estimatedSessions = Math.max(1, Math.min(20, Math.floor(Number(input.estimatedSessions) || 1)));

  return {
    valid: true,
    sanitized: {
      title,
      notes,
      priority,
      estimatedSessions
    }
  };
}

/**
 * Create a new task item
 * @param {Object} input
 * @param {number} now
 * @returns {Object} New task object
 */
export function createTask(input, now = Date.now()) {
  const result = validateTaskInput(input);
  if (!result.valid) {
    throw new Error(result.error);
  }

  return {
    id: `task_${now}_${Math.random().toString(36).substring(2, 7)}`,
    title: result.sanitized.title,
    notes: result.sanitized.notes,
    priority: result.sanitized.priority,
    estimatedSessions: result.sanitized.estimatedSessions,
    completedSessions: 0,
    completed: false,
    createdAt: now,
    completedAt: null
  };
}

/**
 * Update an existing task
 * @param {Array} tasks
 * @param {string} taskId
 * @param {Object} updates
 * @param {number} now
 * @returns {Array} Updated tasks array
 */
export function updateTask(tasks, taskId, updates = {}, now = Date.now()) {
  return tasks.map(task => {
    if (task.id !== taskId) return task;

    const modified = { ...task };

    if (updates.title !== undefined) {
      const title = String(updates.title).trim();
      if (title) modified.title = title.slice(0, 200);
    }

    if (updates.notes !== undefined) {
      modified.notes = String(updates.notes).trim().slice(0, 1000);
    }

    if (updates.priority !== undefined && [TASK_PRIORITIES.LOW, TASK_PRIORITIES.MEDIUM, TASK_PRIORITIES.HIGH].includes(updates.priority)) {
      modified.priority = updates.priority;
    }

    if (updates.estimatedSessions !== undefined) {
      modified.estimatedSessions = Math.max(1, Math.min(20, Math.floor(Number(updates.estimatedSessions) || 1)));
    }

    if (updates.completed !== undefined) {
      const isCompleted = Boolean(updates.completed);
      modified.completed = isCompleted;
      modified.completedAt = isCompleted ? (task.completedAt || now) : null;
    }

    if (updates.completedSessions !== undefined) {
      modified.completedSessions = Math.max(0, Math.floor(Number(updates.completedSessions) || 0));
    }

    return modified;
  });
}

/**
 * Toggle task completion
 * @param {Array} tasks
 * @param {string} taskId
 * @param {number} now
 * @returns {Array}
 */
export function toggleTaskCompletion(tasks, taskId, now = Date.now()) {
  return tasks.map(task => {
    if (task.id !== taskId) return task;
    const completed = !task.completed;
    return {
      ...task,
      completed,
      completedAt: completed ? now : null
    };
  });
}

/**
 * Increment completed sessions count for a task
 * @param {Array} tasks
 * @param {string} taskId
 * @returns {Array}
 */
export function incrementTaskSession(tasks, taskId) {
  if (!taskId) return tasks;
  return tasks.map(task => {
    if (task.id !== taskId) return task;
    return {
      ...task,
      completedSessions: (task.completedSessions || 0) + 1
    };
  });
}

/**
 * Delete a task
 * @param {Array} tasks
 * @param {string} taskId
 * @returns {Array}
 */
export function deleteTask(tasks, taskId) {
  return tasks.filter(task => task.id !== taskId);
}

/**
 * Filter tasks by filter type
 * @param {Array} tasks
 * @param {string} filter
 * @returns {Array}
 */
export function filterTasks(tasks, filter = TASK_FILTERS.ALL) {
  if (!Array.isArray(tasks)) return [];
  switch (filter) {
    case TASK_FILTERS.PENDING:
      return tasks.filter(t => !t.completed);
    case TASK_FILTERS.COMPLETED:
      return tasks.filter(t => t.completed);
    case TASK_FILTERS.ALL:
    default:
      return [...tasks];
  }
}

/**
 * Reorder task in list (move up or down)
 * @param {Array} tasks
 * @param {string} taskId
 * @param {'up'|'down'} direction
 * @returns {Array}
 */
export function reorderTask(tasks, taskId, direction) {
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) return tasks;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= tasks.length) return tasks;

  const clone = [...tasks];
  const [removed] = clone.splice(index, 1);
  clone.splice(targetIndex, 0, removed);
  return clone;
}
