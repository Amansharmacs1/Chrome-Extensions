# Changelog

All notable changes to the **MeetMorph** extension are documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-26

### Added
- **Google Meet Integration:** Expanded host permissions and content script injection rules to support all Google Meet URLs (`https://meet.google.com/*`).
- **Draggable & Collapsible Floating HUD:** Injected an interactive in-page HUD on Google Meet with dragging handle (`⋮⋮`), minimize toggle (`—`), and Vanish/Return controls placed above Google Meet's bottom control bar.
- **`RTCPeerConnection.generateCertificate` Preservation:** Fixed proxying on `RTCPeerConnection` to preserve static methods required by Google Meet WebRTC stack.
- **Track Removal Lifecycle Handling:** Hooked `pc.removeTrack` in `page-bridge.js` to ensure clean sender cleanup when cameras are toggled off.
- **Multi-call `getUserMedia` Resilience:** Added dynamic resolution adaptation and video element null-checking in `video-engine.js` when meeting participants adjust send resolution or toggle video devices.
- **Safe Animation Frame Fallbacks:** Added environment checks for `requestAnimationFrame` and `cancelAnimationFrame` in `video-engine.js` to support headless testing and background runtimes.
- **Dedicated Google Meet Compatibility Test Suite:** Added [`tests/meet-compatibility.test.js`](tests/meet-compatibility.test.js) validating URL matching, stream reinitialization, and static method inheritance.
- **Comprehensive Documentation Suite:** Added `FEATURES.md`, `TESTING.md`, `PERMISSIONS.md`, `PRIVACY.md`, `CONTRIBUTING.md`, and `screenshots/README.md`.

### Fixed
- Fixed `lastSnapTime` initialization in `snap-detector.js` preventing the first finger snap from triggering before the cooldown period.
- Fixed `TypeError: Cannot read properties of undefined (reading 'getUserMedia')` in test mocks by defining configurable properties on `global.navigator`.
- Fixed popup domain detection in `popup.js` to correctly detect Google Meet tabs, display active meeting codes, and provide appropriate fallback guidance for unsupported domains.
- Removed unused `"scripting"` permission from `manifest.json` to adhere to the principle of least privilege.
- Cleaned up loose duplicate files from the parent directory to establish `/MeetMorph` as the single canonical extension root.

### Initial Implementation (Prior Audit)
- Manifest V3 extension configuration.
- Real-time 30 FPS canvas rendering pipeline with `canvas.captureStream(30)`.
- Full-resolution empty-room background capture with 3-second visual countdown and Rec. 601 luma threshold validation.
- Pure audio continuity ensuring zero microphone alteration during Vanish mode.
- Web Audio API acoustic transient detector for finger snaps.
- macOS dark glassmorphism popup dashboard with dual previews and WebRTC telemetry.
- Standalone two-party WebRTC loopback test room (`test-room.html`).
