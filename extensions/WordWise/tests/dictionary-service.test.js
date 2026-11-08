/**
 * WordWise - Dictionary Service Unit Tests
 */

import {
  normalizeApiResponse,
  getCuratedDataset,
  findInCuratedDataset
} from '../services/dictionary-service.js';

export async function runDictionaryServiceTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Dictionary Service Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  // 1. API Response Normalization
  const mockApiResponse = [
    {
      word: 'serendipity',
      phonetic: '/ˌsɛrənˈdɪpɪti/',
      phonetics: [
        {
          text: '/ˌsɛrənˈdɪpɪti/',
          audio: '//ssl.gstatic.com/dictionary/static/sounds/20200429/serendipity--_gb_1.mp3'
        }
      ],
      meanings: [
        {
          partOfSpeech: 'noun',
          definitions: [
            {
              definition: 'The occurrence and development of events by chance in a happy or beneficial way.',
              example: 'A fortunate stroke of serendipity.',
              synonyms: ['chance', 'happy accident'],
              antonyms: ['misfortune']
            }
          ],
          synonyms: ['fluke'],
          antonyms: []
        }
      ]
    }
  ];

  const normalized = normalizeApiResponse(mockApiResponse, 'serendipity');
  assert(normalized.word === 'serendipity', 'Normalized word is lowercase "serendipity"');
  assert(normalized.phonetic === '/ˌsɛrənˈdɪpɪti/', 'Phonetic text extracted');
  assert(normalized.audioUrl.startsWith('https://ssl.gstatic.com'), 'Audio URL prepended with https: if protocol relative');
  assert(normalized.allDefinitions.length === 1, 'Extracted 1 definition');
  assert(normalized.allDefinitions[0].includes('happy or beneficial way'), 'Definition text matches');
  assert(normalized.allExamples.length === 1, 'Extracted example');
  assert(normalized.allSynonyms.includes('chance'), 'Extracted synonym "chance"');
  assert(normalized.allSynonyms.includes('fluke'), 'Extracted top-level meaning synonym "fluke"');
  assert(normalized.allAntonyms.includes('misfortune'), 'Extracted antonym "misfortune"');

  // Error handling for malformed API inputs
  let threw = false;
  try {
    normalizeApiResponse([], 'bad');
  } catch (err) {
    threw = true;
  }
  assert(threw, 'Throws on empty raw entries array');

  // 2. Curated Offline Dataset Loading
  const curated = await getCuratedDataset();
  assert(Array.isArray(curated), 'Curated dataset returns an array');
  assert(curated.length >= 100, `Curated dataset has ${curated.length} words (>= 100)`);

  const sample = curated[0];
  assert(Boolean(sample.word), 'Curated word has word property');
  assert(Boolean(sample.definition), 'Curated word has definition');
  assert(Boolean(sample.partOfSpeech), 'Curated word has partOfSpeech');
  assert(Boolean(sample.example), 'Curated word has example');

  // 3. Search within Curated Dataset
  const ephemeralMatch = await findInCuratedDataset('ephemeral');
  assert(ephemeralMatch !== null, 'Found "ephemeral" in curated dataset');
  assert(ephemeralMatch.word === 'ephemeral', 'Word property is "ephemeral"');
  assert(ephemeralMatch.source === 'offline_curated', 'Source is "offline_curated"');
  assert(ephemeralMatch.isOfflineFallback === true, 'isOfflineFallback is true');
  assert(ephemeralMatch.allDefinitions.length > 0, 'Has definitions');

  // Case insensitivity
  const uppercaseMatch = await findInCuratedDataset('EPHEMERAL');
  assert(uppercaseMatch !== null && uppercaseMatch.word === 'ephemeral', 'Search is case-insensitive');

  // Non-existent word
  const missing = await findInCuratedDataset('xyznonexistentword12345');
  assert(missing === null, 'Missing word returns null');

  // Empty string
  const emptySearch = await findInCuratedDataset('   ');
  assert(emptySearch === null, 'Whitespace search returns null');

  return assertions;
}
