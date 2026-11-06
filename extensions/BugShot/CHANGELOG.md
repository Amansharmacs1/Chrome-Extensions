# 📋 Changelog — BugShot

All notable changes to the BugShot extension are documented in this file.

---

## [1.0.0] - 2026-11-06

### Initial Release
- **Core Capture Engine**:
  - Visible Viewport Capture via `chrome.tabs.captureVisibleTab`.
  - Selected Area Capture with interactive drag-to-crop overlay.
  - Full Webpage Capture with automated stride calculation and canvas slice stitching.
- **Annotation Studio**:
  - Dual-canvas architecture (`canvas-bg` and `canvas-overlay`) for lag-free vector drawing.
  - Arrow, Rectangle, Circle, Brush, Highlighter, and High-Contrast Text Pill tools.
  - Permanent 12×12 pixel averaging Redaction/Blur tool for PII scrubbing.
  - 30-step deep-cloned Undo/Redo history stack with state change listeners.
  - Zoom & Pan controls with "Fit to Screen" normalization.
- **Diagnostics & Metadata**:
  - Automatic environment metadata extraction (OS, browser, viewport, screen, DPR).
  - Sensitive URL query token scrubbing (`token`, `auth`, `password`, `key`, `jwt`).
  - In-page console error and unhandled rejection interceptor.
  - Network failure recorder for broken resource loads and failed requests.
- **Bug Report Generator & Dashboard**:
  - Structured report editor with severity/priority toggles and diagnostic checklists.
  - Workstation dashboard with metric cards, search, filters, sorting, and report duplication.
  - Multi-format exports: Standardized JSON schema, GitHub/Jira Markdown, quick text summary, print-friendly PDF, and annotated PNG.
- **Storage & Infrastructure**:
  - Centralized storage layer with `unlimitedStorage` permission and high-capacity `IndexedDB` safety tier.
  - 100% offline, local-first persistence.
  - Automated test suite with 120 passing tests across 5 test suites.
