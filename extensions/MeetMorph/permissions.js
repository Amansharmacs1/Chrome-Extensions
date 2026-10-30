/**
 * MeetMorph - Permissions & Diagnostics Helper
 * Diagnoses and handles browser and macOS media permission states.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PermissionsHelper = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class PermissionsHelper {
    static async queryCameraPermission() {
      if (!navigator.permissions || !navigator.permissions.query) {
        return { state: 'unknown', supported: false };
      }
      try {
        const status = await navigator.permissions.query({ name: 'camera' });
        return { state: status.state, supported: true };
      } catch (e) {
        return { state: 'unsupported_query', error: e.message };
      }
    }

    static async queryMicrophonePermission() {
      if (!navigator.permissions || !navigator.permissions.query) {
        return { state: 'unknown', supported: false };
      }
      try {
        const status = await navigator.permissions.query({ name: 'microphone' });
        return { state: status.state, supported: true };
      } catch (e) {
        return { state: 'unsupported_query', error: e.message };
      }
    }

    static async testCameraAccess() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return { granted: true };
      } catch (err) {
        let help = 'Unknown camera error.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          help = 'Permission denied. On macOS, ensure Chrome has Camera access under: System Settings > Privacy & Security > Camera. Also check the lock icon in Chrome address bar.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          help = 'No camera found. Connect a webcam or check if another application is holding exclusive camera access.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          help = 'Camera hardware is busy. Close other apps (e.g., FaceTime, Zoom, OBS, Photo Booth) using the camera.';
        }
        return { granted: false, error: err.name, message: err.message, help };
      }
    }

    static getTroubleshootingGuide(errorName) {
      const macSteps = [
        '1. Open macOS System Settings.',
        '2. Navigate to "Privacy & Security" -> "Camera".',
        '3. Verify "Google Chrome" is toggled ON.',
        '4. In Chrome address bar on Google Meet (meet.google.com), click the Site Settings icon (left of the URL) and ensure Camera is set to "Allow".',
        '5. If another application (FaceTime, Zoom, OBS) is running, quit it to free the camera hardware.'
      ];
      return {
        errorName,
        macSteps
      };
    }
  }

  return PermissionsHelper;
});
