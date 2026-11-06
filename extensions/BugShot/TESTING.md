# 🧪 BugShot — Testing Guide & Verification Checklist

This document details automated test coverage, manual QA verification scenarios, and stress testing procedures for BugShot.

---

## 1. Automated Test Suite

BugShot includes an automated test runner written with standard Node.js built-ins (`fs`, `path`, `url`, `assert`) requiring zero remote dependencies.

### Running Tests
From the repository root:

```bash
npm test --prefix extensions/BugShot
```

### Test Suites

1. **`tests/manifest.test.js` (31 assertions)**
   - Validates Manifest V3 compliance, icons, permissions, background worker, action popup, and keyboard shortcuts.
2. **`tests/history-manager.test.js` (20 assertions)**
   - Validates Undo/Redo stack capacity, deep snapshot cloning, state push, undo, redo, and listeners.
3. **`tests/metadata.test.js` (19 assertions)**
   - Tests query parameter scrubbing (`token`, `auth`, `password`), browser extraction (Chrome, Edge, Firefox, Safari), and OS detection (macOS, Windows, Linux, iOS, Android).
4. **`tests/export-manager.test.js` (24 assertions)**
   - Validates standardized JSON schema, GitHub/Jira Markdown formatting, and Slack/Discord quick summary generator.
5. **`tests/storage.test.js` (26 assertions)**
   - Validates bug report CRUD, active capture sessions, user preference updates, storage quota defense, and data clearing.

---

## 2. Manual Verification Checklist

### Capture Workflows
- [ ] **Viewport Capture**: Open a complex webpage, click "Capture Viewport", verify editor opens with the exact visible canvas.
- [ ] **Region Capture**: Trigger "Capture Selected Area", drag a rectangle across an element, verify live dimension tooltip, release mouse to open editor.
- [ ] **Full Page Capture**: On a long document (e.g. Wikipedia), trigger "Capture Entire Webpage", verify automated scrolling, stitching, and complete canvas generation.

### Annotation Tools
- [ ] **Vector Arrows**: Draw arrows pointing towards UI elements; verify sharp triangular head at end of stroke.
- [ ] **Rectangles & Circles**: Draw framing boxes around bugs; test 2px, 4px, and 8px stroke widths.
- [ ] **High-Contrast Text**: Click on canvas, type annotation text, verify dark pill background renders behind white text.
- [ ] **Redaction / Pixel Blur**: Draw a box across sensitive text; verify pixels are permanently blurred upon PNG download.
- [ ] **Undo / Redo**: Perform 5 annotations, click Undo 5 times, verify canvas restores step-by-step; click Redo to restore.
- [ ] **Zoom / Pan**: Zoom to 200%, pan around canvas, click "Fit" to re-center.

### Report Generation & Export
- [ ] **Report Form**: Fill in reproduction steps, expected/actual results, and toggle severity/priority.
- [ ] **Markdown Copy**: Click "Copy Markdown", paste into GitHub issue, verify formatted tables and code blocks.
- [ ] **PDF Export**: Click "Print / Save PDF", verify print dialog opens with clean document layout.
- [ ] **Dashboard**: Open Dashboard (`dashboard/dashboard.html`), verify report appears in list, metric cards reflect counts.
