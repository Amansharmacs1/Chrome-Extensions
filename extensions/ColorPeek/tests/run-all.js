/**
 * ColorPeek - Master Automated Test Runner
 * Executes all unit and integration test suites and displays a consolidated report.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'Manifest V3 Audit', file: 'manifest.test.js' },
  { name: 'Color Conversion & Canonical Engine', file: 'color-converter.test.js' },
  { name: 'WCAG 2.1 Contrast Engine', file: 'contrast-checker.test.js' },
  { name: 'Harmonies & Shading Generator', file: 'harmonies.test.js' },
  { name: 'Palette Management & History', file: 'palette-manager.test.js' },
  { name: 'CSS / SCSS / Tailwind Code Exporter', file: 'css-exporter.test.js' },
  { name: 'Storage Engine & Persistence', file: 'storage.test.js' },
  { name: 'Security & Input Sanitization', file: 'security.test.js' }
];

console.log('=================================================================');
console.log('       ColorPeek Automated Test Suite Runner');
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
      status: failedCount === 0 && code === 0 ? 'PASS' : 'FAIL'
    });

    runSuite(index + 1);
  });
}

function printSummary() {
  console.log('\n=================================================================');
  console.log('                      TEST SUITE SUMMARY');
  console.log('=================================================================');

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    const statusStr = `${icon} ${r.status}`.padEnd(8);
    const nameStr = r.name.padEnd(28);
    console.log(`  ${statusStr} ${nameStr} (${r.passed} passed, ${r.failed} failed)`);
  });

  console.log('-----------------------------------------------------------------');
  console.log(`  Total: ${totalPassed} passed, ${totalFailed} failed across ${suites.length} suites.`);
  console.log('=================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite(0);
