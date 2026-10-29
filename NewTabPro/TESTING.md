# 🧪 NewTab Pro — Testing & Verification

This document records the automated test suites, execution commands, coverage summary, and manual verification procedures for **NewTab Pro**.

---

## 1. Automated Test Suites

The automated test suite runs in Node.js using native ES modules without requiring external test runners or third-party dependencies.

### Command

```bash
cd NewTabPro
npm test
```

### Test Suite Inventory

| Suite | File | Assertions | Focus Areas |
|---|---|:---:|---|
| **Manifest V3 Audit** | `tests/manifest.test.js` | 16 | Manifest version, URL override, minimal permissions (`storage`), asset paths. |
| **Storage & Migration** | `tests/storage.test.js` | 26 | Default state, schema versioning, null/corrupted migrations, enum validation, widget fields. |
| **Clock, Date & Greeting** | `tests/clock.test.js` | 20 | 12h/24h conversion, running seconds, date formatting, time-aware greetings. |
| **Search & Safe Navigation** | `tests/search.test.js` | 27 | Google, DDG, Bing, Brave, query URI-encoding, URL detection, dangerous scheme rejection. |
| **Shortcuts Engine** | `tests/shortcuts.test.js` | 20 | Shortcut CRUD, initials generator, deterministic colors, reordering, URL sanitization. |
| **Tasks & Productivity** | `tests/tasks.test.js` | 23 | Task creation, completion toggle, title editing, filtering, date keys, progress metrics. |
| **Themes & Appearance** | `tests/themes.test.js` | 32 | Theme registry (Midnight, Ocean, Aurora, Light, Minimal, Atmosphere), background presets, CSS tokens. |
| **Widget Registry** | `tests/widgets.test.js` | 33 | 13 widgets registration, enable/disable toggling, accessible keyboard reordering. |
| **Workspace Templates** | `tests/templates.test.js` | 37 | Predefined templates registry, state application, theme/background synchronization, shortcuts swap. |
| **Focus Timer (Pomodoro)** | `tests/focus-timer.test.js` | 13 | Focus 25m, Short 5m, Long 15m intervals, state machine, formatting, reset logic. |
| **Habit Tracker & Streaks** | `tests/habits.test.js` | 10 | Habit creation, emoji icon, daily toggle, consecutive day streak calculations. |
| **Quick Calculator** | `tests/calculator.test.js` | 15 | Digits, decimals, addition, subtraction, multiplication, division, zero-error, percent, negation. |
| **Live Weather Atmosphere** | `tests/weather-atmosphere.test.js` | 21 | WMO code resolution, day vs night skies, ambient fx classes (rain, snow, stars, sunbeam, storm). |
| **Total** | **13 Test Suites** | **293** | **100% Pass Rate (293 passed, 0 failed)** |

---

## 2. Actual Automated Test Run Summary

```text
=================================================================
                      TEST SUITE SUMMARY
=================================================================
  ✓ PASS   manifest.test.js          (16 passed, 0 failed)
  ✓ PASS   storage.test.js           (26 passed, 0 failed)
  ✓ PASS   clock.test.js             (20 passed, 0 failed)
  ✓ PASS   search.test.js            (27 passed, 0 failed)
  ✓ PASS   shortcuts.test.js         (20 passed, 0 failed)
  ✓ PASS   tasks.test.js             (23 passed, 0 failed)
  ✓ PASS   themes.test.js            (32 passed, 0 failed)
  ✓ PASS   widgets.test.js           (33 passed, 0 failed)
  ✓ PASS   templates.test.js         (37 passed, 0 failed)
  ✓ PASS   focus-timer.test.js       (13 passed, 0 failed)
  ✓ PASS   habits.test.js            (10 passed, 0 failed)
  ✓ PASS   calculator.test.js        (15 passed, 0 failed)
  ✓ PASS   weather-atmosphere.test.js (21 passed, 0 failed)
-----------------------------------------------------------------
  Total: 293 passed, 0 failed across 13 suites.
=================================================================
```
