/**
 * ReadEase - Highlights & Annotations Unit Tests
 */

import {
  createHighlightFromSelection,
  applyHighlightToDOM,
  restoreAllHighlights,
  removeHighlightFromDOM,
  HIGHLIGHT_COLORS
} from '../scripts/highlights.js';

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

console.log('\n--- Running Highlights & Annotations Tests ---');

// 1. Color Palettes
assert(Array.isArray(HIGHLIGHT_COLORS), 'Highlight colors is an array');
assert(HIGHLIGHT_COLORS.length === 5, 'Provides 5 distinct highlight colors');
const yellow = HIGHLIGHT_COLORS.find(c => c.id === 'yellow');
assert(yellow && yellow.bg === '#fef08a', 'Yellow color palette exists with proper background');
const green = HIGHLIGHT_COLORS.find(c => c.id === 'green');
assert(green && green.bg === '#bbf7d0', 'Green color palette exists');

// 2. Mock Selection
const mockSelection = {
  isCollapsed: false,
  toString: () => 'Consistent hashing balances caching clusters',
  getRangeAt: () => ({
    startOffset: 25,
    endOffset: 68,
    commonAncestorContainer: {
      textContent: 'In high-scale architectures, Consistent hashing balances caching clusters during active node deployment.'
    }
  })
};

const hlRecord = createHighlightFromSelection(mockSelection, 'art-300', 'green', 'Revise for system design interview');
assert(hlRecord !== null, 'Creates highlight record from selection');
assert(hlRecord.id.startsWith('hl-'), 'Generates unique highlight ID');
assert(hlRecord.text === 'Consistent hashing balances caching clusters', 'Extracts exact highlighted text');
assert(hlRecord.color === '#bbf7d0', 'Applies green background color');
assert(hlRecord.note === 'Revise for system design interview', 'Attaches personal annotation note');
assert(hlRecord.prefix.length > 0, 'Extracts contextual prefix string');
assert(hlRecord.suffix.length > 0, 'Extracts contextual suffix string');

// 3. Selection rejection on collapsed/empty selection
const collapsedSelection = { isCollapsed: true, toString: () => '' };
assert(createHighlightFromSelection(collapsedSelection) === null, 'Rejects collapsed selection');

// 4. Mock DOM Container for highlight application and removal
function createMockNode(text) {
  return {
    nodeType: 3, // Text node
    textContent: text,
    parentNode: null
  };
}

const mockTextNode = createMockNode('This guide explains how indexes improve database query performance and decrease latency.');
const mockContainer = {
  childNodes: [mockTextNode],
  children: [],
  insertBefore(newNode, refNode) {
    const idx = this.childNodes.indexOf(refNode);
    if (idx >= 0) {
      this.childNodes.splice(idx, 0, newNode);
    } else {
      this.childNodes.push(newNode);
    }
    newNode.parentNode = this;
  },
  removeChild(childNode) {
    this.childNodes = this.childNodes.filter(c => c !== childNode);
  },
  querySelectorAll(sel) {
    return this.childNodes.filter(c => c.tagName === 'MARK' && c.dataset?.highlightId);
  }
};
mockTextNode.parentNode = mockContainer;

// 5. TreeWalker mock for applyHighlightToDOM
global.NodeFilter = { SHOW_TEXT: 4 };
global.document = {
  createTreeWalker(root) {
    let index = -1;
    const textNodes = root.childNodes.filter(n => n.nodeType === 3);
    return {
      nextNode() {
        index++;
        return textNodes[index] || null;
      }
    };
  },
  createTextNode(text) {
    return createMockNode(text);
  },
  createElement(tag) {
    return {
      tagName: tag.toUpperCase(),
      className: '',
      dataset: {},
      style: {},
      textContent: '',
      title: '',
      classList: {
        add(cls) { this.className += ` ${cls}`; }
      }
    };
  }
};

const highlightToApply = {
  id: 'hl-99',
  text: 'indexes improve database query performance',
  color: '#fef08a',
  note: 'Essential indexing rule'
};

const applied = applyHighlightToDOM(mockContainer, highlightToApply);
assert(applied === true, 'applyHighlightToDOM locates and marks the target text passage');

const marks = mockContainer.querySelectorAll('mark');
assert(marks.length === 1, 'Mark element inserted into container');
assert(marks[0].dataset.highlightId === 'hl-99', 'Mark element carries highlight ID');
assert(marks[0].title.includes('Essential indexing rule'), 'Mark element carries annotation note');

console.log(`Highlight Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
