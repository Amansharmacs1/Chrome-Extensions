# 🧪 ReadEase — Testing & Quality Assurance

This document records the automated test suites, execution commands, coverage summary, and manual verification procedures for **ReadEase**.

---

## 1. Automated Test Suites

ReadEase includes a comprehensive test suite written in native Node.js ES modules without requiring external test runners, bundlers, or third-party dependencies.

### Command

```bash
cd extensions/ReadEase
npm test
```
*(Or from repository root: `npm test --prefix ReadEase`)*

### Test Suite Inventory

| Suite | File | Assertions | Focus Areas |
|---|---|:---:|---|
| **Manifest V3 Audit** | `tests/manifest.test.js` | 35 | Manifest version, URL overrides, least privilege permissions (`activeTab`, `scripting`, `storage`), asset paths. |
| **HTML Sanitizer & Security** | `tests/sanitizer.test.js` | 32 | Script removal, event handler neutralization, `javascript:` / `vbscript:` stripping, safe tag whitelists, image data URI validation. |
| **Readability Extraction** | `tests/readability.test.js` | 12 | Candidate scoring, metadata extraction, boilerplate element stripping, code block formatting, non-article detection. |
| **Reading Progress & Time** | `tests/reading-progress.test.js` | 26 | Word counting accuracy across languages, WPM reading time calculation, scroll progress percentage, remaining reading time. |
| **Storage & Database Engine** | `tests/storage.test.js` | 11 | Local storage get/set/remove, IndexedDB put/get/getAll/delete/clear, in-memory fallback stores. |
| **Article Manager & Status** | `tests/article-manager.test.js` | 29 | Status classification (unread, in-progress, completed), index item generation, tag CRUD, duplicate prevention, favorites, sorting. |
| **Highlights & Annotations** | `tests/highlights.test.js` | 16 | Highlight model creation, 5-color palette, contextual prefix/suffix matching, TreeWalker DOM marking, delete unwrapping. |
| **Search, Tags & Backup** | `tests/search.test.js` | 24 | Multi-field full-text search (title, author, domain, notes, tags), tag extraction, JSON export validation, merge vs replace import. |
| **Settings & Typography** | `tests/settings.test.js` | 55 | 5 theme definitions, 4 font families, content width & line spacing tokens, bounds clamping, DOM property application. |
| **Total** | **9 Test Suites** | **240** | **100% Pass Rate (240 passed, 0 failed)** |

---

## 2. Actual Test Run Summary

```text
=================================================================
       ReadEase Automated Test Suite Runner
=================================================================

--- Running Manifest V3 Audit Tests ---
Manifest Tests: 35 passed, 0 failed

--- Running HTML Sanitization Tests ---
Sanitization Tests: 32 passed, 0 failed

--- Running Readability Extraction Tests ---
Readability Tests: 12 passed, 0 failed

--- Running Reading Progress & Time Tests ---
Reading Progress Tests: 26 passed, 0 failed

--- Running Storage Engine Tests ---
Storage Tests: 11 passed, 0 failed

--- Running Article Manager Tests ---
Article Manager Tests: 29 passed, 0 failed

--- Running Highlights & Annotations Tests ---
Highlight Tests: 16 passed, 0 failed

--- Running Search, Tags & Backup Tests ---
Search & Backup Tests: 24 passed, 0 failed

--- Running Settings & Typography Tests ---
Settings Tests: 55 passed, 0 failed

=================================================================
                      TEST SUITE SUMMARY
=================================================================
  ✓ PASS   manifest.test.js             (35 passed, 0 failed)
  ✓ PASS   sanitizer.test.js            (32 passed, 0 failed)
  ✓ PASS   readability.test.js          (12 passed, 0 failed)
  ✓ PASS   reading-progress.test.js     (26 passed, 0 failed)
  ✓ PASS   storage.test.js              (11 passed, 0 failed)
  ✓ PASS   article-manager.test.js      (29 passed, 0 failed)
  ✓ PASS   highlights.test.js           (16 passed, 0 failed)
  ✓ PASS   search.test.js               (24 passed, 0 failed)
  ✓ PASS   settings.test.js             (55 passed, 0 failed)
-----------------------------------------------------------------
  Total: 240 passed, 0 failed across 9 suites.
=================================================================
```

---

## 3. Manual Chrome Verification Checklist

When loading unpacked into Google Chrome (`chrome://extensions`):

1. **Popup Detection:** Navigate to an article on a news site (e.g. *The Verge*, *NYTimes*, *Hacker News*). Click the ReadEase icon: verify title, domain, and reading time are displayed.
2. **Read Distraction-Free:** Click "Read Distraction-Free": verify a new tab opens `reader.html` with clean typography, zero ads, and zero sidebars.
3. **Typography Customization:** Click **Aa**: adjust font size slider, change typeface (Serif, Sans, Georgia, Mono), switch line spacing, and change content width (Narrow, Comfortable, Wide).
4. **Theme Palettes:** Switch between Warm Paper, Clean Light, Classic Sepia, Midnight Dark, and OLED Contrast: verify links, blockquotes, and code blocks adapt smoothly.
5. **Interactive Highlights:** Select any passage with the mouse: verify floating toolbar appears. Choose a color (e.g. green) and click Note: verify note is saved and appears in the Highlights drawer.
6. **Focus Mode:** Press <kbd>F</kbd> key: verify toolbar and controls disappear for distraction-free reading. Press <kbd>Esc</kbd> to return.
7. **Reading Progress:** Scroll the article: verify top progress bar fills and time remaining updates.
8. **Save to Library:** Click Save: verify article is saved to library with checkmark feedback.
9. **Library Filtering & Search:** Open `library.html`: search by title or tag, switch category tabs (Unread, In Progress, Completed, Favorites), and toggle favorite star.
10. **Resume Reading:** Reopen a previously read article: verify smooth scroll to previous position with the "Resumed from X%" banner.
11. **Backup / Restore:** Open Backup modal: export JSON file, clear library, and re-import the file in Merge or Replace mode.
12. **Unsupported Page Handling:** Open `chrome://settings` and click extension icon: verify friendly explanation is displayed without console errors.
