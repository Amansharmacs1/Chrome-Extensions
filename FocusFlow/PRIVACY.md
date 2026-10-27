# 🛡️ FocusFlow Privacy Policy

**Effective Date:** October 2026  
**Commitment:** 100% Local, Offline-First, Zero Telemetry.

---

## 1. Core Privacy Principles

FocusFlow was built to be a distraction-free, privacy-respecting productivity companion:
1. **Local Only**: All data is stored locally on your device within your Chrome browser profile.
2. **Zero Telemetry**: FocusFlow contains no Google Analytics, no tracking scripts, no crash reporting beacons, and no advertising trackers.
3. **No External Servers**: FocusFlow does not transmit your tasks, notes, Pomodoro sessions, or browsing habits to any server.
4. **No Account Required**: You never need an email, username, or login to use any feature.

---

## 2. What Data Is Stored Locally

FocusFlow stores the following information locally using `chrome.storage.local`:

- **Timer State**: The current session mode (`focus`, `shortBreak`, `longBreak`), start timestamp, target end timestamp, cycle count, and paused remaining time.
- **Task Items**: Task titles, optional notes, priority ratings, and estimated/completed Pomodoro counts.
- **Productivity History**: An array of completed session records containing the completion timestamp, duration in minutes, session type, and associated task identifier.
- **Settings & Blocklist**: Custom interval durations, daily goal targets, audio/notification preferences, and your custom list of blocked website domains.

---

## 3. What FocusFlow Does NOT Collect

- We do NOT collect or read your browsing history.
- We do NOT monitor the contents of web pages you visit.
- We do NOT access your cookies, form submissions, or login credentials.
- We do NOT track your geographic location or IP address.

---

## 4. How Website Blocking Works Privately

When you enable the Distraction Blocker and specify domains (such as `youtube.com` or `x.com`), FocusFlow creates dynamic declarative network rules inside Chrome's `declarativeNetRequest` API.

**Crucially, Chrome itself enforces these rules without passing your traffic or navigation events to the extension code.** The extension cannot see what videos you watch, what links you click, or what other sites you visit.

---

## 5. Data Retention & How to Clear Your Data

You retain full control over your data at all times:
- **Individual Items**: You can delete individual tasks or remove blocked domains at any time.
- **Complete Wipe**: To erase all FocusFlow data, open **Settings** (in either the popup or the dashboard) and click **Reset All FocusFlow Data**. This will purge all stored settings, tasks, and historical session logs from `chrome.storage.local`.
- **Uninstalling**: Removing FocusFlow via `chrome://extensions` immediately removes all extension data stored by Chrome.

---

## 6. Open Source Transparency

FocusFlow is completely open source. You can inspect every line of JavaScript, HTML, and CSS in this repository to verify these privacy assurances.
