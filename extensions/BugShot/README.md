# 🐛 BugShot — Capture, Annotate & Report

> **Capture. Annotate. Report.**  
> A professional, developer-focused Chrome extension for capturing website bugs, annotating screenshots, recording technical diagnostics, and exporting standardized bug reports.

---

## ✨ Features

- **📸 Triple Capture Engine**:
  - **Visible Viewport Capture**: Instant snapshot of the currently visible screen area.
  - **Selected Region Capture**: Interactive, draggable overlay with live pixel dimension badges and escape-key cancel support.
  - **Full-Page Scroll & Stitch**: Automated scroll-and-stitch canvas pipeline capturing entire long-form documents.
- **🎨 Comprehensive Annotation Studio**:
  - Dual-canvas layer rendering base screenshot independently from vector annotations.
  - Vector Arrows with directional arrowhead geometry.
  - Rectangles and Circles with configurable stroke widths (2px, 4px, 8px).
  - Freehand Drawing Brush with smooth quadratic Bezier path smoothing.
  - High-Contrast Text Pills with auto-contrasting backgrounds for readability over complex UI.
  - Semi-Transparent Highlighting Marker for text and button emphasis.
  - **True Pixelation Redaction**: Permanently averages pixel RGB values across 12×12 blocks directly in canvas image data to securely redact sensitive customer data or credentials.
  - 30-step deep-cloning Undo/Redo history stack with state change listeners.
  - Zoom & Pan controls (20% to 300%) with "Fit to Screen" normalization.
- **🔍 Automated Technical Diagnostics**:
  - Environment metadata: Browser name/version, OS platform, Viewport vs Screen dimensions, DPR, color depth, system language.
  - Query parameter token scrubbing: Automatically redacts `token`, `auth`, `key`, `secret`, `password`, `jwt`, and `session` parameters from URLs.
  - In-page console error monitor: Hooks into `window.onerror`, unhandled promise rejections, and `console.error` / `console.warn` without memory leaks.
  - Network failure recorder: Gathers broken resource loads and 4xx/5xx requests via the Navigation and Resource Timing APIs.
- **📋 Bug Report Generator**:
  - Form fields for Title, Severity (Critical, High, Medium, Low), Priority (P1–P4), Category (UI/UX, Functional, Performance, Security, Content, Other), Steps to Reproduce, Expected vs Actual Behavior.
  - Diagnostic checklists allowing testers to toggle which console logs and network failures to include.
- **💾 Workstation Dashboard**:
  - High-density management interface with metric cards (Total, Critical, High, Open, In Progress).
  - Search across titles, URLs, tags, and reproduction steps.
  - Status/Severity filtering, sorting by date/severity, report duplication, and single/batch JSON exports.
- **📤 Multi-Format Export Center**:
  - **JSON Schema**: Standardized `$schema: https://bugshot.dev/schemas/bug-report-v1.json` export.
  - **GitHub / Jira Markdown**: Copy-paste ready Markdown formatted with tables, code fences, and collapsible metadata.
  - **Plain Text Quick Summary**: Crisp summary formatted for Slack / Discord / Teams messages.
  - **Print / PDF**: Clean `@media print` CSS layout for browser `window.print()` PDF generation.
  - **Annotated PNG**: Direct high-resolution image download.
- **🛡️ Robust Dual-Tier Storage & Privacy**:
  - Centralized storage engine with `unlimitedStorage` and automatic high-capacity `IndexedDB` fallback.
  - 100% local persistence in browser memory; zero external server uploads or tracking.

---

## 📂 Project Structure

```text
extensions/BugShot/
├── manifest.json                  # Manifest V3 specification
├── package.json                   # Test and build scripts
├── generate-icons.cjs             # PNG icon generator (Node.js zlib)
├── assets/
│   └── icons/                     # 16px, 32px, 48px, 128px PNGs and SVG
├── background/
│   └── service-worker.js          # Tab routing, capture coordinator, context menus
├── content/
│   ├── console-monitor.js         # Non-intrusive console/error diagnostics recorder
│   ├── selection-overlay.js       # Interactive drag-to-crop region selector
│   └── content.js                 # Safe content script bridge with idempotency guard
├── editor/
│   ├── editor.html                # Annotation workspace layout
│   ├── editor.css                 # Dark developer-tool studio styling
│   ├── editor.js                  # Canvas controller, pan/zoom, accelerators
│   ├── annotation-engine.js       # Dual-canvas drawing engine & true pixelation
│   └── history-manager.js         # 30-step deep-cloned Undo/Redo stack
├── report/
│   ├── report.html                # Bug report generation form
│   ├── report.css                 # Form and print stylesheet
│   ├── report.js                  # Report editor controller
│   └── export-manager.js          # JSON, Markdown, PDF, and text generators
├── dashboard/
│   ├── dashboard.html             # Workstation reports dashboard
│   ├── dashboard.css              # Workstation styling & modal panels
│   └── dashboard.js               # Report metrics, filters, sorting, settings
├── popup/
│   ├── popup.html                 # Quick capture launcher
│   ├── popup.css                  # Charcoal/electric-blue popup styling
│   └── popup.js                   # Quick capture trigger & recent reports
├── scripts/
│   ├── permissions.js             # Security and restricted URL validator
│   ├── storage.js                 # chrome.storage.local & IndexedDB dual-tier engine
│   ├── metadata.js                # Technical metadata collector & token sanitizer
│   ├── diagnostics.js             # Console/network error formatter
│   ├── screenshot-stitcher.js     # Full-page scroll, crop, and canvas stitcher
│   └── capture.js                 # High-level capture orchestrator
├── src/types/
│   └── index.ts                   # TypeScript interfaces & types
└── tests/
    ├── run-all.js                 # Master test suite runner
    ├── manifest.test.js           # Manifest V3 audit tests
    ├── history-manager.test.js    # Undo/Redo engine tests
    ├── metadata.test.js           # Token sanitization & browser parser tests
    ├── export-manager.test.js     # JSON/Markdown/Summary tests
    └── storage.test.js            # Storage CRUD and quota tests
```

---

## 🚀 Installation & Usage

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `extensions/BugShot/` directory from this repository.
5. Click the **BugShot** puzzle piece or press `Alt+Shift+B` (`Option+Shift+B` on macOS).

---

## 🧪 Testing

Run the automated test suite with:

```bash
npm test --prefix extensions/BugShot
```

```text
=================================================================
            BugShot Automated Test Suite Runner
=================================================================
  ✓ PASS   manifest.test.js             (31 passed, 0 failed)
  ✓ PASS   history-manager.test.js      (20 passed, 0 failed)
  ✓ PASS   metadata.test.js             (19 passed, 0 failed)
  ✓ PASS   export-manager.test.js       (24 passed, 0 failed)
  ✓ PASS   storage.test.js              (26 passed, 0 failed)
-----------------------------------------------------------------
  Total: 120 passed, 0 failed across 5 suites.
=================================================================
```
