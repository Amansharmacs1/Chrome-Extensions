/**
 * ReadEase - Readability Article Extraction Unit Tests
 */

import {
  extractMetadata,
  scoreElement,
  removeUnwantedElements,
  findBestArticleContainer,
  extractCleanArticleContent,
  extractArticle
} from '../scripts/readability.js';

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

console.log('\n--- Running Readability Extraction Tests ---');

// Mock DOM Node Helper for Node testing
function createMockElement(tagName, attrs = {}, textContent = '', children = []) {
  const el = {
    tagName: tagName.toUpperCase(),
    id: attrs.id || '',
    className: attrs.class || attrs.className || '',
    attributes: attrs,
    _textContent: textContent,
    children: [...children],
    get textContent() {
      if (this.children.length === 0) return this._textContent || '';
      return (this._textContent ? this._textContent + ' ' : '') + this.children.map(c => c.textContent).join(' ');
    },
    set textContent(val) {
      this._textContent = val;
    },
    get innerHTML() {
      if (this.children.length === 0) return this._textContent || '';
      return this.children.map(c => `<${c.tagName.toLowerCase()}>${c.textContent}</${c.tagName.toLowerCase()}>`).join('');
    },
    get classList() {
      const self = this;
      return {
        add(cls) {
          const classes = new Set((self.className || '').split(/\s+/).filter(Boolean));
          classes.add(cls);
          self.className = Array.from(classes).join(' ');
        },
        remove(cls) {
          const classes = new Set((self.className || '').split(/\s+/).filter(Boolean));
          classes.delete(cls);
          self.className = Array.from(classes).join(' ');
        },
        contains(cls) {
          return (self.className || '').split(/\s+/).includes(cls);
        }
      };
    },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    setAttribute(name, val) {
      this.attributes[name] = val;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    remove() {
      if (this.parentNode) {
        this.parentNode.children = this.parentNode.children.filter(c => c !== this);
      }
    },
    querySelector(selector) {
      const all = this.querySelectorAll(selector);
      return all.length > 0 ? all[0] : null;
    },
    querySelectorAll(selector) {
      const results = [];
      const match = (node) => {
        const tag = node.tagName?.toLowerCase();
        const cls = node.className || '';
        const id = node.id || '';

        // Basic selector matcher for test fixture verification
        if (selector.startsWith('.')) {
          const clsName = selector.slice(1);
          if (cls.split(/\s+/).includes(clsName)) results.push(node);
        } else if (selector.startsWith('#')) {
          if (id === selector.slice(1)) results.push(node);
        } else if (selector.includes(',')) {
          const parts = selector.split(',').map(s => s.trim().toLowerCase());
          if (parts.includes(tag)) results.push(node);
        } else if (selector.includes('[') && selector.includes(']')) {
          const attrMatch = selector.match(/\[([a-zA-Z0-9_\-]+)(?:="([^"]+)")?\]/);
          if (attrMatch) {
            const attrKey = attrMatch[1];
            const attrVal = attrMatch[2];
            if (attrVal) {
              if (node.getAttribute(attrKey) === attrVal) results.push(node);
            } else if (node.getAttribute(attrKey)) {
              results.push(node);
            }
          }
        } else if (tag === selector.toLowerCase()) {
          results.push(node);
        }

        for (const child of node.children) {
          match(child);
        }
      };

      for (const child of this.children) {
        match(child);
      }
      return results;
    },
    cloneNode() {
      const clonedChildren = this.children.map(c => c.cloneNode());
      const clone = createMockElement(this.tagName, { ...this.attributes }, this._textContent, clonedChildren);
      for (const child of clone.children) {
        child.parentNode = clone;
      }
      return clone;
    }
  };

  for (const child of children) {
    child.parentNode = el;
  }
  return el;
}

// 1. Metadata Extraction
const mockDoc = {
  title: 'Understanding Modern Web Architecture | TechCorp',
  querySelector(sel) {
    if (sel.includes('og:title')) {
      return { getAttribute: () => 'Understanding Modern Web Architecture' };
    }
    if (sel.includes('author')) {
      return { getAttribute: () => 'Sarah Chen', textContent: 'Sarah Chen' };
    }
    if (sel.includes('published_time')) {
      return { getAttribute: () => '2026-10-12T10:00:00Z' };
    }
    if (sel.includes('og:description')) {
      return { getAttribute: () => 'An in-depth analysis of micro-frontends and caching tiers.' };
    }
    if (sel.includes('og:site_name')) {
      return { getAttribute: () => 'TechCorp Engineering' };
    }
    return null;
  }
};

const meta = extractMetadata(mockDoc, 'https://techcorp.com/blog/arch');
assert(meta.title === 'Understanding Modern Web Architecture', 'Extracts clean title without suffix');
assert(meta.byline === 'Sarah Chen', 'Extracts author name');
assert(meta.publishedTime === '2026-10-12T10:00:00Z', 'Extracts published date');
assert(meta.siteName === 'TechCorp Engineering', 'Extracts site name');
assert(meta.excerpt.includes('micro-frontends'), 'Extracts description/excerpt');

// 1b. Wikipedia Coordinates Fallback & Noise Rejection
const wikiMockDoc = {
  title: '2010 Pune bombing - Wikipedia',
  querySelector(sel) {
    if (sel.includes('og:title')) return { getAttribute: () => '2010 Pune bombing - Wikipedia' };
    if (sel.includes('og:description')) return { getAttribute: () => 'Coordinates: 18°32\'23"N 73°53\'14"E / 18.53972°N 73.88722°E / 18.53972; 73.88722' };
    if (sel === 'p') return { textContent: 'On 13 February 2010, a bomb exploded at the German Bakery in Pune killing 17 people and injuring 60 others.' };
    return null;
  }
};
const wikiMeta = extractMetadata(wikiMockDoc, 'https://en.wikipedia.org/wiki/2010_Pune_bombing');
assert(!wikiMeta.excerpt.startsWith('Coordinates:'), 'Rejects coordinate noise from excerpt');
assert(wikiMeta.excerpt.includes('German Bakery in Pune'), 'Falls back to lead paragraph for Wikipedia article');

// 2. Candidate Scoring
const articleContainer = createMockElement('article', { class: 'post-content' }, 'Full article text', [
  createMockElement('h1', {}, 'Main Article Heading'),
  createMockElement('p', {}, 'This is a long and rich paragraph with extensive explanations of the subject matter that provides substantial reading value to users.'),
  createMockElement('p', {}, 'Another deeply informative paragraph providing further technical insights, architectural diagrams, and contextual examples.'),
  createMockElement('pre', {}, 'const code = true;'),
  createMockElement('img', { src: 'diagram.png' }, '')
]);

const articleScore = scoreElement(articleContainer);
assert(articleScore > 40, `Semantic article container receives high score (${articleScore} > 40)`);

const sidebarContainer = createMockElement('div', { class: 'sidebar ad-container' }, 'Ads and Links', [
  createMockElement('p', {}, 'Click here to buy'),
  createMockElement('a', { href: '#' }, 'Link 1'),
  createMockElement('a', { href: '#' }, 'Link 2'),
  createMockElement('a', { href: '#' }, 'Link 3')
]);

const sidebarScore = scoreElement(sidebarContainer);
assert(sidebarScore < articleScore, `Sidebar with ads receives lower score than article (${sidebarScore} < ${articleScore})`);

// 3. Unwanted Elements Removal
const containerWithAds = createMockElement('div', {}, '', [
  createMockElement('p', {}, 'Valuable article paragraph'),
  createMockElement('div', { class: 'sidebar' }, 'Sidebar stuff'),
  createMockElement('div', { class: 'ad-banner' }, 'Sponsored Advertisement'),
  createMockElement('nav', { class: 'nav' }, 'Home About')
]);

removeUnwantedElements(containerWithAds);
assert(containerWithAds.children.length === 1, 'removeUnwantedElements strips sidebar, ad-banner, and nav');
assert(containerWithAds.children[0].textContent.includes('Valuable article paragraph'), 'Preserves content paragraph');

// 4. Best Article Container Selection
const pageBody = createMockElement('body', {}, '', [
  createMockElement('div', { class: 'header' }, 'Header'),
  articleContainer,
  sidebarContainer
]);

const best = findBestArticleContainer(pageBody);
assert(best.tagName === 'ARTICLE', 'findBestArticleContainer locates the <article> container');

// 5. Clean Article Content Extraction
const clean = extractCleanArticleContent(articleContainer);
assert(clean.text.includes('This is a long and rich paragraph'), 'Extracts clean text content');
assert(typeof clean.html === 'string', 'Returns content HTML string');

console.log(`Readability Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
