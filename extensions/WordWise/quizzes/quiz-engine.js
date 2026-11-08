/**
 * WordWise - Quiz Engine
 * Generates randomized, distractor-vetted vocabulary quiz questions across 4 modes:
 * 1. Meaning Challenge: Given a word, choose the correct definition.
 * 2. Word Challenge: Given a definition, choose the correct word.
 * 3. Fill in the Blank: Given a sentence with a missing word (_____), pick the right word.
 * 4. Synonym Challenge: Choose the closest synonym.
 */

/**
 * Shuffles an array in place (Fisher-Yates)
 * @param {Array} array
 * @returns {Array}
 */
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sanitizes and extracts primary definition from a vocabulary item
 * @param {object} item
 * @returns {string}
 */
export function getPrimaryDefinition(item) {
  if (!item) return '';
  if (Array.isArray(item.definitions) && item.definitions.length > 0) {
    return item.definitions[0];
  }
  if (item.definition) return item.definition;
  return '';
}

/**
 * Sanitizes and extracts primary example sentence from a vocabulary item
 * @param {object} item
 * @returns {string}
 */
export function getPrimaryExample(item) {
  if (!item) return '';
  if (Array.isArray(item.examples) && item.examples.length > 0) {
    return item.examples[0];
  }
  if (item.example) return item.example;
  if (item.contextSentence) return item.contextSentence;
  return '';
}

/**
 * Extracts synonyms from a vocabulary item
 * @param {object} item
 * @returns {string[]}
 */
export function getSynonymsList(item) {
  if (!item || !Array.isArray(item.synonyms)) return [];
  return item.synonyms.filter(s => typeof s === 'string' && s.trim().length > 0);
}

/**
 * Creates cloze (fill in the blank) test sentence replacing target word with '_____'
 * @param {string} sentence
 * @param {string} word
 * @returns {string|null}
 */
export function createClozeSentence(sentence = '', word = '') {
  if (!sentence || !word) return null;
  const regex = new RegExp(`\\b${word}\\b`, 'i');
  if (!regex.test(sentence)) {
    // Try word stem / substring if plural or suffixed
    const stem = word.length > 4 ? word.slice(0, -2) : word;
    const stemRegex = new RegExp(`\\b${stem}\\w*\\b`, 'i');
    if (!stemRegex.test(sentence)) return null;
    return sentence.replace(stemRegex, '_____');
  }
  return sentence.replace(regex, '_____');
}

/**
 * Generates questions for a quiz session
 * @param {object} params
 * @param {'meaning'|'word'|'cloze'|'synonym'|'mixed'} params.mode
 * @param {Array<object>} params.userVocab
 * @param {Array<object>} [params.fallbackVocab=[]] Curated vocabulary for distractor pool
 * @param {number} [params.questionCount=10]
 * @returns {Array<object>} Array of quiz question objects
 */
export function generateQuiz({ mode = 'meaning', userVocab = [], fallbackVocab = [], questionCount = 10 }) {
  // Pool of all valid vocabulary items
  const combinedPool = [...userVocab];
  const seenKeys = new Set(userVocab.map(v => v.word.toLowerCase()));

  for (const fb of fallbackVocab) {
    if (!seenKeys.has(fb.word.toLowerCase())) {
      combinedPool.push(fb);
      seenKeys.add(fb.word.toLowerCase());
    }
  }

  // Eligible source items (prefer user saved words if enough, else fallback)
  let eligibleTargets = userVocab.filter(v => getPrimaryDefinition(v) !== '');
  if (eligibleTargets.length < 4) {
    eligibleTargets = combinedPool.filter(v => getPrimaryDefinition(v) !== '');
  }

  if (eligibleTargets.length === 0) {
    return [];
  }

  const shuffledTargets = shuffle(eligibleTargets);
  const questions = [];
  const modes = ['meaning', 'word', 'cloze', 'synonym'];

  for (const target of shuffledTargets) {
    if (questions.length >= questionCount) break;

    const chosenMode = mode === 'mixed' ? modes[questions.length % modes.length] : mode;

    let question = null;
    switch (chosenMode) {
      case 'meaning':
        question = buildMeaningQuestion(target, combinedPool);
        break;
      case 'word':
        question = buildWordQuestion(target, combinedPool);
        break;
      case 'cloze':
        question = buildClozeQuestion(target, combinedPool);
        break;
      case 'synonym':
        question = buildSynonymQuestion(target, combinedPool);
        break;
    }

    if (question) {
      questions.push(question);
    }
  }

  return questions;
}

/**
 * Mode 1: Meaning Challenge (Word -> Definition)
 */
function buildMeaningQuestion(target, pool) {
  const correctDef = getPrimaryDefinition(target);
  if (!correctDef) return null;

  const otherPool = pool.filter(p => p.word.toLowerCase() !== target.word.toLowerCase() && getPrimaryDefinition(p) !== '');
  if (otherPool.length < 3) return null;

  const distractorDefs = shuffle(otherPool)
    .slice(0, 3)
    .map(p => getPrimaryDefinition(p));

  const allOptions = shuffle([correctDef, ...distractorDefs]);

  return {
    id: `q_meaning_${target.word}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    mode: 'meaning',
    word: target.displayWord || target.word,
    prompt: `What is the meaning of "${target.displayWord || target.word}"?`,
    correctAnswer: correctDef,
    options: allOptions,
    correctIndex: allOptions.indexOf(correctDef),
    explanation: `"${target.displayWord || target.word}" (${target.partOfSpeech || 'word'}): ${correctDef}`,
    metadata: {
      partOfSpeech: target.partOfSpeech || 'unknown',
      example: getPrimaryExample(target)
    }
  };
}

/**
 * Mode 2: Word Challenge (Definition -> Word)
 */
function buildWordQuestion(target, pool) {
  const correctDef = getPrimaryDefinition(target);
  const correctWord = target.displayWord || target.word;
  if (!correctDef || !correctWord) return null;

  const otherPool = pool.filter(p => p.word.toLowerCase() !== target.word.toLowerCase());
  if (otherPool.length < 3) return null;

  const distractorWords = shuffle(otherPool)
    .slice(0, 3)
    .map(p => p.displayWord || p.word);

  const allOptions = shuffle([correctWord, ...distractorWords]);

  return {
    id: `q_word_${target.word}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    mode: 'word',
    word: correctWord,
    prompt: `Which word matches this definition?\n"${correctDef}"`,
    correctAnswer: correctWord,
    options: allOptions,
    correctIndex: allOptions.indexOf(correctWord),
    explanation: `"${correctWord}" means: ${correctDef}`,
    metadata: {
      partOfSpeech: target.partOfSpeech || 'unknown',
      example: getPrimaryExample(target)
    }
  };
}

/**
 * Mode 3: Fill in the Blank (Cloze sentence -> Word)
 */
function buildClozeQuestion(target, pool) {
  const rawExample = getPrimaryExample(target);
  if (!rawExample) return null;

  const cloze = createClozeSentence(rawExample, target.word);
  if (!cloze) return null;

  const correctWord = target.displayWord || target.word;
  const otherPool = pool.filter(p => p.word.toLowerCase() !== target.word.toLowerCase());
  if (otherPool.length < 3) return null;

  const distractorWords = shuffle(otherPool)
    .slice(0, 3)
    .map(p => p.displayWord || p.word);

  const allOptions = shuffle([correctWord, ...distractorWords]);

  return {
    id: `q_cloze_${target.word}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    mode: 'cloze',
    word: correctWord,
    prompt: `Complete the sentence with the appropriate word:\n"${cloze}"`,
    correctAnswer: correctWord,
    options: allOptions,
    correctIndex: allOptions.indexOf(correctWord),
    explanation: `Completed: "${rawExample}"`,
    metadata: {
      partOfSpeech: target.partOfSpeech || 'unknown',
      definition: getPrimaryDefinition(target)
    }
  };
}

/**
 * Mode 4: Synonym Challenge
 */
function buildSynonymQuestion(target, pool) {
  const syns = getSynonymsList(target);
  if (syns.length === 0) return null;

  const correctSynonym = syns[0];
  const targetWord = target.displayWord || target.word;

  const otherWords = pool
    .filter(p => p.word.toLowerCase() !== target.word.toLowerCase() && !syns.includes(p.word.toLowerCase()))
    .map(p => p.displayWord || p.word);

  if (otherWords.length < 3) return null;

  const distractorWords = shuffle(otherWords).slice(0, 3);
  const allOptions = shuffle([correctSynonym, ...distractorWords]);

  return {
    id: `q_synonym_${target.word}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    mode: 'synonym',
    word: targetWord,
    prompt: `Which word is the closest synonym for "${targetWord}"?`,
    correctAnswer: correctSynonym,
    options: allOptions,
    correctIndex: allOptions.indexOf(correctSynonym),
    explanation: `"${correctSynonym}" is a direct synonym for "${targetWord}".`,
    metadata: {
      partOfSpeech: target.partOfSpeech || 'unknown',
      allSynonyms: syns
    }
  };
}

/**
 * Evaluates user's answer
 * @param {object} question
 * @param {number} selectedIndex
 * @returns {{ isCorrect: boolean, correctIndex: number, correctAnswer: string, explanation: string }}
 */
export function evaluateAnswer(question, selectedIndex) {
  if (!question) {
    return { isCorrect: false, correctIndex: -1, correctAnswer: '', explanation: '' };
  }

  const isCorrect = selectedIndex === question.correctIndex;
  return {
    isCorrect,
    correctIndex: question.correctIndex,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation
  };
}
