# MeetMorph — Permissions Documentation

This document explains every permission declared in [`manifest.json`](manifest.json), why it is required, which source files utilize it, and its privacy implications.

---

## 1. Extension Permissions (`permissions`)

### A. `"storage"`
- **Why Required:** To persist the user's captured empty-room background image (as a base64 data URL), the user's preferred finger-snap trigger settings (enabled state and sensitivity level), and the HUD minimized preference across page reloads and browser sessions.
- **Source Files Using It:**
  - [`content.js`](content.js) — Reads `savedBackgroundDataUrl`, `snapEnabled`, `snapSensitivity`, and `hudMinimized` on initialization; writes newly captured backgrounds and updated preferences.
  - [`popup.js`](popup.js) — Saves updated sensitivity slider values and snap toggle states.
- **User-Visible Behavior Depending on It:**
  - Preserves your empty room background so you do not have to step out of your chair and recapture the room every time you join a new Google Meet call.
  - Preserves your finger-snap sensitivity preferences.
- **Can It Be Removed?** No. Removing `"storage"` would prevent the extension from saving the empty room background between meetings, forcing a recapture on every call.

---

### B. `"activeTab"`
- **Why Required:** Grants the extension temporary, user-invoked access to the currently focused tab when the user clicks the toolbar popup icon or presses the registered keyboard shortcut (<kbd>⌘+Shift+V</kbd>).
- **Source Files Using It:**
  - [`background.js`](background.js) — Queries the active tab (`chrome.tabs.query({ active: true, currentWindow: true })`) to dispatch the toggle command to Google Meet when <kbd>⌘+Shift+V</kbd> is pressed.
  - [`popup.js`](popup.js) — Queries the active tab URL to identify whether the current page is Google Meet and requests the live pipeline status.
- **User-Visible Behavior Depending on It:**
  - Enables the global keyboard shortcut (<kbd>⌘+Shift+V</kbd>) to toggle Vanish mode from anywhere on the screen without clicking.
  - Allows the popup to query the active meeting tab's pipeline state.
- **Can It Be Removed?** No. Without `"activeTab"`, the background service worker cannot communicate with the active meeting tab when the keyboard shortcut is invoked.

---

## 2. Host Permissions (`host_permissions`)

MeetMorph strictly limits host permissions to meeting and local testing domains:

```json
"host_permissions": [
  "https://meet.google.com/*",
  "https://ome.tv/*",
  "https://*.ome.tv/*",
  "http://localhost/*",
  "http://127.0.0.1/*"
]
```

### Why Required:
1. **`https://meet.google.com/*`**: Allows injecting content scripts into Google Meet meetings and green rooms so `getUserMedia` can be hooked before meeting scripts start.
2. **`https://ome.tv/*` & `https://*.ome.tv/*`**: Supported video chat platform.
3. **`http://localhost/*` & `http://127.0.0.1/*`**: Required for loading and running the local WebRTC test harness (`test-room.html`) during development and local verification.

### Privacy Implications:
- MeetMorph does **not** use `<all_urls>` or wildcard domain access (`*://*/*`).
- MeetMorph scripts only execute on the explicitly listed meeting and testing domains.
- No network requests are made by the extension; all video processing is executed locally on-device via HTML5 Canvas.

---

## 3. Remote Code & Content Security Policy (CSP)

- **Remote Code:** MeetMorph contains **0% remote code**. No external scripts, remote CDNs, telemetry scripts, or analytics beacons are imported.
- **No `unsafe-eval`:** The extension does not use `eval()` or `new Function()`.
- **All Assets Local:** All JavaScript files, CSS styles, and icon assets are packaged directly within the extension bundle.
