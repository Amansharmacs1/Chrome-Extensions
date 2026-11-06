/**
 * BugShot - Storage Engine Tests
 */

import {
  saveReport,
  getReports,
  getReportById,
  deleteReport,
  duplicateReport,
  saveActiveSession,
  getActiveSession,
  clearActiveSession,
  getUserPreferences,
  saveUserPreferences,
  getStorageUsage,
  deleteAllData
} from '../scripts/storage.js';
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

export async function runStorageTests() {
  console.log('\n--- Running Storage Engine Tests ---');

  // Reset state
  await deleteAllData();

  // 1. User Preferences
  const defaultPrefs = await getUserPreferences();
  assert(defaultPrefs.theme === 'dark', 'Default theme is dark');
  assert(defaultPrefs.defaultSeverity === 'medium', 'Default severity is medium');
  assert(defaultPrefs.defaultPriority === 'P2', 'Default priority is P2');

  const updatedPrefs = await saveUserPreferences({ theme: 'light', defaultSeverity: 'high' });
  assert(updatedPrefs.theme === 'light', 'Preferences update theme to light');
  assert(updatedPrefs.defaultSeverity === 'high', 'Preferences update severity to high');
  assert(updatedPrefs.defaultPriority === 'P2', 'Unmodified preference retains default');

  // 2. Active Session Management
  assert((await getActiveSession()) === null, 'Active session is initially null');

  const mockSession = {
    sessionId: 'sess_12345',
    targetTabId: 101,
    targetUrl: 'https://example.com/test',
    captureType: 'viewport',
    timestamp: Date.now(),
    rawScreenshot: 'data:image/png;base64,mock1',
    metadata: { title: 'Test Page' },
    consoleLogs: [],
    networkInsights: []
  };

  await saveActiveSession(mockSession);
  const loadedSession = await getActiveSession();
  assert(loadedSession && loadedSession.sessionId === 'sess_12345', 'Active session persisted and retrieved');
  assert(loadedSession.rawScreenshot === 'data:image/png;base64,mock1', 'Session contains screenshot data');

  await clearActiveSession();
  assert((await getActiveSession()) === null, 'Active session cleared successfully');

  // 3. Report CRUD
  assert((await getReports()).length === 0, 'Initially zero reports stored');

  const report1 = {
    id: 'rep_001',
    title: 'Visual glitch on navbar',
    category: 'ui-ux',
    severity: 'low',
    priority: 'P3',
    status: 'open',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    description: 'Navbar overlaps banner',
    stepsToReproduce: ['Scroll down'],
    expectedResult: 'Navbar sticky above banner',
    actualResult: 'Navbar underneath banner',
    tags: ['nav', 'css'],
    metadata: { url: 'https://example.com' }
  };

  await saveReport(report1);
  const allReports = await getReports();
  assert(allReports.length === 1, 'Saved report in storage');
  assert(allReports[0].id === 'rep_001', 'Retrieved report has correct ID');

  const fetchedById = await getReportById('rep_001');
  assert(fetchedById && fetchedById.title === 'Visual glitch on navbar', 'getReportById finds target report');

  const notFound = await getReportById('non_existent');
  assert(notFound === null, 'getReportById returns null for missing report');

  // Update existing report
  report1.title = 'Updated: Visual glitch on navbar';
  await saveReport(report1);
  const updatedList = await getReports();
  assert(updatedList.length === 1, 'Updating report does not duplicate item');
  assert(updatedList[0].title === 'Updated: Visual glitch on navbar', 'Updated report reflects title modification');

  // Duplicate report
  const duplicate = await duplicateReport('rep_001');
  assert(duplicate && duplicate.id !== 'rep_001', 'Duplicated report receives fresh unique ID');
  assert(duplicate.title.includes('(Copy)'), 'Duplicated report appends (Copy) to title');
  assert((await getReports()).length === 2, 'Total reports count increments to 2 after duplication');

  // Delete report
  const deleted = await deleteReport(duplicate.id);
  assert(deleted === true, 'deleteReport returns true');
  assert((await getReports()).length === 1, 'Report count decrements to 1 after deletion');

  // Storage usage calculator
  const usage = await getStorageUsage();
  assert(typeof usage.bytesInUse === 'number' && usage.bytesInUse > 0, 'getStorageUsage returns numeric bytes');
  assert(typeof usage.formatted === 'string', 'getStorageUsage returns human-readable formatted string');

  // Delete all data
  await deleteAllData();
  assert((await getReports()).length === 0, 'deleteAllData clears all reports');
  assert((await getActiveSession()) === null, 'deleteAllData clears active session');

  return { passed, failed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runStorageTests().then(res => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
