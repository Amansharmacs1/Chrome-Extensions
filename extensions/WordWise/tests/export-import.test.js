/**
 * WordWise - Export and Import Service Unit Tests
 */

import {
  exportToCSV,
  exportToMarkdown,
  exportToJSON,
  validateImportPayload
} from '../services/export-service.js';

export async function runExportImportTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Export/Import Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  const sampleVocab = [
    {
      id: 'vocab_ephemeral_1',
      word: 'ephemeral',
      displayWord: 'Ephemeral',
      partOfSpeech: 'adjective',
      phonetic: '/ɪˈfɛm(ə)rəl/',
      definitions: ['Lasting for a very short time.'],
      examples: ['Fashions are ephemeral.'],
      synonyms: ['transitory', 'fleeting'],
      antonyms: ['permanent'],
      notes: 'Common in literature.',
      customExample: 'His anger was ephemeral.',
      tags: ['vocabulary', 'gre'],
      status: 'review',
      isFavorite: true,
      dateAdded: 1700000000000,
      sm2: {
        repetitions: 2,
        interval: 6,
        easeFactor: 2.6,
        nextReviewDate: 1700000000000 + 6 * 86400000
      },
      contextSentence: 'The beauty of cherry blossoms is ephemeral.',
      sourceUrl: 'https://en.wikipedia.org/wiki/Cherry_blossom'
    },
    {
      id: 'vocab_lucid_2',
      word: 'lucid',
      displayWord: 'Lucid',
      partOfSpeech: 'adjective',
      definitions: ['Expressed clearly; easy to understand.'],
      examples: ['A lucid explanation.'],
      synonyms: ['clear'],
      antonyms: ['confusing'],
      tags: ['clarity'],
      status: 'learning',
      isFavorite: false,
      dateAdded: 1700000000000,
      sm2: {
        repetitions: 0,
        interval: 1,
        easeFactor: 2.5,
        nextReviewDate: 1700000000000 + 86400000
      }
    }
  ];

  // 1. CSV Export
  const csv = exportToCSV(sampleVocab);
  assert(typeof csv === 'string', 'CSV is a string');
  assert(csv.includes('Word,Part of Speech,Phonetic'), 'CSV includes header row');
  assert(csv.includes('"Ephemeral"'), 'CSV includes quoted word');
  assert(csv.includes('"transitory, fleeting"'), 'CSV combines synonyms with commas inside quotes');
  assert(csv.includes('"Yes"'), 'CSV formats favorite as "Yes"');
  assert(csv.includes('"No"'), 'CSV formats non-favorite as "No"');

  // 2. Markdown Export
  const md = exportToMarkdown(sampleVocab);
  assert(typeof md === 'string', 'Markdown is a string');
  assert(md.includes('# WordWise — Vocabulary Notebook'), 'Markdown contains title header');
  assert(md.includes('## ★ Ephemeral *(adjective)* `/ɪˈfɛm(ə)rəl/`'), 'Markdown renders favorite star and word title');
  assert(md.includes('### Definitions'), 'Markdown includes definitions heading');
  assert(md.includes('**Synonyms:** transitory, fleeting'), 'Markdown includes synonyms');
  assert(md.includes('**Tags:** `vocabulary` `gre`'), 'Markdown formats tags as code badges');
  assert(md.includes('**Discovered in:** "The beauty of cherry blossoms is ephemeral."'), 'Markdown preserves context sentence');

  // 3. JSON Export
  const jsonStr = exportToJSON(sampleVocab);
  assert(typeof jsonStr === 'string', 'JSON export is a string');
  const parsed = JSON.parse(jsonStr);
  assert(parsed.app === 'WordWise', 'JSON export includes app identifier');
  assert(parsed.totalWords === 2, 'JSON export has totalWords = 2');
  assert(Array.isArray(parsed.vocabulary) && parsed.vocabulary.length === 2, 'JSON export includes vocabulary array');

  // 4. Import Payload Validation
  // Valid JSON string with 1 existing duplicate and 1 new word
  const importInput = {
    vocabulary: [
      {
        word: 'ephemeral',
        definition: 'Short lived'
      },
      {
        word: 'pragmatic',
        definition: 'Dealing with things sensibly'
      }
    ]
  };

  const validationRes = validateImportPayload(importInput, sampleVocab);
  assert(validationRes.isValid === true, 'Import payload is valid');
  assert(validationRes.newCount === 1, 'Correctly detected 1 new word');
  assert(validationRes.duplicateCount === 1, 'Correctly detected 1 duplicate word ("ephemeral")');
  assert(validationRes.preview.length === 2, 'Generated preview of 2 items');
  assert(validationRes.preview.find(p => p.word === 'ephemeral')?.isDuplicate === true, 'Preview flags ephemeral as duplicate');
  assert(validationRes.preview.find(p => p.word === 'pragmatic')?.isDuplicate === false, 'Preview flags pragmatic as new');

  // Invalid JSON document
  const invalidJson = validateImportPayload('{ broken json: ');
  assert(invalidJson.isValid === false, 'Invalid JSON flagged as invalid');
  assert(Boolean(invalidJson.error), 'Invalid JSON provides descriptive error');

  // Missing vocabulary list
  const emptyPayload = validateImportPayload({ randomField: true });
  assert(emptyPayload.isValid === false, 'Missing vocabulary array flagged as invalid');

  return assertions;
}
