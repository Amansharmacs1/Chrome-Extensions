/**
 * BugShot - Full Page Screenshot Stitcher
 * Calculates precise scroll strides, manages viewport slice capturing,
 * stitches images onto an HTML5 Canvas, and cleanly trims overlapping bottom slices.
 */

/**
 * Calculates page dimensions and slice capture schedule
 * @param {Document} doc
 * @param {Window} win
 * @returns {{ totalWidth: number, totalHeight: number, viewportWidth: number, viewportHeight: number, dpr: number, slices: Array<{ y: number, height: number, isLast: boolean }> }}
 */
export function calculateStitchPlan(doc, win) {
  const docEl = doc.documentElement;
  const body = doc.body;

  const viewportWidth = win.innerWidth || docEl.clientWidth || 1280;
  const viewportHeight = win.innerHeight || docEl.clientHeight || 800;
  const dpr = win.devicePixelRatio || 1;

  const totalWidth = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0, viewportWidth);
  const totalHeight = Math.max(docEl.scrollHeight, body ? body.scrollHeight : 0, viewportHeight);

  const slices = [];
  let currentY = 0;

  while (currentY < totalHeight) {
    const remaining = totalHeight - currentY;
    const sliceHeight = Math.min(viewportHeight, remaining);
    const isLast = (currentY + sliceHeight) >= totalHeight;

    slices.push({
      y: currentY,
      height: sliceHeight,
      isLast
    });

    if (isLast) break;
    currentY += viewportHeight;
  }

  return {
    totalWidth,
    totalHeight,
    viewportWidth,
    viewportHeight,
    dpr,
    slices
  };
}

/**
 * Stitches captured slice Data URLs onto a single destination canvas and returns PNG Data URL
 * @param {Array<{ dataUrl: string, slice: { y: number, height: number, isLast: boolean } }>} capturedSlices
 * @param {{ totalWidth: number, totalHeight: number, viewportWidth: number, viewportHeight: number, dpr: number }} plan
 * @returns {Promise<string>} PNG Data URL
 */
export async function stitchSlicesToDataUrl(capturedSlices, plan) {
  if (typeof document === 'undefined') {
    // Testing environment fallback
    return capturedSlices[0]?.dataUrl || '';
  }

  const { totalWidth, totalHeight, viewportWidth, viewportHeight, dpr } = plan;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(totalWidth * dpr);
  canvas.height = Math.round(totalHeight * dpr);
  const ctx = canvas.getContext('2d');

  for (const item of capturedSlices) {
    const { dataUrl, slice } = item;
    if (!dataUrl) continue;

    const img = await loadImage(dataUrl);
    const sourceY = slice.isLast && slice.height < viewportHeight
      ? Math.round((viewportHeight - slice.height) * dpr)
      : 0;
    const sourceHeight = Math.round(slice.height * dpr);
    const destY = Math.round(slice.y * dpr);

    ctx.drawImage(
      img,
      0,
      sourceY,
      Math.round(viewportWidth * dpr),
      sourceHeight,
      0,
      destY,
      Math.round(viewportWidth * dpr),
      sourceHeight
    );
  }

  return canvas.toDataURL('image/png');
}

/**
 * Crops a specific bounding box region from a full viewport image
 * @param {string} fullImageDataUrl
 * @param {{ x: number, y: number, width: number, height: number }} region
 * @param {number} [dpr=1]
 * @returns {Promise<string>}
 */
export async function cropRegionFromImage(fullImageDataUrl, region, dpr = 1) {
  if (typeof document === 'undefined') {
    return fullImageDataUrl;
  }

  const img = await loadImage(fullImageDataUrl);
  const canvas = document.createElement('canvas');

  const cropW = Math.round(region.width * dpr);
  const cropH = Math.round(region.height * dpr);
  const cropX = Math.round(region.x * dpr);
  const cropY = Math.round(region.y * dpr);

  canvas.width = Math.max(1, cropW);
  canvas.height = Math.max(1, cropH);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return canvas.toDataURL('image/png');
}

/**
 * Helper to wrap image loading in a promise
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image slice: ' + e));
    img.src = src;
  });
}
