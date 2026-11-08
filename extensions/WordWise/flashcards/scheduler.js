/**
 * WordWise - Spaced Repetition Scheduler (SM-2 Algorithm)
 * Implements SuperMemo SM-2 spaced repetition calculations for vocabulary retention.
 */

export const SM2_MIN_EASE_FACTOR = 1.3;
export const SM2_INITIAL_EASE_FACTOR = 2.5;

/**
 * Calculates new SM-2 values for a vocabulary flashcard review
 * @param {object} currentSm2 Current SM-2 state { repetitions, interval, easeFactor, nextReviewDate }
 * @param {'again'|'hard'|'good'|'easy'|number} rating Review rating
 * @param {number} [currentTime=Date.now()]
 * @returns {{ repetitions: number, interval: number, easeFactor: number, nextReviewDate: number, lastReviewed: number, status: 'learning'|'review'|'mastered' }}
 */
export function calculateNextReview(currentSm2 = {}, rating, currentTime = Date.now()) {
  const repetitions = currentSm2.repetitions || 0;
  let interval = currentSm2.interval || 1;
  let easeFactor = currentSm2.easeFactor || SM2_INITIAL_EASE_FACTOR;

  // Normalize rating into numeric grade 1..5:
  // again -> 1 (complete blackout)
  // hard  -> 3 (correct response with significant difficulty)
  // good  -> 4 (correct response with minimal hesitation)
  // easy  -> 5 (instant perfect recall)
  let q = 4;
  if (typeof rating === 'number') {
    q = Math.max(1, Math.min(5, Math.round(rating)));
  } else if (typeof rating === 'string') {
    switch (rating.toLowerCase()) {
      case 'again':
        q = 1;
        break;
      case 'hard':
        q = 3;
        break;
      case 'good':
        q = 4;
        break;
      case 'easy':
        q = 5;
        break;
      default:
        q = 4;
    }
  }

  // 1. Calculate New Ease Factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const deltaEF = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  let newEaseFactor = Math.round((easeFactor + deltaEF) * 100) / 100;
  if (newEaseFactor < SM2_MIN_EASE_FACTOR) {
    newEaseFactor = SM2_MIN_EASE_FACTOR;
  }

  let newRepetitions = repetitions;
  let newInterval = interval;
  let newStatus = 'learning';

  // 2. Calculate New Repetitions and Interval
  if (q < 3) {
    // Review failed ('again') -> reset repetitions, review tomorrow
    newRepetitions = 0;
    newInterval = 1;
    newStatus = 'learning';
  } else {
    // Review passed ('hard', 'good', 'easy')
    if (repetitions === 0) {
      newInterval = q === 3 ? 1 : (q === 5 ? 2 : 1);
    } else if (repetitions === 1) {
      newInterval = q === 3 ? 3 : (q === 5 ? 7 : 6);
    } else {
      if (q === 3) {
        // Hard: slightly lengthen interval
        newInterval = Math.max(1, Math.round(interval * 1.2));
      } else if (q === 4) {
        // Good: standard multiplier by ease factor
        newInterval = Math.max(1, Math.round(interval * newEaseFactor));
      } else {
        // Easy: bonus multiplier
        newInterval = Math.max(1, Math.round(interval * newEaseFactor * 1.3));
      }
    }
    newRepetitions = repetitions + 1;

    // Status assignment
    if (newRepetitions >= 4 && newInterval >= 21) {
      newStatus = 'mastered';
    } else {
      newStatus = 'review';
    }
  }

  // 3. Next Review Date (Interval * 24 hours in milliseconds)
  const nextReviewDate = currentTime + newInterval * 86400000;

  return {
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: newEaseFactor,
    nextReviewDate,
    lastReviewed: currentTime,
    status: newStatus
  };
}

/**
 * Filters vocabulary list into words currently due for review
 * @param {Array<object>} vocab
 * @param {number} [targetTime=Date.now()]
 * @returns {Array<object>}
 */
export function getDueWords(vocab = [], targetTime = Date.now()) {
  if (!Array.isArray(vocab)) return [];
  return vocab.filter(item => {
    if (!item || !item.sm2) return true;
    const nextDate = item.sm2.nextReviewDate;
    if (!nextDate) return true;
    // Due if next review date is in the past or within 1 hour
    return nextDate <= targetTime + 3600000;
  });
}

/**
 * Formats relative time until next review
 * @param {number} nextReviewDate
 * @param {number} [currentTime=Date.now()]
 * @returns {string}
 */
export function formatNextReviewRelative(nextReviewDate, currentTime = Date.now()) {
  if (!nextReviewDate) return 'Due today';
  const diffMs = nextReviewDate - currentTime;
  if (diffMs <= 0) return 'Due now';

  const diffHours = Math.round(diffMs / 3600000);
  if (diffHours < 24) {
    return diffHours === 1 ? 'Due in 1 hour' : `Due in ${diffHours} hours`;
  }

  const diffDays = Math.round(diffMs / 86400000);
  return diffDays === 1 ? 'Due tomorrow' : `Due in ${diffDays} days`;
}
