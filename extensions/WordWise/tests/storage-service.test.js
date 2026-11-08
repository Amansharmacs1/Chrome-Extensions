/**
 * WordWise - Storage Service & Persistence Layer Tests
 */

import {
  initStorage,
  getVocabulary,
  getWordByText,
  saveWord,
  updateWord,
  deleteWord,
  setCachedDefinition,
  getCachedDefinition,
  clearDefinitionCache,
  recordActivity,
  getStreakData,
  saveQuizResult,
  getQuizHistory,
  getSettings,
  updateSettings,
  exportAllData,
  clearAllData
} from '../services/storage-service.js';

export async function runStorageTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Storage Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  // 1. Storage Initialization
  await initStorage();
  await clearAllData();

  const emptyVocab = await getVocabulary();
  assert(Array.isArray(emptyVocab) && emptyVocab.length === 0, 'Initial vocabulary is an empty array');

  // 2. Saving Words & Duplicate Prevention
  const saveRes1 = await saveWord({
    word: 'serendipity',
    phonetic: '/ˌsɛrənˈdɪpɪti/',
    partOfSpeech: 'noun',
    definitions: ['Finding good things without looking for them.'],
    examples: ['It was pure serendipity.'],
    synonyms: ['chance', 'fluke'],
    tags: ['literature']
  });
  assert(saveRes1.success === true, 'Successfully saved new word');
  assert(saveRes1.item.word === 'serendipity', 'Saved word is normalized');
  assert(saveRes1.item.sm2.repetitions === 0, 'Initial SM-2 repetitions is 0');
  assert(saveRes1.item.sm2.easeFactor === 2.5, 'Initial SM-2 ease factor is 2.5');

  // Duplicate prevention (case-insensitive)
  const saveResDup = await saveWord({
    word: 'SERENDIPITY',
    definition: 'Duplicate definition'
  });
  assert(saveResDup.success === false, 'Duplicate word rejected');
  assert(saveResDup.isDuplicate === true, 'isDuplicate flag is true');

  // 3. Finding and Updating Words
  const found = await getWordByText('Serendipity');
  assert(found !== null && found.word === 'serendipity', 'Found word case-insensitively');

  const updateRes = await updateWord(found.id, {
    notes: 'My favorite English word.',
    isFavorite: true,
    tags: ['literature', 'favorites']
  });
  assert(updateRes.success === true, 'Word updated successfully');
  assert(updateRes.item.notes === 'My favorite English word.', 'Notes field updated');
  assert(updateRes.item.isFavorite === true, 'isFavorite field updated');
  assert(updateRes.item.tags.includes('favorites'), 'Tags array updated');

  // 4. SM-2 State Updates
  const now = Date.now();
  const sm2Res = await updateWord(found.id, {
    sm2: {
      repetitions: 1,
      interval: 1,
      easeFactor: 2.5,
      nextReviewDate: now + 86400000
    },
    status: 'review'
  });
  assert(sm2Res.item.sm2.repetitions === 1, 'SM-2 repetitions updated');
  assert(sm2Res.item.status === 'review', 'Status updated to review');

  // 5. Caching Layer
  await setCachedDefinition('ubiquitous', { word: 'ubiquitous', test: true });
  const cached = await getCachedDefinition('Ubiquitous');
  assert(cached !== null && cached.test === true, 'Cached definition retrieved');

  await clearDefinitionCache();
  const clearedCache = await getCachedDefinition('ubiquitous');
  assert(clearedCache === null, 'Cache cleared successfully');

  // 6. Activity & Streaks
  await recordActivity('word_saved', { word: 'serendipity' });
  await recordActivity('flashcard_review', { rating: 'good' });
  const streak = await getStreakData();
  assert(streak.currentStreak >= 1, 'Current streak is at least 1 after activity');
  assert(streak.activeDaysTotal >= 1, 'Active days total recorded');
  assert(Array.isArray(streak.weeklyActivity), 'Weekly activity is an array');

  // 7. Quiz Results
  await saveQuizResult({
    mode: 'meaning',
    score: 8,
    total: 10,
    durationSeconds: 45
  });
  const history = await getQuizHistory();
  assert(history.length === 1, 'Quiz history recorded');
  assert(history[0].accuracy === 80, 'Quiz accuracy calculated correctly (80%)');

  // 8. Settings Management
  const initialSettings = await getSettings();
  assert(typeof initialSettings.dailyGoal === 'number', 'Default daily goal present');

  const updatedSettings = await updateSettings({ dailyGoal: 10, speechRate: 1.0 });
  assert(updatedSettings.dailyGoal === 10, 'dailyGoal updated in settings');
  assert(updatedSettings.speechRate === 1.0, 'speechRate updated in settings');

  // 9. Full Backup Export
  const backup = await exportAllData();
  assert(backup.app === 'WordWise', 'Export contains app name');
  assert(Array.isArray(backup.data.vocabulary), 'Export contains vocabulary array');
  assert(backup.data.vocabulary.length === 1, 'Exported 1 saved word');

  // 10. Deleting Words
  const deleted = await deleteWord(found.id);
  assert(deleted === true, 'Deleted word successfully');
  const emptyAfterDelete = await getVocabulary();
  assert(emptyAfterDelete.length === 0, 'Vocabulary list empty after deletion');

  return assertions;
}
