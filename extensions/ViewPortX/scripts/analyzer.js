/**
 * ViewPortX - Rule-Based Responsive Issue Detection Engine
 * Inspects DOMScanReport data against responsive web design heuristics,
 * identifying fixed-width containers, un-wrapped flex/grids, overflowing media,
 * unscrollable tables, clipped typography, and touch target deficiencies.
 */

/**
 * Analyzes a DOMScanReport and returns a deduplicated list of detected responsive issues.
 * @param {import('../src/types').DOMScanReport} scanReport
 * @returns {import('../src/types').ResponsiveIssue[]}
 */
export function analyzeScanReport(scanReport) {
  if (!scanReport || !Array.isArray(scanReport.elements)) {
    return [];
  }

  /** @type {import('../src/types').ResponsiveIssue[]} */
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

    // Helper to add issue if selector + category combo is not duplicate
    const pushIssue = (issue) => {
      const key = `${issue.selector}::${issue.category}`;
      if (!seenSelectors.has(key)) {
        seenSelectors.add(key);
        issues.push(issue);
      }
    };

    const parsedWidth = parseFloat(computed.width || '0');
    const parsedHeight = parseFloat(computed.height || '0');
    const parsedMaxWidth = parseFloat(computed.maxWidth || '0');

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
      // Check if grid defines multiple fixed px columns
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

    // Flex child with flex-shrink: 0 and wide width
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

  // Sort issues by severity priority: critical > high > medium > low > info
  const severityWeight = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  issues.sort((a, b) => (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0));

  return issues;
}
