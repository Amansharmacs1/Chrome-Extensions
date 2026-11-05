# ViewPortX — Auto Responsive Engine

> **Make Every Website Responsive.**  
> An intelligent Manifest V3 Chrome Extension that transforms non-responsive, poorly responsive, and legacy websites into mobile-friendly layouts directly inside your browser.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Tests](https://img.shields.io/badge/tests-102%20passed%20(100%25)-success.svg)](./TESTING.md)
[![Zero Backend](https://img.shields.io/badge/Zero%20Backend-100%25%20Local-blue.svg)](./PRIVACY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Overview

Modern mobile users routinely encounter legacy enterprise portals, older government websites, academic libraries, and desktop-centric tools that were never built for small touchscreens. These pages force awkward pinch-to-zoom gestures, horizontal scrollbars, clipped text, overlapping elements, and broken data tables.

**ViewPortX** solves this entirely on the client side:
1. **Inspects** the loaded webpage's DOM tree and computed layout styles non-destructively.
2. **Diagnoses** 10 common responsive layout flaws (horizontal scroll overflow, fixed-width containers, nowrap flex navbars, oversized media, unscrollable tables, small touch targets, and rigid CSS grids).
3. **Calculates** a transparent 0–100 Responsive Health Score with letter grades (A through F).
4. **Generates & Injects** scoped, non-destructive CSS overrides directly into the active tab.
5. **Measures & Verifies** layout improvements with zero backend dependencies, zero telemetry, and instant 1-click restoration.

---

## Key Features

- **One-Click Mobile Adaptation**: Instantly eliminates horizontal scrollbars, wraps overflowing navigation bars, constrains oversized containers and media, and wraps wide data tables in smooth touch-scrolling containers.
- **100% Local & Non-Destructive**: Never alters remote servers, backend databases, or site source code. All modifications occur in your browser's local DOM and disappear upon refresh or rollback.
- **Instant Rollback**: Complete reversibility. Click "Restore Original" at any time to instantly revert the page to its unmodified state.
- **Compact Popup Controller**: View responsive score, viewport dimensions, horizontal overflow pixels, and top issues at a glance.
- **Full Workstation Dashboard**:
  - **Overview**: Animated radial score gauge, executive metrics, and diagnostic progress across 10 categories.
  - **DOM Inspector**: Filterable tabular breakdown of inspected nodes, computed styles, and element highlighter.
  - **Responsive Preview**: Interactive multi-device mockup frame (iPhone SE, iPhone 14, iPhone XR, iPad, iPad Air, Laptop) with custom viewport sliders and orientation rotation.
  - **Detected Issues**: Deep diagnostic table with severity indicators, evidence data, and one-click fix copying.
  - **CSS Transformations Editor**: Syntax-styled editor to review, customize, enable/disable, and export generated responsive rules.
  - **Settings**: Tailor auto-scan heuristics, DOM inspection ceilings, and workstation theme palettes.

---

## Architecture & Technology Stack

- **Extension Standard**: Chrome Manifest V3
- **Languages**: Vanilla JavaScript (ES Modules), HTML5, CSS3
- **Permissions**: Minimal required (`activeTab`, `scripting`, `storage`, `tabs`)
- **Isolation**: Standard sandbox-safe with zero external build step requirements
- **Test Suite**: Native Node.js test harness covering all engines with 100% assertion pass rate

---

## Installation & Usage

### 1. Load Unpacked in Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the upper-right corner.
3. Click the **Load unpacked** button.
4. Select the directory:
   ```
   extensions/ViewPortX/
   ```
5. Pin **ViewPortX** to your Chrome toolbar for quick access.

### 2. Using the Extension
1. Open any non-responsive or legacy website (e.g. desktop-first portal or table-heavy report).
2. Click the **ViewPortX** extension icon in your browser toolbar.
3. Inspect the Health Score and detected responsive defects.
4. Click **"Make Responsive"** to inject targeted layout overrides.
5. Click **"Open Dashboard"** for in-depth DOM inspection, multi-device emulation, and CSS customization.
6. Click **"Restore Original"** at any time to revert back to default layout.

---

## Running the Automated Test Suite

ViewPortX includes a comprehensive, self-contained test suite with zero npm package installation requirements:

```bash
# Run via npm test
npm test --prefix extensions/ViewPortX

# Or run directly via Node.js
node extensions/ViewPortX/tests/run-all.js
```

### Test Coverage Summary:
- **Manifest V3 Specification Audit**: 30 assertions passed
- **DOM Scanner & Selector Engine**: 11 assertions passed
- **Responsive Issue Detection Analyzer**: 12 assertions passed
- **CSS Transformation & Injection Engine**: 18 assertions passed
- **Layout Verification & Rollback Engine**: 9 assertions passed
- **Responsive Health Score Engine**: 10 assertions passed
- **Storage & Device Profiles Engine**: 12 assertions passed
- **Total**: **102 / 102 assertions passed (100%)**

---

## Documentation Links

- [Architecture Guide](./ARCHITECTURE.md)
- [Feature Details](./FEATURES.md)
- [Testing & Quality Assurance](./TESTING.md)
- [Permissions & Security Model](./PERMISSIONS.md)
- [Privacy Policy](./PRIVACY.md)
- [Known Limitations](./LIMITATIONS.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

---

## License

MIT License — Copyright (c) 2026 ViewPortX Authors.
