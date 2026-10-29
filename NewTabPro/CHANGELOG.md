# 📜 NewTab Pro — Changelog

All notable changes to the **NewTab Pro** Chrome extension are documented in this file.

The project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-10-29

### Added
- **Automatic Website Logos & Favicons for Shortcuts:**
  - Implemented automatic high-resolution website logo/favicon resolution in `modules/shortcuts.js` via `getFaviconUrl(url, size)`.
  - Added native Chrome favicon cache access using the `chrome-extension://${id}/_favicon/?pageUrl=${url}&size=64` endpoint.
  - Declared `"favicon"` permission in `manifest.json`.
  - Added reliable secondary fallback pipeline to Google's public S2 favicon service (`https://www.google.com/s2/favicons?domain=${domain}&sz=64`) for non-cached sites and development/preview environments.
  - Added graceful offline fallback: automatically hides image and seamlessly displays the user's styled initials badge if an icon fails to load or the network is unreachable (zero broken image boxes).
  - Modernized shortcut card visuals with glass badge backdrop, ambient glowing drop shadows, smooth hover micro-interactions (`scale(1.1)`), and lazy loading (`loading="lazy"`).
  - Added comprehensive automated unit tests for favicon derivation, custom sizing, and domain extraction (3 new unit tests, bringing the suite to 296 passing tests).

---

## [1.1.0] - 2026-10-29

### Added
- **Workspace Templates System (`modules/templates.js`):**
  - Added 6 curated one-click workspace templates:
    1. *Balanced Flow (Default)*: General productivity with shortcuts, tasks, and notes.
    2. *Zen Minimalist*: Pure focus mode with clock, search, focus timer, and quote on pure charcoal.
    3. *Developer Workstation*: Curated coder shortcuts (GitHub, StackOverflow, MDN, Dev.to), world timezones, and calculator on Aurora Borealis.
    4. *Student Study Hall*: Pomodoro focus timer, research shortcuts, calculator, and habits on Clean Light.
    5. *Habit & Goal Master*: Habit streaks, daily checklist, progress ring, and quotes on Ocean Deep.
    6. *Global Executive*: International world clock, weather briefing, agenda, and calculator on Midnight Dusk.
  - Added quick template switcher pill in the header utility bar.
  - Added dedicated visual Templates gallery in the Settings dialog with optional shortcuts override.
- **6 New Productivity Widgets:**
  1. *Focus Timer (Pomodoro)*: 25m Focus, 5m Short Break, and 15m Long Break intervals with visual progress fill and session completion badge.
  2. *Habit Tracker & Streaks*: Daily recurring habit checklist with consecutive day streaks counter (`🔥 Xd`) and custom emoji habit creator.
  3. *Daily Quote & Inspiration*: Curated offline collection of Stoic philosophy and technology quotes with shuffle and one-click copy buttons.
  4. *Quick Calculator*: Embedded arithmetic calculator supporting addition, subtraction, multiplication, division, percentage, sign negation, and division-by-zero protection.
  5. *World Clock*: Multi-timezone clock displaying local times and relative day offsets for major international hubs (London, New York, Tokyo, Paris, Sydney, etc.).
  6. *Browser Launcher Tools*: Fast launchpad for Chrome internal pages (Downloads, Bookmarks, History, Extensions).
- **Automated Test Expansion:**
  - Added `tests/templates.test.js` (37 assertions).
  - Added `tests/focus-timer.test.js` (13 assertions).
  - Added `tests/habits.test.js` (10 assertions).
  - Added `tests/calculator.test.js` (15 assertions).
  - Test suite expanded from 8 to 12 suites, total assertions increased from 181 to 272 (100% pass rate).

---

## [1.0.0] - 2026-10-29

### Added
- **Core Architecture:**
  - Manifest V3 implementation with `chrome_url_overrides.newtab = "newtab.html"`.
  - Zero-dependency vanilla ES6 module architecture (`modules/`).
  - Strict least-privilege permission model requesting only `["storage"]`.
- **Clock & Greeting:**
  - Dynamic digital clock with 12-hour and 24-hour military display modes.
  - Optional running seconds toggle.
  - Complete weekday and calendar date formatting.
  - Time-aware greetings with optional custom user display name.
- **Search & URL Navigation:**
  - Centered quick search box with `/` keyboard focus shortcut.
  - Configurable search engines: Google, DuckDuckGo, Bing, Brave Search.
  - Automatic direct URL detection and protocol normalization.
  - Dangerous scheme rejection (`javascript:`, `data:`, `file:`, `vbscript:`).
- **Quick Links (Shortcuts):**
  - Fully manageable shortcuts grid (Create, Edit, Delete, Reorder).
  - Deterministic initials badge generator with 8-color palette selector.
- **Daily Tasks & Progress:**
  - Today's tasks manager with inline task creation on `Enter`.
  - Filter modes: `All`, `Pending`, and `Done`.
  - Interactive SVG circular progress ring.
- **Quick Scratchpad:**
  - Debounced auto-save (400ms) with character and word count statistics.
- **Themes & Backgrounds:**
  - 5 theme presets (Midnight, Ocean Deep, Aurora Borealis, Clean Light, Minimal Mono).
  - 6 background presets and custom CSS background support.
- **Weather Widget (Optional):**
  - Open-Meteo integration (zero API keys, zero user tracking).
