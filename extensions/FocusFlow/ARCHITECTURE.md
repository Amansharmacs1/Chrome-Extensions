# 🏛️ FocusFlow Architecture

This document describes the software architecture, design principles, state machines, and lifecycle management of the **FocusFlow** Chrome Extension.

---

## 1. High-Level Architecture Overview

FocusFlow is built as a pure **Chrome Extension Manifest V3** application with zero external runtime dependencies, zero analytics, and zero external network calls.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              USER LAYER                                │
│                                                                        │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │    Popup (popup.html)     │      │   Dashboard (dashboard.html)│   │
│   │  • Circular Timer Hero    │      │  • Expansive Timer Dial     │   │
│   │  • Task List & Filters    │      │  • Full Kanban/Task Board   │   │
│   │  • Today's Insights       │      │  • 7-Day Trend Bar Chart    │   │
│   │  • Quick Settings         │      │  • Historical Log Table     │   │
│   └─────────────┬─────────────┘      └──────────────┬──────────────┘   │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  │ chrome.runtime.sendMessage        │
                  ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SERVICE WORKER LAYER                            │
│                                                                        │
│                       background.js (MV3 Worker)                       │
│   • Alarm Scheduling (chrome.alarms)                                   │
│   • Timer Reconciliation on Wakeup & System Boot                       │
│   • DeclarativeNetRequest Dynamic Rule Synchronizer                    │
│   • Desktop Notification Dispatcher (chrome.notifications)             │
│   • Event Broadcast Hub (TIMER_UPDATED, TIMER_COMPLETED)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
┌──────────────────────────────────┐ ┌──────────────────────────────────┐
│      CORE BUSINESS MODULES       │ │        PERSISTENCE LAYER         │
│                                  │ │                                  │
│  • timer.js (Pure state machine) │ │  chrome.storage.local            │
│  • tasks.js (CRUD & filtering)   │ │  • focusflow_settings            │
│  • analytics.js (7-day trends)   │ │  • focusflow_timer               │
│  • blocker.js (DNR rule builder) │ │  • focusflow_tasks               │
│  • sound.js (Web Audio synth)    │ │  • focusflow_history             │
│  • notifications.js (Alerts)     │ │  Schema Migrations (storage.js)  │
└──────────────────────────────────┘ └──────────────────────────────────┘
```

---

## 2. Directory & Module Structure

```text
FocusFlow/
├── manifest.json              # Manifest V3 configuration & permission declarations
├── background.js              # Background service worker
├── popup.html / popup.css / popup.js         # Quick-access popup interface
├── dashboard.html / dashboard.css / dashboard.js # Standalone full-page dashboard
├── modules/
│   ├── storage.js             # Storage management, defaults, and schema migration
│   ├── timer.js               # Pure state machine and timestamp calculations
│   ├── tasks.js               # Task CRUD, priorities, estimates, and filtering
│   ├── analytics.js           # Daily stats, 7-day bar chart calculations, summaries
│   ├── blocker.js             # Domain normalization, validation, and DNR dynamic rules
│   ├── sound.js               # Web Audio API harmonic chime synthesizer
│   └── notifications.js       # Chrome notification dispatcher
├── icons/
│   ├── icon.svg               # Vector source asset
│   ├── icon16.png             # Toolbar icon (16x16)
│   ├── icon32.png             # Retina toolbar icon (32x32)
│   ├── icon48.png             # Extensions page icon (48x48)
│   └── icon128.png            # Chrome Web Store & notification icon (128x128)
├── tests/
│   ├── timer.test.js          # Unit tests for timer calculations and transitions
│   ├── tasks.test.js          # Unit tests for task operations
│   ├── analytics.test.js      # Unit tests for statistics and date boundaries
│   ├── blocker.test.js        # Unit tests for domain validation and DNR rules
│   ├── storage.test.js        # Unit tests for migrations and sanitization
│   ├── manifest.test.js       # Manifest V3 compliance and security audit
│   └── run-all.js             # Automated master test runner
└── package.json               # Project manifest with npm test runner
```

---

## 3. Timer State Machine & Service Worker Resilience

### The Manifest V3 Idle Service Worker Challenge
In Chrome Manifest V3, background service workers suspend execution after approximately 30 seconds of inactivity. Relying on continuous JavaScript timers (`setInterval` or `setTimeout`) in the service worker leads to frozen timers and missed completions.

### The FocusFlow Timestamp Solution
FocusFlow solves this by treating time as an **authoritative timestamp delta**:
1. When a session starts:
   - `startTimestamp = Date.now()`
   - `targetEndTimestamp = startTimestamp + (durationSeconds * 1000)`
   - An exact Chrome alarm is scheduled: `chrome.alarms.create(ALARM_NAME, { when: targetEndTimestamp })`
   - State is persisted to `chrome.storage.local`.
2. While running:
   - UI countdowns interpolate remaining seconds purely as:
     $$\text{remainingSeconds} = \max\left(0, \left\lceil \frac{\text{targetEndTimestamp} - \text{Date.now()}}{1000} \right\rceil\right)$$
   - UI re-renders every 500ms without modifying the persisted state.
3. When the service worker wakes up or the alarm triggers:
   - Checks if `targetEndTimestamp <= Date.now()`.
   - If true, transitions to completed state, commits the session record, sends notifications, and clears the alarm.
4. Pausing and Resuming:
   - When paused, `pausedRemainingSeconds` is frozen, `targetEndTimestamp` is set to `null`, and any pending alarm is cleared.
   - When resumed, a new `targetEndTimestamp = Date.now() + pausedRemainingSeconds * 1000` is computed and a new alarm is armed.

---

## 4. Distraction Blocker Dynamic Rule Lifecycle

FocusFlow uses Chrome's official **DeclarativeNetRequest** (DNR) API:
- Domain inputs are normalized: protocols (`https://`), query strings, sub-paths, and ports are stripped.
- Domains are validated against RFC 1035 label constraints.
- Dynamic rules are generated with stable IDs (`2000 + i`):
  ```json
  {
    "id": 2000,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "||youtube.com",
      "resourceTypes": ["main_frame", "sub_frame"]
    }
  }
  ```
- **Rule Synchronization**:
  - Rules are added to Chrome only when `status === 'running'` and `mode === 'focus'` (or break if configured).
  - Rules are immediately removed when the session pauses, resets, or completes.
  - Startup reconciliation ensures no orphaned blocking rules remain if Chrome restarts.

---

## 5. Security & DOM Safety

- **Safe Text Rendering**: All user-provided strings (task titles, notes, domain names) are inserted strictly via `element.textContent` or sanitized DOM node creation. No unsafe `innerHTML` interpolation of user input is used.
- **Zero Remote Dependencies**: Fonts, scripts, and audio assets are bundled locally or synthesized directly in code (Web Audio API).
- **Strict Content Security Policy**: Inherits Manifest V3 default strict CSP (`script-src 'self'`).
