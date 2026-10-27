/**
 * FocusFlow - Master Test Runner
 * Executes all automated unit, integration, and security verification suites.
 */

import * as timerTest from './timer.test.js';
import * as tasksTest from './tasks.test.js';
import * as analyticsTest from './analytics.test.js';
import * as blockerTest from './blocker.test.js';
import * as storageTest from './storage.test.js';
import * as manifestTest from './manifest.test.js';

async function runAll() {
  console.log('====================================================');
  console.log('⚡ Running FocusFlow Automated Verification Suite');
  console.log('====================================================\n');

  const startTime = Date.now();
  let passedSuites = 0;
  const suites = [
    { name: 'Timer Engine', runner: timerTest.run },
    { name: 'Task Manager', runner: tasksTest.run },
    { name: 'Analytics & Goals', runner: analyticsTest.run },
    { name: 'Distraction Blocker & DNR', runner: blockerTest.run },
    { name: 'Storage & Schema Migrations', runner: storageTest.run },
    { name: 'Manifest V3 & Security Audit', runner: manifestTest.run }
  ];

  try {
    for (const suite of suites) {
      await suite.runner();
      passedSuites++;
      console.log('');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(3);
    console.log('====================================================');
    console.log(`🎉 ALL ${passedSuites}/${suites.length} TEST SUITES PASSED in ${duration}s!`);
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ Test execution failed:');
    console.error(err);
    process.exit(1);
  }
}

runAll();
