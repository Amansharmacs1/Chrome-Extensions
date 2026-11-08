/**
 * WordWise - Master Automated Test Suite Runner
 * Runs all unit and integration test suites, aggregating results, assertions, and execution timings.
 */

import { runManifestTests } from './manifest.test.js';
import { runSchedulerTests } from './scheduler.test.js';
import { runDictionaryServiceTests } from './dictionary-service.test.js';
import { runQuizEngineTests } from './quiz-engine.test.js';
import { runStorageTests } from './storage-service.test.js';
import { runExportImportTests } from './export-import.test.js';
import { runLearningServiceTests } from './learning-service.test.js';

const suites = [
  { name: 'Manifest V3 Structure & Asset Integrity', fn: runManifestTests },
  { name: 'Spaced Repetition SM-2 Scheduler', fn: runSchedulerTests },
  { name: 'Dictionary Service & Normalization', fn: runDictionaryServiceTests },
  { name: 'Quiz Engine & Distractor Pooling', fn: runQuizEngineTests },
  { name: 'Storage Service & Persistence Layer', fn: runStorageTests },
  { name: 'Export/Import Validation & Serialization', fn: runExportImportTests },
  { name: 'Learning Analytics & Chart Service', fn: runLearningServiceTests }
];

async function main() {
  console.log('\n======================================================');
  console.log('       WordWise Chrome Extension - Test Suite         ');
  console.log('            Discover. Learn. Remember.                ');
  console.log('======================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  for (const suite of suites) {
    console.log(`▶ Running Suite: ${suite.name}`);
    const suiteStart = Date.now();

    try {
      const results = await suite.fn();
      const suiteElapsed = Date.now() - suiteStart;
      console.log(`  ✓ All ${results.length} assertions passed in ${suiteElapsed}ms\n`);
      totalPassed += results.length;
    } catch (err) {
      console.error(`  ✗ Suite failed: ${err.message}`);
      if (err.stack) {
        console.error(`    ${err.stack.split('\n').slice(1, 4).join('\n    ')}`);
      }
      console.log('');
      totalFailed++;
    }
  }

  const totalElapsed = Date.now() - startTime;
  console.log('------------------------------------------------------');
  console.log(`Total Assertions Passed : ${totalPassed}`);
  console.log(`Total Suites Failed     : ${totalFailed}`);
  console.log(`Total Execution Time    : ${totalElapsed}ms`);
  console.log('======================================================\n');

  if (totalFailed > 0) {
    console.error('❌ Test suite failed. Please fix the reported errors above.\n');
    process.exit(1);
  } else {
    console.log('✅ ALL TEST SUITES PASSED! Ready for production deployment.\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
