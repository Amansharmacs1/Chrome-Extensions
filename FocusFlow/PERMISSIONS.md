# 🔐 FocusFlow Permissions & Security Audit

This document details every permission requested by FocusFlow, explaining its technical necessity, runtime lifecycle, and user privacy protections.

---

## 1. Permission Matrix

| Permission | Technical Necessity | When Used | User Impact |
|---|---|---|---|
| `storage` | Saves user preferences, active tasks, session state, and productivity history locally. | On initialization and state updates | Data is stored solely on your machine in `chrome.storage.local`. Never synced to external servers. |
| `alarms` | Schedules exact session completion wakeups via `chrome.alarms`. | When a session starts or resumes | Wakes up the service worker at the exact second a Pomodoro interval ends, avoiding battery drain from polling loops. |
| `notifications` | Dispatches desktop notification alerts when an interval completes or a daily goal is achieved. | On interval completion (if enabled) | Displays native Chrome system notifications. Can be disabled at any time in Settings. |
| `declarativeNetRequest` | Dynamically applies network-level block rules to user-selected distracting websites. | Active focus sessions only | Chrome blocks page navigation to specified domains without exposing your browsing history to the extension. |
| `optional_host_permissions` (`*://*/*`) | Allows blocking navigation on user-added domains. | Only when distraction blocker is active | Scoped strictly to the specific domains entered by the user in their blocklist. |

---

## 2. Privacy Guarantees

- **No Remote Transmission**: FocusFlow has zero backends, zero cloud synchronization, and zero third-party analytics.
- **No Browsing History Collection**: FocusFlow does not read your browser tabs, history, or open URLs.
- **Declarative Filtering**: By utilizing `declarativeNetRequest` instead of `webRequest`, Chrome executes blocking directly in the browser's C++ network core. The extension itself never inspects URLs or payload contents of web requests.
- **Temporary Rules**: Blocking rules are dynamic and temporary. As soon as a focus interval pauses or ends, all rules are erased from Chrome's network engine.

---

## 3. Explicit Prohibitions Audit

The following high-risk or invasive permissions were audited and are **strictly excluded**:

- ❌ `tabs`: NOT requested. FocusFlow does not inspect tab titles or URLs.
- ❌ `<all_urls>` (in static permissions): NOT requested.
- ❌ `webRequest` / `webRequestBlocking`: NOT requested. Replaced with privacy-preserving `declarativeNetRequest`.
- ❌ `cookies`: NOT requested.
- ❌ `history`: NOT requested.
- ❌ `identity`: No user accounts or OAuth required.
