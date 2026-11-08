/**
 * WordWise - Dictionary Service
 * Isolates all dictionary lookups, caching, response normalization,
 * and offline fallbacks.
 * Uses the public Free Dictionary API (no key required).
 */

import { getCachedDefinition, setCachedDefinition, getWordByText } from './storage-service.js';

const FREE_DICTIONARY_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const FETCH_TIMEOUT_MS = 8000;

let curatedWordsCache = null;

/**
 * Loads the curated local dictionary dataset (lazy loaded)
 * @returns {Promise<Array<object>>}
 */
export async function getCuratedDataset() {
  if (curatedWordsCache) return curatedWordsCache;

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      const url = chrome.runtime.getURL('data/daily-words.json');
      const res = await fetch(url);
      if (res.ok) {
        curatedWordsCache = await res.json();
        return curatedWordsCache;
      }
    } else if (typeof process !== 'undefined' && process.versions?.node) {
      // Node.js test environment (ES module)
      const fs = await import('node:fs');
      const path = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const dirname = path.dirname(fileURLToPath(import.meta.url));
      const filePath = path.join(dirname, '..', 'data', 'daily-words.json');
      if (fs.existsSync(filePath)) {
        curatedWordsCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return curatedWordsCache;
      }
    }
  } catch (err) {
    console.warn('[WordWise Dictionary] Failed to load daily-words.json:', err);
  }

  curatedWordsCache = [];
  return curatedWordsCache;
}

/**
 * Searches the curated local dataset for a match
 * @param {string} word
 * @returns {Promise<object|null>}
 */
export async function findInCuratedDataset(word = '') {
  const clean = String(word).trim().toLowerCase();
  if (!clean) return null;
  const list = await getCuratedDataset();
  const match = list.find(item => item.word.toLowerCase() === clean);
  if (!match) return null;

  return {
    word: match.word,
    displayWord: match.word.charAt(0).toUpperCase() + match.word.slice(1),
    phonetic: match.phonetic || '',
    audioUrl: null,
    source: 'offline_curated',
    isOfflineFallback: true,
    meanings: [
      {
        partOfSpeech: match.partOfSpeech || 'unknown',
        definitions: [
          {
            definition: match.definition,
            example: match.example || '',
            synonyms: match.synonyms || [],
            antonyms: match.antonyms || []
          }
        ],
        synonyms: match.synonyms || [],
        antonyms: match.antonyms || []
      }
    ],
    allDefinitions: [match.definition],
    allExamples: match.example ? [match.example] : [],
    allSynonyms: match.synonyms || [],
    allAntonyms: match.antonyms || [],
    usageTip: match.usageTip || ''
  };
}

/**
 * Normalizes raw API response into canonical WordWise format
 * @param {Array<object>} rawEntries
 * @param {string} query
 * @returns {object} Normalized word entry
 */
export function normalizeApiResponse(rawEntries, query = '') {
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    throw new Error('Invalid dictionary API response structure.');
  }

  const primary = rawEntries[0];
  const word = primary.word || query;

  // Extract best phonetic transcription
  let phonetic = primary.phonetic || '';
  let audioUrl = null;

  if (Array.isArray(primary.phonetics)) {
    for (const p of primary.phonetics) {
      if (!phonetic && p.text) {
        phonetic = p.text;
      }
      if (!audioUrl && p.audio && typeof p.audio === 'string' && p.audio.trim() !== '') {
        let cleanAudio = p.audio.trim();
        if (cleanAudio.startsWith('//')) {
          cleanAudio = 'https:' + cleanAudio;
        }
        audioUrl = cleanAudio;
      }
    }
  }

  const meanings = [];
  const allDefinitions = [];
  const allExamples = [];
  const synSet = new Set();
  const antSet = new Set();

  for (const entry of rawEntries) {
    if (!Array.isArray(entry.meanings)) continue;

    for (const m of entry.meanings) {
      const partOfSpeech = m.partOfSpeech || 'general';
      const defObjects = [];

      if (Array.isArray(m.synonyms)) {
        m.synonyms.forEach(s => synSet.add(s));
      }
      if (Array.isArray(m.antonyms)) {
        m.antonyms.forEach(a => antSet.add(a));
      }

      if (Array.isArray(m.definitions)) {
        for (const d of m.definitions) {
          if (!d.definition) continue;
          allDefinitions.push(d.definition);
          if (d.example) {
            allExamples.push(d.example);
          }
          if (Array.isArray(d.synonyms)) {
            d.synonyms.forEach(s => synSet.add(s));
          }
          if (Array.isArray(d.antonyms)) {
            d.antonyms.forEach(a => antSet.add(a));
          }

          defObjects.push({
            definition: d.definition,
            example: d.example || '',
            synonyms: Array.isArray(d.synonyms) ? d.synonyms : [],
            antonyms: Array.isArray(d.antonyms) ? d.antonyms : []
          });
        }
      }

      meanings.push({
        partOfSpeech,
        definitions: defObjects,
        synonyms: Array.isArray(m.synonyms) ? m.synonyms : [],
        antonyms: Array.isArray(m.antonyms) ? m.antonyms : []
      });
    }
  }

  return {
    word: word.toLowerCase(),
    displayWord: word,
    phonetic,
    audioUrl,
    source: 'api',
    isOfflineFallback: false,
    meanings,
    allDefinitions,
    allExamples,
    allSynonyms: Array.from(synSet),
    allAntonyms: Array.from(antSet)
  };
}

/**
 * Fetches definition from Free Dictionary API with timeout
 * @param {string} word
 * @returns {Promise<any>}
 */
async function fetchFromApi(word) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const encoded = encodeURIComponent(word.trim().toLowerCase());
    const res = await fetch(`${FREE_DICTIONARY_API_BASE}/${encoded}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.status === 404) {
      return { notFound: true };
    }

    if (!res.ok) {
      throw new Error(`Dictionary service responded with HTTP ${res.status}`);
    }

    const json = await res.json();
    return { data: json };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Look up a word or phrase with caching, online lookup, and graceful offline fallback
 * @param {string} rawQuery
 * @returns {Promise<{ found: boolean, data?: object, error?: string, message?: string, isOffline?: boolean }>}
 */
export async function lookupWord(rawQuery = '') {
  const query = String(rawQuery).trim();
  if (!query) {
    return {
      found: false,
      error: 'empty_query',
      message: 'Please enter a word or phrase to look up.'
    };
  }

  // 1. Check local cache first
  try {
    const cached = await getCachedDefinition(query);
    if (cached) {
      return {
        found: true,
        data: { ...cached, source: 'cache' }
      };
    }
  } catch (cacheErr) {
    console.warn('[WordWise Dictionary] Cache read error:', cacheErr);
  }

  // 2. Attempt online API fetch
  let apiSuccess = false;
  let apiNotFound = false;

  try {
    const apiResult = await fetchFromApi(query);
    if (apiResult.notFound) {
      apiNotFound = true;
    } else if (apiResult.data) {
      const normalized = normalizeApiResponse(apiResult.data, query);
      await setCachedDefinition(query, normalized);
      return {
        found: true,
        data: normalized
      };
    }
  } catch (netErr) {
    // Network failure, timeout, or blocked API
    console.warn('[WordWise Dictionary] Network fetch error:', netErr.message);
  }

  // 3. If online API reported 404 Not Found, check curated local dictionary
  if (apiNotFound) {
    const curatedMatch = await findInCuratedDataset(query);
    if (curatedMatch) {
      return {
        found: true,
        data: curatedMatch
      };
    }

    // Check user library
    const libraryWord = await getWordByText(query);
    if (libraryWord) {
      return {
        found: true,
        data: {
          word: libraryWord.word,
          displayWord: libraryWord.displayWord,
          phonetic: libraryWord.phonetic,
          audioUrl: libraryWord.audioUrl,
          source: 'saved_library',
          isOfflineFallback: true,
          meanings: [
            {
              partOfSpeech: libraryWord.partOfSpeech,
              definitions: libraryWord.definitions.map(d => ({ definition: d, example: '', synonyms: [], antonyms: [] })),
              synonyms: libraryWord.synonyms,
              antonyms: libraryWord.antonyms
            }
          ],
          allDefinitions: libraryWord.definitions,
          allExamples: libraryWord.examples,
          allSynonyms: libraryWord.synonyms,
          allAntonyms: libraryWord.antonyms
        }
      };
    }

    return {
      found: false,
      error: 'not_found',
      message: `No definition found for "${query}" in dictionary.`
    };
  }

  // 4. If network failed (offline or connection error), attempt local fallbacks
  const curatedFallback = await findInCuratedDataset(query);
  if (curatedFallback) {
    return {
      found: true,
      data: curatedFallback,
      isOffline: true
    };
  }

  const savedFallback = await getWordByText(query);
  if (savedFallback) {
    return {
      found: true,
      data: {
        word: savedFallback.word,
        displayWord: savedFallback.displayWord,
        phonetic: savedFallback.phonetic,
        audioUrl: savedFallback.audioUrl,
        source: 'saved_library',
        isOfflineFallback: true,
        meanings: [
          {
            partOfSpeech: savedFallback.partOfSpeech,
            definitions: savedFallback.definitions.map(d => ({ definition: d, example: '', synonyms: [], antonyms: [] })),
            synonyms: savedFallback.synonyms,
            antonyms: savedFallback.antonyms
          }
        ],
        allDefinitions: savedFallback.definitions,
        allExamples: savedFallback.examples,
        allSynonyms: savedFallback.synonyms,
        allAntonyms: savedFallback.antonyms
      },
      isOffline: true
    };
  }

  return {
    found: false,
    error: 'network_error',
    message: 'Unable to connect to online dictionary and no offline match found for this word.'
  };
}
