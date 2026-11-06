# 🔒 BugShot — Permissions Audit & Justification

BugShot adheres strictly to the principle of least privilege required to deliver professional bug capture and annotation capabilities under Chrome Manifest V3.

---

## Declared Permissions

| Permission | Purpose & Technical Justification |
| :--- | :--- |
| `activeTab` | Grants temporary access to the currently focused tab upon explicit user invocation (clicking the extension icon or pressing the shortcut). Enables capturing the tab viewport and retrieving page title and URL. |
| `scripting` | Enables programmatic execution of `content/selection-overlay.js` for drag-to-crop region selection and `content/console-monitor.js` for in-page error diagnostics. |
| `storage` | Grants access to `chrome.storage.local` to store user preferences, active capture sessions, and offline bug reports. |
| `unlimitedStorage` | Removes the default 10MB quota on local browser storage, allowing developers to store high-resolution retina screenshots and maintain archives of bug reports locally. |
| `tabs` | Allows querying tab metadata (width, height, windowId) and opening editor (`editor.html`), report (`report.html`), and dashboard (`dashboard.html`) windows via `chrome.tabs.create`. |
| `downloads` | Enables one-click downloading of annotated PNG screenshots, Markdown bug files, and JSON schemas directly to the user's local disk without navigating away. |

---

## Host Permissions

- `<all_urls>` is declared strictly for content scripts to listen for client-side JavaScript runtime exceptions and network errors on pages where testing is performed.
- BugShot **never** accesses browser history, cookies, bookmarks, web requests, or private tabs.
