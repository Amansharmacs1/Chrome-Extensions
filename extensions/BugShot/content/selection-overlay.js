/**
 * BugShot - Region Selection Overlay
 * Full-screen interactive drag-and-drop crop overlay with floating dimension
 * badge and confirm/cancel controls. Fully self-contained and clean.
 */

(function () {
  if (typeof window !== 'undefined' && window.__BUGSHOT_SELECTION_OVERLAY__) {
    return;
  }

  let overlayContainer = null;
  let isSelecting = false;
  let startX = 0;
  let startY = 0;
  let currentRegion = null;

  function createOverlay(onConfirm, onCancel) {
    if (overlayContainer) {
      removeOverlay();
    }

    overlayContainer = document.createElement('div');
    overlayContainer.id = 'bugshot-selection-backdrop';
    overlayContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      cursor: crosshair;
      user-select: none;
      background: rgba(10, 15, 29, 0.45);
      backdrop-filter: blur(1px);
    `;

    const guideText = document.createElement('div');
    guideText.id = 'bugshot-selection-guide';
    guideText.textContent = 'Drag to select capture area • Press Esc to cancel';
    guideText.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      color: #f8fafc;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #334155;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      pointer-events: none;
      z-index: 2147483648;
    `;
    overlayContainer.appendChild(guideText);

    const selectionBox = document.createElement('div');
    selectionBox.id = 'bugshot-selection-box';
    selectionBox.style.cssText = `
      position: fixed;
      display: none;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.12);
      box-shadow: 0 0 0 99999px rgba(10, 15, 29, 0.55), 0 0 16px rgba(59, 130, 246, 0.35);
      pointer-events: none;
    `;
    overlayContainer.appendChild(selectionBox);

    const dimBadge = document.createElement('div');
    dimBadge.id = 'bugshot-selection-dim';
    dimBadge.style.cssText = `
      position: absolute;
      bottom: -28px;
      right: 0;
      background: #1e293b;
      color: #38bdf8;
      font-family: monospace;
      font-size: 11px;
      font-weight: bold;
      padding: 3px 6px;
      border-radius: 4px;
      border: 1px solid #3b82f6;
      display: none;
      white-space: nowrap;
    `;
    selectionBox.appendChild(dimBadge);

    // Floating action bar upon selection completion
    const actionBar = document.createElement('div');
    actionBar.id = 'bugshot-selection-actions';
    actionBar.style.cssText = `
      position: fixed;
      display: none;
      gap: 8px;
      padding: 6px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.5);
      z-index: 2147483649;
    `;

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '✓ Capture';
    confirmBtn.style.cssText = `
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✕ Cancel';
    cancelBtn.style.cssText = `
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 6px 12px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    `;

    actionBar.appendChild(cancelBtn);
    actionBar.appendChild(confirmBtn);
    overlayContainer.appendChild(actionBar);

    // Mouse handlers
    overlayContainer.addEventListener('mousedown', (e) => {
      if (e.target === confirmBtn || e.target === cancelBtn) return;
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      currentRegion = { x: startX, y: startY, width: 0, height: 0 };

      selectionBox.style.display = 'block';
      selectionBox.style.left = `${startX}px`;
      selectionBox.style.top = `${startY}px`;
      selectionBox.style.width = '0px';
      selectionBox.style.height = '0px';
      dimBadge.style.display = 'none';
      actionBar.style.display = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      currentRegion = { x, y, width, height };

      selectionBox.style.left = `${x}px`;
      selectionBox.style.top = `${y}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;

      dimBadge.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
      dimBadge.style.display = 'block';
    });

    window.addEventListener('mouseup', () => {
      if (!isSelecting) return;
      isSelecting = false;

      if (!currentRegion || currentRegion.width < 10 || currentRegion.height < 10) {
        selectionBox.style.display = 'none';
        return;
      }

      // Position action bar below or above selection
      let actionTop = currentRegion.y + currentRegion.height + 12;
      if (actionTop + 45 > window.innerHeight) {
        actionTop = Math.max(10, currentRegion.y - 48);
      }
      let actionLeft = currentRegion.x + (currentRegion.width / 2) - 80;
      actionLeft = Math.max(10, Math.min(window.innerWidth - 180, actionLeft));

      actionBar.style.top = `${actionTop}px`;
      actionBar.style.left = `${actionLeft}px`;
      actionBar.style.display = 'flex';
    });

    confirmBtn.addEventListener('click', () => {
      if (currentRegion && currentRegion.width >= 10 && currentRegion.height >= 10) {
        const regionWithDpr = {
          ...currentRegion,
          dpr: window.devicePixelRatio || 1
        };
        removeOverlay();
        if (typeof onConfirm === 'function') {
          onConfirm(regionWithDpr);
        }
      }
    });

    cancelBtn.addEventListener('click', () => {
      removeOverlay();
      if (typeof onCancel === 'function') {
        onCancel();
      }
    });

    // Keyboard abort with Escape
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        window.removeEventListener('keydown', onKeyDown);
        removeOverlay();
        if (typeof onCancel === 'function') {
          onCancel();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    document.body.appendChild(overlayContainer);
  }

  function removeOverlay() {
    if (overlayContainer && overlayContainer.parentNode) {
      overlayContainer.parentNode.removeChild(overlayContainer);
    }
    overlayContainer = null;
    isSelecting = false;
    currentRegion = null;
  }

  window.__BUGSHOT_SELECTION_OVERLAY__ = {
    start: createOverlay,
    cancel: removeOverlay
  };
})();
