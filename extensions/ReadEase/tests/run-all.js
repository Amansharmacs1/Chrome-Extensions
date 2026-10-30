/**
 * ReadEase - Master Automated Test Runner
 * Executes all unit and integration test suites and displays a consolidated report.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'Manifest V3 Audit', file: 'manifest.test.js' },
  { name: 'HTML Sanitizer & Security', file: 'sanitizer.test.js' },
  { name: 'Readability Article Extraction', file: 'readability.test.js' },
  { name: 'Reading Progress & Time Estimation', file: 'reading-progress.test.js' },
  { name: 'Storage & Database Engine', file: 'storage.test.js' },
  { name: 'Article Manager & Status Classification', file: 'article-manager.test.js' },
  { name: 'Highlights & Annotations Engine', file: 'highlights.test.js' },
  { name: 'Search, Tagging & JSON Backup/Restore', file: 'search.test.js' },
  { name: 'Settings & Typography Tokens', file: 'settings.test.js' }
];

console.log('=================================================================');
console.log('       ReadEase Automated Test Suite Runner');
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

  const child = spawn('node', [suitePath], { stdio: ['inherit', 'pipe', 'pipe'] });

  let output = '';
  let errorOutput = '';

  child.stdout.on('data', chunk => {
    output += chunk.toString();
    process.stdout.write(chunk);
  });

  child.stderr.on('data', chunk => {
    errorOutput += chunk.toString();
    process.stderr.write(chunk);
  });

  child.on('close', code => {
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);

    const passedCount = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const failedCount = failedMatch ? parseInt(failedMatch[1], 10) : (code !== 0 ? 1 : 0);

    totalPassed += passedCount;
    totalFailed += failedCount;

    results.push({
      name: suite.file,
      passed: passedCount,
      failed: failedCount,
      ok: code === 0 && failedCount === 0
    });

    runSuite(index + 1);
  });
}

function printSummary() {
  console.log('\n=================================================================');
  console.log('                      TEST SUITE SUMMARY');
  console.log('=================================================================');

  for (const r of results) {
    const status = r.ok ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status}   ${r.name.padEnd(28)} (${r.passed} passed, ${r.failed} failed)`);
  }

  console.log('-----------------------------------------------------------------');
  console.log(`  Total: ${totalPassed} passed, ${totalFailed} failed across ${suites.length} suites.`);
  console.log('=================================================================\n');

  process.exit(totalFailed > 0 ? 1 : 0);
}

runSuite(0);
