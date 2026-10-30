/**
 * ReadEase - Reading Progress & Reading Time Tracker
 * Handles scroll-based reading progress, completion detection,
 * remaining time estimation, and resume-from-previous-position logic.
 */

import { calculateReadingTime, formatReadingTime } from './utils.js';

/**
 * Calculates current scroll progress as a percentage (0 to 100)
 * @param {Element|Window} [scrollTarget=window]
 * @returns {number}
 */
export function calculateScrollProgress(scrollTarget) {
  let scrollTop = 0;
  let scrollHeight = 0;
  let clientHeight = 0;

  const isWin = (typeof window !== 'undefined' && (scrollTarget === window || !scrollTarget));

  if (isWin) {
    scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
    clientHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  } else if (scrollTarget) {
    scrollTop = scrollTarget.scrollTop || 0;
    scrollHeight = scrollTarget.scrollHeight || 0;
    clientHeight = scrollTarget.clientHeight || 0;
  }

  const scrollableDistance = scrollHeight - clientHeight;
  if (scrollableDistance <= 0) return 100;

  const progress = (scrollTop / scrollableDistance) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

/**
 * Calculates remaining reading time in minutes based on progress
 * @param {number} totalReadingTimeMinutes
 * @param {number} currentProgressPercent
 * @returns {number}
 */
export function calculateRemainingReadingTime(totalReadingTimeMinutes = 1, currentProgressPercent = 0) {
  if (currentProgressPercent >= 95) return 0;
  const remainingFraction = 1 - (currentProgressPercent / 100);
  const remainingMinutes = Math.ceil(totalReadingTimeMinutes * remainingFraction);
  return Math.max(1, remainingMinutes);
}

/**
 * Formats remaining reading time into a friendly string
 * @param {number} minutes
 * @returns {string} e.g. "2 min left" or "Completed"
 */
export function formatRemainingTime(minutes = 0) {
  if (minutes <= 0) return 'Completed';
  return `${minutes} min left`;
}

/**
 * Attaches a reading progress listener to the window
 * @param {Object} options
 * @param {Function} options.onProgressUpdate callback receiving { progress, remainingMinutes, scrollY }
 * @param {number} [options.totalMinutes=1]
 * @param {number} [options.debounceMs=100]
 * @returns {Function} cleanup function to detach listener
 */
export function attachReadingProgressListener({ onProgressUpdate, totalMinutes = 1, debounceMs = 80 }) {
  if (typeof window === 'undefined') return () => {};

  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const progress = calculateScrollProgress(window);
        const remainingMinutes = calculateRemainingReadingTime(totalMinutes, progress);
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

        if (typeof onProgressUpdate === 'function') {
          onProgressUpdate({ progress, remainingMinutes, scrollY });
        }
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });

  // Initial calculation
  handleScroll();

  return () => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleScroll);
  };
}

/**
 * Resumes reading position smoothly if saved scroll position exists
 * @param {number} savedScrollY
 * @param {number} savedProgress
 * @param {Function} [onShowResumeBanner] callback to show "Resumed from X% • Restart" banner
 */
export function resumeReadingPosition(savedScrollY, savedProgress, onShowResumeBanner) {
  if (typeof window === 'undefined') return;
  if (!savedScrollY || savedScrollY < 120 || savedProgress >= 95) return;

  // Delay slightly to ensure layout and images have calculated dimensions
  setTimeout(() => {
    window.scrollTo({
      top: savedScrollY,
      behavior: 'smooth'
    });

    if (typeof onShowResumeBanner === 'function') {
      onShowResumeBanner({
        savedProgress,
        restart: () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }, 120);
}
