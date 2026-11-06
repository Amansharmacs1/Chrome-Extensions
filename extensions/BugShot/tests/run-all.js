/**
 * BugShot - Consolidated Test Runner
 * Executes all unit and integration test suites and tallies overall pass/fail statistics.
 */

import { runManifestTests } from './manifest.test.js';
import { runHistoryTests } from './history-manager.test.js';
import { runMetadataTests } from './metadata.test.js';
import { runExportTests } from './export-manager.test.js';
import { runStorageTests } from './storage.test.js';

async function runAll() {
  console.log('=================================================================');
  console.log('            BugShot Automated Test Suite Runner');
  console.log('=================================================================');

  const results = [];

  results.push({ name: 'manifest.test.js', res: await runManifestTests() });
  results.push({ name: 'history-manager.test.js', res: await runHistoryTests() });
  results.push({ name: 'metadata.test.js', res: await runMetadataTests() });
  results.push({ name: 'export-manager.test.js', res: await runExportTests() });
  results.push({ name: 'storage.test.js', res: await runStorageTests() });

  let totalPassed = 0;
  let totalFailed = 0;

  console.log('\n=================================================================');
  console.log('                      TEST SUITE SUMMARY');
  console.log('=================================================================');

  for (const { name, res } of results) {
    totalPassed += res.passed;
    totalFailed += res.failed;
    const status = res.failed === 0 ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status}   ${name.padEnd(28)} (${res.passed} passed, ${res.failed} failed)`);
  }

  console.log('-----------------------------------------------------------------');
  console.log(`  Total: ${totalPassed} passed, ${totalFailed} failed across ${results.length} suites.`);
  console.log('=================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('Fatal test runner exception:', err);
  process.exit(1);
});
