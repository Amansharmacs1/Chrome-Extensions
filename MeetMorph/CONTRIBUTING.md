# Contributing to MeetMorph

Thank you for your interest in contributing to **MeetMorph**! We welcome bug fixes, documentation improvements, and architectural enhancements.

---

## 1. Prerequisites

- **macOS** (or Linux/Windows with Google Chrome).
- **Google Chrome** v111 or later.
- **Node.js** v18+ (tested on Node v26).
- A webcam and microphone for hardware testing.

---

## 2. Local Setup & Loading in Chrome

1. **Clone or locate the repository:**
   ```bash
   git clone <repository-url>
   cd MeetMorph
   ```

2. **Install development dependencies (if any) and verify tests:**
   ```bash
   npm test
   ```

3. **Load the unpacked extension in Chrome:**
   - Open Google Chrome and navigate to `chrome://extensions`.
   - In the top-right corner, toggle **Developer mode** to **ON**.
   - Click **Load unpacked** in the top-left corner.
   - Select the `MeetMorph` folder.
   - Pin the extension icon from the Extensions puzzle-piece menu.

---

## 3. Coding Conventions & Architecture

- **Vanilla JavaScript:** MeetMorph does not use heavy frontend frameworks or build steps. Keep all code written in standard modern JavaScript (ES2022+).
- **Separation of Execution Worlds:**
  - `page-bridge.js` runs in the `"world": "MAIN"`, sharing prototypes with the target page (`window`, `RTCPeerConnection`, `navigator.mediaDevices`).
  - `content.js` runs in the `"world": "ISOLATED"`, bridging `chrome.runtime` and `chrome.storage` with `postMessage`.
  - Do **not** attempt to pass `MediaStream` objects over `postMessage` (browser throws `DataCloneError`).
- **WebRTC Integrity:** Always ensure that `RTCPeerConnection` static methods (e.g. `generateCertificate`) and prototype methods remain intact.
- **Zero Remote Code:** Never import remote scripts, CDNs, or analytics. All assets must remain strictly local.
- **Documentation Integrity:** Preserve comments and update relevant markdown documentation whenever changing API behavior.

---

## 4. Running Tests

Before submitting any changes, you must run the automated test suite and ensure all suites pass:

```bash
npm test
```

If you add new features or modify existing behaviors, add corresponding test cases in `tests/`.

---

## 5. Reporting Bugs & Proposing Features

- **Reporting Bugs:**
  - Open an issue on GitHub.
  - Include your macOS version, Chrome version, and exact error message.
  - Describe the target page (Google Meet meeting, green room, or test room).
  - Include console logs from both the page console (`⌘+Option+J`) and the background service worker inspection window (`chrome://extensions` -> "Inspect views: service worker").
- **Proposing Features:**
  - Open an issue outlining the user problem, proposed API, and why it belongs in the core extension.

---

## 6. Pull Request Guidelines

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/my-enhancement
   ```
2. Keep pull requests focused on a single issue or feature.
3. Verify that `npm test` passes with 100% success.
4. Update `CHANGELOG.md` with your changes.
5. Submit the pull request with a clear description and testing evidence.
