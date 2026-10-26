/**
 * MeetMorph - Master Test Runner
 * Executes all automated unit and integration test suites.
 */

const manifestTest = require('./manifest.test.js');
const videoEngineTest = require('./video-engine.test.js');
const snapDetectorTest = require('./snap-detector.test.js');
const permissionsTest = require('./permissions.test.js');
const webrtcBridgeTest = require('./webrtc-bridge.test.js');
const meetCompatibilityTest = require('./meet-compatibility.test.js');

async function runAll() {
  console.log('====================================================');
  console.log('🚀 Running MeetMorph Automated Verification Suite');
  console.log('====================================================\n');

  const startTime = Date.now();
  let passedSuites = 0;
  const totalSuites = 6;

  try {
    manifestTest.run();
    passedSuites++;
    console.log('');

    videoEngineTest.run();
    passedSuites++;
    console.log('');

    snapDetectorTest.run();
    passedSuites++;
    console.log('');

    permissionsTest.run();
    passedSuites++;
    console.log('');

    await webrtcBridgeTest.run();
    passedSuites++;
    console.log('');

    await meetCompatibilityTest.run();
    passedSuites++;
    console.log('');

    // Wait a tick for async assertions
    await new Promise(r => setTimeout(r, 100));

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('====================================================');
    console.log(`🎉 ALL ${passedSuites}/${totalSuites} TEST SUITES PASSED in ${duration}s!`);
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ Test execution failed:');
    console.error(err);
    process.exit(1);
  }
}

runAll();
