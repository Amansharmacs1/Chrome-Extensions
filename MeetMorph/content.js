/**
 * MeetMorph - Content Script (ISOLATED Execution World)
 * Bridges communication between the extension popup/background and the page-bridge,
 * handles background persistence via chrome.storage.local, and injects a draggable floating HUD.
 */

(function () {
  'use strict';

  console.log('[MeetMorph] Content script initialized in ISOLATED world.');

  const MESSAGE_SOURCE_PAGE = 'ometv-vanish-page';
  const MESSAGE_SOURCE_CONTENT = 'ometv-vanish-content';

  let latestStatus = null;
  let floatingHudElement = null;
  let isHudMinimized = false;

  // 1. Storage Integration: Load previously saved background image and settings
  chrome.storage.local.get(['savedBackgroundDataUrl', 'snapEnabled', 'snapSensitivity', 'hudMinimized'], (data) => {
    if (data.savedBackgroundDataUrl) {
      console.log('[MeetMorph] Found stored background image, sending to page bridge...');
      postToPage('LOAD_BACKGROUND', { dataUrl: data.savedBackgroundDataUrl });
    }
    if (data.snapEnabled !== undefined || data.snapSensitivity !== undefined) {
      postToPage('SET_SNAP_CONFIG', {
        enabled: data.snapEnabled,
        sensitivity: data.snapSensitivity
      });
    }
    if (data.hudMinimized !== undefined) {
      isHudMinimized = !!data.hudMinimized;
    }
  });

  // 2. Listen for messages from the MAIN-world page-bridge
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== MESSAGE_SOURCE_PAGE) {
      return;
    }

    const { type, payload } = event.data;

    switch (type) {
      case 'STATUS_UPDATE':
        latestStatus = payload;
        updateFloatingHud(payload);
        // Relay to popup if connected
        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', payload }).catch(() => {});
        break;

      case 'BACKGROUND_CAPTURED':
        if (payload && payload.dataUrl) {
          chrome.storage.local.set({
            savedBackgroundDataUrl: payload.dataUrl,
            backgroundMetadata: payload.metadata
          });
        }
        chrome.runtime.sendMessage({ type: 'BACKGROUND_CAPTURED', payload }).catch(() => {});
        break;

      case 'COUNTDOWN_TICK':
        showFloatingCountdown(payload.secondsRemaining);
        chrome.runtime.sendMessage({ type: 'COUNTDOWN_TICK', payload }).catch(() => {});
        break;

      case 'SNAP_TRIGGERED':
        flashFloatingSnap();
        chrome.runtime.sendMessage({ type: 'SNAP_TRIGGERED', payload }).catch(() => {});
        break;

      case 'ERROR':
        showFloatingToast(`Error: ${payload.message}`, 'error');
        chrome.runtime.sendMessage({ type: 'ERROR', payload }).catch(() => {});
        break;
    }
  });

  // 3. Listen for messages from Extension Popup or Background Worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { action, payload } = message;

    switch (action) {
      case 'GET_STATUS':
        if (latestStatus) {
          sendResponse({ status: latestStatus });
        } else {
          postToPage('GET_STATUS');
          setTimeout(() => {
            sendResponse({ status: latestStatus });
          }, 150);
          return true; // Keep channel open for async response
        }
        break;

      case 'CAPTURE_BACKGROUND':
        postToPage('CAPTURE_BACKGROUND', payload);
        sendResponse({ ok: true });
        break;

      case 'CANCEL_COUNTDOWN':
        postToPage('CANCEL_COUNTDOWN');
        sendResponse({ ok: true });
        break;

      case 'SET_MODE':
        postToPage('SET_MODE', payload);
        sendResponse({ ok: true });
        break;

      case 'TOGGLE':
        postToPage('TOGGLE');
        sendResponse({ ok: true });
        break;

      case 'SET_SNAP_CONFIG':
        postToPage('SET_SNAP_CONFIG', payload);
        if (payload.enabled !== undefined) {
          chrome.storage.local.set({ snapEnabled: payload.enabled });
        }
        if (payload.sensitivity !== undefined) {
          chrome.storage.local.set({ snapSensitivity: payload.sensitivity });
        }
        sendResponse({ ok: true });
        break;

      case 'STOP':
        postToPage('STOP');
        sendResponse({ ok: true });
        break;

      default:
        sendResponse({ ok: false, error: 'Unknown action' });
    }
  });

  function postToPage(type, payload = {}) {
    window.postMessage({
      source: MESSAGE_SOURCE_CONTENT,
      type,
      payload
    }, '*');
  }

  // 4. In-Page Floating HUD (Overlay) with Drag & Collapse Support
  function initFloatingHud() {
    if (document.getElementById('meetmorph-hud') || document.getElementById('ometv-vanish-hud')) return;

    // Detect if on Google Meet to adjust default vertical offset above Meet bottom bar
    const isGoogleMeet = window.location.hostname.includes('meet.google.com');
    const defaultBottom = isGoogleMeet ? '96px' : '24px';

    floatingHudElement = document.createElement('div');
    floatingHudElement.id = 'meetmorph-hud';
    floatingHudElement.innerHTML = `
      <style>
        #meetmorph-hud {
          position: fixed;
          bottom: ${defaultBottom};
          right: 24px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.2);
          color: #f8fafc;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          user-select: none;
          transition: transform 0.15s ease, opacity 0.2s ease;
          cursor: default;
        }
        #meetmorph-hud.minimized {
          padding: 6px 10px;
          gap: 6px;
        }
        #meetmorph-hud.minimized .hud-btn,
        #meetmorph-hud.minimized .hud-badge span,
        #meetmorph-hud.minimized .hud-snap-icon {
          display: none !important;
        }
        #meetmorph-hud.dragging {
          opacity: 0.85;
          transform: scale(1.02);
          transition: none;
        }
        #meetmorph-hud .hud-drag-handle {
          cursor: grab;
          color: #64748b;
          font-size: 14px;
          line-height: 1;
          display: flex;
          align-items: center;
        }
        #meetmorph-hud .hud-drag-handle:active {
          cursor: grabbing;
        }
        #meetmorph-hud .hud-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
        #meetmorph-hud .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #64748b;
          box-shadow: 0 0 8px currentColor;
          transition: background 0.3s;
        }
        #meetmorph-hud .status-dot.live { background: #10b981; color: #10b981; }
        #meetmorph-hud .status-dot.vanished { background: #8b5cf6; color: #8b5cf6; }
        #meetmorph-hud .status-dot.countdown { background: #f59e0b; color: #f59e0b; }
        #meetmorph-hud .hud-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #f8fafc;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s ease;
        }
        #meetmorph-hud .hud-btn:hover {
          background: rgba(255, 255, 255, 0.18);
          transform: translateY(-1px);
        }
        #meetmorph-hud .hud-btn:active {
          transform: translateY(0);
        }
        #meetmorph-hud .hud-btn.vanish-btn {
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          border-color: #8b5cf6;
          box-shadow: 0 2px 10px rgba(124, 58, 237, 0.35);
        }
        #meetmorph-hud .hud-btn.return-btn {
          background: linear-gradient(135deg, #059669, #10b981);
          border-color: #10b981;
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.35);
        }
        #meetmorph-hud .hud-snap-icon {
          font-size: 14px;
          opacity: 0.4;
          transition: opacity 0.2s, transform 0.2s;
        }
        #meetmorph-hud .hud-snap-icon.active {
          opacity: 1;
        }
        #meetmorph-hud .hud-snap-icon.flash {
          transform: scale(1.4);
          filter: drop-shadow(0 0 6px #38bdf8);
        }
        #meetmorph-hud .hud-collapse-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 12px;
          padding: 2px 4px;
          line-height: 1;
        }
        #meetmorph-hud .hud-collapse-btn:hover {
          color: #f8fafc;
        }
        #meetmorph-toast {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.95);
          color: #f8fafc;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          z-index: 2147483647;
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 8px 24px rgba(0,0,0,0.6);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
        }
        #meetmorph-countdown-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 2147483646;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          user-select: none;
        }
        #meetmorph-countdown-num {
          font-size: 120px;
          font-weight: 800;
          color: #38bdf8;
          text-shadow: 0 0 40px rgba(56, 189, 248, 0.8);
          animation: meetmorph-pulse 1s infinite alternate;
        }
        @keyframes meetmorph-pulse {
          0% { transform: scale(0.9); }
          100% { transform: scale(1.1); }
        }
      </style>

      <span class="hud-drag-handle" id="hud-drag-handle" title="Drag to reposition">⋮⋮</span>

      <div class="hud-badge" id="hud-badge-container">
        <div class="status-dot" id="hud-status-dot"></div>
        <span id="hud-status-text">MeetMorph Ready</span>
      </div>

      <button class="hud-btn" id="hud-capture-btn" title="Capture clean room background">
        📸 Capture
      </button>

      <button class="hud-btn vanish-btn" id="hud-toggle-btn">
        ✨ Vanish
      </button>

      <span class="hud-snap-icon" id="hud-snap-indicator" title="Snap detection">🫰</span>

      <button class="hud-collapse-btn" id="hud-collapse-btn" title="Collapse / Expand HUD">
        ${isHudMinimized ? '◻' : '—'}
      </button>
    `;

    document.body.appendChild(floatingHudElement);

    if (isHudMinimized) {
      floatingHudElement.classList.add('minimized');
    }

    // Set up dragging and controls
    setupHudInteractivity();
  }

  function setupHudInteractivity() {
    const toggleBtn = document.getElementById('hud-toggle-btn');
    const captureBtn = document.getElementById('hud-capture-btn');
    const collapseBtn = document.getElementById('hud-collapse-btn');
    const dragHandle = document.getElementById('hud-drag-handle');
    const badgeContainer = document.getElementById('hud-badge-container');

    toggleBtn.addEventListener('click', () => {
      postToPage('TOGGLE');
    });

    captureBtn.addEventListener('click', () => {
      postToPage('CAPTURE_BACKGROUND', { seconds: 3 });
    });

    // Minimize / Expand
    function toggleCollapse() {
      isHudMinimized = !isHudMinimized;
      floatingHudElement.classList.toggle('minimized', isHudMinimized);
      collapseBtn.textContent = isHudMinimized ? '◻' : '—';
      chrome.storage.local.set({ hudMinimized: isHudMinimized });
    }

    collapseBtn.addEventListener('click', toggleCollapse);
    badgeContainer.addEventListener('click', (e) => {
      if (isHudMinimized) toggleCollapse();
    });

    // Draggable functionality
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    dragHandle.addEventListener('mousedown', (e) => {
      isDragging = true;
      floatingHudElement.classList.add('dragging');
      startX = e.clientX;
      startY = e.clientY;

      const rect = floatingHudElement.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      // Unset bottom/right to prevent conflict with left/top
      floatingHudElement.style.bottom = 'auto';
      floatingHudElement.style.right = 'auto';
      floatingHudElement.style.left = `${initialLeft}px`;
      floatingHudElement.style.top = `${initialTop}px`;

      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const newLeft = Math.max(10, Math.min(window.innerWidth - 80, initialLeft + dx));
      const newTop = Math.max(10, Math.min(window.innerHeight - 50, initialTop + dy));

      floatingHudElement.style.left = `${newLeft}px`;
      floatingHudElement.style.top = `${newTop}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        floatingHudElement.classList.remove('dragging');
      }
    });
  }

  function updateFloatingHud(status) {
    if (!floatingHudElement) {
      if (document.body) initFloatingHud();
      else return;
    }

    const dot = document.getElementById('hud-status-dot');
    const text = document.getElementById('hud-status-text');
    const toggleBtn = document.getElementById('hud-toggle-btn');
    const snapIcon = document.getElementById('hud-snap-indicator');

    if (!dot || !text || !toggleBtn) return;

    if (status.snapEnabled) {
      snapIcon.classList.add('active');
    } else {
      snapIcon.classList.remove('active');
    }

    if (status.state === 'COUNTDOWN') {
      dot.className = 'status-dot countdown';
      text.textContent = 'Capturing...';
    } else if (status.isVanished) {
      dot.className = 'status-dot vanished';
      text.textContent = 'Vanished';
      toggleBtn.className = 'hud-btn return-btn';
      toggleBtn.innerHTML = '👤 Return';
    } else if (status.hasRawStream) {
      dot.className = 'status-dot live';
      text.textContent = 'Live';
      toggleBtn.className = 'hud-btn vanish-btn';
      toggleBtn.innerHTML = '✨ Vanish';
    } else {
      dot.className = 'status-dot';
      text.textContent = 'Standby';
    }
  }

  function showFloatingCountdown(secondsRemaining) {
    let overlay = document.getElementById('meetmorph-countdown-overlay');

    if (secondsRemaining <= 0) {
      if (overlay) overlay.remove();
      showFloatingToast('Background Captured Successfully!', 'success');
      return;
    }

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'meetmorph-countdown-overlay';
      overlay.innerHTML = `
        <div id="meetmorph-countdown-num">${secondsRemaining}</div>
        <div style="font-size: 24px; font-weight: 600; margin-top: 16px;">Step out of the camera frame!</div>
        <div style="font-size: 14px; opacity: 0.7; margin-top: 8px;">Capturing clean room background...</div>
      `;
      document.body.appendChild(overlay);
    } else {
      const num = document.getElementById('meetmorph-countdown-num');
      if (num) num.textContent = secondsRemaining;
    }
  }

  function flashFloatingSnap() {
    const snapIcon = document.getElementById('hud-snap-indicator');
    if (snapIcon) {
      snapIcon.classList.add('flash');
      setTimeout(() => snapIcon.classList.remove('flash'), 300);
    }
    showFloatingToast('Snap detected! Toggled.', 'info');
  }

  function showFloatingToast(message, type = 'info') {
    let toast = document.getElementById('meetmorph-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'meetmorph-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.borderColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#38bdf8';
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
    }, 2800);
  }

  // Ensure DOM is ready for floating HUD
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloatingHud);
  } else {
    initFloatingHud();
  }
})();
