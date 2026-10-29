# 🏛️ NewTab Pro — System Architecture

**NewTab Pro** is an open-source, local-first new-tab dashboard engineered for Google Chrome under **Manifest V3**.

This document outlines the architectural principles, component structure, state lifecycle, storage synchronization, and security model.

---

## 1. Architectural Principles

1. **Local-First & Offline Resilience:** Every core feature (clock, search, shortcuts, tasks, habits, focus timer, calculator, world clock, quotes, scratchpad, themes, templates) functions entirely offline without remote servers or authentication.
2. **Minimal Manifest V3 Footprint:** Requests only `chrome.storage.local`. No background service worker, no alarms, no tab queries, and no broad host permissions.
3. **Vanilla JavaScript & CSS:** Zero frontend frameworks (no React, Vue, or Webpack required at runtime). Uses standard ES6 modules natively supported by modern Chromium.
4. **Defensive State Management:** Schemas are explicitly versioned (`schemaVersion: 1`). Malformed, corrupted, or null data structures gracefully fall back to defaults without crashing the dashboard.
5. **Cross-Tab Synchronization:** Multiple open tabs automatically sync state using Chrome storage listeners and the DOM Storage API.

---

## 2. Module Overview

| Module | Responsibility |
|---|---|
| [`newtab.js`](./newtab.js) | Central controller. Initializes components, binds DOM listeners, handles modal dialogs, and coordinates cross-widget state. |
| [`modules/storage.js`](./modules/storage.js) | Manages `chrome.storage.local` with in-memory/`localStorage` fallback, versioning, defensive schema migration, and change dispatching. |
| [`modules/templates.js`](./modules/templates.js) | Defines 6 workspace templates (Balanced, Zen Minimalist, Developer, Student, Habits, Executive) and applies them to state. |
| [`modules/clock.js`](./modules/clock.js) | Pure time and date formatting functions, 12h/24h conversion, running seconds support, and time-aware greeting generator. |
| [`modules/search.js`](./modules/search.js) | Safe search query builder with allowlisted engines (Google, DuckDuckGo, Bing, Brave), URL detection, and dangerous scheme neutralization. |
| [`modules/shortcuts.js`](./modules/shortcuts.js) | Shortcut data model, CRUD actions, deterministic initials/palette generation, and accessible reordering. |
| [`modules/tasks.js`](./modules/tasks.js) | Daily task operations, status toggling, date-key grouping (`YYYY-MM-DD`), filtering, and completion progress metrics. |
| [`modules/habits.js`](./modules/habits.js) | Recurring daily habit tracking, today check-off, and consecutive day streak calculations (`🔥 Xd`). |
| [`modules/focus-timer.js`](./modules/focus-timer.js) | Pomodoro timer state machine supporting Focus (25m), Short Break (5m), and Long Break (15m) with session counting. |
| [`modules/calculator.js`](./modules/calculator.js) | Arithmetic calculator state machine handling addition, subtraction, multiplication, division, percentage, and sign negation. |
| [`modules/world-clock.js`](./modules/world-clock.js) | Multiple global timezone formatter using `Intl.DateTimeFormat` with relative day indicators (*Tomorrow* / *Yesterday*). |
| [`modules/quotes.js`](./modules/quotes.js) | Offline library of 20+ curated philosophy, productivity, and tech quotes with shuffling and clipboard copying. |
| [`modules/scratchpad.js`](./modules/scratchpad.js) | Debounced local notepad buffer (400ms) with character/word counting and immediate unload flushing. |
| [`modules/weather.js`](./modules/weather.js) | Privacy-friendly Open-Meteo integration, manual city geocoding, Celsius/Fahrenheit conversion, and 30-minute response caching. |
| [`modules/themes.js`](./modules/themes.js) | CSS variable theme tokens (Midnight, Ocean, Aurora, Light, Minimal), background presets, and custom CSS background injection. |
| [`modules/widgets.js`](./modules/widgets.js) | Widget registry for 13 widgets, visibility toggle state, and keyboard accessible reordering helpers. |

---

## 3. State Lifecycle and Schema Versioning

### Data Model (`newtab_pro_state`)

```json
{
  "schemaVersion": 1,
  "preferences": {
    "userName": "Alex",
    "timeFormat": "12h",
    "showSeconds": false,
    "searchEngine": "google",
    "openInNewTab": false,
    "theme": "midnight",
    "backgroundPreset": "mesh-midnight",
    "customBackground": "",
    "activeTemplate": "default"
  },
  "shortcuts": [
    {
      "id": "sc-1700000000-xyz",
      "title": "GitHub",
      "url": "https://github.com",
      "color": "#24292F",
      "sortOrder": 0,
      "createdAt": 1700000000000
    }
  ],
  "tasks": [
    {
      "id": "task-1700000000-abc",
      "title": "Refactor storage module",
      "completed": false,
      "createdAt": 1700000000000,
      "completedAt": null,
      "dateKey": "2026-10-29"
    }
  ],
  "habits": [
    {
      "id": "habit-1",
      "title": "Drink 2L Water",
      "icon": "💧",
      "history": { "2026-10-29": true }
    }
  ],
  "focusTimer": {
    "mode": "focus",
    "timeLeft": 1500,
    "sessionsCompleted": 3
  },
  "worldClock": {
    "cities": ["lon", "nyc", "tyo"]
  },
  "quote": {
    "currentQuoteIndex": 0
  },
  "widgets": [
    { "id": "clock", "enabled": true, "order": 0 },
    { "id": "search", "enabled": true, "order": 1 },
    { "id": "shortcuts", "enabled": true, "order": 2 },
    { "id": "quickTools", "enabled": true, "order": 3 },
    { "id": "tasks", "enabled": true, "order": 4 },
    { "id": "progress", "enabled": true, "order": 5 },
    { "id": "habits", "enabled": false, "order": 6 },
    { "id": "focusTimer", "enabled": false, "order": 7 },
    { "id": "scratchpad", "enabled": true, "order": 8 },
    { "id": "calculator", "enabled": false, "order": 9 },
    { "id": "worldClock", "enabled": false, "order": 10 },
    { "id": "quote", "enabled": true, "order": 11 },
    { "id": "weather", "enabled": false, "order": 12 }
  ],
  "scratchpad": {
    "content": "Jotting down quick notes...",
    "lastUpdated": 1700000000000
  },
  "weather": {
    "enabled": false,
    "city": "London, United Kingdom",
    "latitude": 51.5074,
    "longitude": -0.1278,
    "unit": "c",
    "lastFetched": 1700000000000,
    "cachedData": {
      "temperature": 18,
      "unit": "°C",
      "conditionLabel": "Partly Cloudy",
      "icon": "cloud-sun"
    }
  }
}
```

---

## 4. Security & Isolation

- **Zero Remote Scripts:** No remote `<script>` tags, CDN dependencies, or eval invocations. All logic resides strictly inside the unpacked extension directory.
- **Safe Search Navigation:** Search queries are strictly encoded with `encodeURIComponent()`. If direct navigation is triggered, the URL is parsed with the browser's `URL` constructor to ensure only `http:` and `https:` schemes are opened. Schemes like `javascript:`, `data:`, and `file:` are immediately blocked.
- **No Injected Content Scripts:** NewTab Pro only executes inside its own sandboxed new-tab page (`newtab.html`), never inspecting or injecting scripts into external web pages.
