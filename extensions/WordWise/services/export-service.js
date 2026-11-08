/**
 * WordWise - Export & Import Service
 * Handles vocabulary export to JSON, CSV, and Markdown formats,
 * as well as validation and preview of imported JSON backup files.
 */

import { normalizeWordKey } from './storage-service.js';

/**
 * Escapes fields for CSV format
 * @param {string|number|null} val
 * @returns {string}
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates clean CSV string from vocabulary items
 * @param {Array<object>} vocab
 * @returns {string}
 */
export function exportToCSV(vocab = []) {
  const headers = [
    'Word',
    'Part of Speech',
    'Phonetic',
    'Definitions',
    'Examples',
    'Synonyms',
    'Antonyms',
    'Notes',
    'Custom Example',
    'Tags',
    'Status',
    'Favorite',
    'Date Added',
    'Next Review Date',
    'Repetitions',
    'Ease Factor',
    'Source URL',
    'Context Sentence'
  ];

  const rows = [headers.join(',')];

  for (const item of vocab) {
    if (!item) continue;
    const defs = Array.isArray(item.definitions) ? item.definitions.join('; ') : (item.definition || '');
    const examp = Array.isArray(item.examples) ? item.examples.join('; ') : (item.example || '');
    const syns = Array.isArray(item.synonyms) ? item.synonyms.join(', ') : '';
    const ants = Array.isArray(item.antonyms) ? item.antonyms.join(', ') : '';
    const tags = Array.isArray(item.tags) ? item.tags.join(', ') : '';

    const dateAddedStr = item.dateAdded ? new Date(item.dateAdded).toISOString().slice(0, 10) : '';
    const nextReviewStr = item.sm2?.nextReviewDate ? new Date(item.sm2.nextReviewDate).toISOString().slice(0, 10) : '';

    const row = [
      escapeCsv(item.displayWord || item.word),
      escapeCsv(item.partOfSpeech || ''),
      escapeCsv(item.phonetic || ''),
      escapeCsv(defs),
      escapeCsv(examp),
      escapeCsv(syns),
      escapeCsv(ants),
      escapeCsv(item.notes || ''),
      escapeCsv(item.customExample || ''),
      escapeCsv(tags),
      escapeCsv(item.status || 'learning'),
      escapeCsv(item.isFavorite ? 'Yes' : 'No'),
      escapeCsv(dateAddedStr),
      escapeCsv(nextReviewStr),
      escapeCsv(item.sm2?.repetitions ?? 0),
      escapeCsv(item.sm2?.easeFactor ?? 2.5),
      escapeCsv(item.sourceUrl || ''),
      escapeCsv(item.contextSentence || '')
    ];

    rows.push(row.join(','));
  }

  return rows.join('\r\n');
}

/**
 * Generates clean Markdown vocabulary document
 * @param {Array<object>} vocab
 * @returns {string}
 */
export function exportToMarkdown(vocab = []) {
  const lines = [
    '# WordWise — Vocabulary Notebook',
    `*Exported on ${new Date().toLocaleDateString()} — Total words: ${vocab.length}*`,
    '',
    '---',
    ''
  ];

  const sorted = [...vocab].sort((a, b) => (a.word || '').localeCompare(b.word || ''));

  for (const item of sorted) {
    if (!item) continue;
    const wordTitle = item.displayWord || item.word;
    const pos = item.partOfSpeech ? `*(${item.partOfSpeech})*` : '';
    const phonetic = item.phonetic ? `\`${item.phonetic}\`` : '';
    const fav = item.isFavorite ? '★ ' : '';

    lines.push(`## ${fav}${wordTitle} ${pos} ${phonetic}`.trim());

    // Definitions
    const defs = Array.isArray(item.definitions) && item.definitions.length > 0
      ? item.definitions
      : (item.definition ? [item.definition] : []);

    if (defs.length > 0) {
      lines.push('### Definitions');
      defs.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
    }

    // Examples
    const examples = Array.isArray(item.examples) && item.examples.length > 0
      ? item.examples
      : (item.example ? [item.example] : []);

    if (item.customExample) {
      examples.push(item.customExample);
    }

    if (examples.length > 0) {
      lines.push('');
      lines.push('### Examples');
      examples.forEach(e => lines.push(`> "${e}"`));
    }

    // Synonyms & Antonyms
    if (Array.isArray(item.synonyms) && item.synonyms.length > 0) {
      lines.push('');
      lines.push(`**Synonyms:** ${item.synonyms.join(', ')}`);
    }
    if (Array.isArray(item.antonyms) && item.antonyms.length > 0) {
      lines.push(`**Antonyms:** ${item.antonyms.join(', ')}`);
    }

    // Context & Notes
    if (item.contextSentence) {
      lines.push('');
      lines.push(`**Discovered in:** "${item.contextSentence}"`);
      if (item.sourceUrl) {
        lines.push(`*Source:* [${item.pageTitle || item.sourceUrl}](${item.sourceUrl})`);
      }
    }

    if (item.notes) {
      lines.push('');
      lines.push(`**Notes:** ${item.notes}`);
    }

    if (Array.isArray(item.tags) && item.tags.length > 0) {
      lines.push('');
      lines.push(`**Tags:** \`${item.tags.join('` `')}\``);
    }

    lines.push('');
    lines.push(`*Status:* \`${item.status || 'learning'}\` | *Review interval:* ${item.sm2?.interval || 1}d`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates JSON string of vocabulary
 * @param {Array<object>} vocab
 * @returns {string}
 */
export function exportToJSON(vocab = []) {
  return JSON.stringify({
    app: 'WordWise',
    format: 'vocabulary_backup',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    totalWords: vocab.length,
    vocabulary: vocab
  }, null, 2);
}

/**
 * Validates and previews imported JSON payload against existing vocabulary
 * @param {string|object} input JSON string or parsed object
 * @param {Array<object>} existingVocab
 * @returns {{ isValid: boolean, items: Array<object>, newCount: number, duplicateCount: number, preview: Array<{ word: string, status: string, isDuplicate: boolean }>, error?: string }}
 */
export function validateImportPayload(input, existingVocab = []) {
  let payload = input;
  if (typeof input === 'string') {
    try {
      payload = JSON.parse(input);
    } catch (err) {
      return {
        isValid: false,
        items: [],
        newCount: 0,
        duplicateCount: 0,
        preview: [],
        error: 'File is not a valid JSON document: ' + err.message
      };
    }
  }

  if (!payload || typeof payload !== 'object') {
    return {
      isValid: false,
      items: [],
      newCount: 0,
      duplicateCount: 0,
      preview: [],
      error: 'Invalid file format: Expected an object or list.'
    };
  }

  const rawList = payload.vocabulary || payload.data?.vocabulary || (Array.isArray(payload) ? payload : null);

  if (!Array.isArray(rawList)) {
    return {
      isValid: false,
      items: [],
      newCount: 0,
      duplicateCount: 0,
      preview: [],
      error: 'No "vocabulary" list found in the imported file.'
    };
  }

  const existingKeys = new Set(existingVocab.map(v => normalizeWordKey(v.word)));
  const validItems = [];
  const preview = [];
  let newCount = 0;
  let duplicateCount = 0;

  for (const item of rawList) {
    if (!item || !item.word) continue;
    const cleanWord = String(item.displayWord || item.word).trim();
    const key = normalizeWordKey(cleanWord);
    if (!key) continue;

    const isDuplicate = existingKeys.has(key);
    if (isDuplicate) {
      duplicateCount++;
    } else {
      newCount++;
    }

    validItems.push(item);
    if (preview.length < 50) {
      preview.push({
        word: cleanWord,
        partOfSpeech: item.partOfSpeech || 'unknown',
        isDuplicate
      });
    }
  }

  return {
    isValid: validItems.length > 0,
    items: validItems,
    newCount,
    duplicateCount,
    preview,
    error: validItems.length === 0 ? 'No valid words found in the imported file.' : undefined
  };
}

/**
 * Triggers a browser file download from string content
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function triggerDownload(content, filename, mimeType = 'text/plain') {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
