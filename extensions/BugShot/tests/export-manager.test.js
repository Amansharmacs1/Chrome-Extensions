/**
 * BugShot - Export Manager Tests
 */

import { generateJsonExport, generateMarkdownExport, generateQuickSummary } from '../report/export-manager.js';
import { fileURLToPath } from 'url';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

export async function runExportTests() {
  console.log('\n--- Running Export Manager Tests ---');

  const sampleReport = {
    id: 'rep_1234567890_abcde',
    title: 'Checkout button unresponsive on mobile',
    category: 'functional',
    severity: 'critical',
    priority: 'P1',
    status: 'open',
    createdAt: 1700000000000,
    updatedAt: 1700000050000,
    description: 'Tapping Pay Now does not trigger payment flow.',
    stepsToReproduce: ['Navigate to cart', 'Add product', 'Click Pay Now'],
    expectedResult: 'Payment modal opens',
    actualResult: 'Nothing happens, button spinner hangs',
    tags: ['checkout', 'payment'],
    metadata: {
      url: 'https://shop.example.com/checkout',
      title: 'Checkout — Shop Example',
      browserName: 'Google Chrome',
      browserVersion: '120.0.0.0',
      os: 'macOS',
      platform: 'MacIntel',
      viewportWidth: 390,
      viewportHeight: 844,
      devicePixelRatio: 3,
      screenWidth: 1920,
      screenHeight: 1080,
      language: 'en-US'
    },
    screenshotAnnotated: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    consoleLogs: [
      {
        level: 'error',
        message: 'Uncaught TypeError: Stripe.elements is not a function',
        source: 'checkout.js',
        lineno: 42,
        timestamp: 1700000010000,
        included: true
      }
    ],
    networkInsights: [
      {
        url: 'https://api.stripe.com/v1/tokens',
        status: 500,
        type: 'fetch',
        duration: 320,
        included: true
      }
    ]
  };

  // 1. JSON Export
  const jsonString = generateJsonExport(sampleReport, false);
  assert(typeof jsonString === 'string', 'generateJsonExport returns string');
  const parsed = JSON.parse(jsonString);
  assert(parsed.report.id === sampleReport.id, 'JSON output contains report ID');
  assert(parsed.report.severity === 'critical', 'JSON output contains report severity');
  assert(parsed.environment.browserName === 'Google Chrome', 'JSON output contains environment data');
  assert(parsed.diagnostics.consoleErrors.length === 1, 'JSON output contains console errors');
  assert(parsed.diagnostics.networkFailures.length === 1, 'JSON output contains network failures');
  assert(!parsed.screenshot, 'Omits screenshot by default when includeScreenshot=false');

  const jsonWithScreenshot = JSON.parse(generateJsonExport(sampleReport, true));
  assert(jsonWithScreenshot.screenshot && jsonWithScreenshot.screenshot.startsWith('data:image/png'), 'Includes screenshot when flag true');

  // 2. Markdown Export
  const md = generateMarkdownExport(sampleReport);
  assert(typeof md === 'string', 'generateMarkdownExport returns string');
  assert(md.includes('# 🐛 [CRITICAL] Checkout button unresponsive on mobile'), 'Markdown header formats severity and title');
  assert(md.includes('1. Navigate to cart'), 'Markdown contains numbered reproduction steps');
  assert(md.includes('2. Add product'), 'Markdown formats step 2');
  assert(md.includes('3. Click Pay Now'), 'Markdown formats step 3');
  assert(md.includes('Payment modal opens'), 'Markdown contains expected result');
  assert(md.includes('Nothing happens, button spinner hangs'), 'Markdown contains actual result');
  assert(md.includes('https://shop.example.com/checkout'), 'Markdown contains target URL');
  assert(md.includes('Uncaught TypeError: Stripe.elements is not a function'), 'Markdown contains console log block');
  assert(md.includes('https://api.stripe.com/v1/tokens'), 'Markdown contains network failure table');

  // 3. Quick Summary Export
  const summary = generateQuickSummary(sampleReport);
  assert(typeof summary === 'string', 'generateQuickSummary returns string');
  assert(summary.includes('[CRITICAL]'), 'Summary includes severity badge');
  assert(summary.includes('Priority: P1'), 'Summary includes priority badge');
  assert(summary.includes('Checkout button unresponsive on mobile'), 'Summary includes title');
  assert(summary.includes('Expected: Payment modal opens'), 'Summary includes expected result');
  assert(summary.includes('Actual: Nothing happens'), 'Summary includes actual result');

  return { passed, failed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runExportTests().then(res => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
