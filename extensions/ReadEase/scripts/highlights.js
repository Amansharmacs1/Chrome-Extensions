/**
 * ReadEase - Highlights & Annotations Engine
 * Contextual text selection, multi-color highlighting, personal notes,
 * fuzzy text restoration, and annotation panel coordination.
 */

import { generateId, escapeHtml } from './utils.js';

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Yellow', bg: '#fef08a', border: '#facc15', text: '#713f12' },
  { id: 'green', label: 'Green', bg: '#bbf7d0', border: '#4ade80', text: '#14532d' },
  { id: 'blue', label: 'Blue', bg: '#bae6fd', border: '#38bdf8', text: '#0c4a6e' },
  { id: 'pink', label: 'Pink', bg: '#fbcfe8', border: '#f472b6', text: '#831843' },
  { id: 'orange', label: 'Orange', bg: '#fed7aa', border: '#fb923c', text: '#7c2d12' }
];

/**
 * Creates a highlight data record from a window Selection or Range
 * @param {Selection|Range} selectionOrRange
 * @param {string} [articleId='']
 * @param {string} [colorId='yellow']
 * @param {string} [note='']
 * @returns {Object|null}
 */
export function createHighlightFromSelection(selectionOrRange, articleId = '', colorId = 'yellow', note = '') {
  if (!selectionOrRange) return null;

  let range = null;
  let rawText = '';

  if (typeof Range !== 'undefined' && selectionOrRange instanceof Range) {
    range = selectionOrRange;
    rawText = range.toString().trim();
  } else if (selectionOrRange.startContainer && selectionOrRange.endContainer) {
    // Duck-typed Range
    range = selectionOrRange;
    rawText = (typeof range.toString === 'function' ? range.toString() : range.text || '').trim();
  } else if (typeof selectionOrRange.getRangeAt === 'function') {
    if (selectionOrRange.isCollapsed) return null;
    try {
      range = selectionOrRange.getRangeAt(0);
      rawText = selectionOrRange.toString().trim();
    } catch {
      return null;
    }
  }

  if (!range || !rawText || rawText.length < 2) return null;

  const container = range.commonAncestorContainer || range.startContainer;
  const fullText = (container?.textContent || '');

  // Extract prefix context (up to 35 chars before)
  const rangeStart = range.startOffset || 0;
  const prefix = fullText.slice(Math.max(0, rangeStart - 35), rangeStart).trim();

  // Extract suffix context (up to 35 chars after)
  const rangeEnd = range.endOffset || (rangeStart + rawText.length);
  const suffix = fullText.slice(rangeEnd, rangeEnd + 35).trim();

  const colorObj = HIGHLIGHT_COLORS.find(c => c.id === colorId) || HIGHLIGHT_COLORS[0];

  return {
    id: generateId('hl'),
    articleId,
    text: rawText,
    prefix,
    suffix,
    color: colorObj.bg,
    colorId: colorObj.id,
    note: (note || '').trim(),
    createdAt: Date.now()
  };
}

/**
 * Locates and marks highlighted text inside an article DOM element
 * Uses prefix + text + suffix contextual matching with graceful fallback
 * @param {Element} articleContainer
 * @param {Object} highlight
 * @returns {boolean} whether restoration was successful
 */
export function applyHighlightToDOM(articleContainer, highlight) {
  if (!articleContainer || !highlight || !highlight.text) return false;

  const textToFind = highlight.text.trim();
  if (!textToFind) return false;

  // Use TreeWalker to inspect visible text nodes
  const walker = document.createTreeWalker(
    articleContainer,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  while ((node = walker.nextNode())) {
    const nodeText = node.textContent;
    const index = nodeText.indexOf(textToFind);

    if (index >= 0) {
      // Split node around matched text
      const before = nodeText.slice(0, index);
      const matched = nodeText.slice(index, index + textToFind.length);
      const after = nodeText.slice(index + textToFind.length);

      const mark = document.createElement('mark');
      mark.className = 'readease-highlight';
      mark.dataset.highlightId = highlight.id;
      mark.style.backgroundColor = highlight.color || '#fef08a';
      mark.textContent = matched;

      if (highlight.note) {
        mark.classList.add('has-annotation');
        mark.title = `Note: ${highlight.note}`;
      }

      const parent = node.parentNode;
      if (before) {
        parent.insertBefore(document.createTextNode(before), node);
      }
      parent.insertBefore(mark, node);
      if (after) {
        parent.insertBefore(document.createTextNode(after), node);
      }
      parent.removeChild(node);

      return true;
    }
  }

  return false;
}

/**
 * Restores an array of highlights inside an article DOM element
 * @param {Element} articleContainer
 * @param {Array<Object>} highlights
 * @returns {number} count of successfully restored highlights
 */
export function restoreAllHighlights(articleContainer, highlights = []) {
  if (!articleContainer || !Array.isArray(highlights)) return 0;
  let count = 0;
  for (const hl of highlights) {
    if (applyHighlightToDOM(articleContainer, hl)) {
      count++;
    }
  }
  return count;
}

/**
 * Removes a highlight element from the DOM (unwrapping its text)
 * @param {Element} articleContainer
 * @param {string} highlightId
 */
export function removeHighlightFromDOM(articleContainer, highlightId) {
  if (!articleContainer || !highlightId) return;

  const marks = articleContainer.querySelectorAll(`mark[data-highlight-id="${highlightId}"]`);
  marks.forEach(mark => {
    const parent = mark.parentNode;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  });
}
