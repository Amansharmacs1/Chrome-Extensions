/**
 * WebNotes — Export/Import Module Tests
 */

import {
  createExportData,
  getBackupFilename,
  parseImportFile,
  mergeNotes,
  mergeHighlights
} from '../scripts/export-import.js';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(message);
    console.error(`  FAIL: ${message}`);
  }
}

function runTests() {
  console.log('Testing WebNotes Export/Import Module...');

  // 1. getBackupFilename
  const filename = getBackupFilename();
  assert(filename.startsWith('webnotes-backup-') && filename.endsWith('.json'), 'Filename has correct format');

  // 2. createExportData
  const sampleNotes = [
    {
      id: 'n1',
      title: 'Title',
      body: 'Body',
      scope: 'page',
      pageUrl: 'https://example.com',
      domain: 'example.com',
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ];
  const sampleHighlights = [
    {
      id: 'h1',
      selectedText: 'Quote',
      sourceUrl: 'https://example.com',
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ];
  const sampleSettings = { theme: 'dark' };

  const exportPkg = createExportData(sampleNotes, sampleHighlights, sampleSettings);
  assert(exportPkg.format === 'webnotes-backup', 'Export package has correct format tag');
  assert(exportPkg.schemaVersion === 1, 'Export package has schemaVersion 1');
  assert(!isNaN(Date.parse(exportPkg.exportedAt)), 'Export package has valid exportedAt ISO date');
  assert(exportPkg.data.notes.length === 1, 'Export data contains notes');
  assert(exportPkg.data.highlights.length === 1, 'Export data contains highlights');
  assert(exportPkg.data.settings.theme === 'dark', 'Export data contains settings');

  // 3. parseImportFile with valid package
  const jsonValid = JSON.stringify(exportPkg);
  const importResult = parseImportFile(jsonValid);
  assert(importResult.valid === true, 'Valid package passes validation');
  assert(importResult.error === null, 'No error on valid package');
  assert(importResult.data.notes.length === 1, 'Imports 1 valid note');
  assert(importResult.data.highlights.length === 1, 'Imports 1 valid highlight');
  assert(importResult.summary.totalNotes === 1 && importResult.summary.validNotes === 1, 'Summary matches counts');

  // 4. parseImportFile error handling
  // Invalid JSON syntax
  assert(parseImportFile('{ broken json ').valid === false, 'Rejects invalid JSON syntax');

  // Missing format
  const noFormat = JSON.stringify({ schemaVersion: 1, data: {} });
  assert(parseImportFile(noFormat).valid === false, 'Rejects missing format identifier');

  // Newer schema version
  const futureVersion = JSON.stringify({ format: 'webnotes-backup', schemaVersion: 999, data: {} });
  assert(parseImportFile(futureVersion).valid === false, 'Rejects newer unsupported schema version');

  // Missing data section
  const noData = JSON.stringify({ format: 'webnotes-backup', schemaVersion: 1 });
  assert(parseImportFile(noData).valid === false, 'Rejects backup missing data section');

  // Corrupted notes filtered out
  const partialCorrupted = JSON.stringify({
    format: 'webnotes-backup',
    schemaVersion: 1,
    data: {
      notes: [
        { id: 'valid1', body: 'Good', scope: 'page', createdAt: '2026-01-01' },
        { id: 'bad1', scope: 'invalid-scope' } // missing body, createdAt, invalid scope
      ],
      highlights: [
        { id: 'h_good', selectedText: 'Text', sourceUrl: 'https://ex.com', createdAt: '2026-01-01' },
        { id: 'h_bad' } // missing fields
      ]
    }
  });
  const resCorrupted = parseImportFile(partialCorrupted);
  assert(resCorrupted.valid === true, 'Package with some invalid items still parsed');
  assert(resCorrupted.summary.validNotes === 1 && resCorrupted.summary.invalidNotes === 1, 'Invalid note filtered and counted');
  assert(resCorrupted.summary.validHighlights === 1 && resCorrupted.summary.invalidHighlights === 1, 'Invalid highlight filtered and counted');

  // 5. mergeNotes
  const existingNotes = [
    { id: '1', body: 'First' },
    { id: '2', body: 'Second' }
  ];
  const incomingNotes = [
    { id: '2', body: 'Duplicate' },
    { id: '3', body: 'Third' }
  ];
  const mergeNotesRes = mergeNotes(existingNotes, incomingNotes);
  assert(mergeNotesRes.merged.length === 3, 'mergeNotes merges unique IDs');
  assert(mergeNotesRes.imported === 1, 'mergeNotes imported count is 1');
  assert(mergeNotesRes.skipped === 1, 'mergeNotes skipped count is 1');

  // 6. mergeHighlights
  const existingH = [{ id: 'h1' }];
  const incomingH = [{ id: 'h1' }, { id: 'h2' }];
  const mergeHRes = mergeHighlights(existingH, incomingH);
  assert(mergeHRes.merged.length === 2, 'mergeHighlights merges unique IDs');
  assert(mergeHRes.imported === 1, 'mergeHighlights imported count is 1');
  assert(mergeHRes.skipped === 1, 'mergeHighlights skipped count is 1');

  console.log(`Export/Import Tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runTests();
