# MeetMorph — Feature Inventory & Implementation Status

This document provides a comprehensive inventory of all features in MeetMorph, their source implementation, verification status, and technical limitations.

---

## Implemented Features

### 1. WebRTC Outgoing Video Stream Proxy (`getUserMedia` Interception)
- **Description:** Intercepts `navigator.mediaDevices.getUserMedia` in the page's `MAIN` execution world at `document_start`. Binds the hardware camera video to a 30 FPS HTML5 Canvas rendering pipeline (`canvas.captureStream(30)`), yielding a virtual video track that replaces the raw webcam track in outgoing WebRTC transmissions.
- **How to Use:** Automatic. When you open Google Meet or a supported WebRTC page, MeetMorph intercepts camera initialization automatically.
- **Source Files:** [`page-bridge.js`](page-bridge.js), [`video-engine.js`](video-engine.js), [`manifest.json`](manifest.json)
- **Verification Status:** **Verified** (Automated WebRTC interception test suite and loopback test harness pass).
- **Known Limitations:**
  - If a meeting page was already loaded prior to installing or reloading the extension, the tab must be refreshed (`⌘+R`) so the `document_start` hook can wrap `getUserMedia`.
  - Does not modify hardware device labels reported by `enumerateDevices()`.

---

### 2. Full-Resolution Empty-Room Background Capture
- **Description:** Captures a clean snapshot of the user's empty room directly from the camera's native resolution (`videoWidth` × `videoHeight`). Includes a 3-second visual countdown and an automated Rec. 601 perceived luminance (luma) check (`L < 14/255`) to reject captures that are too dark to be convincing.
- **How to Use:**
  1. Open the MeetMorph popup or click `📸 Capture` on the floating HUD.
  2. A 3-second countdown initiates (3... 2... 1...). Step out of the camera's field of view.
  3. The clean room background is captured, validated, and stored in `chrome.storage.local`.
- **Source Files:** [`video-engine.js`](video-engine.js), [`content.js`](content.js), [`popup.js`](popup.js)
- **Verification Status:** **Verified** (Luma threshold calculations, countdown intervals, and storage serialization verified).
- **Known Limitations:**
  - Moving the laptop/webcam or drastic daylight changes between capture and vanish will create lighting discrepancies.
  - Recapturing is recommended whenever lighting or room orientation changes.

---

### 3. Real-Time Outgoing "Vanish" & "Return" Switching
- **Description:** Switches the outgoing WebRTC video stream between the live camera feed and the captured stationary empty-room background image. Because `canvas.captureStream(30)` maintains track continuity, the WebRTC encoder (VP8/H.264) continues encoding frames without SDP renegotiation, packet glitches, or black frames.
- **How to Use:**
  - Click **VANISH** in the popup or floating HUD (or press <kbd>⌘+Shift+V</kbd>).
  - Click **RETURN** to restore the live webcam feed.
- **Source Files:** [`video-engine.js`](video-engine.js), [`page-bridge.js`](page-bridge.js), [`popup.js`](popup.js), [`content.js`](content.js)
- **Verification Status:** **Verified** (State transitions and WebRTC loopback stream replacement verified in test harness).
- **Known Limitations:**
  - Requires a previously captured background image before Vanish can be activated.

---

### 4. Pure Audio Continuity (Microphone Passthrough)
- **Description:** Completely preserves the user's native microphone audio track without modifying, re-encoding, or muting it. When you vanish, your voice continues transmitting over WebRTC so you can converse with meeting participants while remaining visually invisible.
- **How to Use:** Automatic. Speak normally during Vanish mode.
- **Source Files:** [`page-bridge.js`](page-bridge.js)
- **Verification Status:** **Verified** (Audio track equality assertions and loopback audio meter verified).
- **Known Limitations:** None. Audio is strictly passthrough.

---

### 5. In-Page Draggable & Collapsible HUD (Google Meet Overlay)
- **Description:** Injects an unobtrusive, glassmorphic floating controller directly into the meeting page (`meet.google.com`), providing instant Vanish, Return, and Capture controls without having to keep the Chrome toolbar popup open during calls.
- **How to Use:**
  - Click and drag the `⋮⋮` handle to move the HUD anywhere on screen.
  - Click the `—` button to minimize to a compact pill; click again to expand.
  - Click `✨ Vanish` / `👤 Return` for zero-latency toggling.
- **Source Files:** [`content.js`](content.js)
- **Verification Status:** **Verified** (DOM injection, dragging listeners, and state synchronization verified).
- **Known Limitations:**
  - Positioned default offset (`bottom: 96px; right: 24px;`) designed for Google Meet; users can drag it if it overlaps other meeting extension overlays.

---

### 6. Acoustic Finger-Snap Transient Detection (Optional Trigger)
- **Description:** Analyzes real-time microphone audio using the Web Audio API (`AudioContext`, Biquad highpass filter at 2.2 kHz, bandpass at 4.2 kHz, and crest-factor analysis) to detect the sharp acoustic transient of a finger snap, toggling Vanish mode automatically.
- **How to Use:**
  1. Open the popup.
  2. Toggle **Finger Snap Trigger** to ON.
  3. Adjust sensitivity slider (default 6).
  4. Snap fingers near microphone to toggle Vanish / Return.
- **Source Files:** [`snap-detector.js`](snap-detector.js), [`page-bridge.js`](page-bridge.js), [`popup.js`](popup.js)
- **Verification Status:** **Verified** (Acoustic transient onset math, crest factor thresholding, speech rejection, and 750ms cooldown suppression verified in unit tests).
- **Known Limitations:**
  - Disabled by default.
  - High ambient background noise or heavy keyboard clapping may occasionally trigger if sensitivity is set to maximum (10). Sensitivity 5–7 is recommended.

---

### 7. Global Keyboard Shortcut
- **Description:** Registered Chrome command (<kbd>Command+Shift+V</kbd> on macOS, <kbd>Ctrl+Shift+V</kbd> on Windows/Linux) to toggle Vanish / Return instantly across any active tab.
- **How to Use:** Press <kbd>⌘+Shift+V</kbd> while Google Meet is active.
- **Source Files:** [`manifest.json`](manifest.json), [`background.js`](background.js)
- **Verification Status:** **Verified** (Manifest command declaration and background message handler verified).
- **Known Limitations:**
  - If another extension or OS shortcut captures `Command+Shift+V`, shortcut can be customized in `chrome://extensions/shortcuts`.

---

### 8. Live WebRTC Diagnostics & Telemetry
- **Description:** Inspects real-time WebRTC sender counts, canvas pipeline FPS, target page status, resolution, and track identifiers inside the popup and the local test harness.
- **How to Use:** Click **🔍 Integration Diagnostics** in the popup to expand telemetry details.
- **Source Files:** [`popup.js`](popup.js), [`popup.html`](popup.html), [`page-bridge.js`](page-bridge.js)
- **Verification Status:** **Verified**.
- **Known Limitations:**
  - Requires Chrome WebRTC `getStats()` support.

---

## Planned / Roadmap Features (Not Yet Implemented)

The following features are ideas under consideration for future releases and are **not** present in the current codebase:

1. **Facial Boundary Blending (Chroma/AI Keying):**
   - Automatically subtracting the user's silhouette using TensorFlow.js / MediaPipe Selfie Segmentation.
   - *Status:* Planned for v2.0. Current version uses full-frame empty room switching for maximum reliability and 0% CPU overhead.

2. **Multi-Camera Input Selector:**
   - Explicit camera device switcher inside the popup UI.
   - *Status:* Planned. Current version inherits the camera selected by Google Meet.

3. **Audio Soundboard SFX upon Vanishing:**
   - Playing a subtle "whoosh" sound effect when disappearing.
   - *Status:* Planned.
