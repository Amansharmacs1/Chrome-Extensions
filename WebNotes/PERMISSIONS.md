# 🔐 WebNotes Permissions & Security

This document outlines every permission requested by the **WebNotes** Chrome extension in `manifest.json`, along with the technical justification and security posture for each.

---

## 1. Declared Permissions

WebNotes adheres to the **Principle of Least Privilege**. It requests only what is strictly required to deliver its core features:

| Permission | Technical Requirement | User Impact & Benefit |
|---|---|---|
| `storage` | Save notes, highlights, tags, and settings locally in `chrome.storage.local`. | Persists your knowledge base across browser sessions without requiring an external database or account. |
| `activeTab` | Read the URL and title of the currently focused tab when the user clicks the extension icon or context menu. | Automatically associates your note or quotation with the exact webpage you are viewing. Does not grant background access to other tabs. |
| `contextMenus` | Register the right-click menu action **"Save to WebNotes"**. | Enables saving selected text or quotes directly from any webpage with a single right-click. |
| `scripting` | Execute a lightweight selection reader (`window.getSelection().toString()`) when the user clicks the "Capture Selection" button inside the popup. | Allows capturing quotes from the active page without injecting permanent content scripts into every page you visit. |

---

## 2. Permissions We Intentionally DO NOT Request

| Permission | Why We Avoid It |
|---|---|
| `<all_urls>` / `*://*/*` | We do not monitor your web browsing or inject code into every webpage. |
| `tabs` | Broad tab history access is unnecessary; `activeTab` is sufficient and much safer. |
| `webRequest` / `declarativeNetRequest` | We do not inspect, modify, or block network traffic. |
| `cookies` | We do not inspect or manage browser cookies. |
| `identity` | No Google or third-party OAuth accounts are used. |

---

## 3. Host Permissions & Network Calls

- **Host Permissions:** None (`host_permissions` is not present in `manifest.json`).
- **External Network Calls:** Zero. WebNotes never sends HTTP/HTTPS requests to external servers, CDNs, or APIs.
- **Content Security Policy:** Uses the default Manifest V3 strict CSP. Inline scripts (`<script>...</script>`) and `eval()` are prohibited. All code is bundled within the extension package.
