# 🛡️ NewTab Pro — Permissions Audit

**Extension:** NewTab Pro — Personal Productivity Dashboard  
**Platform:** Google Chrome (Manifest V3)  
**Standard:** Minimal Least Privilege

---

## 1. Declared Permissions

The extension declares only **one** Chrome permission in its `manifest.json`:

```json
{
  "permissions": [
    "storage"
  ]
}
```

### Technical Justification

| Permission | Purpose | Why It Cannot Be Omitted |
|---|---|---|
| `storage` | Provides access to `chrome.storage.local` to persist the user's dashboard preferences, shortcuts, daily tasks, widget layout, theme selections, and scratchpad notes across browser sessions. | Without persistent storage, all user shortcuts, tasks, and configurations would be wiped whenever Chrome is closed. |

---

## 2. Permissions Intentionally Omitted

To protect user privacy and maximize extension performance, the following permissions were audited and deliberately **omitted**:

| Permission | Reason for Omission |
|---|---|
| `tabs` / `activeTab` | NewTab Pro does not need to query, track, or inspect tabs. |
| `history` | Shortcuts are added and managed manually by the user. NewTab Pro never accesses the user's browsing history. |
| `bookmarks` | NewTab Pro maintains an independent, customizable quick-links list rather than requesting full access to your personal Chrome bookmarks. |
| `cookies` | No user authentication, sessions, or tracking required. |
| `webNavigation` | Not applicable to a new-tab dashboard. |
| `geolocation` | Open-Meteo weather uses manual city search; NewTab Pro never prompts for device location. |
| `host_permissions` / `<all_urls>` | Core features run completely offline. The optional weather widget fetches public forecasts from Open-Meteo, which provides open CORS headers (`Access-Control-Allow-Origin: *`) directly to client requests without requiring broad host permissions. |
| `background` / Service Worker | The new-tab override loads instantly as a standard web document (`newtab.html`). Running a background service worker would waste memory and CPU cycles while the user is browsing other websites. |

---

## 3. Chrome URL Override

The extension utilizes the official Chrome URL Override capability:

```json
{
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  }
}
```

This instructs Chrome to render `newtab.html` when a new tab is opened. It does not alter Chrome's Omnibox (address bar), bookmarks bar, or browser settings.

---

## 4. Compliance Summary

NewTab Pro adheres strictly to the **Google Chrome Web Store Single Purpose and Privacy Policies**:
- Requests the absolute minimum permission set required for its declared function.
- Contains no remote code or analytics trackers.
- Performs all data operations locally in the user's browser.
