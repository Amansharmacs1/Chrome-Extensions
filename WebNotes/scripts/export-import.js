/**
 * WebNotes — Export/Import Module
 * 
 * Handles JSON backup export and import with validation.
 */

import { CURRENT_SCHEMA_VERSION, validateNote, validateHighlight, generateId } from './storage.js';

/**
 * Create an export data package.
 * @param {Array} notes
 * @param {Array} highlights
 * @param {Object} settings
 * @returns {Object}
 */
export function createExportData(notes, highlights, settings = {}) {
  return {
    format: 'webnotes-backup',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      notes: notes || [],
      highlights: highlights || [],
      settings: settings || {}
    }
  };
}

/**
 * Generate a predictable backup filename.
 * @returns {string}
 */
export function getBackupFilename() {
  const date = new Date().toISOString().split('T')[0];
  return `webnotes-backup-${date}.json`;
}

/**
 * Trigger a file download in the browser.
 * @param {Object} data
 * @param {string} filename
 */
export function downloadJson(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

/**
 * Parse and validate an import file.
 * @param {string} jsonString - The raw JSON string.
 * @returns {Object} { valid, data, error, summary }
 */
export function parseImportFile(jsonString) {
  let parsed;
  
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return { valid: false, data: null, error: 'Invalid JSON file. Please check the file format.', summary: null };
  }

  // Check structure
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, data: null, error: 'File does not contain a valid backup object.', summary: null };
  }

  if (parsed.format !== 'webnotes-backup') {
    return { valid: false, data: null, error: 'File is not a WebNotes backup. Missing format identifier.', summary: null };
  }

  if (!parsed.schemaVersion || typeof parsed.schemaVersion !== 'number') {
    return { valid: false, data: null, error: 'Missing or invalid schema version.', summary: null };
  }

  if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return { valid: false, data: null, error: `Backup is from a newer version (v${parsed.schemaVersion}). Please update WebNotes.`, summary: null };
  }

  if (!parsed.data || typeof parsed.data !== 'object') {
    return { valid: false, data: null, error: 'Backup file is missing data section.', summary: null };
  }

  const notes = Array.isArray(parsed.data.notes) ? parsed.data.notes : [];
  const highlights = Array.isArray(parsed.data.highlights) ? parsed.data.highlights : [];

  // Validate individual records
  const validNotes = [];
  const invalidNotes = [];
  for (const note of notes) {
    if (validateNote(note)) {
      validNotes.push(note);
    } else {
      invalidNotes.push(note);
    }
  }

  const validHighlights = [];
  const invalidHighlights = [];
  for (const h of highlights) {
    if (validateHighlight(h)) {
      validHighlights.push(h);
    } else {
      invalidHighlights.push(h);
    }
  }

  const summary = {
    totalNotes: notes.length,
    validNotes: validNotes.length,
    invalidNotes: invalidNotes.length,
    totalHighlights: highlights.length,
    validHighlights: validHighlights.length,
    invalidHighlights: invalidHighlights.length,
    schemaVersion: parsed.schemaVersion,
    exportedAt: parsed.exportedAt || 'Unknown'
  };

  return {
    valid: true,
    data: {
      notes: validNotes,
      highlights: validHighlights,
      settings: parsed.data.settings || {}
    },
    error: null,
    summary
  };
}

/**
 * Merge imported notes with existing notes.
 * Avoids duplicates by ID.
 * @param {Array} existing
 * @param {Array} incoming
 * @returns {Object} { merged, imported, skipped }
 */
export function mergeNotes(existing, incoming) {
  const existingIds = new Set(existing.map(n => n.id));
  const merged = [...existing];
  let imported = 0;
  let skipped = 0;

  for (const note of incoming) {
    if (existingIds.has(note.id)) {
      skipped++;
    } else {
      merged.push(note);
      imported++;
    }
  }

  return { merged, imported, skipped };
}

/**
 * Merge imported highlights with existing highlights.
 * @param {Array} existing
 * @param {Array} incoming
 * @returns {Object} { merged, imported, skipped }
 */
export function mergeHighlights(existing, incoming) {
  const existingIds = new Set(existing.map(h => h.id));
  const merged = [...existing];
  let imported = 0;
  let skipped = 0;

  for (const h of incoming) {
    if (existingIds.has(h.id)) {
      skipped++;
    } else {
      merged.push(h);
      imported++;
    }
  }

  return { merged, imported, skipped };
}
