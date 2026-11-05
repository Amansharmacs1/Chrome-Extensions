/**
 * ViewPortX - Intelligent DOM Scanner Engine
 * Non-destructively inspects loaded documents, collects geometric and computed
 * CSS properties across layout, interactive, and media elements.
 */

/**
 * Generates a clean, robust, and safe CSS selector for a given DOM element
 * @param {Element} el
 * @returns {string}
 */
export function generateSafeSelector(el) {
  if (!el || el.nodeType !== 1) return '';

  const tag = el.tagName.toLowerCase();
  if (tag === 'html') return 'html';
  if (tag === 'body') return 'body';

  // 1. Safe, unique ID
  if (el.id && typeof el.id === 'string' && /^[a-zA-Z][a-zA-Z0-9_\-]*$/.test(el.id)) {
    // Verify it is truly unique in the document
    if (typeof el.ownerDocument?.querySelectorAll === 'function') {
      try {
        if (el.ownerDocument.querySelectorAll(`#${el.id}`).length === 1) {
          return `#${el.id}`;
        }
      } catch {}
    }
  }

  // 2. Meaningful class names (filtering out dynamic utility classes or frameworks)
  if (el.classList && el.classList.length > 0) {
    const validClasses = Array.from(el.classList).filter(c =>
      /^[a-zA-Z][a-zA-Z0-9_\-]*$/.test(c) &&
      !c.startsWith('viewportx-') &&
      !/^css-[a-z0-9]+$/i.test(c)
    );

    if (validClasses.length > 0 && typeof el.ownerDocument?.querySelectorAll === 'function') {
      const classSelector = `${tag}.${validClasses.slice(0, 2).join('.')}`;
      try {
        if (el.ownerDocument.querySelectorAll(classSelector).length === 1) {
          return classSelector;
        }
      } catch {}
    }
  }

  // 3. Hierarchical path traversal with nth-of-type
  const path = [];
  let curr = el;

  while (curr && curr.nodeType === 1 && curr.tagName.toLowerCase() !== 'html') {
    const currTag = curr.tagName.toLowerCase();
    if (currTag === 'body') {
      path.unshift('body');
      break;
    }

    if (curr.id && /^[a-zA-Z][a-zA-Z0-9_\-]*$/.test(curr.id)) {
      path.unshift(`#${curr.id}`);
      break;
    }

    let index = 1;
    let sibling = curr.previousElementSibling;
    while (sibling) {
      if (sibling.tagName.toLowerCase() === currTag) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    path.unshift(index > 1 ? `${currTag}:nth-of-type(${index})` : currTag);
    curr = curr.parentElement;
    if (path.length >= 5) break; // Avoid excessively long selector chains
  }

  return path.join(' > ');
}

/**
 * Checks whether an element is visually rendered
 * @param {Element} el
 * @param {CSSStyleDeclaration} style
 * @param {DOMRect} rect
 * @returns {boolean}
 */
export function isElementVisible(el, style, rect) {
  if (!el || !style) return false;

  if (style.display === 'none') return false;
  if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  if (parseFloat(style.opacity || '1') === 0) return false;

  // Ignore 0x0 elements that have no child content
  if (rect.width === 0 && rect.height === 0) {
    if (!el.firstElementChild) return false;
  }

  // Ignore script, style, and template tags
  const tag = el.tagName.toLowerCase();
  if (['script', 'style', 'noscript', 'template', 'meta', 'link'].includes(tag)) {
    return false;
  }

  return true;
}

/**
 * Checks whether an element is interactive
 * @param {Element} el
 * @returns {boolean}
 */
export function isInteractiveElement(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  if (['button', 'a', 'input', 'select', 'textarea', 'details', 'summary'].includes(tag)) {
    return true;
  }
  if (typeof el.getAttribute === 'function') {
    const role = el.getAttribute('role');
    if (role === 'button' || role === 'link') {
      return true;
    }
  }
  if (typeof el.hasAttribute === 'function' && el.hasAttribute('onclick')) {
    return true;
  }
  if (typeof el.tabIndex === 'number' && el.tabIndex >= 0) {
    return true;
  }
  return false;
}

/**
 * Scans a document or container and extracts comprehensive layout & styling metadata
 * @param {Document|Element} rootDoc
 * @param {Window|Object} [winOrOptions]
 * @returns {import('../src/types/index.js').DOMScanReport}
 */
export function scanDocument(rootDoc, winOrOptions = {}) {
  const doc = rootDoc.ownerDocument || rootDoc;
  const isWin = winOrOptions && typeof winOrOptions.getComputedStyle === 'function';
  const win = isWin ? winOrOptions : (doc.defaultView || (typeof window !== 'undefined' ? window : null));
  const options = isWin ? {} : winOrOptions;

  const viewportWidth = win?.innerWidth || doc.documentElement?.clientWidth || 390;
  const viewportHeight = win?.innerHeight || doc.documentElement?.clientHeight || 844;

  const docEl = doc.documentElement;
  const scrollWidth = docEl ? docEl.scrollWidth : viewportWidth;
  const clientWidth = docEl ? docEl.clientWidth : viewportWidth;
  const scrollHeight = docEl ? docEl.scrollHeight : viewportHeight;

  const horizontalOverflow = Math.max(0, scrollWidth - clientWidth);
  const maxElements = options.maxElements || 1000;

  // Elements of structural, interactive, and visual interest
  const targetSelectors = [
    'div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav',
    'table', 'form', 'img', 'svg', 'video', 'iframe',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p',
    'button', 'a', 'input', 'select', 'textarea', 'ul', 'ol'
  ].join(',');

  const rawElements = (typeof doc.querySelectorAll === 'function')
    ? Array.from(doc.querySelectorAll(targetSelectors))
    : [];

  const elements = [];
  let count = 0;

  for (const el of rawElements) {
    if (count >= maxElements) break;

    // Skip ViewPortX extension UI components
    if (el.id && el.id.startsWith('viewportx-')) continue;
    const hasIgnoreClass = el.classList && (
      typeof el.classList.contains === 'function'
        ? el.classList.contains('viewportx-ignore')
        : Array.from(el.classList).includes('viewportx-ignore')
    );
    if (hasIgnoreClass) continue;

    const style = win ? win.getComputedStyle(el) : (el.style || {});
    const rect = typeof el.getBoundingClientRect === 'function'
      ? el.getBoundingClientRect()
      : { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 };

    if (!isElementVisible(el, style, rect)) continue;

    const parent = el.parentElement;
    const parentRect = parent && typeof parent.getBoundingClientRect === 'function'
      ? parent.getBoundingClientRect()
      : { width: viewportWidth };

    const classNames = el.classList ? Array.from(el.classList) : [];
    const selector = generateSafeSelector(el);

    const inspection = {
      id: `el-${count + 1}`,
      tagName: el.tagName.toLowerCase(),
      elementId: el.id || '',
      classNames,
      selector,
      rect: {
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      computed: {
        width: style.width || '',
        height: style.height || '',
        minWidth: style.minWidth || '',
        maxWidth: style.maxWidth || '',
        display: style.display || 'block',
        position: style.position || 'static',
        overflowX: style.overflowX || 'visible',
        overflowY: style.overflowY || 'visible',
        boxSizing: style.boxSizing || 'content-box',
        flexShrink: style.flexShrink || '1',
        flexWrap: style.flexWrap || 'nowrap',
        gridTemplateColumns: style.gridTemplateColumns || 'none',
        fontSize: style.fontSize || '16px',
        lineHeight: style.lineHeight || 'normal',
        padding: style.padding || '0px',
        margin: style.margin || '0px',
        textAlign: style.textAlign || 'start',
        wordBreak: style.wordBreak || 'normal',
        overflowWrap: style.overflowWrap || 'normal',
        tableLayout: style.tableLayout || 'auto'
      },
      parentDimensions: {
        clientWidth: parent?.clientWidth || viewportWidth,
        scrollWidth: parent?.scrollWidth || viewportWidth,
        width: Math.round(parentRect.width || viewportWidth),
        tagName: parent?.tagName ? parent.tagName.toLowerCase() : '',
        selector: parent ? generateSafeSelector(parent) : ''
      },
      isVisible: true,
      isInteractive: isInteractiveElement(el)
    };

    if (inspection.tagName === 'img') {
      const attrW = typeof el.getAttribute === 'function' ? el.getAttribute('width') : null;
      const attrH = typeof el.getAttribute === 'function' ? el.getAttribute('height') : null;
      inspection.intrinsicWidth = el.naturalWidth || (attrW ? parseInt(attrW, 10) : undefined);
      inspection.intrinsicHeight = el.naturalHeight || (attrH ? parseInt(attrH, 10) : undefined);
    }

    elements.push(inspection);
    count++;
  }

  return {
    timestamp: Date.now(),
    url: doc.location ? doc.location.href : '',
    hostname: doc.location ? doc.location.hostname : '',
    viewportWidth,
    viewportHeight,
    documentScrollWidth: scrollWidth,
    documentScrollHeight: scrollHeight,
    hasHorizontalOverflow: horizontalOverflow > 2,
    totalHorizontalOverflow: horizontalOverflow,
    totalElementsScanned: elements.length,
    elements
  };
}

export const scanDOM = scanDocument;

