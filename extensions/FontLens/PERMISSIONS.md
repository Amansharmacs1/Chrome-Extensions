# 🛡️ FontLens Permission Justifications

FontLens follows the **Principle of Least Privilege** (PoLP). Every requested permission in `manifest.json` is strictly required for core user-facing functionality, with zero excessive or speculative access.

---

## 1. Declared Permissions Matrix

| Permission | Scope | Technical Justification | User Benefit |
|---|---|---|---|
| `activeTab` | Temporary access to the currently active browser tab | Allows injecting the Shadow DOM typography inspector and scanner only when explicitly invoked by the user (clicking the extension icon or pressing `Alt+Shift+F`). | The extension has zero access to tabs you aren't actively inspecting. |
| `scripting` | Programmatic script execution | Injects `inspector/inspector.js` and `scanner/scanner.js` into the active tab upon user command. | Enables in-page element inspection without permanently embedding content scripts on every webpage you visit. |
| `storage` | `chrome.storage.local` persistence | Saves user preferences, custom typography presets, favorited fonts, recent inspection history, and comparison studio snapshots. | Retains your custom typographic formulas and favorites across browser restarts without remote servers. |
| `tabs` | Tab query and URL inspection | Used by the popup controller to determine the active tab's hostname and verify that the active page is not a restricted system page (`chrome://`, webstore). Also used to open the standalone Comparison Studio and Dashboard tabs. | Prevents crashes on browser internal URLs and enables launching dedicated studio tabs. |

---

## 2. Web Accessible Resources Matrix

| Resource | Scope | Justification |
|---|---|---|
| `inspector/inspector.css` | `<all_urls>` | Loaded dynamically inside the isolated Shadow Root of `<fontlens-inspector-host>` to style the floating inspection panel without exposing styles to the host page. |
| `scanner/scanner.css` | `<all_urls>` | Loaded dynamically inside the isolated Shadow Root of `<fontlens-scanner-host>` to style the page-wide scanner modal and highlighters. |

---

## 3. Explicitly Avoided Permissions

FontLens intentionally **does NOT** request:
- ❌ `<all_urls>` or broad host permissions: FontLens never scans websites in the background. It only interacts with the active tab when requested.
- ❌ `cookies`: No cookie inspection or manipulation.
- ❌ `webRequest` / `declarativeNetRequest`: No network request intercepting.
- ❌ `history`: Browser history is never queried.
- ❌ `identity`: No user authentication or Google accounts required.
- ❌ `geolocation`: No location data requested.
