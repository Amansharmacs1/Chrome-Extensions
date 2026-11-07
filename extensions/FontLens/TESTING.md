# 🧪 FontLens Testing Guide & QA Matrix

This guide details the automated test suite and manual verification checklist for the **FontLens** Chrome extension.

---

## 1. Automated Test Suite

FontLens includes a fully native Node.js ES Modules test runner with zero external dependencies.

### Running the Automated Tests
```bash
# Run from repository root
npm test --prefix extensions/FontLens

# Or run from inside the FontLens folder
cd extensions/FontLens
npm test
```

### Automated Test Coverage (187 Assertions Across 7 Suites)

```text
======================================================
       FontLens Chrome Extension - Test Suite         
======================================================

▶ Running Suite: Manifest V3 Configuration & Structure
  ✓ All 30 assertions passed in 0ms

▶ Running Suite: Typography Engine & Math Utilities
  ✓ All 32 assertions passed in 0ms

▶ Running Suite: Font Identification & Evidence Engine
  ✓ All 24 assertions passed in 1ms

▶ Running Suite: Page Typography Scanner & Grouping
  ✓ All 9 assertions passed in 0ms

▶ Running Suite: CSS Export & Report Generation
  ✓ All 20 assertions passed in 1ms

▶ Running Suite: Presets Management & Validation
  ✓ All 47 assertions passed in 0ms

▶ Running Suite: Central Storage Engine & Fallback
  ✓ All 25 assertions passed in 0ms

------------------------------------------------------
Total Assertions Passed : 187
Total Suites Failed     : 0
Total Execution Time    : 3ms
======================================================

✅ ALL TEST SUITES PASSED! Ready for production deployment.
```

---

## 2. Manual QA Verification Checklist

Follow this checklist to verify full end-to-end functionality in Google Chrome:

### A. Extension Loading & Permissions
- [ ] Load unpacked via `chrome://extensions`.
- [ ] Confirm extension loads cleanly without runtime warnings or errors.
- [ ] Verify toolbar icon renders sharply in 16px, 32px, 48px, and 128px.
- [ ] Confirm minimal permissions list: `activeTab`, `scripting`, `storage`, `tabs`.

### B. In-Page Inspector & Shadow DOM Isolation
- [ ] Navigate to any rich content webpage (e.g., [Wikipedia](https://wikipedia.org) or [GitHub](https://github.com)).
- [ ] Press `Alt+Shift+F` or click **Inspect Page Typography** in the popup.
- [ ] Confirm floating inspector panel appears without altering the host page layout.
- [ ] Verify hover outline appears over text elements showing rendered font and px size badge.
- [ ] Click an element: verify inspector pins to the element and shows full property grid.
- [ ] Drag inspector by its header to reposition on screen.
- [ ] Press `Esc`: confirm inspector unpins smoothly.

### C. Live Style Editor & Non-Destructive Reset
- [ ] Select a heading or paragraph element.
- [ ] Switch to the **Live Editor** tab.
- [ ] Change font family, font size, weight, line-height, and color.
- [ ] Verify element updates in real-time on the webpage.
- [ ] Click **Reset Element**: verify element returns to its exact original inline style.
- [ ] Test multiple elements, then click **Reset All**: verify all elements revert cleanly.

### D. Whole-Page Typography Scanner
- [ ] Open the extension popup and click **Page Scanner**.
- [ ] Verify modal appears showing summary cards: Total Text Elements, Unique Fonts, Font Sizes, and Font Weights.
- [ ] Check categories: Headings, Body, Interactive, Code.
- [ ] Click on a unique style card: verify all matching elements on the webpage highlight with outline boxes.
- [ ] Click **Export JSON** and **Export CSV**: confirm files download with structured typography data.

### E. Font Comparison Studio
- [ ] Click **Font Studio** in the popup or dashboard.
- [ ] Verify standalone Comparison Studio opens in a new tab.
- [ ] Compare 2 or more fonts side-by-side.
- [ ] Switch sample presets (Pangram, Alphabet, Numerals & Symbols, Headline, Paragraph).
- [ ] Test sliders (Size, Weight, Line Height, Letter Spacing).
- [ ] Click **Copy CSS** and **Add Font to Studio**.

### F. Workstation Dashboard
- [ ] Open dashboard tab (`dashboard/dashboard.html`).
- [ ] Verify built-in presets (Editorial Serif, Modern Tech Sans, Dense Data Mono, Bold Display Headline, UI Interactive Button).
- [ ] Click **New Preset**: create custom preset and test live preview.
- [ ] Click **Export Presets** and verify JSON export.
- [ ] Click **Import Presets** and import a preset JSON file.
- [ ] Test **Favorite Fonts** search and toggle.
- [ ] Check **Recent History** table with source domain origins.
- [ ] Test **Settings** form submission and Danger Zone data purge.
