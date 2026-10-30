# 🧪 WebNotes Testing Guide & QA Plan

This document outlines the testing strategy, automated test suites, and manual verification procedures for **WebNotes**.

---

## 1. Automated Test Suites

WebNotes contains **170 automated unit and integration tests** implemented in ES modules with zero third-party testing dependencies.

### Running All Tests

```bash
# Using npm
npm test

# Or directly with node
node tests/run-all.js
```

### Running Individual Test Suites

```bash
# Manifest and packaging integrity
node tests/manifest.test.js

# URL normalization, domain extraction, and restricted URLs
node tests/url-utils.test.js

# Storage CRUD, schema versioning, and queries
node tests/storage.test.js

# Search, tag filtering, and multi-field sorting
node tests/search.test.js

# Backup export, import parsing, and merge resolution
node tests/export-import.test.js
```

---

## 2. Test Suites Summary

| Test File | Test Count | Key Test Assertions |
|---|:---:|---|
| [`manifest.test.js`](file:///Users/amansharma/Desktop/Extension/WebNotes/tests/manifest.test.js) | 41 | Manifest V3 compliance, icons presence (16, 32, 48, 128), permissions, action config, and critical file existence. |
| [`url-utils.test.js`](file:///Users/amansharma/Desktop/Extension/WebNotes/tests/url-utils.test.js) | 42 | URL normalization, query stripping (`utm_*`, `fbclid`, etc.), parameter ordering, domain extraction, restricted URLs (`chrome://`, `about:blank`, etc.), and same-page comparison. |
| [`storage.test.js`](file:///Users/amansharma/Desktop/Extension/WebNotes/tests/storage.test.js) | 36 | ID generation, ISO timestamps, note and highlight validation, memory fallback, note CRUD, page/domain/tag queries, favorites, pins, highlight notes, and storage stats. |
| [`search.test.js`](file:///Users/amansharma/Desktop/Extension/WebNotes/tests/search.test.js) | 26 | Full-text search across titles, bodies, tags, domains; case insensitivity; highlight search; scope filtering; and multi-order sorting with pin prioritization. |
| [`export-import.test.js`](file:///Users/amansharma/Desktop/Extension/WebNotes/tests/export-import.test.js) | 25 | Backup filename format, JSON export package structure, schema validation, corrupted record filtering, and non-destructive merge deduplication. |

---

## 3. Manual QA Checklist

When testing WebNotes interactively inside Google Chrome:

### 3.1 Installation & Loading
- [ ] Load the unpacked directory in `chrome://extensions/`.
- [ ] Verify that no errors or warnings are shown on the extension card.
- [ ] Confirm the extension icon displays properly in the toolbar.

### 3.2 Page Note Creation (Popup)
- [ ] Visit any normal web page (e.g. `https://developer.mozilla.org/`).
- [ ] Click the WebNotes icon in the toolbar.
- [ ] Verify active page title and domain are detected accurately.
- [ ] Create a note with scope set to **"This Page"**; save it.
- [ ] Create a second note with scope set to **"Entire Domain"**; save it.
- [ ] Visit a different subpage on the same domain (e.g. `https://developer.mozilla.org/en-US/docs/Web/CSS`).
- [ ] Open the popup: verify the domain-scoped note appears, but the page-specific note from the first URL is hidden.

### 3.3 Text Highlight & Quote Saving
- [ ] Select any sentence on the webpage.
- [ ] Right-click and choose **"Save to WebNotes"**.
- [ ] Open the WebNotes popup: switch to the "Quotes" tab and verify the selected text appears.
- [ ] Test the "Capture Selection" button inside the popup with text selected on the active page.

### 3.4 Restricted Pages Handling
- [ ] Navigate to `chrome://settings/` or `chrome://extensions/`.
- [ ] Open the WebNotes popup.
- [ ] Verify a friendly message is displayed indicating internal browser pages cannot have notes attached.

### 3.5 Full Dashboard Library
- [ ] Click the dashboard icon in the popup header (or open `dashboard.html` directly).
- [ ] Navigate through sidebar tabs: `All Notes`, `Quotations`, `Favorites`, `Page Scope`, `Domain Scope`.
- [ ] Test real-time search typing keywords in the search bar.
- [ ] Test sorting by Updated, Created, and Title.
- [ ] Edit a note, save it, and verify updates persist.
- [ ] Export a JSON backup from Settings.
- [ ] Verify backup file downloads successfully with proper timestamp name.
- [ ] Test importing the backup file with **Merge** mode.
