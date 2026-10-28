# 📝 WebNotes — Remember What Matters, Right Where You Found It

> **A production-grade, local-first Chrome extension (Manifest V3) that lets you take context-aware notes on any webpage, capture quotes and highlights, organize your research with tags, and jump back to source material instantly.**

WebNotes transforms the web into your personal knowledge base. Whether you are conducting academic research, debugging API documentation, compiling reading lists, or organizing recipe ideas, WebNotes keeps your insights permanently anchored to the exact web pages where you discovered them.

All data remains 100% local, private, and offline. No accounts, subscriptions, cloud databases, or tracking scripts required.

---

## ✨ Features

- 📌 **Context-Aware Webpage Notes**
  - Instant note-taking tied directly to the current page URL or entire domain.
  - Page-scope vs. Domain-scope toggle: choose whether a note attaches to a specific URL (e.g. `github.com/facebook/react/issues/123`) or applies across the whole domain (e.g. `github.com`).
  - Automatic URL normalization (strips tracking query params such as `utm_*`, `fbclid`, session IDs, hash fragments, and trailing slashes) so notes remain linked even when visited via redirects or marketing links.
  - Restricted page detection: gracefully handles internal browser pages (`chrome://`, `chrome-extension://`, `edge://`, `about:blank`, webstore) with informative notices.

- 💬 **Web Quotation & Highlight Collector**
  - **Right-Click Context Menu**: Select any text on any webpage, right-click, and select **"Save to WebNotes"**.
  - **One-Click Selection Capture**: Click the capture icon directly inside the popup to grab the active page selection.
  - Highlights preserve the exact selected text, source webpage title, URL, timestamp, and optional personal commentary/annotation.
  - Direct "Open Source Page" button on every quote card to jump straight back to where you found it.

- 🏷️ **Smart Tagging & Organization**
  - Tag notes using comma-separated keywords or hash notation.
  - Automatic tag normalization: trims whitespace, converts to lowercase, and removes duplicates.
  - Filter notes instantly by clicking tags in the sidebar, popup, or filter dropdowns.
  - Visual tag pills with click-to-filter support.

- ⭐ **Favorites & Pinned Notes**
  - Pin important notes to anchor them at the very top of lists across sorting modes.
  - Star notes as Favorites for fast filtering and reference.

- 🔍 **Instant Local Search & Multi-criteria Filtering**
  - Real-time search across note titles, body text, page titles, URLs, domains, and tags.
  - Case-insensitive search with immediate UI updates.
  - Filter by Scope (`All`, `Page-specific`, `Domain-wide`), Favorites, Pinned, or custom Tags.
  - Sort by Last Updated (newest/oldest), Created Date (newest/oldest), or Alphabetical Title.

- 🖥️ **Dual Form Factor: Action Popup & Comprehensive Dashboard**
  - **Popup (`popup.html`)**: Sleek, responsive quick-access window displaying notes and quotes relevant to the active tab, tab-specific note creation, and rapid search.
  - **Full-tab Dashboard (`dashboard.html`)**: Complete desktop-class knowledge base featuring a sidebar navigation tree (`All Notes`, `Quotations`, `Favorites`, `Domain Scope`, `Page Scope`, dynamic tags list), multi-card grid layouts, note editor modal, backup management, and settings.

- 💾 **Safe Local Backup & Restore**
  - Export entire knowledge base to formatted JSON (`webnotes-backup-YYYY-MM-DD.json`).
  - Restore backup with schema validation and choice between **Merge** (appends non-duplicate records) and **Replace** (complete overwrite).
  - Versioned backup schemas to ensure forward and backward compatibility.

- 🎨 **Modern Dark Aesthetics & Micro-interactions**
  - Modern design with dark palette, smooth glassmorphism, tailored focus rings, and responsive button states.
  - Zero layout shift, accessible typography, keyboard navigation, and toast notifications.

---

## 📸 Interface Preview

```text
+-------------------------------------------------------------+
|  📝 WebNotes                 [Search] [Quotes] [Library ↗]  |
+-------------------------------------------------------------+
|  Active Page: developer.mozilla.org                         |
|  Scope: [ (•) This Page ]  [ ( ) Entire Domain ]            |
|                                                             |
|  +-------------------------------------------------------+  |
|  | Title (optional)                                      |  |
|  | Take a note for this page...                          |  |
|  | Tags: javascript, web-api                             |  |
|  | [Cancel]                                [ Save Note ] |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  [Notes (2)]   [Quotes (1)]                                 |
|  +-------------------------------------------------------+  |
|  | 📌 MDN Web API Guidelines            [★] [Edit] [Del] |  |
|  | Always verify browser support matrix before shipping. |  |
|  | #docs #api                                2 mins ago  |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

---

## 🚀 Installation Guide

### Option 1: Load Unpacked into Google Chrome

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Amansharmacs1/Chrome-Extensions.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left toolbar.
5. Select the `WebNotes` directory:
   ```text
   Chrome-Extensions/WebNotes
   ```
6. The WebNotes icon (📝) will appear in your Chrome toolbar. Pin it for quick access!

---

## ⌨️ How to Use

### 1. Taking Notes on a Webpage
1. Browse to any webpage (e.g. an article, GitHub repository, documentation).
2. Click the **WebNotes** extension icon in your toolbar.
3. Choose the scope:
   - **This Page**: Note will only show up when viewing this exact URL.
   - **Entire Domain**: Note will show up when browsing any page under this domain.
4. Type your title, note body, and optional tags (separated by commas).
5. Click **Save Note** (or press `Cmd/Ctrl + Enter`).

### 2. Saving Selected Quotes & Highlights
1. Highlight any snippet of text on any webpage.
2. **Right-click** the selected text and choose **"Save to WebNotes"**.
3. A notification confirms the quote has been saved with the webpage URL, title, and timestamp.
4. Alternatively, click the WebNotes icon in the toolbar and click the **Capture Selection** button.

### 3. Browsing Your Full Notes Library
1. Click the **Library / Dashboard** button (↗) in the popup header, or right-click the extension icon and select "Options".
2. Use the left sidebar to navigate:
   - **All Notes**: Everything you have saved.
   - **Quotations**: All text captured from web pages.
   - **Favorites**: Starred notes.
   - **Tags**: Click any tag to see related notes.
   - **Domain / Page Scopes**: Filter by note scope.
3. Click any note to edit its content, tags, or scope.

### 4. Exporting and Backing Up Your Data
1. Open the **Dashboard** and select **Settings** from the bottom of the sidebar.
2. Under "Data Management", click **Export JSON Backup**.
3. To restore or migrate to another computer, click **Import Backup JSON** and choose **Merge** or **Replace**.

---

## 🛡️ Privacy & Security First

- **Zero Telemetry**: No tracking, analytics, ads, cookies, or external requests.
- **100% Offline**: Operates completely within your local browser storage (`chrome.storage.local`).
- **No Third-Party CDNs**: All HTML, CSS, JavaScript, and SVG icons are bundled directly within the extension package.
- **Strict Content Security Policy**: No `eval()`, inline scripts, or remote executable code.

See [PRIVACY.md](./PRIVACY.md) and [PERMISSIONS.md](./PERMISSIONS.md) for comprehensive breakdowns.

---

## 🧪 Automated Testing

WebNotes comes with a comprehensive standalone test suite with **170 unit and integration tests**:

```bash
# Run all automated tests
npm test

# Or run directly via Node.js
node tests/run-all.js
```

### Test Coverage Breakdown

| Test Suite | Purpose | Tests | Status |
|---|---|:---:|:---:|
| `manifest.test.js` | Validates MV3 schema, icons, permissions, and file integrity | 41 | Pass |
| `url-utils.test.js` | Normalization, query param stripping, domain extraction, restricted URLs | 42 | Pass |
| `storage.test.js` | Note/Quote CRUD, scope matching, tags, favorites, pins, memory fallback | 36 | Pass |
| `search.test.js` | Keyword search, case insensitivity, multi-criteria filtering, sorting | 26 | Pass |
| `export-import.test.js` | Backup generation, schema verification, corruption rejection, deduplication | 25 | Pass |
| **Total** | | **170** | **100% Passing** |

See [TESTING.md](./TESTING.md) for full test instructions and verification guides.

---

## 📂 Project Structure

```text
WebNotes/
├── manifest.json              # Chrome Manifest V3 configuration
├── background.js              # Service worker (context menus, selection capture, routing)
├── popup.html                 # Extension toolbar popup interface
├── popup.css                  # Modern dark styling for popup
├── popup.js                   # Popup controller & active tab context manager
├── dashboard.html             # Standalone full-page notes library & settings
├── dashboard.css              # Full-page dashboard layout & styling
├── dashboard.js               # Library controller, search, editing & backup logic
├── package.json               # Project metadata & test scripts
├── scripts/
│   ├── storage.js             # Local storage CRUD, schema versioning & memory fallback
│   ├── url-utils.js           # URL normalization, domain extraction & restricted URLs
│   ├── search.js              # In-memory search, tag filtering & multi-field sorting
│   └── export-import.js       # JSON backup export, import validation & merge resolution
├── assets/
│   ├── icon.svg               # Scalable master vector icon
│   ├── icon16.png             # 16x16 toolbar icon
│   ├── icon32.png             # 32x32 retina icon
│   ├── icon48.png             # 48x48 extensions management icon
│   └── icon128.png            # 128x128 Web Store / installation icon
├── tests/
│   ├── run-all.js             # Unified test runner
│   ├── manifest.test.js       # Manifest & asset integrity suite
│   ├── url-utils.test.js      # URL utilities unit test suite
│   ├── storage.test.js        # Storage CRUD & schema test suite
│   ├── search.test.js         # Search, filter, and sort test suite
│   └── export-import.test.js  # Backup & restore test suite
├── ARCHITECTURE.md            # Technical design, component interactions & data models
├── PERMISSIONS.md             # Detailed explanations of all requested Chrome permissions
├── PRIVACY.md                 # Privacy guarantees & data storage policies
├── TESTING.md                 # Test plan, automated testing, and manual QA checklist
└── CHANGELOG.md               # Version history and release notes
```

---

## 📄 License

MIT License. Free to use, modify, and distribute.
