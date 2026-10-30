# 🏛️ WebNotes Architecture

This document describes the software architecture, design principles, data models, and component communication flows of the **WebNotes** Chrome Extension.

---

## 1. High-Level Architecture Overview

WebNotes is architected as an offline-first **Chrome Extension Manifest V3** application with zero external dependencies, zero analytics scripts, and zero cloud services.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              USER LAYER                                │
│                                                                        │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │    Popup (popup.html)     │      │   Dashboard (dashboard.html)│   │
│   │  • Current Page Context   │      │  • Multi-view Sidebar Nav   │   │
│   │  • Scope Switcher         │      │  • Notes & Quotes Grid      │   │
│   │  • Fast Note Composer     │      │  • Realtime Search & Sort   │   │
│   │  • Contextual Notes List  │      │  • Note Editor Modal        │   │
│   │  • Selection Capture      │      │  • JSON Backup & Restore    │   │
│   └─────────────┬─────────────┘      └──────────────┬──────────────┘   │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  │                                   │
                  ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SERVICE WORKER LAYER                            │
│                                                                        │
│                       background.js (MV3 Worker)                       │
│   • Context Menus Management ("Save to WebNotes", "New WebNote")       │
│   • On-Demand Script Execution via chrome.scripting.executeScript      │
│   • Selected Text Extraction & Normalization                           │
│   • Inter-window Message Dispatch (OPEN_DASHBOARD, CAPTURE_SELECTION)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
┌──────────────────────────────────┐ ┌──────────────────────────────────┐
│      CORE BUSINESS MODULES       │ │        PERSISTENCE LAYER         │
│                                  │ │                                  │
│  • storage.js (CRUD & Schema)    │ │  chrome.storage.local            │
│  • url-utils.js (Normalization)  │ │  • webnotes_schema_version       │
│  • search.js (Search/Filter/Sort)│ │  • webnotes_notes                │
│  • export-import.js (Backups)    │ │  • webnotes_highlights           │
│                                  │ │  • webnotes_settings             │
└──────────────────────────────────┘ └──────────────────────────────────┘
```

---

## 2. Directory & Module Structure

```text
WebNotes/
├── manifest.json              # Manifest V3 schema and permission declarations
├── background.js              # Background service worker (menus, capture, routing)
├── popup.html                 # Extension toolbar action popup markup
├── popup.css                  # Modern dark design system for popup
├── popup.js                   # Popup view controller & context synchronizer
├── dashboard.html             # Standalone desktop knowledge base markup
├── dashboard.css              # Dashboard layout, sidebar, modal & grid styling
├── dashboard.js               # Library controller, search, editing & backup logic
├── package.json               # Package metadata and test script definitions
├── scripts/
│   ├── storage.js             # Data models, validation, CRUD & test fallback
│   ├── url-utils.js           # URL cleaning, parameter stripping & domain parsing
│   ├── search.js              # In-memory query engine, tag filtering & sorting
│   └── export-import.js       # Backup serializer, validator & merge resolver
├── assets/
│   ├── icon.svg               # Master vector icon
│   ├── icon16.png             # 16x16 px icon
│   ├── icon32.png             # 32x32 px icon
│   ├── icon48.png             # 48x48 px icon
│   └── icon128.png            # 128x128 px icon
└── tests/
    ├── run-all.js             # Unified automated test runner
    ├── manifest.test.js       # Manifest & asset integrity suite
    ├── url-utils.test.js      # URL utilities test suite
    ├── storage.test.js        # Storage CRUD & schema test suite
    ├── search.test.js         # Search, filter, and sort test suite
    └── export-import.test.js  # Backup & restore test suite
```

---

## 3. Data Models & Schemas

### 3.1 Note Entity
```typescript
interface Note {
  id: string;               // e.g. "ml3k2-a8f10-9b2c"
  title: string;            // User-provided or auto-extracted header
  body: string;             // Note markdown or plain text content
  scope: 'page' | 'domain'; // Page-specific vs domain-wide
  pageUrl: string;          // Normalized URL of the associated webpage
  domain: string;           // e.g. "developer.mozilla.org"
  pageTitle: string;        // Title of the page when note was saved
  tags: string[];           // Normalized lowercase unique tags
  isFavorite: boolean;      // Star status
  isPinned: boolean;        // Pinned to top of lists
  createdAt: string;        // ISO 8601 string
  updatedAt: string;        // ISO 8601 string
}
```

### 3.2 Highlight / Quotation Entity
```typescript
interface Highlight {
  id: string;               // e.g. "ml3k2-b7e12-4c1d"
  selectedText: string;     // Captured text content from webpage
  userNote: string;         // Optional user commentary / annotation
  sourceUrl: string;        // Source webpage URL
  sourceTitle: string;      // Source webpage title
  contextBefore?: string;   // Surrounding text before selection (optional)
  contextAfter?: string;    // Surrounding text after selection (optional)
  createdAt: string;        // ISO 8601 string
}
```

### 3.3 Settings Entity
```typescript
interface Settings {
  defaultScope: 'page' | 'domain';
  confirmBeforeDelete: boolean;
  showTimestamps: boolean;
  theme: 'dark' | 'light';
}
```

---

## 4. Key Design Patterns & Engineering Principles

### 4.1 URL Normalization Engine (`scripts/url-utils.js`)
Real-world URLs are noisy and fragmented due to marketing campaigns, analytics trackers, and session cookies. Without normalization, a note written on `https://example.com/article?utm_source=twitter` would disappear when visited via `https://example.com/article`.

WebNotes applies a deterministic 5-step normalization:
1. Parse URL protocol, hostname, port, and pathname.
2. Filter out tracking parameters: `utm_*`, `fbclid`, `gclid`, `ref`, `source`, `campaign`, `token`, `session_id`.
3. Alphabetize remaining legitimate query parameters for consistent string matching.
4. Strip URL fragments / hashes (`#section`).
5. Remove trailing slashes (except root `/`).

### 4.2 Storage Abstraction with Test Fallback
`scripts/storage.js` provides a dual-mode storage engine:
- In production, it operates directly on `chrome.storage.local`.
- When executed in standard Node.js environments (such as unit tests), it transparently falls back to an in-memory dictionary with deep-cloning semantics, allowing thorough automated testing without heavy browser mocks or puppeteer overhead.

### 4.3 Context Menu & Selection Capture
`background.js` listens to `chrome.contextMenus.onClicked`:
- For selected text (`contexts: ['selection']`), it extracts the selection string and active tab metadata, creates a validated Highlight entity, and saves it directly to `chrome.storage.local`.
- If a WebNotes popup or dashboard is currently open, a runtime message is dispatched so the UI updates without requiring a manual refresh.

### 4.4 Non-Destructive Backup & Deduplication
The backup system in `scripts/export-import.js` guarantees data safety:
- **Format Tagging & Versioning**: Backups contain `format: 'webnotes-backup'` and `schemaVersion: 1`.
- **Validation**: Incoming records are individually validated; corrupt or tampered records are rejected while healthy ones are preserved.
- **Merge Strategy**: Matches on primary keys (`id`) to allow merging backups without duplicating existing notes.
