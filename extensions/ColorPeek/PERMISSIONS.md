# 🛡️ ColorPeek — Permissions & Security Justification

ColorPeek operates under the **Principle of Least Privilege**. It requests only the minimal permissions necessary to fulfill its developer tool functions.

---

## Declared Permissions

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ]
}
```

---

## Detailed Justification

### 1. `storage`
- **Purpose**: Persist user-saved color palettes, recently sampled colors, active color selections, and export preferences.
- **Scope**: Access is strictly limited to Chrome's local storage sandbox (`chrome.storage.local`).
- **Data retention**: All data remains on the user's local machine. No external servers or cloud accounts are used.

### 2. `activeTab`
- **Purpose**: Enables temporary interaction with the currently focused webpage when the user explicitly clicks the extension action or triggers the "Inspect CSS Color" feature.
- **Why not `<all_urls>`**: ColorPeek never monitors background browsing or accesses inactive tabs. It only gains access to the active tab upon explicit user invocation.
- **Scope**: Automatically revokes when the user navigates away or switches tabs.

### 3. `scripting`
- **Purpose**: Injects the element color inspector (`scripts/element-inspector.js`) into the active tab upon explicit user request.
- **Safety guarantee**: Injected content scripts are transient, read computed CSS styles only, and automatically remove their event listeners and DOM elements upon selection or <kbd>Escape</kbd>.

---

## Explicitly Omitted Permissions

| Omitted Permission | Why It Was Excluded |
|:---|:---|
| `<all_urls>` / `*://*/*` | Unnecessary and invasive. ColorPeek uses `activeTab` to scope execution only when requested. |
| `tabs` | Broad tab inspection and history access are not required. |
| `webRequest` / `webRequestBlocking` | ColorPeek does not intercept, inspect, or modify network requests. |
| `cookies` | No authentication or cookie tracking is performed. |
| Remote hosts | Zero outbound HTTP or WebSocket connections are ever initiated. |
