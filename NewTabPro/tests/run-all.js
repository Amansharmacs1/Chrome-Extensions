/**
 * NewTab Pro - Automated Test Suite Runner
 * Runs all unit and integration tests and outputs summary.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = [
  'manifest.test.js',
  'storage.test.js',
  'clock.test.js',
  'search.test.js',
  'shortcuts.test.js',
  'tasks.test.js',
  'themes.test.js',
  'widgets.test.js',
  'templates.test.js',
  'focus-timer.test.js',
  'habits.test.js',
  'calculator.test.js',
  'weather-atmosphere.test.js'
];

async function runTest(file) {
  return new Promise((resolve) => {
    const fullPath = path.join(__dirname, file);
    const child = spawn('node', [fullPath], { stdio: ['inherit', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      resolve({ file, code, stdout, stderr });
    });
  });
}

async function main() {
  console.log('='.repeat(65));
  console.log('       NewTab Pro Automated Test Suite Runner');
  console.log('='.repeat(65));

  let totalPassed = 0;
  let totalFailed = 0;
  const results = [];

  for (const file of testFiles) {
    const res = await runTest(file);
    process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);

    const match = res.stdout.match(/(\d+)\s+passed,\s+(\d+)\s+failed/);
    let p = 0;
    let f = 0;
    if (match) {
      p = parseInt(match[1], 10);
      f = parseInt(match[2], 10);
    } else if (res.code === 0) {
      p = 1;
    } else {
      f = 1;
    }

    totalPassed += p;
    totalFailed += f;
    results.push({ file, passed: p, failed: f, exitCode: res.code });
  }

  console.log('\n' + '='.repeat(65));
  console.log('                      TEST SUITE SUMMARY');
  console.log('='.repeat(65));

  for (const r of results) {
    const status = r.exitCode === 0 ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status.padEnd(8)} ${r.file.padEnd(25)} (${r.passed} passed, ${r.failed} failed)`);
  }

  console.log('-'.repeat(65));
  console.log(`  Total: ${totalPassed} passed, ${totalFailed} failed across ${testFiles.length} suites.`);
  console.log('='.repeat(65) + '\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
