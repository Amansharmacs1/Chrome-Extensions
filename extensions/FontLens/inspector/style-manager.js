/**
 * FontLens - Live Typography Style Manager
 * Manages non-destructive live styling on active webpage elements with
 * instant reset, preset injection, and session rollback on exit.
 */

export class StyleManager {
  constructor() {
    // Map of element -> { originalStyles: { prop: string }, modified: boolean }
    this.trackedElements = new Map();
    this.managedProperties = [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'lineHeight',
      'letterSpacing',
      'wordSpacing',
      'color',
      'textAlign',
      'textDecoration',
      'textTransform'
    ];
  }

  /**
   * Begins tracking an element if not already recorded
   * @param {HTMLElement} el
   */
  track(el) {
    if (!el || !(el instanceof HTMLElement)) return;
    if (this.trackedElements.has(el)) return;

    const originalStyles = {};
    for (const prop of this.managedProperties) {
      originalStyles[prop] = el.style[prop] || '';
    }

    this.trackedElements.set(el, {
      originalStyles,
      modified: false
    });
  }

  /**
   * Applies a single live property override to an element
   * @param {HTMLElement} el
   * @param {string} property e.g. "fontSize", "fontFamily"
   * @param {string} value e.g. "20px", "Inter"
   */
  applyProperty(el, property, value) {
    if (!el || !(el instanceof HTMLElement)) return;
    this.track(el);

    const record = this.trackedElements.get(el);
    if (!record) return;

    el.style[property] = value;
    record.modified = true;
  }

  /**
   * Applies an entire preset to the target element
   * @param {HTMLElement} el
   * @param {object} presetProperties
   */
  applyPreset(el, presetProperties = {}) {
    if (!el || !(el instanceof HTMLElement)) return;
    this.track(el);

    for (const [prop, val] of Object.entries(presetProperties)) {
      if (this.managedProperties.includes(prop) && val !== undefined) {
        this.applyProperty(el, prop, val);
      }
    }
  }

  /**
   * Restores an element back to its exact initial styles
   * @param {HTMLElement} el
   */
  resetElement(el) {
    if (!el || !this.trackedElements.has(el)) return;

    const record = this.trackedElements.get(el);
    for (const [prop, origVal] of Object.entries(record.originalStyles)) {
      if (origVal) {
        el.style[prop] = origVal;
      } else {
        el.style.removeProperty(this.camelToKebab(prop));
      }
    }

    record.modified = false;
  }

  /**
   * Checks whether an element has active live modifications
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  hasModifications(el) {
    const record = this.trackedElements.get(el);
    return Boolean(record && record.modified);
  }

  /**
   * Restores all modified elements across the entire page
   */
  resetAll() {
    for (const [el] of this.trackedElements.entries()) {
      try {
        if (document.contains(el)) {
          this.resetElement(el);
        }
      } catch {
        // Element might have been removed dynamically by host page
      }
    }
    this.trackedElements.clear();
  }

  /**
   * Converts camelCase to kebab-case
   * @param {string} str
   * @returns {string}
   */
  camelToKebab(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }
}
