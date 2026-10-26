/**
 * Test Suite: VideoEngine State Machine & Processing Pipeline
 */

const assert = require('assert');
const VideoEngine = require('../video-engine.js');

function run() {
  console.log('--- Running VideoEngine Tests ---');

  const engine = new VideoEngine({
    targetFps: 30,
    transitionDuration: 50,
    minBrightnessThreshold: 14
  });

  // 1. Initial State
  assert.strictEqual(engine.state, VideoEngine.STATES.IDLE, 'Initial state should be IDLE');
  assert.strictEqual(engine.isVanished, false, 'isVanished should be false initially');

  // 2. Vanish without background captured should throw
  assert.throws(() => {
    engine.vanish();
  }, /capture an empty background/, 'Vanish should throw if no background is set');

  // 3. Average Luma Brightness Analysis
  // Test dark buffer (all 0s)
  const darkBuffer = new Uint8ClampedArray(640 * 480 * 4); // all zeros
  const darkLuma = engine._calculateAverageLuma({ data: darkBuffer });
  assert.strictEqual(darkLuma, 0, 'Dark buffer luma should be 0');

  // Test well-lit buffer (R=180, G=170, B=160)
  const brightBuffer = new Uint8ClampedArray(640 * 480 * 4);
  for (let i = 0; i < brightBuffer.length; i += 4) {
    brightBuffer[i] = 180;
    brightBuffer[i + 1] = 170;
    brightBuffer[i + 2] = 160;
    brightBuffer[i + 3] = 255;
  }
  const brightLuma = engine._calculateAverageLuma({ data: brightBuffer });
  const expectedLuma = 0.299 * 180 + 0.587 * 170 + 0.114 * 160;
  assert(Math.abs(brightLuma - expectedLuma) < 0.1, 'Luma calculation must match Rec. 601 formula');
  assert(brightLuma > engine.minBrightnessThreshold, 'Bright buffer must exceed threshold');

  // 4. Mock Background Image Loading & Vanish / Return State Machine
  engine.backgroundImage = { complete: true, naturalWidth: 1280, naturalHeight: 720 };
  engine.isVanished = false;
  engine.state = VideoEngine.STATES.VISIBLE;

  // Transition to Vanished
  engine.vanish();
  assert.strictEqual(engine.isVanished, true, 'isVanished must be true');
  assert.strictEqual(engine.state, VideoEngine.STATES.VANISHED, 'State must be VANISHED');

  // Transition to Return (Visible)
  engine.return();
  assert.strictEqual(engine.isVanished, false, 'isVanished must be false after return');
  assert.strictEqual(engine.state, VideoEngine.STATES.VISIBLE, 'State must be VISIBLE');

  // Toggle behavior
  engine.toggle();
  assert.strictEqual(engine.isVanished, true, 'Toggle should flip to vanished');
  engine.toggle();
  assert.strictEqual(engine.isVanished, false, 'Toggle should flip back to visible');

  // 5. Diagnostics reporting
  const diag = engine.getDiagnosticInfo();
  assert.strictEqual(diag.isVanished, false);
  assert.strictEqual(diag.hasBackground, true);

  // 6. Stop and cleanup
  engine.stop();
  assert.strictEqual(engine.state, VideoEngine.STATES.IDLE, 'State must reset to IDLE after stop');
  assert.strictEqual(engine.isVanished, false, 'isVanished must reset to false after stop');

  console.log('✅ All VideoEngine tests passed.');
}

module.exports = { run };
if (require.main === module) run();
