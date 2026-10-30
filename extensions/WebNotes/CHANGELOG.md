# 📋 WebNotes Changelog

All notable changes to the **WebNotes** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-10-28

### Initial Production Release

#### Added
- **Core Extension Engine**
  - Manifest V3 compliant service worker architecture.
  - Local-first architecture using sandboxed `chrome.storage.local`.
  - Zero external tracking, zero analytics, zero external network calls.
- **Context-Aware Web Notes**
  - Dual-scope note taking: page-specific vs domain-wide.
  - Smart URL normalization: strips tracking query parameters (`utm_*`, `fbclid`, session tokens), fragments, and trailing slashes.
  - Contextual awareness: detects active tab title and domain automatically.
  - Support for tags, favorites, and pinned notes.
- **Quotation & Highlight Capture**
  - Context menu integration: select text and right-click "Save to WebNotes".
  - One-click selection capture via `chrome.scripting.executeScript`.
  - Quotes store source URL, page title, capture timestamp, and editable commentary.
- **Interactive Popup UI (`popup.html`)**
  - Dual-tab view: Notes vs Quotes.
  - Real-time search and filter.
  - Clean card layout with quick actions (edit, delete, favorite, pin, copy, jump to source).
  - Empty states and restricted-page informational notices.
- **Desktop Knowledge Base Dashboard (`dashboard.html`)**
  - Multi-view navigation sidebar: All Notes, Quotes, Favorites, Page Scope, Domain Scope, and dynamic tags.
  - Grid card presentation with search, sorting (Updated, Created, Title), and filter toolbar.
  - Note creation and editing modal dialogs with hotkey support (`Cmd/Ctrl + Enter`).
  - Safe backup management: JSON export and validated import with Merge or Replace strategies.
  - Settings panel with storage statistics.
- **Automated Test Suite**
  - 170 unit and integration tests across 5 test suites covering manifest, URLs, storage, search, and export/import.
  - Automated test runner with zero third-party dependencies (`npm test`).
