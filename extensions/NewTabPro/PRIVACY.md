# 🔒 NewTab Pro — Privacy Policy

**Effective Date:** October 2026  
**Commitment:** 100% Local-First. Zero Telemetry. No User Tracking.

---

## 1. Introduction

NewTab Pro was built on a foundational principle: **your new tab belongs to you.**

Modern browser extensions frequently collect analytics, monitor navigation history, or upload clipboard content. NewTab Pro rejects this model. It operates as an entirely self-contained, local productivity utility.

---

## 2. Information We Do NOT Collect

- We do **NOT** track your browsing history or keystrokes.
- We do **NOT** inspect web pages you visit.
- We do **NOT** collect your IP address, device fingerprint, or MAC address.
- We do **NOT** collect personal identities, emails, or account credentials.
- We do **NOT** include any analytics libraries, telemetry SDKs, or crash-reporting servers (e.g., Google Analytics, Mixpanel, Sentry).
- We do **NOT** sell, rent, or share any user data with third parties.

---

## 3. Data Stored Locally on Your Computer

All user preferences and data are stored locally in Chrome's sandboxed storage (`chrome.storage.local`):

1. **User Preferences:** Display name (optional), time format (12h/24h), running seconds, default search engine, and theme settings.
2. **Shortcuts:** Titles, URLs, and color choices for quick links created or edited by you.
3. **Tasks:** Titles, completion statuses, and dates of tasks entered into the task manager.
4. **Scratchpad:** Notes entered into the quick scratchpad text area.
5. **Widget Layout:** Visibility and display order of your widgets.

This data never leaves your device unless you explicitly use the **Export JSON** feature in Settings to save a backup file to your own hard drive.

---

## 4. Third-Party Network Services (Optional Feature)

The only feature in NewTab Pro that interacts with an external network service is the **Weather Widget**, which is disabled by default:

- **Provider:** [Open-Meteo](https://open-meteo.com) (open-source weather service).
- **No API Key Required:** Queries are sent anonymously without user identifiers or API keys.
- **Manual City Lookup:** City names entered in Settings are sent to Open-Meteo's public geocoding API to resolve coordinates.
- **No Geolocation API:** NewTab Pro never accesses your device's GPS or Chrome's Geolocation API.
- **Intelligent Caching:** Weather data is cached locally for 30 minutes to prevent unnecessary requests.
- **Opt-in / Disable Anytime:** If you do not wish to send requests to Open-Meteo, simply leave the Weather widget disabled in Settings.

---

## 5. Data Retention & Deletion

- You retain full control over all stored data.
- You can reset the extension to factory defaults at any time via **Settings > Data & Storage > Reset All**.
- Uninstalling the extension completely deletes all associated local storage data from Google Chrome.

---

## 6. Questions & Transparency

NewTab Pro is fully open-source. You can inspect every line of code in the extension's source directory or verify network traffic via Chrome DevTools (`F12 > Network`).
