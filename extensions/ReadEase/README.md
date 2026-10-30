# 📖 ReadEase

**Less clutter. More clarity.**

ReadEase is a premium, local-first Chrome extension that transforms cluttered, ad-heavy web pages into calm, distraction-free reading experiences. Built for researchers, developers, students, and avid readers, ReadEase gives you full control over typography, customizable themes, reading progress tracking, interactive highlights with personal annotations, and an offline reading library.

Built strictly with vanilla JavaScript, HTML5, CSS3, and Chrome Extension Manifest V3. Zero tracking. Zero remote code dependencies. Instant load times.

---

## ✨ Features at a Glance

- **Distraction-Free Article Extraction:**
  - Automatically isolates primary article content, headings, paragraphs, lists, code blocks, blockquotes, and figures.
  - Strips annoying sidebars, advertising banners, cookie consent popups, newsletters, and social sharing widgets.
  - Clones webpage DOM non-destructively so the original webpage is never modified.
  - Intelligent fallback for non-article pages with instant **Read Selected Text** capability.

- **Strict Security & HTML Sanitization:**
  - Whitelist-based sanitization engine purges all `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, and `<form>` tags.
  - Neutralizes all `onclick`, `onload`, and `onerror` inline event handlers.
  - Enforces safe URL schemes (`https:`, `http:`, `mailto:`, relative paths, or safe image data URIs) while blocking `javascript:` and `vbscript:`.
  - Automatically appends `rel="noopener noreferrer" target="_blank"` to external links.

- **5 Handcrafted Reading Themes:**
  1. **Warm Paper (Default):** Natural cream paper surface inspired by classical books.
  2. **Clean Light:** Crisp white background with deep slate typography.
  3. **Classic Sepia:** Soft vintage amber for low-contrast eye comfort.
  4. **Midnight Dark:** Charcoal slate palette designed for night reading without eye fatigue.
  5. **OLED Contrast:** Ultra-high contrast pure black and white for maximum clarity.

- **Customizable Typography & Layout:**
  - **Typeface Families:** *Literary Serif* (Charter / Cambria), *System Sans*, *Classic Georgia*, and *Technical Mono*.
  - **Granular Font Size:** 14px to 28px with real-time slider and stepper controls.
  - **Line Spacing:** *Compact* (1.5), *Normal* (1.78), and *Spacious* (2.08).
  - **Content Widths:** *Narrow* (620px), *Comfortable* (750px), and *Wide* (920px).
  - **Text Alignment:** Left-aligned or Justified.

- **Interactive Highlights & Personal Annotations:**
  - Select any passage in the reader to bring up a floating toolbar with 5 pastel highlight colors (Yellow, Green, Blue, Pink, Orange).
  - Attach personal reflections, study notes, or interview reminders to any highlight.
  - Contextual text locator stores surrounding prefix and suffix context for reliable restoration.
  - Slide-out **Highlights & Notes Drawer** lists all saved quotes with 1-click smooth scroll and ambient flash animation.

- **Reading Progress & Resume Reading:**
  - Real-time progress bar with percentage and estimated remaining reading time based on your target WPM.
  - Automatically resumes saved articles from your previous scroll position with a 1-click "Restart from beginning" option.
  - Automatic status classification: *Unread*, *In Progress*, and *Completed* (≥90% read).

- **Offline Reading Library Dashboard:**
  - Full-featured personal library to save articles for later reading without internet.
  - Real-time search-as-you-type across titles, author names, domains, notes, and tags.
  - Dynamic user tag manager and category tabs (*All*, *Unread*, *In Progress*, *Completed*, *Favorites*).
  - Multi-field sorting by date saved, date read, reading duration, or title.
  - Complete JSON Backup and Restore with merge or replace options.

- **Focus Mode Immersion:**
  - Tap <kbd>F</kbd> key to enter pure focus mode: toolbars, buttons, and headers vanish for 100% distraction-free reading. Press <kbd>Esc</kbd> anytime to exit.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>F</kbd> | Toggle distraction-free Focus Mode |
| <kbd>Esc</kbd> | Exit Focus Mode / Close open drawers & popovers |

---

## 🚀 Installation & Loading into Chrome

1. **Clone or Download Repository:**
   ```bash
   git clone https://github.com/Amansharmacs1/Chrome-Extensions.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the `extensions/ReadEase` folder (or the root `ReadEase` symlink folder).
6. ReadEase is now installed! Pin it to your Chrome toolbar for fast 1-click access.

---

## 📂 Project Structure

```text
extensions/ReadEase/
├── manifest.json            # Manifest V3 extension configuration
├── popup.html               # Extension action popup
├── popup.css                # Popup styling
├── popup.js                 # Popup extraction & quick action controller
├── reader.html              # Dedicated distraction-free reading interface
├── reader.css               # Typography, themes, and highlight styles
├── reader.js                # Reader controller & progress tracker
├── library.html             # Saved reading library dashboard
├── library.css              # Library grid, tag filter, and modal styles
├── library.js               # Library catalog & backup controller
├── background.js            # Manifest V3 background service worker
├── generate-icons.cjs       # PNG icon asset generator
├── assets/                  # 16x16, 32x32, 48x48, 128x128 icons
├── scripts/
│   ├── utils.js             # String, date, WPM, and DOM helpers
│   ├── sanitizer.js         # Whitelist-based HTML sanitization engine
│   ├── readability.js       # Core article extraction algorithm
│   ├── extractor.js         # Extraction pipeline with selection fallback
│   ├── inpage-extractor.js  # Self-contained active tab runner
│   ├── storage.js           # Dual-tier storage (local + IndexedDB)
│   ├── article-manager.js   # Article CRUD, indexing, and status
│   ├── reading-progress.js  # Scroll math, remaining time, resume
│   ├── highlights.js        # Selection, colors, contextual locator
│   ├── search.js            # Search, tag extraction, JSON backup
│   └── settings.js          # Preferences, theme & font tokens
├── tests/
│   ├── fixtures/            # Blog, news, tech, and non-article HTML fixtures
│   ├── run-all.js           # Central automated test runner
│   ├── manifest.test.js     # Manifest V3 audit tests
│   ├── sanitizer.test.js    # Security & HTML sanitization tests
│   ├── readability.test.js  # Article extraction heuristics tests
│   ├── reading-progress.test.js # Progress & WPM calculation tests
│   ├── storage.test.js      # Storage engine & database tests
│   ├── article-manager.test.js # Article CRUD & status tests
│   ├── highlights.test.js   # Highlight & locator tests
│   ├── search.test.js       # Search, tags, and backup tests
│   └── settings.test.js     # Settings & typography tests
├── ARCHITECTURE.md          # System design & technical architecture
├── PERMISSIONS.md           # Minimal least privilege audit
├── PRIVACY.md               # 100% local-first data policy
├── TESTING.md               # Automated & manual testing report
├── CHANGELOG.md             # Version history & release notes
└── package.json             # NPM scripts & metadata
```

---

## 🧪 Running Automated Tests

ReadEase includes **9 test suites** with **240 automated assertions** (100% pass rate) running directly in Node.js:

```bash
cd extensions/ReadEase
npm test
```

---

## 🔒 Security & Privacy

ReadEase requires strictly **three permissions**:
- `activeTab`: Scoped, user-gesture-initiated access to the current webpage.
- `scripting`: Runs the local extraction script inside the active tab.
- `storage`: Persists your reading preferences and library catalog.

ReadEase **never** collects browsing history, transmits articles to external AI models, or injects remote executable code. All data operations are 100% local.

---

## 📄 License

MIT License. Part of the [Chrome-Extensions](https://github.com/Amansharmacs1/Chrome-Extensions) collection.
