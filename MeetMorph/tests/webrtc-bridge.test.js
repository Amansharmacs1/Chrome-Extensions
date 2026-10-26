/**
 * Test Suite: WebRTC Interception & Page Bridge Architecture
 */

const assert = require('assert');

async function run() {
  console.log('--- Running WebRTC Bridge & Interception Tests ---');

  // Set up mock DOM / Browser environment for Node test execution
  global.window = global;
  global.self = global;

  // Mock MediaStream & Track
  class MockMediaStreamTrack {
    constructor(kind, label) {
      this.id = 'track-' + Math.random().toString(36).slice(2, 9);
      this.kind = kind;
      this.label = label || `${kind}_mock_track`;
      this.readyState = 'live';
      this.enabled = true;
    }
    stop() {
      this.readyState = 'ended';
    }
  }

  class MockMediaStream {
    constructor(tracks = []) {
      this.id = 'stream-' + Math.random().toString(36).slice(2, 9);
      this._tracks = [...tracks];
    }
    getTracks() { return this._tracks; }
    getVideoTracks() { return this._tracks.filter(t => t.kind === 'video'); }
    getAudioTracks() { return this._tracks.filter(t => t.kind === 'audio'); }
    addTrack(t) { this._tracks.push(t); }
  }

  global.MediaStream = MockMediaStream;
  global.MediaStreamTrack = MockMediaStreamTrack;

  // Mock RTCPeerConnection
  class MockRTCRtpSender {
    constructor(track) {
      this.track = track;
    }
    async replaceTrack(newTrack) {
      this.track = newTrack;
      return true;
    }
  }

  class MockRTCPeerConnection {
    constructor() {
      this.senders = [];
      this.connectionState = 'connected';
      this.listeners = {};
    }
    addEventListener(event, cb) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
    }
    addTrack(track, ...streams) {
      const sender = new MockRTCRtpSender(track);
      this.senders.push(sender);
      return sender;
    }
    removeTrack(sender) {
      this.senders = this.senders.filter(s => s !== sender);
    }
    getSenders() {
      return this.senders;
    }
    close() {
      this.connectionState = 'closed';
    }
  }

  // Static method (Google Meet requires this)
  MockRTCPeerConnection.generateCertificate = async () => ({ certId: 'mock_cert_123' });

  global.RTCPeerConnection = MockRTCPeerConnection;
  window.RTCPeerConnection = MockRTCPeerConnection;

  // Mock navigator.mediaDevices
  const hardwareVideoTrack = new MockMediaStreamTrack('video', 'Hardware Webcam HD');
  const hardwareAudioTrack = new MockMediaStreamTrack('audio', 'Hardware Internal Mic');

  const mockNavigator = {
    mediaDevices: {
      getUserMedia: async (constraints) => {
        const tracks = [];
        if (constraints.video) tracks.push(hardwareVideoTrack);
        if (constraints.audio) tracks.push(hardwareAudioTrack);
        return new MockMediaStream(tracks);
      }
    }
  };

  Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    configurable: true,
    writable: true
  });
  window.navigator = mockNavigator;

  // Mock window postMessage
  const messageListeners = [];
  global.addEventListener = (event, cb) => {
    if (event === 'message') messageListeners.push(cb);
  };
  global.postMessage = (data) => {
    messageListeners.forEach(cb => cb({ data }));
  };

  // Require dependencies
  const VideoEngine = require('../video-engine.js');
  const SnapDetector = require('../snap-detector.js');
  global.VideoEngine = VideoEngine;
  global.SnapDetector = SnapDetector;

  // Load page-bridge
  require('../page-bridge.js');
  const bridge = window.__meetmorphBridge || window.__ometvVanishBridge;
  assert(bridge, 'PageBridge must be mounted on window.__meetmorphBridge');

  // Verify RTCPeerConnection static methods are preserved (Google Meet requirement)
  assert.strictEqual(typeof window.RTCPeerConnection.generateCertificate, 'function', 'RTCPeerConnection.generateCertificate static method must be preserved');
  const cert = await window.RTCPeerConnection.generateCertificate({ name: 'ECDSA', namedCurve: 'P-256' });
  assert.strictEqual(cert.certId, 'mock_cert_123', 'Static certificate generation must work');

  // Mock VideoEngine's processed track for testing
  const virtualCanvasVideoTrack = new MockMediaStreamTrack('video', 'MeetMorph Canvas Track (30fps)');
  bridge.videoEngine.processedVideoTrack = virtualCanvasVideoTrack;
  bridge.videoEngine.canvasStream = new MockMediaStream([virtualCanvasVideoTrack]);

  // Test 1: Calling getUserMedia on page intercepts and returns composite stream
  const compositeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  assert(compositeStream, 'getUserMedia must return a composite stream');

  // Video track must be the processed canvas track
  const videoTracks = compositeStream.getVideoTracks();
  assert.strictEqual(videoTracks.length, 1, 'Must have exactly 1 video track');
  assert.strictEqual(videoTracks[0].id, virtualCanvasVideoTrack.id, 'Video track must be the virtual processed track');

  // Audio track must be untouched hardware audio track
  const audioTracks = compositeStream.getAudioTracks();
  assert.strictEqual(audioTracks.length, 1, 'Must have exactly 1 audio track');
  assert.strictEqual(audioTracks[0].id, hardwareAudioTrack.id, 'Audio track must be the original hardware track');

  // Test 2: Audio-only getUserMedia passes through untouched
  const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  assert.strictEqual(audioOnlyStream.getVideoTracks().length, 0, 'Audio-only stream must not have video tracks');
  assert.strictEqual(audioOnlyStream.getAudioTracks().length, 1, 'Audio-only stream must preserve audio track');

  // Test 3: RTCPeerConnection outgoing track integration
  const pc = new window.RTCPeerConnection();
  const videoSender = pc.addTrack(compositeStream.getVideoTracks()[0], compositeStream);
  assert.strictEqual(videoSender.track.id, virtualCanvasVideoTrack.id, 'WebRTC sender must transmit the virtual processed track');

  // Test 4: Track replacement when switching tracks
  const updatedTrack = new MockMediaStreamTrack('video', 'Updated Virtual Track');
  bridge._replaceTracksOnActiveSenders(updatedTrack);
  assert.strictEqual(videoSender.track.id, updatedTrack.id, 'Active RTCRtpSender must be updated via replaceTrack');

  // Test 5: removeTrack cleans up sender tracking
  pc.removeTrack(videoSender);
  assert(!bridge.activeVideoSenders.has(videoSender), 'removeTrack must remove sender from active tracking map');

  // Test 6: Message bridge communication
  let statusReceived = false;
  window.addEventListener('message', (e) => {
    if (e.data && e.data.source === 'ometv-vanish-page' && e.data.type === 'STATUS_UPDATE') {
      statusReceived = true;
    }
  });

  window.postMessage({
    source: 'ometv-vanish-content',
    type: 'GET_STATUS'
  });

  assert.strictEqual(statusReceived, true, 'Status update message must be received from page bridge');

  console.log('✅ All WebRTC Bridge & Interception tests passed.');
}

module.exports = { run };
if (require.main === module) run();
