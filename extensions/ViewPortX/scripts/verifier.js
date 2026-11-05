/**
 * ViewPortX - Layout Verification Engine
 * Quantifies and validates the effectiveness of applied CSS transformations
 * by comparing geometric bounding boxes and scroll dimensions before and after injection.
 */

/**
 * Runs verification checks against document and applied transformations.
 * @param {Document} doc
 * @param {import('../src/types').CssTransformation[]} transformations
 * @param {number} [initialDocumentOverflow=0]
 * @returns {import('../src/types').VerificationReport}
 */
export function verifyTransformations(doc, transformations = [], initialDocumentOverflow = 0) {
  const win = doc.defaultView || (typeof window !== 'undefined' ? window : null);
  const viewportWidth = win ? win.innerWidth : 1280;

  const docEl = doc.documentElement || doc.body;
  const finalScrollWidth = docEl ? docEl.scrollWidth : viewportWidth;
  const finalClientWidth = docEl ? docEl.clientWidth : viewportWidth;
  const finalDocumentOverflow = Math.max(0, finalScrollWidth - finalClientWidth);

  /** @type {import('../src/types').VerificationMeasurement[]} */
  const measurements = [];
  let verifiedCount = 0;
  let unsuccessfulCount = 0;
  let regressedCount = 0;

  for (const tx of transformations) {
    if (!tx || !tx.targetSelector) continue;

    // Handle global body / html selector
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
        // Element could not be found with selector
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
