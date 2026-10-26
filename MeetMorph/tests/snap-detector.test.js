/**
 * Test Suite: Audio Snap Detector Algorithm
 */

const assert = require('assert');
const SnapDetector = require('../snap-detector.js');

function run() {
  console.log('--- Running SnapDetector Tests ---');

  const detector = new SnapDetector({
    enabled: true,
    sensitivity: 7,
    cooldownMs: 700
  });

  // 1. Initial State
  assert.strictEqual(detector.enabled, true, 'Detector should be enabled');
  assert.strictEqual(detector.sensitivity, 7, 'Sensitivity should match option');

  // 2. Sensitivity Bounds Clamping
  detector.setSensitivity(15);
  assert.strictEqual(detector.sensitivity, 10, 'Sensitivity must clamp to max 10');
  detector.setSensitivity(-2);
  assert.strictEqual(detector.sensitivity, 1, 'Sensitivity must clamp to min 1');
  detector.setSensitivity(6);
  assert.strictEqual(detector.sensitivity, 6, 'Sensitivity set to 6');

  // 3. Audio Transient Math Verification
  // Simulate synthetic audio buffer containing sharp transient (finger snap):
  // Low ambient baseline with sudden high peak
  const snapBuffer = new Float32Array(512);
  for (let i = 0; i < snapBuffer.length; i++) {
    snapBuffer[i] = 0.005; // low ambient noise
  }
  // Sharp transient spike at index 100
  snapBuffer[100] = 0.65;
  snapBuffer[101] = 0.45;
  snapBuffer[102] = 0.15;

  let snapTriggered = false;
  detector.on('snap', () => {
    snapTriggered = true;
  });

  detector.isListening = true;
  detector._processAudio({
    inputBuffer: {
      length: 512,
      getChannelData: () => snapBuffer
    }
  });

  assert.strictEqual(snapTriggered, true, 'Finger snap transient must be detected');

  // 4. Cooldown Enforcement: Immediate second transient within cooldown period must be ignored
  snapTriggered = false;
  detector._processAudio({
    inputBuffer: {
      length: 512,
      getChannelData: () => snapBuffer
    }
  });
  assert.strictEqual(snapTriggered, false, 'Second transient within cooldown must be suppressed');

  // 5. Speech / Low Crest Factor Noise Rejection
  // Continuous sinewave or white noise has low crest factor (crest < 2.0)
  const speechBuffer = new Float32Array(512);
  for (let i = 0; i < speechBuffer.length; i++) {
    speechBuffer[i] = 0.25 * Math.sin((i / 512) * Math.PI * 8); // continuous loud voice
  }

  // Fast forward cooldown time
  detector.lastSnapTime = -100000;
  snapTriggered = false;
  detector._processAudio({
    inputBuffer: {
      length: 512,
      getChannelData: () => speechBuffer
    }
  });
  assert.strictEqual(snapTriggered, false, 'Continuous speech/hum must be rejected by crest factor');

  console.log('✅ All SnapDetector tests passed.');
}

module.exports = { run };
if (require.main === module) run();
