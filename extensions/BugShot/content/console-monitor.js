/**
 * BugShot - Console & Error Monitor
 * Non-intrusively captures JavaScript runtime errors, unhandled promise rejections,
 * and console.error/warn messages on the active tab without modifying app state.
 */

(function () {
  if (typeof window !== 'undefined' && window.__BUGSHOT_CONSOLE_MONITOR__) {
    return;
  }

  const state = {
    isMonitoring: false,
    logs: [],
    originalConsoleError: null,
    originalConsoleWarn: null,
    errorHandler: null,
    rejectionHandler: null
  };

  /**
   * Sanitizes text strings to avoid leaking tokens
   */
  function sanitizeText(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/(token|auth|key|secret|password|pwd|jwt)=[a-zA-Z0-9_\-\.%]+/gi, '$1=[REDACTED]');
  }

  function addLog(level, message, stack = '', source = '', line = 0, col = 0) {
    if (!state.isMonitoring) return;

    const cleanMsg = sanitizeText(String(message || ''));
    // Deduplicate identical error within 500ms
    const recentDuplicate = state.logs.find(l =>
      l.message === cleanMsg && (Date.now() - l.timestamp) < 500
    );
    if (recentDuplicate) return;

    state.logs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      level,
      message: cleanMsg,
      stack: stack ? sanitizeText(String(stack)) : undefined,
      source: source || undefined,
      line: line || undefined,
      col: col || undefined,
      included: true
    });

    // Keep ceiling of last 100 logs
    if (state.logs.length > 100) {
      state.logs.shift();
    }
  }

  function start() {
    if (state.isMonitoring) return;
    state.isMonitoring = true;

    // 1. Window Error Event
    state.errorHandler = (event) => {
      addLog(
        'error',
        event.message || 'Script error',
        event.error?.stack || '',
        event.filename,
        event.lineno,
        event.colno
      );
    };
    window.addEventListener('error', state.errorHandler);

    // 2. Unhandled Promise Rejection
    state.rejectionHandler = (event) => {
      const reason = event.reason;
      const msg = typeof reason === 'object' && reason ? (reason.message || String(reason)) : String(reason);
      const stack = typeof reason === 'object' && reason ? reason.stack : '';
      addLog('error', `Unhandled Promise Rejection: ${msg}`, stack);
    };
    window.addEventListener('unhandledrejection', state.rejectionHandler);

    // 3. Console.error hook
    state.originalConsoleError = console.error;
    console.error = function (...args) {
      try {
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        addLog('error', msg);
      } catch {}
      state.originalConsoleError.apply(console, args);
    };

    // 4. Console.warn hook
    state.originalConsoleWarn = console.warn;
    console.warn = function (...args) {
      try {
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        addLog('warn', msg);
      } catch {}
      state.originalConsoleWarn.apply(console, args);
    };
  }

  function stop() {
    if (!state.isMonitoring) return;
    state.isMonitoring = false;

    if (state.errorHandler) {
      window.removeEventListener('error', state.errorHandler);
      state.errorHandler = null;
    }
    if (state.rejectionHandler) {
      window.removeEventListener('unhandledrejection', state.rejectionHandler);
      state.rejectionHandler = null;
    }
    if (state.originalConsoleError) {
      console.error = state.originalConsoleError;
      state.originalConsoleError = null;
    }
    if (state.originalConsoleWarn) {
      console.warn = state.originalConsoleWarn;
      state.originalConsoleWarn = null;
    }
  }

  function getLogs() {
    return [...state.logs];
  }

  function clearLogs() {
    state.logs = [];
  }

  window.__BUGSHOT_CONSOLE_MONITOR__ = {
    start,
    stop,
    getLogs,
    clearLogs,
    isActive: () => state.isMonitoring
  };
})();
