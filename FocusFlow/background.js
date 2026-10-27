/**
 * FocusFlow - Background Service Worker (Manifest V3)
 * Orchestrates alarms, timer reconciliation, notification dispatch, and declarativeNetRequest rules.
 */

import {
  STORAGE_KEYS,
  loadSettings,
  loadTimerState,
  saveTimerState,
  appendHistory,
  loadTasks,
  saveTasks
} from './modules/storage.js';

import {
  SESSION_MODES,
  SESSION_STATUS,
  calculateRemainingSeconds,
  startSession,
  pauseSession,
  resumeSession,
  resetSession,
  skipSession,
  completeSession
} from './modules/timer.js';

import { incrementTaskSession } from './modules/tasks.js';
import { syncBlockingRules } from './modules/blocker.js';
import { notifySessionComplete, notifyGoalReached } from './modules/notifications.js';
import { getDailyStats } from './modules/analytics.js';

const ALARM_NAME = 'focusflow_session_timer';

/**
 * Determine whether distraction blocking should currently be active
 * @param {Object} timer
 * @param {Object} settings
 * @returns {boolean}
 */
function shouldBlockDistractions(timer, settings) {
  if (!settings.distractionBlockingEnabled) return false;
  if (timer.status !== SESSION_STATUS.RUNNING) return false;

  if (timer.mode === SESSION_MODES.FOCUS) {
    return true;
  }
  return Boolean(settings.blockDuringBreaks);
}

/**
 * Update declarativeNetRequest dynamic blocking rules based on current state
 * @param {Object} timer
 * @param {Object} settings
 */
async function reconcileBlockingRules(timer, settings) {
  const shouldBlock = shouldBlockDistractions(timer, settings);
  await syncBlockingRules({
    shouldBlock,
    domains: settings.blockedDomains || []
  });
}

/**
 * Schedule or clear Chrome alarm based on timer state
 * @param {Object} timer
 */
async function scheduleAlarm(timer) {
  await chrome.alarms.clear(ALARM_NAME);
  if (timer.status === SESSION_STATUS.RUNNING && timer.targetEndTimestamp) {
    chrome.alarms.create(ALARM_NAME, {
      when: timer.targetEndTimestamp
    });
  }
}

/**
 * Handle session completion logic, persistence, notifications, and transitions
 * @param {Object} currentTimer
 * @param {Object} settings
 * @param {number} now
 * @returns {Promise<Object>} new timer state
 */
async function processSessionCompletion(currentTimer, settings, now = Date.now()) {
  const { nextState, completedRecord } = completeSession(currentTimer, settings, now);

  let taskTitle = '';
  if (completedRecord) {
    await appendHistory(completedRecord);

    if (completedRecord.taskId) {
      const tasks = await loadTasks();
      const matched = tasks.find(t => t.id === completedRecord.taskId);
      if (matched) taskTitle = matched.title;
      const updatedTasks = incrementTaskSession(tasks, completedRecord.taskId);
      await saveTasks(updatedTasks);
    }
  }

  // Save next state to local storage
  await saveTimerState(nextState);

  // Dispatch completion notification if enabled
  if (settings.notificationsEnabled) {
    await notifySessionComplete({
      mode: currentTimer.mode,
      nextMode: nextState.mode,
      taskTitle
    });

    // Check if daily goals were met
    try {
      const history = await chrome.storage.local.get([STORAGE_KEYS.HISTORY]).then(r => r[STORAGE_KEYS.HISTORY] || []);
      const tasks = await loadTasks();
      const dailyStats = getDailyStats(history, tasks, settings, now);

      if (dailyStats.focusSessionsToday === settings.dailyGoalSessions) {
        await notifyGoalReached('sessions', settings.dailyGoalSessions);
      }
    } catch (e) {
      console.warn('[FocusFlow Background] Daily goal check warning:', e);
    }
  }

  // Schedule next alarm if auto-started
  await scheduleAlarm(nextState);

  // Reconcile dynamic blocking rules
  await reconcileBlockingRules(nextState, settings);

  // Broadcast to open UI pages
  broadcastMessage({
    type: 'TIMER_COMPLETED',
    timer: nextState,
    previousMode: currentTimer.mode,
    completedRecord
  });

  return nextState;
}

/**
 * Broadcast an event to any active popup or dashboard windows
 * @param {Object} payload
 */
function broadcastMessage(payload) {
  chrome.runtime.sendMessage(payload).catch(() => {
    // Expected when no popup or dashboard is currently open
  });
}

/**
 * Reconcile timer on service worker wake-up or browser restart
 */
async function reconcileTimerOnWakeup() {
  const settings = await loadSettings();
  const timer = await loadTimerState();

  if (timer.status === SESSION_STATUS.RUNNING) {
    const remaining = calculateRemainingSeconds(timer, Date.now());
    if (remaining <= 0) {
      console.log('[FocusFlow Service Worker] Active session completed while sleeping. Reconciling...');
      await processSessionCompletion(timer, settings, Date.now());
      return;
    } else {
      // Re-arm alarm if needed
      await scheduleAlarm(timer);
    }
  }

  await reconcileBlockingRules(timer, settings);
}

// Alarm listener
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const timer = await loadTimerState();
  const settings = await loadSettings();

  if (timer.status === SESSION_STATUS.RUNNING) {
    await processSessionCompletion(timer, settings, Date.now());
  }
});

// Runtime message listener for UI commands
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  (async () => {
    try {
      const settings = await loadSettings();
      let timer = await loadTimerState();

      switch (message.type) {
        case 'START_TIMER': {
          timer = startSession(timer, settings, Date.now());
          if (message.taskId !== undefined) {
            timer.activeTaskId = message.taskId;
          }
          await saveTimerState(timer);
          await scheduleAlarm(timer);
          await reconcileBlockingRules(timer, settings);
          broadcastMessage({ type: 'TIMER_UPDATED', timer });
          sendResponse({ success: true, timer });
          break;
        }

        case 'PAUSE_TIMER': {
          timer = pauseSession(timer, Date.now());
          await saveTimerState(timer);
          await scheduleAlarm(timer);
          await reconcileBlockingRules(timer, settings);
          broadcastMessage({ type: 'TIMER_UPDATED', timer });
          sendResponse({ success: true, timer });
          break;
        }

        case 'RESUME_TIMER': {
          timer = resumeSession(timer, Date.now());
          await saveTimerState(timer);
          await scheduleAlarm(timer);
          await reconcileBlockingRules(timer, settings);
          broadcastMessage({ type: 'TIMER_UPDATED', timer });
          sendResponse({ success: true, timer });
          break;
        }

        case 'RESET_TIMER': {
          timer = resetSession(timer, settings);
          await saveTimerState(timer);
          await scheduleAlarm(timer);
          await reconcileBlockingRules(timer, settings);
          broadcastMessage({ type: 'TIMER_UPDATED', timer });
          sendResponse({ success: true, timer });
          break;
        }

        case 'SKIP_TIMER': {
          timer = skipSession(timer, settings);
          await saveTimerState(timer);
          await scheduleAlarm(timer);
          await reconcileBlockingRules(timer, settings);
          broadcastMessage({ type: 'TIMER_UPDATED', timer });
          sendResponse({ success: true, timer });
          break;
        }

        case 'SELECT_TASK': {
          timer.activeTaskId = message.taskId || null;
          await saveTimerState(timer);
          broadcastMessage({ type: 'TIMER_UPDATED', timer });
          sendResponse({ success: true, timer });
          break;
        }

        case 'SYNC_SETTINGS': {
          await reconcileBlockingRules(timer, settings);
          sendResponse({ success: true });
          break;
        }

        case 'GET_STATUS': {
          sendResponse({ success: true, timer, settings });
          break;
        }

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (err) {
      console.error('[FocusFlow Service Worker] Message handling error:', err);
      sendResponse({ error: err.message });
    }
  })();

  return true; // Keep message channel open for async response
});

// Extension lifecycle hooks
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[FocusFlow] Extension installed / updated:', details.reason);
  await reconcileTimerOnWakeup();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[FocusFlow] Browser started. Reconciling...');
  await reconcileTimerOnWakeup();
});

// Top-level initialization on service worker spin-up
reconcileTimerOnWakeup();
