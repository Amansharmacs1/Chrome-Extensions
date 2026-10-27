/**
 * FocusFlow - Notifications Module
 * Dispatches distinct, deduplicated Chrome notifications for session transitions and goals.
 */

export const NOTIFICATION_IDS = {
  SESSION_COMPLETE: 'focusflow_notification_session',
  GOAL_MET: 'focusflow_notification_goal'
};

/**
 * Dispatch notification when a session finishes
 * @param {Object} options
 * @param {string} options.mode - The completed mode ('focus'|'shortBreak'|'longBreak')
 * @param {string} options.nextMode - The upcoming mode
 * @param {string} [options.taskTitle] - Associated task title if any
 * @returns {Promise<boolean>}
 */
export async function notifySessionComplete({ mode, nextMode, taskTitle = '' }) {
  if (typeof chrome === 'undefined' || !chrome.notifications || !chrome.notifications.create) {
    return false;
  }

  let title = 'Session Completed!';
  let message = 'Great job staying in flow!';

  if (mode === 'focus') {
    title = taskTitle ? `Task Completed: ${taskTitle}` : 'Focus Session Finished!';
    message = nextMode === 'longBreak'
      ? 'Outstanding focus! Take a well-earned 15-minute long break.'
      : 'Time to step away and relax for 5 minutes.';
  } else {
    title = 'Break Finished!';
    message = 'Ready to dive back into your flow? Start your next focus session.';
  }

  return new Promise((resolve) => {
    chrome.notifications.create(
      NOTIFICATION_IDS.SESSION_COMPLETE,
      {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title,
        message,
        priority: 2,
        requireInteraction: false
      },
      (notificationId) => {
        resolve(Boolean(notificationId));
      }
    );
  });
}

/**
 * Dispatch notification when daily goal is reached
 * @param {string} goalType - 'minutes' | 'sessions' | 'tasks'
 * @param {number} value
 * @returns {Promise<boolean>}
 */
export async function notifyGoalReached(goalType, value) {
  if (typeof chrome === 'undefined' || !chrome.notifications || !chrome.notifications.create) {
    return false;
  }

  let title = 'Daily Goal Achieved! 🎯';
  let message = `You reached your daily goal of ${value} ${goalType}!`;

  return new Promise((resolve) => {
    chrome.notifications.create(
      NOTIFICATION_IDS.GOAL_MET,
      {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title,
        message,
        priority: 1
      },
      (notificationId) => {
        resolve(Boolean(notificationId));
      }
    );
  });
}
