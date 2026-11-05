# ViewPortX Changelog

All notable changes to the **ViewPortX — Auto Responsive Engine** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-05

### Added
- **Core Engine Architecture**:
  - `scripts/scanner.js`: Non-destructive DOM inspection engine with safe selector synthesis, computed CSS property extraction, and horizontal overflow measurement.
  - `scripts/analyzer.js`: Rule-based diagnostic engine detecting 10 responsive flaw categories (horizontal overflow, fixed containers, images, navigation nowrap, typography clipping, grid columns, form sizing, tables, overlap, and touch targets).
  - `scripts/transformer.js`: Targeted CSS override generator, stylesheet compiler, and safe `<style id="viewportx-responsive-styles">` injector with 1-click rollback.
  - `scripts/verifier.js`: Geometry-based before/after layout validation engine calculating verification rates and regression detection.
  - `scripts/health-score.js`: 0–100 weighted health score algorithm with letter grades (A–F) and actionable summaries.
  - `scripts/storage.js`: Local persistence engine for settings and per-site overrides with in-memory fallback.
  - `content.js`: Content script bridge orchestrating scanning, transformation, verification, and element highlighting.
  - `background.js`: Manifest V3 service worker managing tab messaging, workstation launching, and badge updates.
- **User Interface**:
  - `popup.html`, `popup.css`, `popup.js`: Compact developer popup with health gauge, key metrics, "Make Responsive", "Restore Original", and interactive element highlighting.
  - `dashboard.html`, `dashboard.css`, `dashboard.js`: Workstation interface featuring 6 sections (Overview, DOM Inspector, Multi-Device Responsive Preview Simulator, Detected Issues Table, Live CSS Transformation Editor, Settings).
- **Test Suite**:
  - `tests/run-all.js`: Master test runner with 7 suites and 102/102 assertions passing (100%).
- **Documentation**:
  - `README.md`, `ARCHITECTURE.md`, `FEATURES.md`, `TESTING.md`, `LIMITATIONS.md`, `PERMISSIONS.md`, `PRIVACY.md`, `CONTRIBUTING.md`.
