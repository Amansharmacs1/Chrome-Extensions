# 📜 FocusFlow Changelog

All notable changes to the FocusFlow Chrome Extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-27

### Added
- **Core Pomodoro Engine**:
  - Precision timestamp calculation resilient to Manifest V3 service-worker suspensions.
  - Three standard session types: Focus (25m), Short Break (5m), and Long Break (15m).
  - Cycle progression with customizable long-break interval (default: 4 cycles).
  - Controls: Start, Pause, Resume, Reset, and Skip.
  - Dev Fast-Timer mode (10-second sessions) for rapid testing.
  - SVG circular countdown dial with smooth progress animation.
- **Distraction Blocker**:
  - DeclarativeNetRequest dynamic rule generation for user-selected domains.
  - Domain normalization stripping protocols, query parameters, ports, and paths.
  - RFC 1035 domain syntax validation and protected browser scheme guards.
  - Automatic rule activation during focus sessions and cleanup on pause/reset/finish.
- **Task Management**:
  - Offline-first task CRUD with title, notes, priority (`Low`, `Medium`, `High`), and estimated Pomodoros.
  - One-click task linkage to active timer sessions.
  - Automatic Pomodoro session increment on associated task completion.
  - Instant filtering by `All`, `Pending`, and `Completed`.
- **Productivity Analytics & Daily Goals**:
  - Real-time aggregation of today's focus minutes, completed sessions, and tasks.
  - Customizable daily goal meters for focus time, sessions, and tasks.
  - Accessible 7-day focus trend bar chart with session counts.
  - All-time statistics: total focus hours, average session duration, most productive day.
  - Chronological daily session log table.
- **Dual Form Factor**:
  - Compact popup window (`popup.html`) with 4 distinct tabs (Focus, Tasks, Insights, Settings).
  - Standalone productivity dashboard (`dashboard.html`) for wide-screen focus and kanban management.
- **Audio & Desktop Alerts**:
  - Web Audio API synthetic harmonic chimes for focus and break transitions.
  - Native Chrome desktop notifications with stable deduplication IDs.
- **Automated Verification Suite**:
  - 6 comprehensive test suites covering timer math, task logic, analytics, blocker rules, storage migrations, and Manifest V3 compliance.
  - Master test runner executable via `npm test` or `node tests/run-all.js`.
- **Complete Documentation Suite**:
  - `README.md`, `ARCHITECTURE.md`, `TESTING.md`, `PERMISSIONS.md`, `PRIVACY.md`, and `CHANGELOG.md`.
