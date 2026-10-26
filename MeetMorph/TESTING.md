# MeetMorph — Testing & Quality Assurance Documentation

This document records the testing strategy, test suites executed, verification results, and regression test checklists for the MeetMorph Chrome Extension.

---

## 1. Test Environment

- **Operating System:** macOS Darwin (Apple Silicon / arm64)
- **Node.js Version:** v26.9.0
- **npm Version:** 11.19.1
- **Target Browser:** Google Chrome 111+ (tested on Google Chrome 156.0.8078.47)
- **Target Platform:** Google Meet (`https://meet.google.com/*`) & WebRTC platforms

---

## 2. Automated Test Suite Results

The automated verification suite can be executed locally at any time:

```bash
cd /Users/amansharma/Desktop/Extension/MeetMorph
npm test
```

### Execution Output:
```
====================================================
🚀 Running MeetMorph Automated Verification Suite
====================================================

--- Running Manifest V3 Tests ---
✅ All Manifest V3 tests passed.

--- Running VideoEngine Tests ---
✅ All VideoEngine tests passed.

--- Running SnapDetector Tests ---
[SnapDetector] SNAP DETECTED! (Peak: 0.650, Threshold: 0.188, Crest: 18.10)
✅ All SnapDetector tests passed.

--- Running Permissions & Diagnostics Tests ---
✅ All Permissions tests passed.

--- Running WebRTC Bridge & Interception Tests ---
[MeetMorph] Initializing Page Bridge in MAIN world...
[MeetMorph] navigator.mediaDevices.getUserMedia successfully proxied. 
[MeetMorph] RTCPeerConnection successfully proxied (static methods preserved). 
[MeetMorph] PageBridge initialized and WebRTC hooks installed. 
[MeetMorph] getUserMedia called with constraints: { video: true, audio: true }
[MeetMorph] Composite stream created and returning to caller. Video track: {
  id: 'track-cxof5rd',
  label: 'MeetMorph Virtual Track (30fps)',
  audioTracksCount: 1
}
[MeetMorph] getUserMedia called with constraints: { audio: true, video: false }
[MeetMorph] New RTCPeerConnection created. Active connections: 1
[MeetMorph] pc.addTrack called for track kind: video 
[MeetMorph] Video sender registered with track: track-cxof5rd
[MeetMorph] pc.removeTrack called 
✅ All WebRTC Bridge & Interception tests passed.
[MeetMorph] RTCRtpSender.replaceTrack succeeded for sender. 

--- Running Google Meet Compatibility Tests ---
✅ All Google Meet Compatibility tests passed.

====================================================
🎉 ALL 6/6 TEST SUITES PASSED in 0.18s!
====================================================
```

### Breakdown of Automated Test Suites:

| Suite | File | What is Verified | Result |
| :--- | :--- | :--- | :--- |
| **Manifest V3** | [`tests/manifest.test.js`](tests/manifest.test.js) | Manifest V3 schema validity, extension naming (`MeetMorph`), icons existence on disk, `host_permissions` matching `meet.google.com`, dual-world content scripts (`MAIN` & `ISOLATED`), CSP compliance (no `unsafe-eval`). | **PASS** |
| **Video Engine** | [`tests/video-engine.test.js`](tests/video-engine.test.js) | Initial `IDLE` state, vanish rejection without captured background, Rec. 601 perceived luminance (luma) calculation on dark and bright pixel buffers, state transitions (`VISIBLE` ⇄ `VANISHED`), aspect ratio scaling. | **PASS** |
| **Snap Detector** | [`tests/snap-detector.test.js`](tests/snap-detector.test.js) | Acoustic transient onset math, crest factor analysis (>3.2), sensitivity clamping (1–10), continuous speech/hum noise rejection, 750ms refractory cooldown suppression. | **PASS** |
| **Permissions** | [`tests/permissions.test.js`](tests/permissions.test.js) | Error mapping (`NotAllowedError`, `NotFoundError`), macOS System Settings navigation guide. | **PASS** |
| **WebRTC Bridge** | [`tests/webrtc-bridge.test.js`](tests/webrtc-bridge.test.js) | `navigator.mediaDevices.getUserMedia` proxying, composite stream creation with virtual canvas track + untouched hardware audio track, audio-only constraint passthrough, `RTCPeerConnection` static method preservation (`generateCertificate`), `removeTrack` cleanup, cross-context message routing. | **PASS** |
| **Google Meet Compatibility** | [`tests/meet-compatibility.test.js`](tests/meet-compatibility.test.js) | URL regex matching across all Google Meet path formats (`/abc-defg-hij`, `/new`, `/landing`), multi-call `getUserMedia` reinitialization (preview 360p → in-meeting 720p HD), dynamic canvas resolution resizing. | **PASS** |

---

## 3. Interactive WebRTC Loopback Simulation ([`test-room.html`](test-room.html))

The repository includes a dedicated two-party WebRTC test harness that runs locally in Google Chrome:

```
file:///Users/amansharma/Desktop/Extension/MeetMorph/test-room.html
```

### Manual Verification Matrix in Test Room:

1. **Camera Initialization:**
   - Action: Click **📹 1. Start Meeting Camera**.
   - Verified Behavior: Camera permission is requested. Live feed appears in the Left panel ("You (Local Meeting User)"). Stream pill updates to `Active (30 FPS)`.
2. **WebRTC Peer Connection Establishment:**
   - Action: Click **🤝 2. Connect Participant (WebRTC)**.
   - Verified Behavior: Local SDP offer and remote SDP answer are exchanged via loopback. Video track feeds into the Right panel ("Remote Participant"). Telemetry cards display live outbound bitrate (kbps), packets sent, and video codec (VP8/H.264).
3. **Empty Background Capture:**
   - Action: Click **📸 Capture Test Room**.
   - Verified Behavior: Visual 3-second countdown initiates. Background is captured and saved.
4. **Outgoing Video Vanish Switching:**
   - Action: Click **✨ Vanish (Show Empty Room)**.
   - Verified Behavior: Right panel (Remote Participant) instantly displays the empty room background. Telemetry confirms outbound packets and 30 FPS transmission continue without dropping.
5. **Microphone Continuity:**
   - Verified Behavior: Remote audio level meter shows active microphone spikes while the user is vanished. Audio is completely uninterrupted.
6. **Return Mode Restoration:**
   - Action: Click **👤 Return (Show Live Webcam)**.
   - Verified Behavior: Live webcam video immediately returns on the remote screen.
7. **Peer Reconnection / Resolution Switch:**
   - Action: Click **⏭️ 3. Reconnect Peer**.
   - Verified Behavior: Previous peer connection is cleanly torn down and re-established without browser errors.

---

## 4. Tests Requiring a Live Google Meet Session

Certain user-interaction flows involve Google's proprietary authentication, remote SFU servers, and live hardware inputs. These must be verified manually on a live meeting:

### Live Google Meet Test Checklist:
- [ ] **Pre-meeting Green Room:** Open `https://meet.google.com/new`. Verify that MeetMorph's page bridge hooks `getUserMedia` on the pre-meeting device check screen.
- [ ] **In-Call HUD Visibility:** Join the call. Verify that the MeetMorph floating HUD is mounted at `bottom: 96px; right: 24px;`, positioned safely above Google Meet's bottom controls (`Mute`, `Camera`, `Raise hand`).
- [ ] **HUD Dragging:** Click and drag the `⋮⋮` handle on the HUD to verify it moves smoothly across the screen and can be docked in an alternate location.
- [ ] **HUD Minimization:** Click the `—` button on the HUD. Verify it shrinks into a minimal floating pill (`✨` with status dot) and expands when clicked.
- [ ] **Empty Room Capture:** Click **📸 Capture**, step out of frame for 3 seconds, and confirm the captured preview appears in the popup.
- [ ] **Remote Stranger / Colleague Verification:** Have another meeting participant confirm that when you click **Vanish**, your video box in Google Meet switches to your empty room and your voice remains audible.
- [ ] **Meet Camera Toggle:** Turn camera off and back on using Google Meet's native camera button. Confirm that MeetMorph re-binds the video track seamlessly.
- [ ] **Global Shortcut:** Press <kbd>⌘+Shift+V</kbd> (or <kbd>Ctrl+Shift+V</kbd>) while the meeting window has focus. Verify that Vanish toggles instantly.

---

## 5. Regression Testing Checklist for Future Changes

Before publishing or creating a Git commit:
- [ ] Run `npm test` and verify that all 6 test suites pass with 0 errors.
- [ ] Validate `manifest.json` using Chrome's extension loader (`chrome://extensions` -> Load unpacked).
- [ ] Verify that no console errors appear in the background service worker or page console.
- [ ] Check that `storage.local` values persist across tab reloads.
- [ ] Verify that no API keys or personal credentials exist in the codebase.
