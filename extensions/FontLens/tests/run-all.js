/**
 * FontLens - Master Automated Test Suite Runner
 * Runs all unit and integration test suites, aggregating results and timings.
 */

import { runManifestTests } from './manifest.test.js';
import { runTypographyEngineTests } from './typography-engine.test.js';
import { runFontDetectionTests } from './font-detection.test.js';
import { runScannerTests } from './scanner.test.js';
import { runCssExportTests } from './css-export.test.js';
import { runPresetsTests } from './presets.test.js';
import { runStorageTests } from './storage.test.js';

const suites = [
  { name: 'Manifest V3 Configuration & Structure', fn: runManifestTests },
  { name: 'Typography Engine & Math Utilities', fn: runTypographyEngineTests },
  { name: 'Font Identification & Evidence Engine', fn: runFontDetectionTests },
  { name: 'Page Typography Scanner & Grouping', fn: runScannerTests },
  { name: 'CSS Export & Report Generation', fn: runCssExportTests },
  { name: 'Presets Management & Validation', fn: runPresetsTests },
  { name: 'Central Storage Engine & Fallback', fn: runStorageTests }
];

async function main() {
  console.log('\n======================================================');
  console.log('       FontLens Chrome Extension - Test Suite         ');
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
