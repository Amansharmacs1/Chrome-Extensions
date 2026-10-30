# 🛡️ ReadEase — Permissions Audit

**Extension:** ReadEase — Distraction-Free Reader & Library  
**Platform:** Google Chrome (Manifest V3)  
**Security Standard:** Strict Least Privilege

---

## 1. Declared Permissions

ReadEase declares strictly **three** minimal permissions in its `manifest.json`:

```json
{
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ]
}
```

### Technical Justification

| Permission | Purpose | Why It Cannot Be Omitted |
|---|---|---|
| `activeTab` | Grants temporary, user-gesture-initiated access to the current webpage when the user clicks the ReadEase extension icon in the toolbar. | Allows ReadEase to extract the article text and metadata from the page the user explicitly chose to read. Access is revoked automatically when the tab is closed or navigated. |
| `scripting` | Executes the locally bundled, non-destructive content extractor script (`scripts/inpage-extractor.js`) inside the active tab. | Required by Manifest V3 to parse article DOM elements, calculate word count, and sanitize content for the reader. |
| `storage` | Grants access to `chrome.storage.local` to persist the user's reading preferences (themes, font sizes, line spacing), lightweight library index, and active session article. | Without persistent storage, user reading settings, favorites, and saved article catalog would be lost upon restarting Chrome. |

---

## 2. Permissions Deliberately Omitted

To protect user privacy, prevent telemetry, and ensure zero background tracking, the following sensitive permissions were audited and deliberately **omitted**:

| Permission | Reason for Omission |
|---|---|
| `<all_urls>` / Broad Host Permissions | ReadEase only inspects webpages upon explicit user action via `activeTab`. It never reads or intercepts network traffic in the background. |
| `history` | ReadEase does not track or inspect your browsing history. The library only stores articles you deliberately choose to save. |
| `tabs` | Broad tab querying and URL inspection permissions are omitted in favor of the scoped `activeTab` API. |
| `cookies` | No user authentication, session tracking, or remote cookies are required. |
| `webRequest` | No network interception or traffic monitoring is performed. |
| `unlimitedStorage` | ReadEase utilizes browser `IndexedDB` for offline article content and storage, avoiding unnecessary requests for unlimited disk access. |
| Remote Code / CDN scripts | All scripts (`readability.js`, `sanitizer.js`, `extractor.js`) are 100% locally bundled. No scripts are ever fetched from external CDNs. |

---

## 3. Chrome Web Store Compliance

ReadEase adheres strictly to the **Chrome Web Store Single Purpose Policy and Developer Guidelines**:
- Minimal permissions strictly bounded by user gestures.
- Zero remote code injection (`script-src 'self'`).
- 100% local processing; article content is never transmitted to external AI APIs or cloud databases.
