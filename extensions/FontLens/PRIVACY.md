# 🔒 FontLens Privacy Policy & Data Handling

**Last Updated:** November 2026  
**Commitment:** 100% Client-Side | Zero Analytics | Zero Remote Transmissions

---

## 1. Core Privacy Philosophy

FontLens is built for privacy-conscious developers, security professionals, and designers. We believe developer tools should work entirely inside your browser without harvesting data or phoning home.

---

## 2. Data Collection & Analytics

- **No Analytics**: FontLens contains zero telemetry, analytics, tracking beacons, or event counters (no Google Analytics, no Mixpanel, no Sentry).
- **No Third-Party CDNs**: All scripts, stylesheets, and curated font catalogs are bundled directly inside the extension package. No external scripts are downloaded at runtime.
- **No Remote Font Uploads**: Website text and fonts are inspected locally using browser DOM and Canvas APIs. Inspected text is never sent to any external server.
- **No Account Required**: The extension operates anonymously and does not require registration, login, or personal identifiers.

---

## 3. What Data Is Stored Locally?

All persistent data is stored strictly in your browser's local sandbox via `chrome.storage.local`:

| Storage Key | Contents | Purpose |
|---|---|---|
| `fontlens_schema_version` | Integer (`1`) | Versioning and schema migrations |
| `fontlens_presets` | Array of preset objects | Built-in and user-created typography formulas |
| `fontlens_favorites` | Array of strings | Names of fonts you have bookmarked |
| `fontlens_recent` | Array of objects (max 25) | Font names, timestamps, and page domain origins |
| `fontlens_comparisons` | Array of objects | Snapshots of multi-font Comparison Studios |
| `fontlens_settings` | Configuration object | Theme, default sample text, highlight color, and inspection flags |

---

## 4. How to Erase Your Data

You retain full ownership and control over all data stored by FontLens:
1. Open the **FontLens Workstation Dashboard** (click the dashboard icon in the extension popup).
2. Navigate to the **Settings** tab.
3. Scroll down to the **Danger Zone** and click **Clear All Extension Data**.
4. Alternatively, uninstalling the extension from `chrome://extensions` immediately wipes all `chrome.storage.local` data.
