/**
 * WordWise - Spaced Repetition (SM-2) Engine Tests
 */

import {
  calculateNextReview,
  getDueWords,
  formatNextReviewRelative,
  SM2_MIN_EASE_FACTOR,
  SM2_INITIAL_EASE_FACTOR
} from '../flashcards/scheduler.js';

export async function runSchedulerTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Scheduler Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  const baseNow = 1700000000000;

  // Initial review test with 'again'
  const initialSm2 = { repetitions: 0, interval: 1, easeFactor: SM2_INITIAL_EASE_FACTOR, nextReviewDate: baseNow };
  const resAgain = calculateNextReview(initialSm2, 'again', baseNow);
  assert(resAgain.repetitions === 0, 'Rating "again" resets repetitions to 0');
  assert(resAgain.interval === 1, 'Rating "again" sets interval to 1 day');
  assert(resAgain.easeFactor < SM2_INITIAL_EASE_FACTOR, 'Rating "again" reduces ease factor');
  assert(resAgain.status === 'learning', 'Rating "again" sets status to learning');
  assert(resAgain.nextReviewDate === baseNow + 86400000, 'Next review date is in 24 hours');

  // Consecutive successful reviews ('good')
  const review1 = calculateNextReview({ repetitions: 0, interval: 1, easeFactor: 2.5 }, 'good', baseNow);
  assert(review1.repetitions === 1, 'First "good" review increases repetitions to 1');
  assert(review1.interval === 1, 'First "good" review sets interval to 1 day');
  assert(review1.status === 'review', 'First "good" review changes status to review');

  const review2 = calculateNextReview(review1, 'good', baseNow + 86400000);
  assert(review2.repetitions === 2, 'Second "good" review increases repetitions to 2');
  assert(review2.interval === 6, 'Second "good" review sets interval to 6 days');

  const review3 = calculateNextReview(review2, 'good', baseNow + 7 * 86400000);
  assert(review3.repetitions === 3, 'Third "good" review increases repetitions to 3');
  assert(review3.interval === Math.round(6 * review2.easeFactor), 'Third "good" review multiplies by ease factor');

  // Easy review bonus
  const reviewEasy = calculateNextReview(review2, 'easy', baseNow + 7 * 86400000);
  assert(reviewEasy.repetitions === 3, 'Review "easy" increases repetitions to 3');
  assert(reviewEasy.interval > review3.interval, 'Review "easy" produces longer interval than "good"');
  assert(reviewEasy.easeFactor > review2.easeFactor, 'Review "easy" increases ease factor');

  // Hard review test
  const reviewHard = calculateNextReview(review2, 'hard', baseNow + 7 * 86400000);
  assert(reviewHard.easeFactor < review2.easeFactor, 'Review "hard" decreases ease factor');
  assert(reviewHard.interval < review3.interval, 'Review "hard" interval is shorter than "good"');

  // Minimum Ease Factor Clamp (SM2_MIN_EASE_FACTOR = 1.3)
  let testSm2 = { repetitions: 0, interval: 1, easeFactor: 1.4 };
  for (let i = 0; i < 5; i++) {
    testSm2 = calculateNextReview(testSm2, 'again', baseNow);
  }
  assert(testSm2.easeFactor >= SM2_MIN_EASE_FACTOR, `Ease factor clamped at ${SM2_MIN_EASE_FACTOR} (actual: ${testSm2.easeFactor})`);
  assert(testSm2.easeFactor === 1.3, 'Ease factor equals exact minimum 1.3 after multiple fails');

  // Mastered status transition (repetitions >= 4 and interval >= 21)
  const masteredCandidate = {
    repetitions: 3,
    interval: 18,
    easeFactor: 2.6
  };
  const masteredResult = calculateNextReview(masteredCandidate, 'good', baseNow);
  assert(masteredResult.status === 'mastered', 'Reaching 4 reps with interval >= 21 sets status to "mastered"');

  // getDueWords test
  const mockVocab = [
    { word: 'duePast', sm2: { nextReviewDate: baseNow - 100000 } },
    { word: 'dueSoon', sm2: { nextReviewDate: baseNow + 1800000 } }, // 30 mins
    { word: 'future', sm2: { nextReviewDate: baseNow + 86400000 * 3 } }, // 3 days
    { word: 'noSm2', sm2: null }
  ];
  const due = getDueWords(mockVocab, baseNow);
  assert(due.some(w => w.word === 'duePast'), 'Past words are included in due list');
  assert(due.some(w => w.word === 'dueSoon'), 'Words due within an hour are included');
  assert(due.some(w => w.word === 'noSm2'), 'Words without sm2 state are considered due');
  assert(!due.some(w => w.word === 'future'), 'Future words are excluded from due list');

  // formatNextReviewRelative test
  assert(formatNextReviewRelative(baseNow - 5000, baseNow) === 'Due now', 'Negative diff formats as "Due now"');
  assert(formatNextReviewRelative(null) === 'Due today', 'Null date formats as "Due today"');
  assert(formatNextReviewRelative(baseNow + 3600000, baseNow).includes('hour'), 'Short diff includes "hour"');
  assert(formatNextReviewRelative(baseNow + 86400000, baseNow).includes('Due tomorrow'), '24h diff formats as "Due tomorrow"');
  assert(formatNextReviewRelative(baseNow + 86400000 * 4, baseNow).includes('4 days'), 'Multi-day diff formats as "Due in 4 days"');

  return assertions;
}
