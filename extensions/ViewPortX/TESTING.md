# ViewPortX Testing & Quality Assurance

Comprehensive testing guide and test results for **ViewPortX — Auto Responsive Engine**.

---

## 1. Test Harness Philosophy

- **Zero External Dependencies**: The test harness uses native Node.js ES Modules (`node:child_process`, `node:path`, `node:fs`, `node:url`) and requires zero npm package installations (`node_modules`).
- **Deterministic Assertions**: Each test validates exact numerical outputs, DOM inspection properties, CSS syntax structures, and error states.
- **Fast Execution**: Entire 102-assertion test suite executes in under 2 seconds.

---

## 2. Test Execution

Run the master test runner from repository root:

```bash
# Option 1: Via npm script
npm test --prefix extensions/ViewPortX

# Option 2: Directly with Node.js
node extensions/ViewPortX/tests/run-all.js
```

To run individual test suites independently:

```bash
node extensions/ViewPortX/tests/manifest.test.js
node extensions/ViewPortX/tests/scanner.test.js
node extensions/ViewPortX/tests/analyzer.test.js
node extensions/ViewPortX/tests/transformer.test.js
node extensions/ViewPortX/tests/verifier.test.js
node extensions/ViewPortX/tests/health-score.test.js
node extensions/ViewPortX/tests/storage.test.js
```

---

## 3. Test Suites & Coverage

| Suite | Description | Assertions | Status |
| :--- | :--- | :---: | :---: |
| **Manifest V3 Specification Audit** | Verifies MV3 compliance, required permissions, icon resolutions, popup, background service worker, and web-accessible resources | 30 / 30 | **PASSED** |
| **DOM Scanner & Selector Engine** | Validates safe selector generation, unique ID prioritization, class fallback, element visibility, and overflow calculation | 11 / 11 | **PASSED** |
| **Responsive Issue Detection Analyzer** | Validates detection heuristics across all 10 problem types, severity ordering, and confidence ratings | 12 / 12 | **PASSED** |
| **CSS Transformation Engine** | Tests scoped CSS rule generation, box-sizing normalization, DOM injection, removal, and element highlighting | 18 / 18 | **PASSED** |
| **Layout Verification Engine** | Measures before vs after scroll dimensions, validates resolved vs partial states, and computes verification rates | 9 / 9 | **PASSED** |
| **Responsive Health Score Engine** | Validates category weighting (100 total), 0–100 scoring, letter grades (A–F), and summary generation | 10 / 10 | **PASSED** |
| **Storage & Device Profiles Engine** | Tests chrome.storage.local operations, in-memory fallback, device profile presets, and site override persistence | 12 / 12 | **PASSED** |
| **Total Consolidated Results** | **Master Automated Test Suite** | **102 / 102** | **100% PASSED** |

---

## 4. Manual QA Verification Checklist

When validating ViewPortX against real-world websites:

1. **Popup Inspection**:
   - [x] Click extension icon: popup opens within 100ms.
   - [x] Domain name and viewport dimensions match the active tab.
   - [x] Health gauge animates to the calculated score.
   - [x] Top issues are listed with color-coded severity pills.
2. **One-Click Transformation**:
   - [x] Click "Make Responsive": horizontal scrollbars disappear on desktop-first pages.
   - [x] Images and videos resize fluidly to fit viewport width without distortion.
   - [x] Wide tables gain horizontal scroll bars.
   - [x] Button label transitions to "Transformations Active" and turns green.
3. **One-Click Rollback**:
   - [x] Click "Restore Original": page immediately returns to default appearance.
   - [x] `#viewportx-responsive-styles` element is removed from DOM.
4. **Workstation Dashboard**:
   - [x] Click "Open Dashboard": opens `dashboard.html` in a new tab.
   - [x] Navigation tabs switch smoothly without page reload.
   - [x] Device simulator frame resizes cleanly across device presets.
   - [x] Custom CSS rules can be edited and applied back to the target tab.
   - [x] "Export CSS" downloads a clean `.css` file.
