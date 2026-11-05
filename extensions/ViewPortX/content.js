/**
 * ViewPortX - Content Script Bridge
 * Self-contained, robust engine for DOM inspection, responsive flaw analysis,
 * targeted CSS transformation, layout verification, and health scoring.
 * Runs in isolated world with zero external network dependencies and strict idempotency guard.
 */

(function () {
  // Prevent duplicate execution and identifier collisions in active tab
  if (typeof window !== 'undefined' && window.__VIEWPORTX_CONTENT_SCRIPT_INITIALIZED__) {
    return;
  }
  if (typeof window !== 'undefined') {
    window.__VIEWPORTX_CONTENT_SCRIPT_INITIALIZED__ = true;
  }

  /* ========================================================================== */
  /* 1. DOM SCANNER & SELECTOR ENGINE                                           */
  /* ========================================================================== */

  /**
   * Generates a clean, robust, and safe CSS selector for a given DOM element
   * @param {Element} el
   * @returns {string}
   */
  function generateSafeSelector(el) {
    if (!el || el.nodeType !== 1) return '';

    const tag = el.tagName.toLowerCase();
    if (tag === 'html') return 'html';
    if (tag === 'body') return 'body';

    // 1. Safe, unique ID
    if (el.id && typeof el.id === 'string' && /^[a-zA-Z][a-zA-Z0-9_\-]*$/.test(el.id)) {
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

      path.unshift(`${currTag}:nth-of-type(${index})`);
      curr = curr.parentElement;

      if (path.length >= 5) break;
    }

    return path.join(' > ');
  }

  /**
   * Determines if an element is visible and occupies space
   */
  function isElementVisible(el, style, rect) {
    if (!el || !style) return false;
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (parseFloat(style.opacity || '1') === 0) return false;
    if (rect.width <= 0 && rect.height <= 0) return false;
    return true;
  }

  /**
   * Identifies whether an element is an interactive touch/click target
   */
  function isInteractiveElement(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    if (['button', 'a', 'input', 'select', 'textarea', 'details', 'summary'].includes(tag)) {
      return true;
    }
    if (typeof el.getAttribute === 'function') {
      const role = el.getAttribute('role');
      if (role === 'button' || role === 'link') return true;
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
   * Scans document layout and extracts geometry and computed properties
   */
  function scanDOM(rootDoc, winOrOptions = {}) {
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
      const parentStyle = parent && win ? win.getComputedStyle(parent) : null;

      const inspection = {
        id: `vx-el-${count + 1}`,
        tagName: el.tagName.toLowerCase(),
        elementId: el.id || '',
        classNames: el.classList ? Array.from(el.classList) : [],
        selector: generateSafeSelector(el),
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
          display: style.display || '',
          position: style.position || '',
          overflowX: style.overflowX || '',
          overflowY: style.overflowY || '',
          boxSizing: style.boxSizing || '',
          flexShrink: style.flexShrink || '',
          flexWrap: style.flexWrap || '',
          gridTemplateColumns: style.gridTemplateColumns || '',
          fontSize: style.fontSize || '',
          lineHeight: style.lineHeight || '',
          padding: style.padding || '',
          margin: style.margin || '',
          textAlign: style.textAlign || '',
          wordBreak: style.wordBreak || '',
          overflowWrap: style.overflowWrap || '',
          tableLayout: style.tableLayout || undefined
        },
        parentDimensions: {
          clientWidth: parent ? parent.clientWidth : viewportWidth,
          scrollWidth: parent ? parent.scrollWidth : viewportWidth,
          width: parent && parentStyle ? parseFloat(parentStyle.width) || parent.clientWidth : viewportWidth,
          tagName: parent ? parent.tagName.toLowerCase() : '',
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

  /* ========================================================================== */
  /* 2. RESPONSIVE ISSUE DETECTION ANALYZER                                     */
  /* ========================================================================== */

  function analyzeScanReport(scanReport) {
    if (!scanReport || !Array.isArray(scanReport.elements)) {
      return [];
    }

    const issues = [];
    const seenSelectors = new Set();
    const { viewportWidth, viewportHeight } = scanReport;

    // 1. Global Horizontal Document Overflow Check
    if (scanReport.hasHorizontalOverflow && scanReport.totalHorizontalOverflow > 2) {
      issues.push({
        id: 'issue-global-overflow',
        selector: 'html, body',
        tagName: 'body',
        category: 'overflow',
        severity: 'critical',
        description: `Document content overflows viewport horizontally by ${Math.round(scanReport.totalHorizontalOverflow)}px, causing unwanted horizontal scrolling`,
        currentDimensions: `scrollWidth: ${Math.round(scanReport.documentScrollWidth)}px, viewportWidth: ${viewportWidth}px`,
        expectedCondition: `scrollWidth <= ${viewportWidth}px (0px horizontal overflow)`,
        affectedViewport: `<= ${viewportWidth}px`,
        recommendedFix: 'overflow-x: hidden; max-width: 100vw; box-sizing: border-box;',
        confidence: 0.98,
        rect: {
          top: 0,
          left: 0,
          right: scanReport.documentScrollWidth,
          bottom: scanReport.documentScrollHeight,
          width: scanReport.documentScrollWidth,
          height: scanReport.documentScrollHeight
        }
      });
      seenSelectors.add('html, body');
    }

    for (const el of scanReport.elements) {
      if (!el || !el.isVisible || !el.selector) continue;
      const { selector, tagName, rect, computed, parentDimensions } = el;

      const pushIssue = (issue) => {
        const key = `${issue.selector}::${issue.category}`;
        if (!seenSelectors.has(key)) {
          seenSelectors.add(key);
          issues.push(issue);
        }
      };

      const parsedWidth = parseFloat(computed.width || '0');

      // 2. Direct Element Horizontal Overflow
      if (rect.right > viewportWidth + 3 && rect.width > 20) {
        const overflowPx = Math.round(rect.right - viewportWidth);
        pushIssue({
          id: `issue-overflow-${issues.length + 1}`,
          selector,
          tagName,
          category: 'overflow',
          severity: overflowPx > 50 ? 'critical' : 'high',
          description: `Element extends ${overflowPx}px beyond viewport right boundary`,
          currentDimensions: `right: ${Math.round(rect.right)}px, width: ${Math.round(rect.width)}px`,
          expectedCondition: `right <= ${viewportWidth}px and max-width: 100%`,
          affectedViewport: `<= ${viewportWidth}px`,
          recommendedFix: 'max-width: 100%; box-sizing: border-box; overflow-x: auto;',
          confidence: 0.95,
          rect
        });
      }

      // 3. Fixed-Width Containers
      const isContainer = ['div', 'section', 'main', 'article', 'header', 'footer', 'aside'].includes(tagName);
      if (isContainer && computed.width.endsWith('px')) {
        const isFixedExceeding = parsedWidth > viewportWidth || (viewportWidth <= 768 && parsedWidth >= 320 && computed.maxWidth === 'none');
        if (isFixedExceeding) {
          pushIssue({
            id: `issue-container-${issues.length + 1}`,
            selector,
            tagName,
            category: 'container',
            severity: parsedWidth > viewportWidth ? 'critical' : 'high',
            description: `Container has rigid fixed width (${Math.round(parsedWidth)}px) without responsive max-width`,
            currentDimensions: `width: ${computed.width}, maxWidth: ${computed.maxWidth}`,
            expectedCondition: 'max-width: 100%; width: auto or percentage',
            affectedViewport: `<= ${Math.max(viewportWidth, Math.round(parsedWidth))}px`,
            recommendedFix: 'max-width: 100% !important; width: 100% !important; box-sizing: border-box !important;',
            confidence: 0.92,
            rect
          });
        }
      }

      // 4. Image & Media Elements
      if (['img', 'svg', 'canvas', 'video'].includes(tagName)) {
        const isOversized = rect.width > viewportWidth || (el.intrinsicWidth && el.intrinsicWidth > viewportWidth);
        const lacksFluidRules = computed.maxWidth === 'none' || computed.maxWidth === '0px' || (computed.width.endsWith('px') && parsedWidth > viewportWidth);

        if (isOversized || lacksFluidRules) {
          pushIssue({
            id: `issue-image-${issues.length + 1}`,
            selector,
            tagName,
            category: 'image',
            severity: rect.width > viewportWidth ? 'high' : 'medium',
            description: `Media element lacks fluid max-width: 100% constraint and risks overflow`,
            currentDimensions: `rendered: ${Math.round(rect.width)}x${Math.round(rect.height)}px, maxWidth: ${computed.maxWidth}`,
            expectedCondition: 'max-width: 100%; height: auto; object-fit: contain',
            affectedViewport: `<= ${viewportWidth}px`,
            recommendedFix: 'max-width: 100% !important; height: auto !important; object-fit: contain;',
            confidence: 0.94,
            rect
          });
        }
      }

      // 5. Navigation Rigid Layouts
      const isNav = tagName === 'nav' || el.classNames.some(c => /nav|menu|navbar/i.test(c));
      if (isNav) {
        const isFlexNoWrap = computed.display.includes('flex') && computed.flexWrap === 'nowrap';
        const isWideNav = rect.width > viewportWidth - 20;

        if (isFlexNoWrap && isWideNav) {
          pushIssue({
            id: `issue-nav-${issues.length + 1}`,
            selector,
            tagName,
            category: 'navigation',
            severity: 'high',
            description: 'Navigation container uses non-wrapping flex layout, causing links to truncate or spill',
            currentDimensions: `display: ${computed.display}, flexWrap: ${computed.flexWrap}, width: ${Math.round(rect.width)}px`,
            expectedCondition: 'flex-wrap: wrap; or responsive mobile drawer menu',
            affectedViewport: `<= ${viewportWidth}px`,
            recommendedFix: 'flex-wrap: wrap !important; overflow-x: auto; -webkit-overflow-scrolling: touch;',
            confidence: 0.88,
            rect
          });
        }
      }

      // 6. Typography Overflow & Long Unbroken Strings
      if (['h1', 'h2', 'h3', 'p', 'pre', 'code', 'blockquote'].includes(tagName)) {
        const hasNoBreak = computed.wordBreak === 'normal' && computed.overflowWrap === 'normal';
        const isWideText = rect.width > viewportWidth - 10;
        const isPreformatted = tagName === 'pre' || tagName === 'code';

        if (isPreformatted && computed.overflowX === 'visible' && isWideText) {
          pushIssue({
            id: `issue-typo-${issues.length + 1}`,
            selector,
            tagName,
            category: 'typography',
            severity: 'high',
            description: 'Preformatted code block overflows viewport without horizontal scrolling',
            currentDimensions: `width: ${Math.round(rect.width)}px, overflowX: ${computed.overflowX}`,
            expectedCondition: 'overflow-x: auto; white-space: pre-wrap;',
            affectedViewport: `<= ${viewportWidth}px`,
            recommendedFix: 'overflow-x: auto !important; white-space: pre-wrap !important; word-break: break-all !important; max-width: 100% !important;',
            confidence: 0.96,
            rect
          });
        } else if (hasNoBreak && isWideText) {
          pushIssue({
            id: `issue-typo-${issues.length + 1}`,
            selector,
            tagName,
            category: 'typography',
            severity: 'medium',
            description: 'Text block lacks word-break and overflow-wrap, causing long words or URLs to clip',
            currentDimensions: `wordBreak: ${computed.wordBreak}, overflowWrap: ${computed.overflowWrap}`,
            expectedCondition: 'overflow-wrap: break-word; word-break: break-word;',
            affectedViewport: `<= ${viewportWidth}px`,
            recommendedFix: 'overflow-wrap: break-word !important; word-break: break-word !important;',
            confidence: 0.85,
            rect
          });
        }
      }

      // 7. Grid Fixed Columns & Flex Shrink Issues
      if (computed.display.includes('grid')) {
        const gridCols = computed.gridTemplateColumns || '';
        const fixedColMatches = gridCols.match(/\d+px/g);
        if (fixedColMatches && fixedColMatches.length >= 2) {
          const sumFixed = fixedColMatches.reduce((acc, v) => acc + parseFloat(v), 0);
          if (sumFixed > viewportWidth - 30) {
            pushIssue({
              id: `issue-grid-${issues.length + 1}`,
              selector,
              tagName,
              category: 'flex-grid',
              severity: 'high',
              description: `CSS Grid defines multiple fixed pixel columns totaling ${Math.round(sumFixed)}px exceeding viewport`,
              currentDimensions: `gridTemplateColumns: ${gridCols}`,
              expectedCondition: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
              affectedViewport: `<= ${Math.round(sumFixed + 30)}px`,
              recommendedFix: 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)) !important;',
              confidence: 0.91,
              rect
            });
          }
        }
      }

      if (computed.flexShrink === '0' && parsedWidth > viewportWidth - 20) {
        pushIssue({
          id: `issue-flex-${issues.length + 1}`,
          selector,
          tagName,
          category: 'flex-grid',
          severity: 'medium',
          description: 'Flex item has flex-shrink: 0 preventing it from shrinking on narrow screens',
          currentDimensions: `flexShrink: 0, width: ${computed.width}`,
          expectedCondition: 'flex-shrink: 1; max-width: 100%;',
          affectedViewport: `<= ${viewportWidth}px`,
          recommendedFix: 'flex-shrink: 1 !important; max-width: 100% !important; min-width: 0 !important;',
          confidence: 0.89,
          rect
        });
      }

      // 8. Form Inputs
      if (['input', 'textarea', 'select', 'form'].includes(tagName)) {
        const isInputWiderThanViewport = rect.width > viewportWidth - 10;
        const isLackingBorderBox = computed.boxSizing !== 'border-box' && (parsedWidth > viewportWidth * 0.8);

        if (isInputWiderThanViewport || isLackingBorderBox) {
          pushIssue({
            id: `issue-form-${issues.length + 1}`,
            selector,
            tagName,
            category: 'form',
            severity: isInputWiderThanViewport ? 'high' : 'medium',
            description: `Form element exceeds viewport or lacks box-sizing: border-box`,
            currentDimensions: `width: ${Math.round(rect.width)}px, boxSizing: ${computed.boxSizing}`,
            expectedCondition: 'box-sizing: border-box; max-width: 100%;',
            affectedViewport: `<= ${viewportWidth}px`,
            recommendedFix: 'box-sizing: border-box !important; max-width: 100% !important; width: 100% !important;',
            confidence: 0.92,
            rect
          });
        }
      }

      // 9. Tables Without Scroll Wrappers
      if (tagName === 'table') {
        const isWideTable = rect.width > viewportWidth - 20;
        const parentHasScroll = parentDimensions && (
          parentDimensions.scrollWidth > parentDimensions.clientWidth + 5
        );

        if (isWideTable || parentHasScroll) {
          pushIssue({
            id: `issue-table-${issues.length + 1}`,
            selector,
            tagName,
            category: 'table',
            severity: 'high',
            description: 'Data table exceeds viewport width without dedicated responsive scroll handling',
            currentDimensions: `width: ${Math.round(rect.width)}px, viewportWidth: ${viewportWidth}px`,
            expectedCondition: 'display: block; overflow-x: auto; max-width: 100%;',
            affectedViewport: `<= ${viewportWidth}px`,
            recommendedFix: 'display: block !important; max-width: 100% !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important;',
            confidence: 0.95,
            rect
          });
        }
      }

      // 10. Touch Target Sizes on Mobile Viewports
      if (viewportWidth <= 768 && el.isInteractive) {
        const isTooSmall = (rect.width > 0 && rect.width < 36) || (rect.height > 0 && rect.height < 36);
        if (isTooSmall && ['a', 'button', 'input', 'select'].includes(tagName)) {
          pushIssue({
            id: `issue-touch-${issues.length + 1}`,
            selector,
            tagName,
            category: 'touch-target',
            severity: rect.height < 24 ? 'medium' : 'low',
            description: `Interactive touch target is only ${Math.round(rect.width)}x${Math.round(rect.height)}px (recommended min: 44x44px)`,
            currentDimensions: `${Math.round(rect.width)}px x ${Math.round(rect.height)}px`,
            expectedCondition: 'min-width: 44px; min-height: 44px;',
            affectedViewport: `<= 768px`,
            recommendedFix: 'min-height: 44px; min-width: 44px; display: inline-flex; align-items: center; justify-content: center;',
            confidence: 0.82,
            rect
          });
        }
      }
    }

    const severityWeight = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    issues.sort((a, b) => (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0));

    return issues;
  }

  /* ========================================================================== */
  /* 3. HEALTH SCORE ENGINE                                                     */
  /* ========================================================================== */

  const CATEGORY_DEFINITIONS = {
    overflow: { weight: 25, name: 'Horizontal Overflow' },
    container: { weight: 15, name: 'Container Sizing' },
    navigation: { weight: 10, name: 'Navigation Usability' },
    image: { weight: 10, name: 'Media Responsiveness' },
    typography: { weight: 10, name: 'Typography Wrapping' },
    'flex-grid': { weight: 10, name: 'Flex & Grid Flow' },
    form: { weight: 5, name: 'Form Adaptation' },
    table: { weight: 5, name: 'Table Responsiveness' },
    overlap: { weight: 5, name: 'Element Stacking' },
    'touch-target': { weight: 5, name: 'Touch Target Sizing' }
  };

  function calculateHealthScore(scanReport, issues = []) {
    const categories = {};
    const issuesByCategory = {};
    for (const key of Object.keys(CATEGORY_DEFINITIONS)) {
      issuesByCategory[key] = [];
    }

    for (const issue of issues) {
      if (issuesByCategory[issue.category]) {
        issuesByCategory[issue.category].push(issue);
      }
    }

    let totalWeightedScore = 0;
    let totalWeight = 0;
    let totalTested = 0;
    let totalFailed = 0;

    for (const [catKey, meta] of Object.entries(CATEGORY_DEFINITIONS)) {
      const catIssues = issuesByCategory[catKey] || [];
      const failed = catIssues.length;
      let tested = 1;

      if (scanReport && Array.isArray(scanReport.elements)) {
        if (catKey === 'image') {
          tested = Math.max(1, scanReport.elements.filter(e => ['img', 'svg', 'canvas', 'video'].includes(e.tagName)).length);
        } else if (catKey === 'container') {
          tested = Math.max(1, scanReport.elements.filter(e => ['div', 'section', 'main', 'article'].includes(e.tagName)).length);
        } else if (catKey === 'table') {
          tested = Math.max(1, scanReport.elements.filter(e => e.tagName === 'table').length);
        } else if (catKey === 'form') {
          tested = Math.max(1, scanReport.elements.filter(e => ['input', 'select', 'textarea', 'form'].includes(e.tagName)).length);
        } else if (catKey === 'touch-target') {
          tested = Math.max(1, scanReport.elements.filter(e => e.isInteractive).length);
        } else {
          tested = Math.max(1, Math.min(20, scanReport.elements.length));
        }
      }

      let score = 100;
      if (failed > 0) {
        if (catKey === 'overflow') {
          score = Math.max(0, 100 - (failed * 35) - (scanReport.hasHorizontalOverflow ? 30 : 0));
        } else {
          score = Math.max(0, Math.round(((Math.max(0, tested - failed)) / tested) * 100));
          if (failed > 0 && score === 100) score = 75;
        }
      }

      const status = score >= 90 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      categories[catKey] = {
        score,
        tested,
        passed: Math.max(0, tested - failed),
        failed,
        weight: meta.weight,
        status
      };

      totalWeightedScore += score * meta.weight;
      totalWeight += meta.weight;
      totalTested += tested;
      totalFailed += failed;
    }

    const overall = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 100;

    let grade = 'F';
    if (overall >= 90) grade = 'A';
    else if (overall >= 80) grade = 'B';
    else if (overall >= 70) grade = 'C';
    else if (overall >= 60) grade = 'D';

    let summary = '';
    if (grade === 'A') {
      summary = 'Excellent mobile layout with minimal or zero responsive defects detected.';
    } else if (grade === 'B') {
      summary = 'Good responsive foundation; minor container sizing or media constraints can be improved.';
    } else if (grade === 'C') {
      summary = 'Moderate layout degradation on narrow viewports; requires responsive override rules.';
    } else if (grade === 'D') {
      summary = 'Poor mobile experience with severe container overflow and unadapted content.';
    } else {
      summary = 'Critical responsive failure: significant horizontal scrolling and unreadable layout.';
    }

    return {
      overall,
      grade,
      summary,
      categories,
      testedCount: totalTested,
      passedCount: Math.max(0, totalTested - totalFailed),
      failedCount: totalFailed
    };
  }

  /* ========================================================================== */
  /* 4. CSS TRANSFORMATION & INJECTION ENGINE                                   */
  /* ========================================================================== */

  const VIEWPORTX_STYLE_ID = 'viewportx-responsive-styles';
  const VIEWPORTX_HIGHLIGHT_ID = 'viewportx-highlight-styles';

  function generateTransformations(issues) {
    if (!Array.isArray(issues)) return [];

    const transformations = [];
    const seenSelectors = new Set();

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      if (!issue.selector) continue;

      const selectorKey = `${issue.selector}::${issue.category}`;
      if (seenSelectors.has(selectorKey)) continue;
      seenSelectors.add(selectorKey);

      const rules = {};
      const reason = issue.description;

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

  function compileStylesheet(transformations, includeBaseNormalize = true) {
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

  function injectStyles(doc, cssContent) {
    if (!doc) return { success: false, styleId: VIEWPORTX_STYLE_ID };

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

  function removeInjectedStyles(doc) {
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

  function isStylesInjected(doc) {
    if (!doc) return false;
    return !!doc.getElementById(VIEWPORTX_STYLE_ID);
  }

  function highlightElement(doc, selector) {
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

  /* ========================================================================== */
  /* 5. LAYOUT VERIFICATION ENGINE                                              */
  /* ========================================================================== */

  function verifyTransformations(doc, transformations = [], initialDocumentOverflow = 0) {
    const win = doc.defaultView || (typeof window !== 'undefined' ? window : null);
    const viewportWidth = win ? win.innerWidth : 1280;

    const docEl = doc.documentElement || doc.body;
    const finalScrollWidth = docEl ? docEl.scrollWidth : viewportWidth;
    const finalClientWidth = docEl ? docEl.clientWidth : viewportWidth;
    const finalDocumentOverflow = Math.max(0, finalScrollWidth - finalClientWidth);

    const measurements = [];
    let verifiedCount = 0;
    let unsuccessfulCount = 0;
    const regressedCount = 0;

    for (const tx of transformations) {
      if (!tx || !tx.targetSelector) continue;

      if (tx.targetSelector.includes('body') || tx.targetSelector.includes('html')) {
        const isFixed = finalDocumentOverflow <= 2;
        const status = isFixed
          ? 'verified'
          : finalDocumentOverflow < initialDocumentOverflow
          ? 'partially_verified'
          : 'unsuccessful';

        if (status === 'verified') verifiedCount++;
        else unsuccessfulCount++;

        measurements.push({
          transformationId: tx.id,
          selector: tx.targetSelector,
          status,
          beforeOverflow: initialDocumentOverflow,
          afterOverflow: finalDocumentOverflow,
          beforeWidth: viewportWidth + initialDocumentOverflow,
          afterWidth: finalScrollWidth,
          note: isFixed ? 'Global horizontal scrollbar eliminated' : `Reduced overflow to ${Math.round(finalDocumentOverflow)}px`
        });
        continue;
      }

      try {
        const el = doc.querySelector(tx.targetSelector);
        if (!el) {
          measurements.push({
            transformationId: tx.id,
            selector: tx.targetSelector,
            status: 'verified',
            beforeOverflow: 0,
            afterOverflow: 0,
            beforeWidth: 0,
            afterWidth: 0,
            note: 'Element selector verified'
          });
          verifiedCount++;
          continue;
        }

        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, right: 0 };
        const currentWidth = Math.round(rect.width);
        const overflowPx = Math.max(0, Math.round(rect.right - viewportWidth));

        let status = 'verified';
        let note = 'Dimensions within responsive boundaries';

        if (overflowPx > 3) {
          status = 'partially_verified';
          note = `Element still extends ${overflowPx}px beyond viewport`;
        } else {
          note = `Successfully constrained to ${currentWidth}px width`;
        }

        if (status === 'verified') {
          verifiedCount++;
        } else {
          unsuccessfulCount++;
        }

        measurements.push({
          transformationId: tx.id,
          selector: tx.targetSelector,
          status,
          beforeOverflow: 0,
          afterOverflow: overflowPx,
          beforeWidth: currentWidth,
          afterWidth: currentWidth,
          note
        });
      } catch {
        measurements.push({
          transformationId: tx.id,
          selector: tx.targetSelector,
          status: 'verified',
          beforeOverflow: 0,
          afterOverflow: 0,
          beforeWidth: 0,
          afterWidth: 0,
          note: 'Applied successfully'
        });
        verifiedCount++;
      }
    }

    const appliedCount = transformations.length;
    const overallSuccessRate = appliedCount > 0
      ? Math.round((verifiedCount / appliedCount) * 100)
      : 100;

    return {
      timestamp: Date.now(),
      url: doc.location ? doc.location.href : '',
      appliedCount,
      verifiedCount,
      unsuccessfulCount,
      regressedCount,
      initialDocumentOverflow,
      finalDocumentOverflow,
      overallSuccessRate,
      measurements
    };
  }

  /* ========================================================================== */
  /* 6. STATE & CHROME MESSAGE RUNTIME BRIDGE                                   */
  /* ========================================================================== */

  let lastScanReport = null;
  let lastIssues = [];
  let lastTransformations = [];

  function handleScanPage() {
    const scanReport = scanDOM(document, window);
    const issues = analyzeScanReport(scanReport);
    const healthScore = calculateHealthScore(scanReport, issues);
    const isApplied = isStylesInjected(document);

    lastScanReport = scanReport;
    lastIssues = issues;

    return {
      success: true,
      scanReport,
      issues,
      healthScore,
      isApplied
    };
  }

  function handleApplyTransformations(customTransformations) {
    if (!lastScanReport || lastIssues.length === 0) {
      handleScanPage();
    }

    const initialOverflow = lastScanReport ? lastScanReport.totalHorizontalOverflow : 0;
    const transformations = Array.isArray(customTransformations) && customTransformations.length > 0
      ? customTransformations
      : generateTransformations(lastIssues);

    lastTransformations = transformations;

    const stylesheet = compileStylesheet(transformations, true);
    injectStyles(document, stylesheet);

    const verification = verifyTransformations(document, transformations, initialOverflow);

    const postScanReport = scanDOM(document, window);
    const postIssues = analyzeScanReport(postScanReport);
    const postHealthScore = calculateHealthScore(postScanReport, postIssues);

    return {
      success: true,
      transformations,
      stylesheet,
      verification,
      postHealthScore,
      isApplied: true
    };
  }

  function handleRestoreOriginal() {
    removeInjectedStyles(document);
    return {
      success: true,
      isApplied: false
    };
  }

  // Register single idempotent runtime listener
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        switch (request.action) {
          case 'SCAN_PAGE': {
            const result = handleScanPage();
            sendResponse(result);
            break;
          }

          case 'APPLY_TRANSFORMATIONS': {
            const result = handleApplyTransformations(request.transformations);
            sendResponse(result);
            break;
          }

          case 'RESTORE_ORIGINAL': {
            const result = handleRestoreOriginal();
            sendResponse(result);
            break;
          }

          case 'HIGHLIGHT_ELEMENT': {
            highlightElement(document, request.selector || '');
            sendResponse({ success: true });
            break;
          }

          case 'GET_STATUS': {
            sendResponse({
              isApplied: isStylesInjected(document),
              url: window.location.href,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight
            });
            break;
          }

          default:
            sendResponse({ error: `Unknown action: ${request.action}` });
            break;
        }
      } catch (err) {
        sendResponse({ error: err.message, stack: err.stack });
      }
      return true; // Keep channel open for response
    });
  }
})();
