/**
 * QRQuick - Master Automated Test Suite Runner
 * Runs all unit and integration test suites, aggregating results, assertions, and execution timings.
 */

import { runManifestTests } from './manifest.test.js';
import { runPayloadBuilderTests } from './payload-builder.test.js';
import { runQrEngineTests } from './qr-engine.test.js';
import { runValidationTests } from './validation.test.js';
import { runCsvParserTests } from './csv-parser.test.js';
import { runDecoderTests } from './decoder.test.js';
import { runStorageTests } from './storage-service.test.js';
import { runSimpleZipTests } from './simple-zip.test.js';

const suites = [
  { name: 'Manifest V3 Structure & Asset Integrity', fn: runManifestTests },
  { name: 'Payload Builders & Type Detector', fn: runPayloadBuilderTests },
  { name: 'QR Engine & Rendering Calculations', fn: runQrEngineTests },
  { name: 'Validation, Contrast & Safety Engine', fn: runValidationTests },
  { name: 'RFC 4180 CSV & Bulk Parser', fn: runCsvParserTests },
  { name: 'QR Decoder & Roundtrip Verification', fn: runDecoderTests },
  { name: 'Storage Service & Persistence Layer', fn: runStorageTests },
  { name: 'SimpleZip PKZIP Generator', fn: runSimpleZipTests }
];

async function main() {
  console.log('\n======================================================');
  console.log('       QRQuick Chrome Extension - Test Suite          ');
  console.log('            Generate. Customize. Share.               ');
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
