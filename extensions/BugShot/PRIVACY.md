# 🛡️ BugShot — Privacy Policy & Data Handling

BugShot is built with a **local-first, privacy-by-design** architecture. All data remains exclusively on your local machine.

---

## 1. Zero External Telemetry or Network Transmission
- BugShot contains **no remote analytics**, **no tracking pixels**, and **no third-party SDKs**.
- Bug reports, screenshots, console logs, and network diagnostics are stored locally in your browser (`chrome.storage.local` and `IndexedDB`).
- No bug report or diagnostic data is ever transmitted across the network unless you explicitly copy or export it yourself.

---

## 2. Automatic Query Parameter Sanitization
Modern web applications frequently embed sensitive tokens, session keys, and authentication parameters into URL query strings. BugShot automatically scrubs sensitive query tokens before saving metadata:

Any parameter matching:
- `token`, `auth`, `key`, `secret`, `password`, `pwd`, `session`, `jwt`, `signature`, `sig`, `access_token`, `id_token`

is automatically redacted to `[REDACTED]` prior to storage or export.

---

## 3. Permanent Pixel Redaction
When blurring sensitive UI areas (e.g. credit card numbers, passwords, personal addresses) using the Redaction tool:
- The pixels are irreversibly transformed on the raw HTML5 Canvas via 12×12 pixel averaging.
- The underlying original data is permanently overwritten. It cannot be recovered by inspecting the DOM or reversing styles.

---

## 4. Full Data Control
You maintain 100% ownership and control over all stored bug reports:
- Delete any individual report at any time from the BugShot Dashboard.
- Delete all local data instantly with one click using the "Clear All Data" action in Dashboard Settings.
- Uninstalling BugShot automatically purges all locally stored reports and preferences.
