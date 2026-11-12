/**
 * QRQuick - RFC 4180 CSV & Bulk Text Parser
 * Parses CSV files and multiline text entries into structured QR job queues.
 */

import { validatePayloadCapacity } from '../services/validation.js';

/**
 * Parses RFC 4180 compliant CSV text into an array of row arrays
 * @param {string} text Raw CSV text
 * @returns {string[][]} Array of row values
 */
export function parseCSV(text = '') {
  const p = String(text ?? '').trim();
  if (!p) return [];

  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;
  let i = 0;

  while (i < p.length) {
    const char = p[i];
    const nextChar = p[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped double-quote: "" -> "
        currentVal += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (!inQuotes && char === ',') {
      // Column separator
      currentRow.push(currentVal.trim());
      currentVal = '';
      i++;
      continue;
    }

    if (!inQuotes && (char === '\r' || char === '\n')) {
      // Line break
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      // Skip empty lines
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
      i++;
      continue;
    }

    currentVal += char;
    i++;
  }

  // Push remaining value
  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses either a CSV string or newline-separated text into structured QR batch items
 * @param {string} rawInput
 * @param {'csv'|'text'} format
 * @returns {{ items: Array<{ id: string, content: string, label: string, type: string, isValid: boolean, error?: string }>, validCount: number, invalidCount: number }}
 */
export function parseBulkInput(rawInput = '', format = 'csv') {
  const clean = String(rawInput ?? '').trim();
  if (!clean) {
    return { items: [], validCount: 0, invalidCount: 0 };
  }

  const items = [];

  if (format === 'csv') {
    const rows = parseCSV(clean);
    if (rows.length === 0) {
      return { items: [], validCount: 0, invalidCount: 0 };
    }

    // Determine header indices
    const headerRow = rows[0].map(h => h.toLowerCase());
    let contentCol = -1;
    let labelCol = -1;
    let typeCol = -1;

    for (let c = 0; c < headerRow.length; c++) {
      const col = headerRow[c];
      if (['content', 'payload', 'url', 'data', 'text', 'value'].includes(col)) {
        contentCol = c;
      } else if (['label', 'title', 'name'].includes(col)) {
        labelCol = c;
      } else if (['type', 'category'].includes(col)) {
        typeCol = c;
      }
    }

    // If no header matches, treat row 0 as data if it has no labels
    const hasHeader = contentCol !== -1 || labelCol !== -1;
    const startIdx = hasHeader ? 1 : 0;
    const targetContentCol = contentCol !== -1 ? contentCol : 0;
    const targetLabelCol = labelCol !== -1 ? labelCol : (rows[0].length > 1 ? 1 : -1);

    for (let r = startIdx; r < rows.length; r++) {
      const row = rows[r];
      const content = row[targetContentCol] || '';
      const label = targetLabelCol !== -1 ? (row[targetLabelCol] || '') : '';
      const type = typeCol !== -1 ? (row[typeCol] || 'text') : 'text';

      const cap = validatePayloadCapacity(content, 'M');
      items.push({
        id: `bulk_${r}_${Math.random().toString(36).substring(2, 6)}`,
        content,
        label: label || content.slice(0, 30),
        type,
        isValid: cap.valid,
        error: cap.error
      });
    }
  } else {
    // Plain newline-separated list
    const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    lines.forEach((line, idx) => {
      const cap = validatePayloadCapacity(line, 'M');
      items.push({
        id: `bulk_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        content: line,
        label: line.slice(0, 30),
        type: line.startsWith('http') ? 'url' : 'text',
        isValid: cap.valid,
        error: cap.error
      });
    });
  }

  const validCount = items.filter(i => i.isValid).length;
  const invalidCount = items.length - validCount;

  return { items, validCount, invalidCount };
}
