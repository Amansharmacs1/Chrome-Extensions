# 📜 ReadEase — Changelog

All notable changes to the **ReadEase** Chrome extension are documented in this file.

The project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-30

### Initial Release — Less Clutter, More Clarity

#### Added
- **Core Architecture & Manifest V3:**
  - Modern Manifest V3 extension architecture with `activeTab`, `scripting`, and `storage` permissions.
  - Zero-dependency, pure vanilla ES6 modules with no bundler requirements.
  - Dual-tier storage architecture utilizing `chrome.storage.local` for settings/index and `IndexedDB` for offline article content and notes.
- **Article Extraction Engine (`scripts/readability.js`, `scripts/extractor.js`):**
  - Non-destructive DOM cloning and boilerplate stripping (ads, navigation, sidebars, cookie banners, social share bars).
  - Multi-candidate scoring evaluating semantic tags, paragraph text density, code blocks, and link ratios.
  - Metadata harvesting for title, author, publication date, site domain, and excerpt.
  - Graceful unsupported page detection with fallback to read user-selected text.
- **Strict Security & HTML Sanitization (`scripts/sanitizer.js`):**
  - Whitelist-based tag and attribute sanitizer.
  - Strips all `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, and `on*` inline event handlers.
  - Strict URL protocol enforcement (only `http:`, `https:`, `mailto:`, relative paths, or safe image data URIs).
  - Enforced `rel="noopener noreferrer" target="_blank"` on links and `loading="lazy"` on images.
- **Dedicated Digital Reading Sanctuary (`reader.html`, `reader.css`, `reader.js`):**
  - 5 Handcrafted Reading Themes: *Warm Paper*, *Clean Light*, *Classic Sepia*, *Midnight Dark*, and *OLED Contrast*.
  - 4 Typeface stacks: *Literary Serif*, *System Sans*, *Classic Georgia*, and *Technical Mono*.
  - Reading layout customization: Font size (14–28px), line spacing (Compact, Normal, Spacious), content width (Narrow 620px, Comfortable 750px, Wide 920px), and text alignment.
  - Reading progress bar with percentage and estimated remaining reading time.
  - Smooth resume reading position with a 1-click restart option.
- **Floating Highlights & Personal Annotations (`scripts/highlights.js`):**
  - Contextual text selection toolbar with 5 pastel highlight colors (Yellow, Green, Blue, Pink, Orange).
  - Personal note composer attaching reflections, reminders, or summaries to highlighted passages.
  - Contextual prefix/suffix locator strategy for reliable text restoration across DOM variations.
  - Slide-out Highlights & Notes drawer with click-to-scroll and ambient flash animation.
- **Distraction-Free Focus Mode:**
  - Full-screen immersion hiding headers, toolbars, and controls (<kbd>F</kbd> key to enter, <kbd>Esc</kbd> to exit).
- **Reading Library Dashboard (`library.html`, `library.css`, `library.js`):**
  - Catalog for saved articles, progress, and offline reading.
  - Auto-status categorization: *Unread*, *In Progress*, *Completed*, and *Favorites*.
  - Instant debounced search across titles, authors, domains, notes, and tags.
  - Dynamic user tag manager and filtering bar.
  - Multi-field sorting (Recently Saved, Recently Read, Reading Time, Title).
  - Versioned JSON Backup and Restore with merge and replace options.
- **Automated Test Suite:**
  - 9 automated test suites with 240 assertions covering Manifest audit, sanitization security, readability heuristics, progress math, storage, article management, highlights, and search.
  - 100% test pass rate with zero external runner dependencies.
