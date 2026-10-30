/**
 * Test Suite: Google Meet Compatibility & Edge Cases
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('--- Running Google Meet Compatibility Tests ---');

  // 1. Verify Manifest V3 Pattern Matches Google Meet URLs
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../manifest.json'), 'utf8'));

  const googleMeetTestUrls = [
    'https://meet.google.com/abc-defg-hij',
    'https://meet.google.com/new',
    'https://meet.google.com/landing',
    'https://meet.google.com/'
  ];

  function matchesPattern(url, pattern) {
    const regexStr = '^' + pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*') + '$';
    return new RegExp(regexStr).test(url);
  }

  for (const url of googleMeetTestUrls) {
    const isMatchedInContentScripts = manifest.content_scripts.every(cs =>
      cs.matches.some(pattern => matchesPattern(url, pattern))
    );
    assert(isMatchedInContentScripts, `Google Meet URL ${url} must match all content script patterns`);

    const isMatchedInHostPermissions = manifest.host_permissions.some(pattern =>
      matchesPattern(url, pattern)
    );
    assert(isMatchedInHostPermissions, `Google Meet URL ${url} must match host permissions`);
  }

  // 2. Test Multi-call getUserMedia lifecycle (Meet preview -> In-meeting call)
  const VideoEngine = require('../video-engine.js');
  const engine = new VideoEngine({ targetFps: 30 });

  // Simulate mock 640x360 preview stream
  let previewEnded = false;
  const mockPreviewTrack = {
    id: 'preview-track',
    kind: 'video',
    readyState: 'live',
    onended: null,
    stop: () => { previewEnded = true; }
  };
  const mockPreviewStream = {
    getVideoTracks: () => [mockPreviewTrack],
    getAudioTracks: () => [{ id: 'audio-preview', kind: 'audio' }],
    getTracks: () => [mockPreviewTrack]
  };

  // Mock DOM video element for test
  global.document = {
    createElement: (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        style: {},
        autoplay: false,
        muted: false,
        playsInline: false,
        videoWidth: 640,
        videoHeight: 360,
        play: async () => {},
        pause: () => {},
        onloadedmetadata: null,
        getContext: () => ({
          drawImage: () => {},
          getImageData: () => ({ data: new Uint8ClampedArray(640 * 360 * 4) }),
          fillRect: () => {},
          fillText: () => {}
        }),
        captureStream: (fps) => ({
          getVideoTracks: () => [{ id: 'canvas-track-1', kind: 'video', readyState: 'live', stop: () => {} }],
          getTracks: () => []
        }),
        parentNode: {
          removeChild: () => {}
        }
      };

      let _src = null;
      Object.defineProperty(el, 'srcObject', {
        get: () => _src,
        set: (val) => {
          _src = val;
          setImmediate(() => {
            if (el.onloadedmetadata) el.onloadedmetadata();
          });
        }
      });

      return el;
    },
    body: {
      appendChild: () => {}
    }
  };

  const track1 = await engine.initWithStream(mockPreviewStream);
  assert(track1, 'First stream initialization must return a processed track');
  assert.strictEqual(engine.state, VideoEngine.STATES.VISIBLE, 'Engine state must be VISIBLE');

  // Simulate Meet switching to 1280x720 HD in-meeting stream
  const mockHdTrack = {
    id: 'hd-track',
    kind: 'video',
    readyState: 'live',
    onended: null,
    stop: () => {}
  };
  const mockHdStream = {
    getVideoTracks: () => [mockHdTrack],
    getAudioTracks: () => [{ id: 'audio-hd', kind: 'audio' }],
    getTracks: () => [mockHdTrack]
  };

  const track2 = await engine.initWithStream(mockHdStream);
  assert(track2, 'Second stream initialization must return a processed track');
  assert.strictEqual(engine.state, VideoEngine.STATES.VISIBLE, 'Engine state must remain VISIBLE');

  // 3. Test Static Properties on RTCPeerConnection (Certificate generation)
  const bridge = window.__meetmorphBridge || window.__ometvVanishBridge;
  assert(bridge, 'PageBridge must be active');
  assert.strictEqual(typeof window.RTCPeerConnection.generateCertificate, 'function', 'generateCertificate must be available on RTCPeerConnection');

  await new Promise(r => setTimeout(r, 50));
  engine.stop();
  console.log('✅ All Google Meet Compatibility tests passed.');
}

module.exports = { run };
if (require.main === module) run();
