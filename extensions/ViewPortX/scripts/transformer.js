/**
 * ViewPortX - Responsive CSS Transformation Engine
 * Generates targeted, non-destructive CSS overrides to resolve detected
 * responsive layout issues, wraps them in a clean stylesheet, and injects/removes
 * them safely in the target document.
 */

export const VIEWPORTX_STYLE_ID = 'viewportx-responsive-styles';
export const VIEWPORTX_HIGHLIGHT_ID = 'viewportx-highlight-styles';

/**
 * Generates structured transformation records from a list of detected issues.
 * @param {import('../src/types').ResponsiveIssue[]} issues
 * @returns {import('../src/types').CssTransformation[]}
 */
export function generateTransformations(issues) {
  if (!Array.isArray(issues)) return [];

  const transformations = [];
  const seenSelectors = new Set();

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    if (!issue.selector) continue;

    const selectorKey = `${issue.selector}::${issue.category}`;
    if (seenSelectors.has(selectorKey)) continue;
    seenSelectors.add(selectorKey);

    /** @type {Record<string, string>} */
    const rules = {};
    let reason = issue.description;

    switch (issue.category) {
      case 'overflow':
        if (issue.selector.includes('body') || issue.selector.includes('html')) {
          rules['overflow-x'] = 'hidden !important';
          rules['max-width'] = '100vw !important';
          rules['box-sizing'] = 'border-box !important';
        } else {
          rules['max-width'] = '100% !important';
          rules['overflow-x'] = 'auto !important';
          rules['box-sizing'] = 'border-box !important';
        }
        break;

      case 'container':
        rules['max-width'] = '100% !important';
        rules['width'] = '100% !important';
        rules['box-sizing'] = 'border-box !important';
        rules['margin-left'] = 'auto !important';
        rules['margin-right'] = 'auto !important';
        break;

      case 'image':
        rules['max-width'] = '100% !important';
        rules['height'] = 'auto !important';
        rules['object-fit'] = 'contain !important';
        break;

      case 'navigation':
        rules['flex-wrap'] = 'wrap !important';
        rules['max-width'] = '100% !important';
        rules['overflow-x'] = 'auto !important';
        rules['-webkit-overflow-scrolling'] = 'touch !important';
        break;

      case 'typography':
        rules['overflow-wrap'] = 'break-word !important';
        rules['word-break'] = 'break-word !important';
        rules['max-width'] = '100% !important';
        if (issue.tagName === 'pre' || issue.tagName === 'code') {
          rules['overflow-x'] = 'auto !important';
          rules['white-space'] = 'pre-wrap !important';
        }
        break;

      case 'flex-grid':
        rules['grid-template-columns'] = 'repeat(auto-fit, minmax(min(100%, 260px), 1fr)) !important';
        rules['flex-wrap'] = 'wrap !important';
        rules['flex-shrink'] = '1 !important';
        rules['min-width'] = '0 !important';
        rules['max-width'] = '100% !important';
        break;

      case 'form':
        rules['box-sizing'] = 'border-box !important';
        rules['max-width'] = '100% !important';
        rules['width'] = '100% !important';
        break;

      case 'table':
        rules['display'] = 'block !important';
        rules['max-width'] = '100% !important';
        rules['overflow-x'] = 'auto !important';
        rules['-webkit-overflow-scrolling'] = 'touch !important';
        break;

      case 'touch-target':
        rules['min-height'] = '44px !important';
        rules['min-width'] = '44px !important';
        rules['display'] = 'inline-flex !important';
        rules['align-items'] = 'center !important';
        rules['justify-content'] = 'center !important';
        break;

      default:
        rules['max-width'] = '100% !important';
        rules['box-sizing'] = 'border-box !important';
        break;
    }

    const cssRulesString = Object.entries(rules)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');

    const generatedCss = `${issue.selector} {\n${cssRulesString}\n}`;

    transformations.push({
      id: `tx-${i + 1}-${Date.now().toString(36)}`,
      issueId: issue.id,
      targetSelector: issue.selector,
      category: issue.category,
      originalComputedStyle: {},
      generatedCss,
      rules,
      reason,
      confidence: issue.confidence || 0.9,
      applied: false,
      verified: false,
      verificationStatus: 'pending',
      beforeMeasurement: issue.currentDimensions || '',
      afterMeasurement: '',
      isReversible: true
    });
  }

  return transformations;
}

/**
 * Compiles a full stylesheet string from a list of transformations.
 * @param {import('../src/types').CssTransformation[]} transformations
 * @param {boolean} [includeBaseNormalize=true]
 * @returns {string}
 */
export function compileStylesheet(transformations, includeBaseNormalize = true) {
  const parts = [];

  parts.push('/* ========================================================== */');
  parts.push('/* ViewPortX - Auto Responsive Stylesheet                     */');
  parts.push(`/* Generated at ${new Date().toISOString()}                  */`);
  parts.push('/* Safe, reversible overrides for legacy & broken layouts     */');
  parts.push('/* ========================================================== */\n');

  if (includeBaseNormalize) {
    parts.push('/* Global Safety Normalizations */');
    parts.push('html {');
    parts.push('  box-sizing: border-box !important;');
    parts.push('  -webkit-text-size-adjust: 100% !important;');
    parts.push('}');
    parts.push('*, *::before, *::after {');
    parts.push('  box-sizing: inherit !important;');
    parts.push('}');
    parts.push('img, video, canvas, svg {');
    parts.push('  max-width: 100% !important;');
    parts.push('  height: auto !important;');
    parts.push('}');
    parts.push('embed, object, iframe {');
    parts.push('  max-width: 100% !important;');
    parts.push('}\n');
  }

  if (Array.isArray(transformations) && transformations.length > 0) {
    parts.push('/* Targeted Element Responsive Overrides */');
    for (const tx of transformations) {
      parts.push(`/* Issue: [${tx.category}] ${tx.reason} */`);
      parts.push(tx.generatedCss);
      parts.push('');
    }
  }

  return parts.join('\n');
}

/**
 * Injects or updates the responsive stylesheet in the target DOM document.
 * @param {Document} doc
 * @param {string} cssContent
 * @returns {{ success: boolean, styleId: string }}
 */
export function injectStyles(doc, cssContent) {
  if (!doc) {
    return { success: false, styleId: VIEWPORTX_STYLE_ID };
  }

  let styleEl = doc.getElementById(VIEWPORTX_STYLE_ID);
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = VIEWPORTX_STYLE_ID;
    styleEl.setAttribute('type', 'text/css');
    styleEl.setAttribute('data-viewportx-injected', 'true');

    const targetParent = doc.head || doc.documentElement || doc.body;
    if (targetParent) {
      targetParent.appendChild(styleEl);
    }
  }

  styleEl.textContent = cssContent;
  return { success: true, styleId: VIEWPORTX_STYLE_ID };
}

/**
 * Completely removes injected ViewPortX styles from document.
 * @param {Document} doc
 * @returns {{ success: boolean }}
 */
export function removeInjectedStyles(doc) {
  if (!doc) return { success: false };

  const styleEl = doc.getElementById(VIEWPORTX_STYLE_ID);
  if (styleEl) {
    if (typeof styleEl.remove === 'function') {
      styleEl.remove();
    } else if (styleEl.parentNode && typeof styleEl.parentNode.removeChild === 'function') {
      styleEl.parentNode.removeChild(styleEl);
    }
  }

  const highlightEl = doc.getElementById(VIEWPORTX_HIGHLIGHT_ID);
  if (highlightEl) {
    if (typeof highlightEl.remove === 'function') {
      highlightEl.remove();
    } else if (highlightEl.parentNode && typeof highlightEl.parentNode.removeChild === 'function') {
      highlightEl.parentNode.removeChild(highlightEl);
    }
  }

  return { success: true };
}

/**
 * Checks if ViewPortX styles are currently injected in the document.
 * @param {Document} doc
 * @returns {boolean}
 */
export function isStylesInjected(doc) {
  if (!doc) return false;
  return !!doc.getElementById(VIEWPORTX_STYLE_ID);
}

/**
 * Injects temporary highlight styling onto a specific element selector.
 * @param {Document} doc
 * @param {string} selector
 */
export function highlightElement(doc, selector) {
  if (!doc) return;

  let highlightEl = doc.getElementById(VIEWPORTX_HIGHLIGHT_ID);
  if (!highlightEl) {
    highlightEl = doc.createElement('style');
    highlightEl.id = VIEWPORTX_HIGHLIGHT_ID;
    highlightEl.setAttribute('type', 'text/css');
    const targetParent = doc.head || doc.documentElement || doc.body;
    if (targetParent) {
      targetParent.appendChild(highlightEl);
    }
  }

  if (!selector) {
    highlightEl.textContent = '';
    return;
  }

  highlightEl.textContent = `
    ${selector} {
      outline: 3px solid #6366f1 !important;
      outline-offset: 2px !important;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.4) !important;
      transition: outline 0.2s ease, box-shadow 0.2s ease !important;
    }
  `;
}
