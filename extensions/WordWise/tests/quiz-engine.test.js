/**
 * WordWise - Quiz Engine Unit Tests
 */

import {
  shuffle,
  getPrimaryDefinition,
  getPrimaryExample,
  getSynonymsList,
  createClozeSentence,
  generateQuiz
} from '../quizzes/quiz-engine.js';

export async function runQuizEngineTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Quiz Engine Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  // 1. Array Shuffling
  const sampleArr = [1, 2, 3, 4, 5, 6, 7, 8];
  const shuffled = shuffle(sampleArr);
  assert(shuffled.length === sampleArr.length, 'Shuffled array preserves length');
  assert(sampleArr.every(x => shuffled.includes(x)), 'Shuffled array contains all original items');

  // 2. Metadata Extractors
  const testItem = {
    word: 'resilient',
    definitions: ['Able to withstand or recover quickly from difficult conditions.'],
    examples: ['Babies are generally more resilient than new parents realize.'],
    synonyms: ['tough', 'durable', 'buoyant']
  };

  assert(getPrimaryDefinition(testItem) === testItem.definitions[0], 'Extracts primary definition');
  assert(getPrimaryExample(testItem) === testItem.examples[0], 'Extracts primary example');
  assert(getSynonymsList(testItem).length === 3, 'Extracts synonyms array');

  // 3. Cloze Masking
  const cloze = createClozeSentence('The community was remarkably resilient after the storm.', 'resilient');
  assert(cloze !== null, 'Cloze generated successfully');
  assert(cloze.includes('_____'), 'Target word replaced with "_____"');
  assert(!cloze.toLowerCase().includes('resilient'), 'Target word completely masked');

  // Cloze with stem/plural
  const clozePlural = createClozeSentence('Several anomalies occurred in the experiment.', 'anomaly');
  assert(clozePlural !== null, 'Stem matching handles plurals/suffixes');

  // Missing word returns null
  const clozeMissing = createClozeSentence('The sun rises in the east.', 'umbrella');
  assert(clozeMissing === null, 'Returns null when target word is absent');

  // 4. Quiz Question Generation
  const mockVocabPool = [
    {
      word: 'ephemeral',
      displayWord: 'Ephemeral',
      partOfSpeech: 'adjective',
      definitions: ['Lasting for a very short time.'],
      examples: ['Fame in the digital age is often ephemeral.'],
      synonyms: ['transitory', 'fleeting']
    },
    {
      word: 'lucid',
      displayWord: 'Lucid',
      partOfSpeech: 'adjective',
      definitions: ['Expressed clearly; easy to understand.'],
      examples: ['A lucid explanation of the problem.'],
      synonyms: ['clear', 'coherent']
    },
    {
      word: 'ubiquitous',
      displayWord: 'Ubiquitous',
      partOfSpeech: 'adjective',
      definitions: ['Present, appearing, or found everywhere.'],
      examples: ['Smartphones are now ubiquitous across modern society.'],
      synonyms: ['omnipresent', 'pervasive']
    },
    {
      word: 'pragmatic',
      displayWord: 'Pragmatic',
      partOfSpeech: 'adjective',
      definitions: ['Dealing with things sensibly and realistically.'],
      examples: ['A pragmatic approach to solving the issue.'],
      synonyms: ['practical', 'sensible']
    },
    {
      word: 'serendipity',
      displayWord: 'Serendipity',
      partOfSpeech: 'noun',
      definitions: ['The occurrence of events by chance in a happy way.'],
      examples: ['Finding the book was pure serendipity.'],
      synonyms: ['fluke', 'chance']
    }
  ];

  // Meaning mode
  const meaningQuiz = generateQuiz({
    mode: 'meaning',
    userVocab: mockVocabPool,
    questionCount: 3
  });
  assert(meaningQuiz.length === 3, 'Generated 3 meaning questions');
  const qM = meaningQuiz[0];
  assert(qM.mode === 'meaning', 'Question mode is "meaning"');
  assert(qM.options.length === 4, 'Question has exactly 4 options');
  assert(qM.options.includes(qM.correctAnswer), 'Options list includes correct answer');
  assert(qM.options[qM.correctIndex] === qM.correctAnswer, 'correctIndex matches correctAnswer');
  assert(qM.explanation.length > 5, 'Explanation is populated');

  // Word mode
  const wordQuiz = generateQuiz({
    mode: 'word',
    userVocab: mockVocabPool,
    questionCount: 3
  });
  assert(wordQuiz.length === 3, 'Generated 3 word questions');
  const qW = wordQuiz[0];
  assert(qW.mode === 'word', 'Question mode is "word"');
  assert(qW.options.length === 4, 'Word question has 4 options');
  assert(qW.options[qW.correctIndex] === qW.correctAnswer, 'correctIndex points to correct word');

  // Cloze mode
  const clozeQuiz = generateQuiz({
    mode: 'cloze',
    userVocab: mockVocabPool,
    questionCount: 3
  });
  assert(clozeQuiz.length > 0, 'Generated cloze questions');
  const qC = clozeQuiz[0];
  assert(qC.mode === 'cloze', 'Question mode is "cloze"');
  assert(qC.prompt.includes('_____'), 'Prompt contains fill-in-the-blank line');

  // Synonym mode
  const synonymQuiz = generateQuiz({
    mode: 'synonym',
    userVocab: mockVocabPool,
    questionCount: 3
  });
  assert(synonymQuiz.length > 0, 'Generated synonym questions');
  const qS = synonymQuiz[0];
  assert(qS.mode === 'synonym', 'Question mode is "synonym"');
  assert(qS.options.length === 4, 'Synonym question has 4 options');

  // Mixed mode
  const mixedQuiz = generateQuiz({
    mode: 'mixed',
    userVocab: mockVocabPool,
    questionCount: 4
  });
  assert(mixedQuiz.length === 4, 'Mixed mode generated requested question count');

  // Small vocabulary fallback support
  const smallUserVocab = [mockVocabPool[0]]; // Only 1 user word
  const fallbackQuiz = generateQuiz({
    mode: 'meaning',
    userVocab: smallUserVocab,
    fallbackVocab: mockVocabPool,
    questionCount: 2
  });
  assert(fallbackQuiz.length === 2, 'Fallback vocab supplements small user vocabularies');

  return assertions;
}
