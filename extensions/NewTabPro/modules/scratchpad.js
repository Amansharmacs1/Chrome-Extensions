/**
 * NewTab Pro - Scratchpad Engine
 * Debounced local notes manager for quick thoughts, links, and temporary snippets.
 */

export class Scratchpad {
  /**
   * @param {Object} options
   * @param {number} [options.debounceMs]
   * @param {Function} options.onSave
   */
  constructor({ debounceMs = 400, onSave } = {}) {
    this.debounceMs = debounceMs;
    this.onSave = onSave || (() => {});
    this._timer = null;
    this._pendingContent = null;
    this._isDirty = false;
  }

  /**
   * Schedules a debounced save
   * @param {string} content
   * @param {Function} [onStatusChange]
   */
  update(content, onStatusChange) {
    this._pendingContent = typeof content === 'string' ? content : '';
    this._isDirty = true;

    if (onStatusChange) {
      onStatusChange('saving');
    }

    if (this._timer) {
      clearTimeout(this._timer);
    }

    this._timer = setTimeout(async () => {
      await this.flush(onStatusChange);
    }, this.debounceMs);
  }

  /**
   * Instantly commits any pending text to storage
   * @param {Function} [onStatusChange]
   */
  async flush(onStatusChange) {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    if (this._isDirty && this._pendingContent !== null) {
      try {
        await this.onSave(this._pendingContent);
        this._isDirty = false;
        if (onStatusChange) {
          onStatusChange('saved');
        }
      } catch (err) {
        console.warn('[NewTabPro Scratchpad] Save error:', err);
        if (onStatusChange) {
          onStatusChange('error');
        }
      }
    }
  }

  /**
   * Returns character and word count statistics
   * @param {string} text
   * @returns {{ characters: number, words: number }}
   */
  static getStats(text = '') {
    const clean = typeof text === 'string' ? text : '';
    const characters = clean.length;
    const words = clean.trim() ? clean.trim().split(/\s+/).length : 0;
    return { characters, words };
  }
}
