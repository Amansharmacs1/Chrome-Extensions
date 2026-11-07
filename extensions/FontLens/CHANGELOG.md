# 📝 FontLens Changelog

All notable changes to the **FontLens** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-07

### Added
- **Manifest V3 Core**: Clean declarative manifest specifying `activeTab`, `scripting`, `storage`, and `tabs` permissions with custom `Alt+Shift+F` command.
- **Shadow DOM Floating Inspector**: In-page inspector encapsulated inside an open Shadow Root (`<fontlens-inspector-host>`), completely immune to host CSS conflicts.
- **Multi-Layered Font Identification Engine**: Evidence-based scoring combining `document.fonts.check()`, loaded `FontFace` iteration, canvas metric deviation heuristics, and Google Fonts catalog cross-referencing.
- **Curated Google Fonts Catalog**: Curated dataset of 100+ popular Google Fonts enabling zero-network offline specimen lookups.
- **Typography Math Engine**: Comprehensive normalization for px & rem sizes, font-weight human labels (Thin to ExtraBlack), line-height unitless ratios, and letter/word spacing.
- **WCAG 2.1 Contrast Engine**: Recursive parent background compositing with relative luminance calculation and AA/AAA compliance reporting.
- **Non-Destructive Live Editor**: Real-time property modification directly on live webpage elements with complete `WeakMap` tracked inline style rollback.
- **Page-Wide Typography Scanner**: DOM crawler extracting unique typography signatures, grouping into semantic categories (Headings, Body, Interactive, Code), highlighting matching elements on-page, and exporting clean JSON and CSV reports.
- **Standalone Font Comparison Studio**: Dedicated multi-column comparison interface with reactive sliders, preset sample texts, character sets, and CSS export.
- **Workstation Dashboard**: Complete workspace for managing presets (CRUD, import/export), bookmarks, saved studios, recent history, and extension settings.
- **Central Storage Layer**: High-performance persistence via `chrome.storage.local` with automated in-memory fallback for non-extension / Node.js test environments.
- **Comprehensive Test Suite**: Native Node.js test runner validating 187 assertions across 7 modular test suites.
- **Native Icon Generator**: `generate-icons.cjs` script generating clean PNG icon assets across 16px, 32px, 48px, and 128px formats using native `zlib`.
- **Documentation Suite**: `README.md`, `ARCHITECTURE.md`, `PERMISSIONS.md`, `PRIVACY.md`, `TESTING.md`, and `CHANGELOG.md`.
