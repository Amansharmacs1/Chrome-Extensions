/**
 * ViewPortX - Master Automated Test Runner
 * Executes all 7 unit test suites, consolidates assertion results, and reports final status.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'Manifest V3 Specification Audit', file: 'manifest.test.js' },
  { name: 'DOM Scanner & Selector Engine', file: 'scanner.test.js' },
  { name: 'Responsive Issue Detection Analyzer', file: 'analyzer.test.js' },
  { name: 'CSS Transformation & Injection Engine', file: 'transformer.test.js' },
  { name: 'Layout Verification & Rollback Engine', file: 'verifier.test.js' },
  { name: 'Responsive Health Score Engine', file: 'health-score.test.js' },
  { name: 'Storage & Device Profiles Engine', file: 'storage.test.js' }
];

console.log('=================================================================');
console.log('       ViewPortX — Master Automated Test Runner');
console.log('=================================================================');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

function runSuite(index) {
  if (index >= suites.length) {
    printSummary();
    return;
  }

  const suite = suites[index];
  const suitePath = path.join(__dirname, suite.file);

  const proc = spawn('node', [suitePath], { stdio: 'pipe' });
  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', data => {
    stdout += data.toString();
  });

  proc.stderr.on('data', data => {
    stderr += data.toString();
  });

  proc.on('close', code => {
    process.stdout.write(stdout);
    if (stderr) {
      process.stderr.write(stderr);
    }

    const passMatch = stdout.match(/(\d+)\s+passed/);
    const failMatch = stdout.match(/(\d+)\s+failed/);

    const passedCount = passMatch ? parseInt(passMatch[1], 10) : 0;
    const failedCount = failMatch ? parseInt(failMatch[1], 10) : (code !== 0 ? 1 : 0);

    totalPassed += passedCount;
    totalFailed += failedCount;

    results.push({
      name: suite.name,
      file: suite.file,
      passed: passedCount,
      failed: failedCount,
      success: code === 0 && failedCount === 0
    });

    runSuite(index + 1);
  });
}

function printSummary() {
  console.log('\n=================================================================');
  console.log('                     CONSOLIDATED TEST REPORT                    ');
  console.log('=================================================================');

  for (const r of results) {
    const symbol = r.success ? '✓' : '✗';
    const status = r.success ? 'PASSED' : 'FAILED';
    console.log(` ${symbol} [${status}] ${r.name.padEnd(45)} (${r.passed} passed, ${r.failed} failed)`);
  }

  console.log('-----------------------------------------------------------------');
  console.log(` Total Assertions: ${totalPassed + totalFailed}`);
  console.log(` Passed:           ${totalPassed}`);
  console.log(` Failed:           ${totalFailed}`);
  console.log(` Overall Status:   ${totalFailed === 0 ? 'ALL TESTS PASSED (100%)' : 'TESTS FAILED'}`);
  console.log('=================================================================\n');

  process.exit(totalFailed > 0 ? 1 : 0);
}

runSuite(0);
