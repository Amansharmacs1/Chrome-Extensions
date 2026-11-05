/**
 * ColorPeek - Webpage Element CSS Inspector
 * Injected into active tab on user action. Highlights elements on hover and
 * inspects computed CSS colors (text, background, border, outline) with parent background compositing.
 * Fully cleans up overlay elements and event listeners upon exit.
 */

(function () {
  // Prevent duplicate inspector instances
  if (window.__COLORPEEK_INSPECTOR_ACTIVE__) {
    if (typeof window.__COLORPEEK_CLEANUP__ === 'function') {
      window.__COLORPEEK_CLEANUP__();
    }
    return;
  }
  window.__COLORPEEK_INSPECTOR_ACTIVE__ = true;

  // DOM Container Elements
  let overlayBox = null;
  let tooltipHud = null;
  let activeElement = null;

  /**
   * Helper to check if a color string is transparent
   */
  function isTransparent(colorStr) {
    if (!colorStr) return true;
    const clean = colorStr.trim().toLowerCase();
    return clean === 'transparent' || clean === 'rgba(0, 0, 0, 0)' || clean === 'rgba(0,0,0,0)' || clean === 'rgba(255, 255, 255, 0)';
  }

  /**
   * Traverses parent hierarchy to find effective visible background color
   */
  function getEffectiveBackgroundColor(elem) {
    let curr = elem;
    while (curr && curr !== document && curr !== document.documentElement) {
      const style = window.getComputedStyle(curr);
      const bg = style.backgroundColor;
      if (!isTransparent(bg)) {
        return bg;
      }
      curr = curr.parentElement;
    }
    // Default page canvas fallback
    return 'rgb(255, 255, 255)';
  }

  /**
   * Converts RGB/RGBA string to Hex for display
   */
  function rgbStringToHex(rgbStr) {
    if (!rgbStr) return '#000000';
    const match = rgbStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!match) return rgbStr;
    const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }

  /**
   * Initializes overlay & HUD tooltip
   */
  function setupUI() {
    // 1. Hover highlight box
    overlayBox = document.createElement('div');
    overlayBox.id = 'colorpeek-inspector-overlay';
    Object.assign(overlayBox.style, {
      position: 'fixed',
      pointerEvents: 'none',
      border: '2px solid #06B6D4',
      backgroundColor: 'rgba(6, 182, 212, 0.08)',
      boxShadow: '0 0 12px rgba(6, 182, 212, 0.35)',
      borderRadius: '4px',
      zIndex: '2147483646',
      display: 'none',
      transition: 'top 0.08s ease, left 0.08s ease, width 0.08s ease, height 0.08s ease'
    });
    document.documentElement.appendChild(overlayBox);

    // 2. Floating info HUD
    tooltipHud = document.createElement('div');
    tooltipHud.id = 'colorpeek-inspector-hud';
    Object.assign(tooltipHud.style, {
      position: 'fixed',
      zIndex: '2147483647',
      backgroundColor: '#0F172A',
      color: '#F8FAFC',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '10px 14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '12px',
      lineHeight: '1.4',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
      pointerEvents: 'none',
      display: 'none',
      minWidth: '220px',
      maxWidth: '320px'
    });
    document.documentElement.appendChild(tooltipHud);
  }

  /**
   * Updates overlay position and HUD content on element hover
   */
  function inspectElement(elem, mouseX, mouseY) {
    if (!elem || elem === overlayBox || elem === tooltipHud || elem === document.documentElement || elem === document.body) {
      if (overlayBox) overlayBox.style.display = 'none';
      if (tooltipHud) tooltipHud.style.display = 'none';
      return;
    }

    activeElement = elem;
    const rect = elem.getBoundingClientRect();
    const style = window.getComputedStyle(elem);

    const textColor = style.color;
    const rawBg = style.backgroundColor;
    const effectiveBg = getEffectiveBackgroundColor(elem);
    const borderColor = style.borderColor;
    const isBgTransparent = isTransparent(rawBg);

    const textHex = rgbStringToHex(textColor);
    const bgHex = rgbStringToHex(effectiveBg);
    const borderHex = rgbStringToHex(borderColor);

    // Position overlay box around element
    overlayBox.style.display = 'block';
    overlayBox.style.top = `${rect.top}px`;
    overlayBox.style.left = `${rect.left}px`;
    overlayBox.style.width = `${rect.width}px`;
    overlayBox.style.height = `${rect.height}px`;

    // Construct HUD HTML
    const tag = elem.tagName.toLowerCase();
    const classList = elem.className && typeof elem.className === 'string' ? '.' + elem.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const idStr = elem.id ? `#${elem.id}` : '';
    const selectorName = `${tag}${idStr}${classList}`.slice(0, 28);

    tooltipHud.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #1E293B; padding-bottom:6px;">
        <span style="font-weight:700; color:#38BDF8; font-family:monospace;">${selectorName}</span>
        <span style="font-size:10px; color:#94A3B8; background:#1E293B; padding:2px 6px; borderRadius:4px;">Computed CSS</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="display:inline-block; width:14px; height:14px; border-radius:3px; background:${textHex}; border:1px solid #475569;"></span>
          <span><b style="color:#94A3B8;">Text:</b> <code style="color:#F1F5F9;">${textHex}</code></span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="display:inline-block; width:14px; height:14px; border-radius:3px; background:${bgHex}; border:1px solid #475569;"></span>
          <span><b style="color:#94A3B8;">Bg:</b> <code style="color:#F1F5F9;">${bgHex}</code>${isBgTransparent ? ' <small style="color:#64748B;">(parent)</small>' : ''}</span>
        </div>
      </div>
      ${borderColor && !isTransparent(borderColor) ? `
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
        <span style="display:inline-block; width:14px; height:14px; border-radius:3px; background:${borderHex}; border:1px solid #475569;"></span>
        <span><b style="color:#94A3B8;">Border:</b> <code style="color:#F1F5F9;">${borderHex}</code></span>
      </div>` : ''}
      <div style="font-size:10px; color:#64748B; border-top:1px solid #1E293B; padding-top:6px; text-align:center;">
        Click to capture color • <kbd style="background:#1E293B; padding:1px 4px; border-radius:3px; color:#CBD5E1;">Esc</kbd> to exit
      </div>
    `;

    // Position tooltip HUD intelligently away from mouse and within viewport
    tooltipHud.style.display = 'block';
    const hudW = tooltipHud.offsetWidth || 240;
    const hudH = tooltipHud.offsetHeight || 130;

    let posX = mouseX + 16;
    let posY = mouseY + 16;

    if (posX + hudW > window.innerWidth - 10) {
      posX = mouseX - hudW - 16;
    }
    if (posY + hudH > window.innerHeight - 10) {
      posY = mouseY - hudH - 16;
    }

    tooltipHud.style.left = `${Math.max(10, posX)}px`;
    tooltipHud.style.top = `${Math.max(10, posY)}px`;
  }

  // Event Listeners
  function handleMouseMove(e) {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    inspectElement(target, e.clientX, e.clientY);
  }

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (activeElement) {
      const style = window.getComputedStyle(activeElement);
      const textHex = rgbStringToHex(style.color);
      const bgHex = rgbStringToHex(getEffectiveBackgroundColor(activeElement));

      // Prefer background if opaque, otherwise text color
      const chosenHex = !isTransparent(style.backgroundColor) ? bgHex : textHex;

      // Save chosen color to storage
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          colorpeek_active_color: chosenHex,
          colorpeek_last_inspected: {
            hex: chosenHex,
            textHex,
            bgHex,
            tag: activeElement.tagName.toLowerCase(),
            timestamp: Date.now()
          }
        });
      }

      cleanup();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
    }
  }

  function cleanup() {
    window.removeEventListener('mousemove', handleMouseMove, true);
    window.removeEventListener('click', handleClick, true);
    window.removeEventListener('keydown', handleKeyDown, true);

    if (overlayBox && overlayBox.parentNode) {
      overlayBox.parentNode.removeChild(overlayBox);
    }
    if (tooltipHud && tooltipHud.parentNode) {
      tooltipHud.parentNode.removeChild(tooltipHud);
    }

    window.__COLORPEEK_INSPECTOR_ACTIVE__ = false;
    delete window.__COLORPEEK_CLEANUP__;
  }

  window.__COLORPEEK_CLEANUP__ = cleanup;

  // Mount
  setupUI();
  window.addEventListener('mousemove', handleMouseMove, true);
  window.addEventListener('click', handleClick, true);
  window.addEventListener('keydown', handleKeyDown, true);
})();
