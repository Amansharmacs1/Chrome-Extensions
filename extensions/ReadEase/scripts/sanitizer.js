/**
 * ReadEase - HTML Sanitization Engine
 * Whitelist-based HTML sanitizer to safely render untrusted webpage content.
 * Prevents Cross-Site Scripting (XSS), script execution, and dangerous resource loads.
 */

// Whitelist of allowed HTML element tags
export const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'ins', 'mark', 'sub', 'sup',
  'code', 'pre', 'kbd', 'samp', 'var',
  'blockquote', 'q', 'cite',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'figure', 'figcaption',
  'img', 'picture', 'source',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'hr', 'br',
  'span', 'div', 'section', 'article',
  'a'
]);

// Whitelist of allowed attributes per element or global
export const ALLOWED_GLOBAL_ATTRS = new Set([
  'class', 'id', 'title', 'lang', 'dir'
]);

export const ALLOWED_TAG_ATTRS = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
  source: new Set(['srcset', 'media', 'type']),
  td: new Set(['colspan', 'rowspan', 'headers']),
  th: new Set(['colspan', 'rowspan', 'headers', 'scope']),
  ol: new Set(['start', 'reversed', 'type']),
  li: new Set(['value']),
  blockquote: new Set(['cite']),
  q: new Set(['cite'])
};

// Safe URL schemes allowed in href and src
export const SAFE_URL_SCHEMES = /^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i;
export const SAFE_IMAGE_DATA_URI = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,/i;

/**
 * Validates whether a URL is safe for href or src
 * @param {string} url
 * @param {boolean} [allowDataImage=false]
 * @returns {boolean}
 */
export function isSafeUrl(url = '', allowDataImage = false) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Reject dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('data:text/html')
  ) {
    return false;
  }

  if (allowDataImage && SAFE_IMAGE_DATA_URI.test(trimmed)) {
    return true;
  }

  return SAFE_URL_SCHEMES.test(trimmed);
}

/**
 * Sanitizes an attribute value based on the attribute name and tag
 * @param {string} tagName
 * @param {string} attrName
 * @param {string} attrValue
 * @returns {string|null} sanitized value or null if rejected
 */
export function sanitizeAttribute(tagName, attrName, attrValue) {
  const name = attrName.toLowerCase();

  // Strip all event handlers
  if (name.startsWith('on')) {
    return null;
  }

  // Check whitelist
  const isGlobal = ALLOWED_GLOBAL_ATTRS.has(name) || name.startsWith('data-');
  const tagAttrs = ALLOWED_TAG_ATTRS[tagName];
  const isTagAllowed = tagAttrs && tagAttrs.has(name);

  if (!isGlobal && !isTagAllowed) {
    return null;
  }

  // URL attributes security
  if (name === 'href') {
    return isSafeUrl(attrValue, false) ? attrValue.trim() : null;
  }

  if (name === 'src') {
    return isSafeUrl(attrValue, true) ? attrValue.trim() : null;
  }

  // Standard string attributes
  return attrValue;
}

/**
 * Sanitizes an HTML string using DOM manipulation
 * Works in both browser DOM and DOM-like mock environments
 * @param {string} dirtyHtml
 * @returns {string} clean sanitized HTML
 */
export function sanitizeHtml(dirtyHtml = '') {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  // In browser environments with DOMParser
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirtyHtml, 'text/html');
    cleanNode(doc.body);
    return doc.body.innerHTML;
  }

  // Fallback regex-based sanitizer for Node.js test environments without DOMParser
  return sanitizeHtmlFallback(dirtyHtml);
}

/**
 * Recursively inspects and cleans a DOM node in place
 * @param {Node} node
 */
function cleanNode(node) {
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === 3) {
      // Text node: safe by definition
      continue;
    }

    if (child.nodeType === 8) {
      // Comment node: remove
      node.removeChild(child);
      continue;
    }

    if (child.nodeType === 1) {
      const tagName = child.tagName.toLowerCase();

      // Check if tag is allowed
      if (!ALLOWED_TAGS.has(tagName)) {
        // Tag not allowed: remove dangerous tags like script, style, iframe, form entirely
        const dangerous = new Set([
          'script', 'style', 'iframe', 'object', 'embed', 'applet',
          'frame', 'frameset', 'form', 'input', 'button', 'select', 'textarea',
          'svg', 'audio', 'video', 'canvas', 'noscript', 'meta', 'link'
        ]);

        if (dangerous.has(tagName)) {
          node.removeChild(child);
        } else {
          // Non-dangerous disallowed tag (e.g. font, center, marquee): unwrap its contents
          cleanNode(child);
          while (child.firstChild) {
            node.insertBefore(child.firstChild, child);
          }
          node.removeChild(child);
        }
        continue;
      }

      // Sanitize element attributes
      const attrs = Array.from(child.attributes);
      for (const attr of attrs) {
        const safeVal = sanitizeAttribute(tagName, attr.name, attr.value);
        if (safeVal === null) {
          child.removeAttribute(attr.name);
        } else if (safeVal !== attr.value) {
          child.setAttribute(attr.name, safeVal);
        }
      }

      // Safe anchor attributes: enforce rel and target
      if (tagName === 'a') {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      }

      // Safe image attributes: add lazy loading
      if (tagName === 'img') {
        child.setAttribute('loading', 'lazy');
      }

      // Recursively clean children
      cleanNode(child);
    } else {
      // Other node types: remove
      node.removeChild(child);
    }
  }
}

/**
 * Robust regex-based fallback sanitizer for Node.js unit tests without full DOM
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtmlFallback(html = '') {
  let clean = html;

  // 1. Strip script tags and their content
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // 2. Strip style tags and content
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // 3. Strip iframes, objects, embeds, forms
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  clean = clean.replace(/<embed\b[^>]*>/gi, '');
  clean = clean.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
  // 4. Strip on* event handlers
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, '');
  clean = clean.replace(/\s+on[a-z]+\s*=\s*[^ >]+/gi, '');
  // 5. Strip javascript: URLs in href/src
  clean = clean.replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"');
  clean = clean.replace(/src\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'src=""');

  return clean;
}
