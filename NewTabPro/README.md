# 🌌 NewTab Pro

**Your browser. Your space. Your flow.**

NewTab Pro is a premium, customizable, local-first new-tab dashboard for Google Chrome. It replaces Chrome's default new-tab page with a fast, elegant, distraction-free workspace that unifies time, search, quick links, daily tasks, habit streaks, Pomodoro focus timer, international world clock, instant calculator, daily inspiration, a quick scratchpad, and customizable workspace templates.

Built strictly with vanilla JavaScript, HTML5, CSS3, and Chrome Extension Manifest V3. Zero tracking. Zero remote executable dependencies. Instant load times.

---

## 🚀 Workspace Templates (One-Click Setup)

NewTab Pro includes **6 curated workspace templates** tailored for specific workflows. Switch instantly from the header pill or **Settings > Templates**:

| Template | Focus & Purpose | Active Widgets & Presets |
|---|---|---|
| **Balanced Flow (Default)** | Classic balanced dashboard for everyday browsing. | Clock, Search, Shortcuts, Tasks, Progress, Scratchpad, Quotes, Launcher. Theme: *Midnight*. |
| **Zen Minimalist** | Ultra-clean, distraction-free workspace. | Digital Clock, Minimal Search, Focus Timer, Quotes. Theme: *Minimal Mono*. |
| **Developer Workstation** | Built for engineers and coders. | Search, Curated Dev Shortcuts (GitHub, StackOverflow, MDN, Dev.to), Tasks, Notes, World Clock, Calculator, Launcher. Theme: *Aurora Borealis*. |
| **Student Study Hall** | Tailored for research and study sessions. | Pomodoro Focus Timer, Tasks, Scratchpad, Quick Calculator, Habits, Quotes, Academic Shortcuts. Theme: *Clean Light*. |
| **Habit & Goal Master** | Daily personal growth and consistency. | Habit Tracker with Streaks, Daily Tasks, Progress Ring, Quotes, Weather. Theme: *Ocean Deep*. |
| **Global Executive** | International agenda and time awareness. | World Timezones (London, NY, Tokyo), Weather briefing, Agenda checklist, Calculator, Quick Links. Theme: *Midnight Dusk*. |

---

## ✨ 13 Modular Widgets

- **🕒 Modern Time & Greeting:**
  - Real-time digital clock with 12-hour (AM/PM) and 24-hour military format support.
  - Optional running seconds toggle.
  - Complete weekday, date, and month formatting.
  - Time-aware greetings (Morning, Afternoon, Evening, Night) with optional custom display name.

- **⏱️ Focus Timer (Pomodoro):**
  - Dedicated 25-minute Focus, 5-minute Short Break, and 15-minute Long Break intervals.
  - Visual linear progress bar and session count tracking badge.
  - Start, Pause, and Reset controls.

- **🔥 Habit Tracker & Daily Streaks:**
  - Track recurring daily habits (e.g. *Drink 2L Water*, *Read 20 Mins*, *Code / Build*).
  - One-click daily check-off with date-aware history.
  - Automatically calculates consecutive day streaks (`🔥 5d`).
  - Add custom habits with custom emoji icons.

- **📜 Daily Quotes & Inspiration:**
  - Curated offline collection of Stoic philosophy, computer science, and innovation quotes.
  - Shuffle button to cycle quotes and one-click copy to clipboard.

- **🌍 World Clock:**
  - Monitor international timezones simultaneously (New York, San Francisco, London, Paris, Tokyo, Dubai, Sydney, Singapore).
  - Displays local time, AM/PM, and relative day indicator (*Tomorrow* / *Yesterday*).

- **🧮 Quick Calculator:**
  - Compact arithmetic calculator right inside your new tab without switching windows.
  - Addition, subtraction, multiplication, division, percentage, and sign negation.

- **⚡ Quick Tools / Browser Launcher:**
  - Quick launch pills for Chrome internal pages: Downloads, Bookmarks, History, and Extensions.

- **🔍 Centered Quick Search & Safe URL Navigation:**
  - Centered search input with keyboard shortcut (`/`) to focus.
  - Allowlisted search engines: **Google**, **DuckDuckGo**, **Bing**, and **Brave Search**.
  - Direct URL detection and navigation (e.g. `github.com`).
  - Strict protocol validation rejecting malicious schemes (`javascript:`, `data:`, `file:`).

- **⚡ Quick Links & Bookmarks:**
  - Add, edit, reorder, and remove frequently used websites.
  - Automatic website logo & favicon fetching via Chrome's native favicon cache with Google S2 service fallback.
  - Graceful offline fallback to stylish initials badge with custom or deterministic color accents (zero broken images).
  - Option to open links in the current tab or a new tab.

- **✅ Daily Tasks & Progress Ring:**
  - Lightweight daily to-do checklist with inline task creation on `Enter`.
  - Filter tasks by `All`, `Pending`, and `Done`.
  - Real-time circular SVG progress ring with percentage completion.
  - Preserves historical tasks without clearing previous days' accomplishments.

- **📝 Quick Scratchpad:**
  - Temporary or persistent local notepad for thoughts, clipboard snippets, or links.
  - Debounced auto-save (400ms) with character and word count statistics.
  - Instant flush on window unload to prevent data loss.

- **🌦️ Optional Weather Widget (Open-Meteo):**
  - Powered by the free Open-Meteo API (**no API key** and **zero tracking**).
  - Manual city lookup without automatic geolocation requests.
  - Supports Celsius (°C) and Fahrenheit (°F) with 30-minute response caching.

- **🎨 Themes & Background Engine:**
  - 5 Handcrafted Themes: `Midnight`, `Ocean Deep`, `Aurora Borealis`, `Clean Light`, and `Minimal Mono`.
  - 6 Background Presets: Radial gradients, deep space mesh, dusk violet, clean slate, and pure charcoal.
  - Custom CSS background color or gradient support.
  - Full `prefers-reduced-motion` compliance.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `/` | Focus the search input |
| `,` | Open Settings & Templates modal |
| `Escape` | Close any open modal dialog |
| `Enter` | Submit search query or add a task in the task input |

---

## 📁 Directory Structure

```text
NewTabPro/
├── manifest.json              # Manifest V3 specification
├── newtab.html                # Semantic HTML5 dashboard layout
├── newtab.css                 # Glassmorphism design system & theme tokens
├── newtab.js                  # Master UI event coordinator
├── package.json               # Test script configuration
├── generate-icons.cjs         # Standalone icon generator
├── assets/                    # PNG icon assets (16, 32, 48, 128)
├── modules/                   # Vanilla ES6 business logic modules
│   ├── storage.js             # Versioned schema (v1), migrations & cross-tab sync
│   ├── clock.js               # 12h/24h time, date, & greeting algorithms
│   ├── search.js              # Engine allowlist, safe query encoding & URL validation
│   ├── shortcuts.js           # Shortcut CRUD, initials & palette generator
│   ├── tasks.js               # Task management, filters & progress calculations
│   ├── habits.js              # Habit tracker, date keys & streak calculations
│   ├── focus-timer.js         # Pomodoro timer state machine & session counter
│   ├── calculator.js          # Arithmetic calculator state machine
│   ├── world-clock.js         # Intl timezone formatter & relative day offsets
│   ├── quotes.js              # Curated offline quote library & randomizer
│   ├── templates.js           # Predefined workspace templates applicator
│   ├── scratchpad.js          # Debounced auto-save local notes manager
│   ├── weather.js             # Privacy-first Open-Meteo weather integration
│   ├── themes.js              # Theme tokens, background presets & DOM styler
│   └── widgets.js             # Widget registry (13 widgets) & accessible reordering
├── tests/                     # Automated test suites (Node.js native runner)
│   ├── manifest.test.js       # Manifest V3 audit test
│   ├── storage.test.js        # Storage schema & corruption migration test
│   ├── clock.test.js          # Clock formatting & greeting tests
│   ├── search.test.js         # Search URL & dangerous scheme test
│   ├── shortcuts.test.js      # Shortcut operations & initials test
│   ├── tasks.test.js          # Task logic, date keys & progress test
│   ├── themes.test.js         # Theme registry & background preset test
│   ├── widgets.test.js        # Widget toggle & reordering test
│   ├── templates.test.js      # Workspace templates applicator test
│   ├── focus-timer.test.js    # Pomodoro focus timer test
│   ├── habits.test.js         # Habit streaks & completion test
│   ├── calculator.test.js     # Arithmetic calculator test
│   └── run-all.js             # Unified test suite runner
├── README.md                  # Comprehensive user & developer guide
├── ARCHITECTURE.md            # Technical design & state lifecycle
├── PERMISSIONS.md             # Manifest permission audit & justification
├── PRIVACY.md                 # Local-first privacy statement
├── TESTING.md                 # Test runner results & manual checklist
└── CHANGELOG.md               # Version notes (v1.1.0)
```

---

## 🔒 Permissions and Privacy

NewTab Pro is strictly **local-first** and requests only the minimal permissions necessary:

| Permission | Purpose |
|---|---|
| `storage` | Save user settings, shortcuts, tasks, habits, widgets, and scratchpad locally via `chrome.storage.local`. |

- **No background service worker:** Zero background memory or battery drain.
- **No host permissions:** Core dashboard runs 100% offline.
- **No browser history access:** Shortcuts and habits are managed locally.
- **No cookies or identity access:** Zero analytics, accounts, or telemetry.

---

## 🧪 Testing

Run the automated test suite locally:

```bash
cd NewTabPro
npm test
```

All **12 test suites** and **272 automated assertions** run using Node.js with zero dependencies and a **100% pass rate**.

---

## 📄 License

This project is licensed under the [MIT License](../LICENSE).
