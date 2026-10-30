# 🔒 ReadEase — Privacy Policy & Data Architecture

**Tagline:** Less clutter. More clarity.  
**Commitment:** 100% Local-First. Zero Tracking. Zero Remote Transmission.

---

## 1. Core Principles

ReadEase was built with a privacy-first ethos:

1. **No External Servers:** ReadEase has no backend servers, analytics endpoints, or remote logging services.
2. **No Third-Party AI APIs:** Article extraction, reading time estimation, and content sanitization run completely on your local device. Your articles, thoughts, and notes are never fed into external machine learning models.
3. **No Account Required:** You do not need to create an account, log in with an email, or share personal credentials.
4. **No Background Snooping:** ReadEase does not track what websites you visit, when you browse, or how long you stay on pages. It only activates when you explicitly click the extension action.

---

## 2. What Information is Stored and Where

All ReadEase data remains stored strictly on your local machine using standard browser storage sandboxes:

| Data Type | Storage Location | Contents |
|---|---|---|
| **Reading Preferences** | `chrome.storage.local` (`readease_settings`) | Selected theme (`paper`, `light`, `sepia`, `dark`, `contrast`), font family, font size, line spacing, reading width, and target WPM. |
| **Library Index** | `chrome.storage.local` (`readease_library_index`) | Lightweight catalog of saved articles: Title, URL, domain, reading time, progress percentage, status, and tags. |
| **Full Article Content** | `IndexedDB` (`ReadEaseDB`) | Sanitized article HTML, plain text content, saved timestamp, reading progress, and scroll offset for offline reading. |
| **Highlights & Annotations** | `IndexedDB` (`ReadEaseDB`) | User-highlighted text passages, color IDs, contextual prefixes/suffixes, and personal notes. |

---

## 3. Offline Capabilities & Limitations

- **Saved Articles are 100% Readable Offline:** When you save an article, ReadEase stores the sanitized text and article HTML locally in your browser's IndexedDB. You can read, highlight, annotate, and resume your reading even without an active internet connection.
- **External Images Limitation:** External images hosted on third-party servers require network access to fetch unless cached by Chrome's native HTTP cache. ReadEase does not fabricate or proxy remote images.

---

## 4. How to Export or Delete Your Data

You have complete ownership over your reading library:

- **Full Data Backup (JSON):** Open your **Library** and click **Backup / Import > Download Backup (JSON)** to export all saved articles, highlights, notes, and preferences into an open JSON file.
- **Selective Deletion:** Click the delete trash icon on any article card in your Library or reader highlights panel to permanently erase that article or annotation.
- **Complete Erasure:** You can wipe all extension data anytime by clicking **Backup / Import > Replace Library** or clearing extension data via Chrome Settings (`chrome://settings/clearBrowserData`).
