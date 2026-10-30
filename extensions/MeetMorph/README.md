# MeetMorph

> **Disappear and reappear on Google Meet by switching your outgoing webcam video to a clean, captured image of your empty room.**

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](manifest.json)
[![Tests Passing](https://img.shields.io/badge/Tests-6%2F6%20Passing-brightgreen.svg)](tests/)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Chrome-orange.svg)](#requirements-and-prerequisites)
[![License](https://img.shields.io/badge/License-Pending%20Review-lightgrey.svg)](#license)

---

## 1. Overview

**MeetMorph** is a Chrome extension for macOS and desktop Chrome that allows you to instantly "vanish" and "reappear" during video calls on [Google Meet](https://meet.google.com) (and supported WebRTC video platforms).

Instead of merely hiding your local video preview or toggling a CSS blur filter, MeetMorph intercepts the browser's outgoing WebRTC video pipeline. It allows you to capture a clean, full-resolution snapshot of your empty room and seamlessly route that image into your outgoing video stream. 

To colleagues, strangers, or meeting participants on the other end, **you completely disappear from your room**, while your microphone continues streaming your voice without interruption.

---

## 2. The Problem MeetMorph Solves

Standard meeting applications provide "camera off" buttons, which turn off video entirely and display an avatar profile image, signaling that you have manually stopped your camera.

Traditional virtual background replacement algorithms (e.g. green screen or AI segmentation) attempt to keep your body visible while replacing the background.

**MeetMorph solves a completely different need:**
- It allows you to step away or perform practical jokes by showing your **real room without you in it**.
- It switches the **actual WebRTC video track transmitted over the network**, ensuring that remote participants see the empty room feed at 30 FPS.
- It guarantees **audio continuity**, ensuring that your microphone remains unmuted, uncompressed, and active so you can keep speaking while remaining visually invisible.

---

## 3. Implemented & Verified Features

The following features are fully implemented in the codebase and verified by automated tests:

- **WebRTC Outgoing Stream Interception:** Proxies `navigator.mediaDevices.getUserMedia` in the page's native `MAIN` execution context at `document_start`.
- **Canvas 30 FPS Processing Pipeline:** Routes hardware camera frames through an HTML5 Canvas pipeline (`canvas.captureStream(30)`), generating a compliant virtual video track.
- **Empty-Room Background Capture:** Captures a full-resolution snapshot of your room with a 3-second countdown and Rec. 601 perceived luminance (luma) brightness validation.
- **Instant Vanish & Return Switching:** Seamlessly toggles the canvas render loop between the live camera feed and the static empty room image without SDP renegotiation or WebRTC packet glitches.
- **Pure Audio Passthrough:** Leaves your microphone audio track 100% untouched and unmuted during Vanish mode.
- **Draggable & Collapsible Floating In-Page HUD:** A glassmorphic on-screen widget that floats above Google Meet's bottom controls with dragging handle (`⋮⋮`), minimize toggle (`—`), and instant Vanish/Return controls.
- **Finger-Snap Acoustic Trigger (Optional):** Local Web Audio API transient detector analyzing high-frequency energy (>2.2 kHz) and crest factor (>3.2) with a 750ms refractory cooldown.
- **Global Keyboard Shortcut:** <kbd>Command+Shift+V</kbd> (macOS) / <kbd>Ctrl+Shift+V</kbd> (Windows/Linux) to toggle Vanish / Return from anywhere.
- **Integration Diagnostics:** Live telemetry in the popup displaying active WebRTC senders, canvas pipeline FPS, resolution, and track identifiers.
- **Interactive WebRTC Loopback Test Room:** Dedicated standalone test room ([`test-room.html`](test-room.html)) simulating two-party calls with live `getStats()` bitrate telemetry.

---

## 4. Screenshots

> *Note: For instructions on capturing fresh screenshots of your setup, refer to [screenshots/README.md](screenshots/README.md).*

| Extension Popup Dashboard | In-Meeting Floating HUD |
| :---: | :---: |
| ![MeetMorph Popup](screenshots/popup.png) | ![MeetMorph In-Meeting HUD](screenshots/meetmorph-in-meeting.png) |

| Empty-Room Vanish Mode | WebRTC Simulation Test Room |
| :---: | :---: |
| ![MeetMorph Vanished View](screenshots/meetmorph-vanished.png) | ![MeetMorph Test Room](screenshots/test-room.png) |

---

## 5. Technology Stack

- **Extension Framework:** Chrome Extension Manifest V3 (MV3).
- **Execution Worlds:** Dual execution context — `MAIN` world for WebRTC prototype interception; `ISOLATED` world for storage and messaging.
- **Video Processing:** HTML5 Canvas API, `HTMLCanvasElement.captureStream(30)`.
- **Audio Analysis:** Web Audio API (`AudioContext`, `BiquadFilterNode`, `AnalyserNode`, `ScriptProcessorNode`).
- **Network / Transport:** WebRTC Media Capture and Streams API (`navigator.mediaDevices.getUserMedia`, `RTCPeerConnection`, `RTCRtpSender`).
- **Local Persistence:** `chrome.storage.local`.
- **Styling:** Vanilla CSS3 (modern macOS dark glassmorphism).
- **Testing:** Node.js native test runner and WebRTC loopback simulation.

---

## 6. Project Directory Structure

```
MeetMorph/
├── manifest.json         # Manifest V3 configuration (dual-world scripts, permissions)
├── popup.html            # Dark macOS extension popup dashboard
├── popup.css             # Glassmorphic styling, status indicators, accessible controls
├── popup.js              # State synchronization & UI event controller
├── background.js         # Service worker handling global shortcuts (⌘+Shift+V)
├── content.js            # Content script (ISOLATED world, storage bridge & draggable HUD)
├── page-bridge.js        # Main-world script intercepting getUserMedia & RTCPeerConnection
├── video-engine.js       # Real-time 30 FPS canvas engine, capture countdown & luma validator
├── snap-detector.js      # Web Audio API transient detector for finger snaps
├── permissions.js        # macOS & browser permission diagnostics
├── test-room.html        # Interactive WebRTC loopback test room
├── test-room.css         # Styling for test room and telemetry
├── test-room.js          # WebRTC peer connection loopback & getStats() metrics
├── icons/                # Extension icon assets (16x16, 48x48, 128x128)
├── screenshots/          # Documentation screenshot directory & capture checklist
├── tests/                # Automated verification suite (6/6 passing)
│   ├── manifest.test.js
│   ├── video-engine.test.js
│   ├── snap-detector.test.js
│   ├── permissions.test.js
│   ├── webrtc-bridge.test.js
│   ├── meet-compatibility.test.js
│   └── run-all.js
├── README.md             # Main repository documentation
├── FEATURES.md           # Feature inventory & implementation status
├── TESTING.md            # Comprehensive test results & QA matrix
├── PERMISSIONS.md        # Detailed permission audit & privacy justifications
├── PRIVACY.md            # Privacy policy & local data handling details
├── CONTRIBUTING.md       # Contribution guidelines & coding conventions
├── CHANGELOG.md          # Version history & audit record
├── .gitignore            # Git exclusion rules
└── package.json          # Node package definition & npm test script
```

---

## 7. Requirements and Prerequisites

- **Operating System:** macOS 12 Monterey, macOS 13 Ventura, macOS 14 Sonoma, or macOS 15 Sequoia (Apple Silicon or Intel).
- **Browser:** Google Chrome v111 or later (required for Manifest V3 `"world": "MAIN"` support).
- **Node.js (for running tests):** Node.js v18 or later (tested on Node v26).
- **Hardware:** Built-in FaceTime HD camera or external USB webcam; built-in microphone.

---

## 8. Installation Instructions (Chrome Load Unpacked)

1. Clone or download this repository to your local machine:
   ```bash
   git clone <repository-url>
   cd MeetMorph
   ```
2. Open **Google Chrome**.
3. In the Chrome address bar, navigate to:
   ```
   chrome://extensions
   ```
4. In the top-right corner, toggle **Developer mode** to **ON**.
5. In the top-left corner, click the **Load unpacked** button.
6. In the file picker, select the `MeetMorph` folder:
   ```
   /Users/amansharma/Desktop/Extension/MeetMorph
   ```
7. Click **Select**.
8. **MeetMorph** will appear in your extensions list. Pin it from the Chrome toolbar puzzle-piece icon for easy access.

---

## 9. Usage Workflow on Google Meet

### Step 1: Open Google Meet
1. Go to [https://meet.google.com](https://meet.google.com) and start or join a meeting (`https://meet.google.com/new`).
2. Allow Chrome camera and microphone permissions when prompted.

### Step 2: Use the In-Page Floating HUD
- Once on Google Meet, the **MeetMorph floating HUD** appears above the bottom toolbar (`Live` status).
- Click and drag the `⋮⋮` handle to move the HUD anywhere on screen.
- Click `—` to collapse into a minimal pill; click again to expand.

### Step 3: Capture Your Empty Room
1. Click **📸 Capture Empty Background** (in the popup or on the floating HUD).
2. A 3-second visual countdown starts on screen (3... 2... 1...).
3. **Step completely out of your webcam's view**.
4. The extension captures a clean, full-resolution snapshot of your room and saves it locally.
5. Return to your chair.

### Step 4: Vanish
1. Click **✨ VANISH** (or press <kbd>⌘+Shift+V</kbd>).
2. The status badge turns purple (`VANISHED`).
3. Your outgoing WebRTC video instantly switches to the clean empty room background.
4. Meeting participants will see your room completely empty — as if you vanished into thin air!
5. Your microphone remains live and audible, allowing you to speak normally while invisible.

### Step 5: Return
1. Click **👤 RETURN** (or press <kbd>⌘+Shift+V</kbd>).
2. Your outgoing video seamlessly restores your live camera feed.
3. You can toggle back and forth as many times as you like during a single call without refreshing or leaving the meeting.

---

## 10. Required Permissions

MeetMorph strictly follows the principle of least privilege:

| Permission | Purpose |
| :--- | :--- |
| `"storage"` | Persists your captured room background snapshot and UI preferences locally in `chrome.storage.local`. |
| `"activeTab"` | Allows the background worker to dispatch the toggle command to Google Meet when <kbd>⌘+Shift+V</kbd> is pressed. |
| `https://meet.google.com/*` | Injects the WebRTC proxy script into Google Meet calls. |
| `http://localhost/*`, `http://127.0.0.1/*` | Enables running the local WebRTC test harness (`test-room.html`). |

*For a full audit of all permissions, see [PERMISSIONS.md](PERMISSIONS.md).*

---

## 11. Compatibility Notes & Known Limitations

- **Page Reload after Extension Install:** If you install or reload MeetMorph while a Google Meet tab is already open, you must refresh the meeting tab (`⌘+R`) so the `document_start` hook can intercept camera initialization.
- **Lighting & Camera Movement:** Because the background is a stationary high-resolution snapshot, moving your laptop or sudden shifts in daylight will cause visual seams between the live webcam feed and the background. Simply click **📸 Capture** again to update the room snapshot.
- **Camera Off in Google Meet:** If you turn your camera off using Google Meet's native camera button, Google Meet stops the hardware track. When you turn it back on, MeetMorph automatically re-hooks the new video track.

---

## 12. Troubleshooting Guide

### Issue: "Page Bridge Offline / Waiting for Hook"
- **Solution:** Ensure the active tab is `https://meet.google.com`. If the tab was already open before loading the extension, reload the page (`⌘+R`).

### Issue: Black Screen or Camera Access Blocked
- **macOS System Permissions:** Open macOS **System Settings** -> **Privacy & Security** -> **Camera**. Ensure **Google Chrome** is toggled **ON**. Repeat for **Microphone**.
- **Chrome Site Settings:** Click the lock/site settings icon in the Chrome address bar on `meet.google.com` and verify that Camera and Microphone are set to **Allow**.
- **Hardware In-Use:** If FaceTime, Zoom, OBS, or Photo Booth is running in the background, quit them to release the camera hardware.

### Issue: Video Changes Locally but Remote Participant Sees Nothing
- Open the extension popup and expand **🔍 Integration Diagnostics**.
- Confirm that **Page Bridge** shows `Hooked & Ready` and **Active WebRTC Senders** shows `1 sender(s) transmitting`.

---

## 13. Testing Instructions

MeetMorph includes both automated unit tests and an interactive loopback test room.

### Run Automated Tests (CLI):
```bash
cd MeetMorph
npm test
```
All 6 test suites (`manifest`, `video-engine`, `snap-detector`, `permissions`, `webrtc-bridge`, `meet-compatibility`) will execute and output formatted pass/fail reports.

### Run WebRTC Simulation Test Room (Browser):
1. In Chrome, open:
   ```
   file:///Users/amansharma/Desktop/Extension/MeetMorph/test-room.html
   ```
2. Click **📹 1. Start Meeting Camera**.
3. Click **🤝 2. Connect Participant (WebRTC)**.
4. Click **📸 Capture Test Room**, step aside for 3 seconds.
5. Click **✨ Vanish** and verify that the remote screen immediately shows the empty room while telemetry confirms continuous 30 FPS transmission!
6. Click **▶ Run Verification Suite** on the top right for automated in-browser assertions.

*For full testing details and results, see [TESTING.md](TESTING.md).*

---

## 14. Privacy and Security Information

- **No Remote Servers:** All video frame rendering and audio transient calculations occur 100% on-device in your browser's local memory.
- **No Video Recording:** MeetMorph never records video files or sends media to any remote server.
- **No Analytics / Telemetry:** Contains zero tracking scripts, cookies, or remote analytics.

*For our complete privacy audit, see [PRIVACY.md](PRIVACY.md).*

---

## 15. Roadmap

- [ ] **AI Body Segmentation (v2.0):** Optional silhouette edge feathering via MediaPipe Selfie Segmentation.
- [ ] **Custom Background Uploads:** Allow users to upload existing room photos or custom images from disk.
- [ ] **Soundboard SFX:** Optional audio chime or "whoosh" sound effect when vanishing.

*For feature details and statuses, see [FEATURES.md](FEATURES.md).*

---

## 16. Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, coding guidelines, and pull request expectations.

---

## 17. License

The repository owner has not yet selected a final standalone license for this project. Please consult the repository owner before redistributing or using this software commercially.

---

## 18. Author & Repository Information

- **Project:** MeetMorph Chrome Extension
- **Created for:** Google Meet & WebRTC Video Conferences
- **Development Environment:** macOS, Google Chrome
