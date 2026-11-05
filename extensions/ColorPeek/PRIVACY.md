# 🔒 ColorPeek — Privacy Policy

Last updated: November 2026

**ColorPeek** is built with an absolute privacy-first philosophy. We believe developer tools should work completely offline without sending telemetry or tracking user behavior.

---

## 1. Zero Data Collection
- **No Analytics**: ColorPeek does not include Google Analytics, Mixpanel, Sentry, or any third-party tracking scripts.
- **No Telemetry**: ColorPeek does not log user actions, feature usage, clicks, or timestamps to any remote service.
- **No Accounts**: There is no login, signup, subscription, or identification required.

## 2. Local-Only Storage
- All color palettes, notes, custom names, and recent picks are stored strictly within the browser's local sandbox via `chrome.storage.local`.
- No color data ever leaves your computer.
- Clearing your extension data or browser storage permanently deletes all saved palettes.

## 3. Webpage Content & Inspection
- When using the Element CSS Inspector or EyeDropper, ColorPeek accesses only computed CSS styling properties (`color`, `background-color`, `border-color`) and pixel colors necessary to sample the selected color.
- Webpage content, text, form entries, passwords, cookies, and URLs are **never** logged, recorded, or transmitted.

## 4. Third-Party Requests
- ColorPeek makes **zero** network requests.
- All conversions, WCAG calculations, harmony generations, and code exports are performed synchronously inside local browser memory.
