# ViewPortX Privacy Policy

**Last Updated:** November 2026

ViewPortX is engineered from the ground up to respect user privacy and operate completely offline.

---

## 1. Zero Telemetry & Zero Analytics

- ViewPortX does **not** track, collect, log, or transmit any user activity, page browsing history, visited URLs, IP addresses, or device identifiers.
- There are no analytics SDKs (e.g. Google Analytics, Mixpanel, Sentry) embedded in the extension.

---

## 2. Local-Only Processing

- All DOM inspection, layout analysis, health score computation, CSS generation, and layout verification execute entirely within the local browser environment.
- No network requests are made by the extension to any remote server or external API.

---

## 3. Data Storage

- All user settings and per-site preferences are stored locally on your device via `chrome.storage.local`.
- This data remains strictly in your browser and is never shared, synced with external third parties, or monetized.

---

## 4. Reversibility & Clean Uninstallation

- All stylesheet injections are isolated to the `<style id="viewportx-responsive-styles">` DOM element.
- Uninstalling the extension or clicking "Restore Original" completely purges all injected styles.
