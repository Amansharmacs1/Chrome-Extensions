/**
 * BugShot - Annotation History Manager
 * Maintains a robust Undo / Redo stack with configurable capacity,
 * state change notifications, and snapshot cloning.
 */

export class HistoryManager {
  /**
   * @param {number} [maxCapacity=30]
   */
  constructor(maxCapacity = 30) {
    this.maxCapacity = maxCapacity;
    this.undoStack = [];
    this.redoStack = [];
    this.onChangeCallback = null;
  }

  /**
   * Sets callback invoked whenever undo/redo availability transitions
   * @param {Function} cb
   */
  setOnChange(cb) {
    this.onChangeCallback = cb;
  }

  /**
   * Pushes a new state snapshot and clears redo history
   * @param {any} state
   */
  push(state) {
    if (state === undefined || state === null) return;

    // Deep clone to isolate mutations
    const snapshot = JSON.parse(JSON.stringify(state));
    this.undoStack.push(snapshot);

    if (this.undoStack.length > this.maxCapacity) {
      this.undoStack.shift();
    }

    // New action invalidates redo tree
    this.redoStack = [];
    this.notify();
  }

  /**
   * Undoes the last state change
   * @returns {any|null} The restored state, or null if cannot undo
   */
  undo() {
    if (!this.canUndo()) return null;

    const current = this.undoStack.pop();
    this.redoStack.push(current);

    const targetState = this.undoStack[this.undoStack.length - 1];
    this.notify();

    return targetState ? JSON.parse(JSON.stringify(targetState)) : null;
  }

  /**
   * Redoes the last undone state change
   * @returns {any|null} The reapplied state, or null if cannot redo
   */
  redo() {
    if (!this.canRedo()) return null;

    const next = this.redoStack.pop();
    this.undoStack.push(next);
    this.notify();

    return JSON.parse(JSON.stringify(next));
  }

  /**
   * Whether undo action is currently available
   * @returns {boolean}
   */
  canUndo() {
    return this.undoStack.length > 1;
  }

  /**
   * Whether redo action is currently available
   * @returns {boolean}
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Clears both undo and redo stacks
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  /**
   * Current undo stack depth
   * @returns {number}
   */
  size() {
    return this.undoStack.length;
  }

  notify() {
    if (typeof this.onChangeCallback === 'function') {
      this.onChangeCallback({
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        undoCount: this.undoStack.length,
        redoCount: this.redoStack.length
      });
    }
  }
}
