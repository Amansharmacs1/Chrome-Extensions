/**
 * BugShot - Content Script Bridge
 * Injected into active webpages to coordinate region selection overlays,
 * scroll positioning for full-page captures, console monitoring, and metadata collection.
 * Wrapped in an IIFE with idempotency guard.
 */

(function () {
  if (typeof window !== 'undefined' && window.__BUGSHOT_CONTENT_INITIALIZED__) {
    return;
  }
  if (typeof window !== 'undefined') {
    window.__BUGSHOT_CONTENT_INITIALIZED__ = true;
  }

  // Helper for technical metadata
  function collectMetadata() {
    const nav = window.navigator || {};
    const screen = window.screen || {};

    let browserName = 'Google Chrome';
    let browserVersion = '';
    const ua = nav.userAgent || '';

    if (/Edg\/([0-9.]+)/.test(ua)) {
      browserName = 'Microsoft Edge';
      browserVersion = RegExp.$1;
    } else if (/Chrome\/([0-9.]+)/.test(ua)) {
      browserName = 'Google Chrome';
      browserVersion = RegExp.$1;
    } else if (/Firefox\/([0-9.]+)/.test(ua)) {
      browserName = 'Mozilla Firefox';
      browserVersion = RegExp.$1;
    } else if (/Safari\/([0-9.]+)/.test(ua) && !/Chrome/.test(ua)) {
      browserName = 'Apple Safari';
      browserVersion = RegExp.$1;
    }

    let os = 'Unknown OS';
    if (/Macintosh|Mac OS X/.test(ua)) os = 'macOS';
    else if (/Windows NT/.test(ua)) os = 'Windows';
    else if (/Linux/.test(ua)) os = 'Linux';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad/.test(ua)) os = 'iOS';

    // Strip sensitive auth tokens from URL
    let cleanUrl = window.location.href;
    try {
      const u = new URL(cleanUrl);
      for (const k of Array.from(u.searchParams.keys())) {
        if (/token|auth|key|secret|password|pwd|jwt/i.test(k)) {
          u.searchParams.set(k, '[REDACTED]');
        }
      }
      cleanUrl = u.toString();
    } catch {}

    return {
      url: cleanUrl,
      title: document.title || '',
      timestamp: Date.now(),
      browserName,
      browserVersion,
      userAgent: ua,
      os,
      platform: nav.platform || os,
      viewportWidth: window.innerWidth || document.documentElement.clientWidth || 0,
      viewportHeight: window.innerHeight || document.documentElement.clientHeight || 0,
      devicePixelRatio: window.devicePixelRatio || 1,
      screenWidth: screen.width || 0,
      screenHeight: screen.height || 0,
      colorDepth: screen.colorDepth || 24,
      language: nav.language || 'en',
      online: typeof nav.onLine === 'boolean' ? nav.onLine : true
    };
  }

  // Helper for network failures from Performance API
  function collectNetworkFailures() {
    if (!window.performance || typeof window.performance.getEntriesByType !== 'function') {
      return [];
    }

    const entries = window.performance.getEntriesByType('resource');
    const failures = [];

    for (const entry of entries) {
      const status = entry.responseStatus;
      if (typeof status === 'number' && status >= 400) {
        failures.push({
          id: `net_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: Date.now(),
          url: entry.name,
          status,
          statusText: `HTTP ${status}`,
          resourceType: entry.initiatorType || 'resource',
          duration: Math.round(entry.duration),
          failureReason: `HTTP Error ${status}`,
          included: true
        });
      }
    }

    return failures;
  }

  // Message listener
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        switch (request.action) {
          case 'COLLECT_PAGE_DIAGNOSTICS': {
            const meta = collectMetadata();
            const logs = window.__BUGSHOT_CONSOLE_MONITOR__ ? window.__BUGSHOT_CONSOLE_MONITOR__.getLogs() : [];
            const net = collectNetworkFailures();
            sendResponse({
              metadata: meta,
              consoleLogs: logs,
              networkInsights: net
            });
            break;
          }

          case 'START_REGION_SELECTION': {
            if (window.__BUGSHOT_SELECTION_OVERLAY__) {
              window.__BUGSHOT_SELECTION_OVERLAY__.start(
                (region) => {
                  const meta = collectMetadata();
                  const logs = window.__BUGSHOT_CONSOLE_MONITOR__ ? window.__BUGSHOT_CONSOLE_MONITOR__.getLogs() : [];
                  const net = collectNetworkFailures();

                  chrome.runtime.sendMessage({
                    type: 'REGION_CAPTURED',
                    region,
                    diagnostics: { metadata: meta, consoleLogs: logs, networkInsights: net }
                  });
                },
                () => {
                  chrome.runtime.sendMessage({ type: 'REGION_CANCELLED' });
                }
              );
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'Overlay script not available' });
            }
            break;
          }

          case 'PREPARE_FULL_PAGE_CAPTURE': {
            const docEl = document.documentElement;
            const body = document.body;

            const viewportWidth = window.innerWidth || docEl.clientWidth || 1280;
            const viewportHeight = window.innerHeight || docEl.clientHeight || 800;
            const dpr = window.devicePixelRatio || 1;

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

            const plan = {
              totalWidth,
              totalHeight,
              viewportWidth,
              viewportHeight,
              dpr,
              slices
            };

            const originalScroll = {
              x: window.scrollX || window.pageXOffset || 0,
              y: window.scrollY || window.pageYOffset || 0
            };

            const meta = collectMetadata();
            const logs = window.__BUGSHOT_CONSOLE_MONITOR__ ? window.__BUGSHOT_CONSOLE_MONITOR__.getLogs() : [];
            const net = collectNetworkFailures();

            sendResponse({
              plan,
              originalScroll,
              diagnostics: { metadata: meta, consoleLogs: logs, networkInsights: net }
            });
            break;
          }

          case 'SCROLL_TO_Y': {
            window.scrollTo(0, request.y || 0);
            sendResponse({ success: true });
            break;
          }

          case 'RESTORE_SCROLL': {
            if (request.scroll) {
              window.scrollTo(request.scroll.x || 0, request.scroll.y || 0);
            }
            sendResponse({ success: true });
            break;
          }

          case 'START_CONSOLE_MONITOR': {
            if (window.__BUGSHOT_CONSOLE_MONITOR__) {
              window.__BUGSHOT_CONSOLE_MONITOR__.start();
              sendResponse({ success: true, active: true });
            } else {
              sendResponse({ success: false, error: 'Console monitor component not loaded' });
            }
            break;
          }

          case 'STOP_CONSOLE_MONITOR': {
            if (window.__BUGSHOT_CONSOLE_MONITOR__) {
              window.__BUGSHOT_CONSOLE_MONITOR__.stop();
              sendResponse({ success: true, active: false });
            } else {
              sendResponse({ success: true, active: false });
            }
            break;
          }

          case 'GET_MONITOR_STATUS': {
            const isActive = window.__BUGSHOT_CONSOLE_MONITOR__ ? window.__BUGSHOT_CONSOLE_MONITOR__.isActive() : false;
            const logCount = window.__BUGSHOT_CONSOLE_MONITOR__ ? window.__BUGSHOT_CONSOLE_MONITOR__.getLogs().length : 0;
            sendResponse({ active: isActive, count: logCount });
            break;
          }

          default:
            sendResponse({ error: 'Unknown action: ' + request.action });
            break;
        }
      } catch (err) {
        sendResponse({ error: err.message });
      }
      return true;
    });
  }
})();
