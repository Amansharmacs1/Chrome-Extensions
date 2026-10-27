/**
 * FocusFlow - Popup UI Controller
 * Manages view tabs, local countdown interpolation, task operations, analytics rendering, and settings sync.
 */

import {
  loadSettings,
  saveSettings,
  loadTimerState,
  loadTasks,
  saveTasks,
  loadHistory,
  resetAllData
} from './modules/storage.js';

import {
  SESSION_MODES,
  SESSION_STATUS,
  formatTime,
  formatModeLabel,
  calculateRemainingSeconds
} from './modules/timer.js';

import {
  createTask,
  toggleTaskCompletion,
  deleteTask,
  filterTasks,
  TASK_FILTERS
} from './modules/tasks.js';

import {
  getDailyStats,
  getLast7DaysStats
} from './modules/analytics.js';

import {
  normalizeDomain,
  isValidDomain
} from './modules/blocker.js';

import {
  playFocusCompleteSound,
  playBreakCompleteSound
} from './modules/sound.js';

// DOM Element References
const elements = {
  // Tabs
  tabs: document.querySelectorAll('.tab-btn'),
  panels: document.querySelectorAll('.tab-panel'),

  // Header
  btnHeaderSound: document.getElementById('btnHeaderSound'),
  soundIconSvg: document.getElementById('soundIconSvg'),
  btnOpenDashboard: document.getElementById('btnOpenDashboard'),

  // Timer Hero
  sessionModeBadge: document.getElementById('sessionModeBadge'),
  sessionCycleBadge: document.getElementById('sessionCycleBadge'),
  timerProgressRing: document.getElementById('timerProgressRing'),
  timerDigits: document.getElementById('timerDigits'),
  timerStatusLabel: document.getElementById('timerStatusLabel'),

  // Active Task Strip
  activeTaskBar: document.getElementById('activeTaskBar'),
  activeTaskTitle: document.getElementById('activeTaskTitle'),
  btnChangeActiveTask: document.getElementById('btnChangeActiveTask'),

  // Timer Controls
  btnMainAction: document.getElementById('btnMainAction'),
  mainActionText: document.getElementById('mainActionText'),
  mainActionIcon: document.getElementById('mainActionIcon'),
  btnResetTimer: document.getElementById('btnResetTimer'),
  btnSkipTimer: document.getElementById('btnSkipTimer'),
  blockerStatusNotice: document.getElementById('blockerStatusNotice'),
  blockerDot: document.getElementById('blockerDot'),
  blockerNoticeText: document.getElementById('blockerNoticeText'),

  // Tasks Tab
  formAddTask: document.getElementById('formAddTask'),
  inputTaskTitle: document.getElementById('inputTaskTitle'),
  selectTaskPriority: document.getElementById('selectTaskPriority'),
  filterChips: document.querySelectorAll('.filter-chip'),
  tasksList: document.getElementById('tasksList'),
  tasksEmptyState: document.getElementById('tasksEmptyState'),

  // Insights Tab
  statFocusMinutes: document.getElementById('statFocusMinutes'),
  statSessionsCount: document.getElementById('statSessionsCount'),
  statTasksCount: document.getElementById('statTasksCount'),
  goalMinutesProgress: document.getElementById('goalMinutesProgress'),
  goalMinutesBar: document.getElementById('goalMinutesBar'),
  goalSessionsProgress: document.getElementById('goalSessionsProgress'),
  goalSessionsBar: document.getElementById('goalSessionsBar'),
  goalTasksProgress: document.getElementById('goalTasksProgress'),
  goalTasksBar: document.getElementById('goalTasksBar'),
  chart7Days: document.getElementById('chart7Days'),

  // Settings Tab
  inputFocusDuration: document.getElementById('inputFocusDuration'),
  inputShortBreak: document.getElementById('inputShortBreak'),
  inputLongBreak: document.getElementById('inputLongBreak'),
  inputSessionsBeforeLong: document.getElementById('inputSessionsBeforeLong'),
  toggleFastTimer: document.getElementById('toggleFastTimer'),
  toggleAutoBreaks: document.getElementById('toggleAutoBreaks'),
  toggleAutoFocus: document.getElementById('toggleAutoFocus'),
  toggleSound: document.getElementById('toggleSound'),
  toggleNotifications: document.getElementById('toggleNotifications'),
  toggleDistractionBlocker: document.getElementById('toggleDistractionBlocker'),
  toggleBlockBreaks: document.getElementById('toggleBlockBreaks'),
  inputBlockDomain: document.getElementById('inputBlockDomain'),
  btnAddDomain: document.getElementById('btnAddDomain'),
  domainTagsList: document.getElementById('domainTagsList'),
  btnOpenResetModal: document.getElementById('btnOpenResetModal'),

  // Modal
  resetModal: document.getElementById('resetModal'),
  btnCancelReset: document.getElementById('btnCancelReset'),
  btnConfirmReset: document.getElementById('btnConfirmReset')
};

// State
let appSettings = null;
let currentTimer = null;
let appTasks = [];
let appHistory = [];
let currentTaskFilter = TASK_FILTERS.ALL;
let timerTicker = null;
const RING_CIRCUMFERENCE = 2 * Math.PI * 90; // 565.487

/**
 * Initialize Popup
 */
async function init() {
  appSettings = await loadSettings();
  currentTimer = await loadTimerState();
  appTasks = await loadTasks();
  appHistory = await loadHistory();

  setupEventListeners();
  renderAll();
  startLocalTicker();

  // Listen for background updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TIMER_UPDATED') {
      currentTimer = message.timer;
      renderTimer();
      renderDistractionNotice();
    } else if (message.type === 'TIMER_COMPLETED') {
      currentTimer = message.timer;
      if (appSettings.soundEnabled) {
        if (message.previousMode === SESSION_MODES.FOCUS) {
          playFocusCompleteSound();
        } else {
          playBreakCompleteSound();
        }
      }
      refreshData();
    }
  });
}

/**
 * Refresh state from storage
 */
async function refreshData() {
  appSettings = await loadSettings();
  currentTimer = await loadTimerState();
  appTasks = await loadTasks();
  appHistory = await loadHistory();
  renderAll();
}

/**
 * Setup UI Event Listeners
 */
function setupEventListeners() {
  // Tab navigation
  elements.tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Open Dashboard
  elements.btnOpenDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  // Sound toggle button in header
  elements.btnHeaderSound.addEventListener('click', async () => {
    appSettings.soundEnabled = !appSettings.soundEnabled;
    await saveSettings(appSettings);
    renderSoundIcons();
  });

  // Timer Main Action (Start / Pause / Resume)
  elements.btnMainAction.addEventListener('click', async () => {
    if (!currentTimer) return;

    if (currentTimer.status === SESSION_STATUS.IDLE) {
      const res = await chrome.runtime.sendMessage({
        type: 'START_TIMER',
        taskId: currentTimer.activeTaskId
      });
      if (res && res.timer) currentTimer = res.timer;
    } else if (currentTimer.status === SESSION_STATUS.RUNNING) {
      const res = await chrome.runtime.sendMessage({ type: 'PAUSE_TIMER' });
      if (res && res.timer) currentTimer = res.timer;
    } else if (currentTimer.status === SESSION_STATUS.PAUSED) {
      const res = await chrome.runtime.sendMessage({ type: 'RESUME_TIMER' });
      if (res && res.timer) currentTimer = res.timer;
    }
    renderTimer();
    renderDistractionNotice();
  });

  // Reset Session
  elements.btnResetTimer.addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ type: 'RESET_TIMER' });
    if (res && res.timer) currentTimer = res.timer;
    renderTimer();
    renderDistractionNotice();
  });

  // Skip Session
  elements.btnSkipTimer.addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ type: 'SKIP_TIMER' });
    if (res && res.timer) currentTimer = res.timer;
    renderTimer();
    renderDistractionNotice();
  });

  // Active Task switch -> switches to tasks tab
  elements.activeTaskBar.addEventListener('click', () => switchTab('tasks'));
  elements.btnChangeActiveTask.addEventListener('click', (e) => {
    e.stopPropagation();
    switchTab('tasks');
  });

  // Add Task
  elements.formAddTask.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = elements.inputTaskTitle.value.trim();
    if (!title) return;

    const newTask = createTask({
      title,
      priority: elements.selectTaskPriority.value
    });

    appTasks.unshift(newTask);
    await saveTasks(appTasks);
    elements.inputTaskTitle.value = '';
    renderTasks();
  });

  // Task Filters
  elements.filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentTaskFilter = chip.getAttribute('data-filter');
      renderTasks();
    });
  });

  // Settings Inputs
  const handleSettingChange = async () => {
    appSettings.focusDurationMinutes = Number(elements.inputFocusDuration.value) || 25;
    appSettings.shortBreakMinutes = Number(elements.inputShortBreak.value) || 5;
    appSettings.longBreakMinutes = Number(elements.inputLongBreak.value) || 15;
    appSettings.sessionsBeforeLongBreak = Number(elements.inputSessionsBeforeLong.value) || 4;
    appSettings.devFastTimer = elements.toggleFastTimer.checked;
    appSettings.autoStartBreaks = elements.toggleAutoBreaks.checked;
    appSettings.autoStartFocus = elements.toggleAutoFocus.checked;
    appSettings.soundEnabled = elements.toggleSound.checked;
    appSettings.notificationsEnabled = elements.toggleNotifications.checked;
    appSettings.distractionBlockingEnabled = elements.toggleDistractionBlocker.checked;
    appSettings.blockDuringBreaks = elements.toggleBlockBreaks.checked;

    await saveSettings(appSettings);
    await chrome.runtime.sendMessage({ type: 'SYNC_SETTINGS' });
    renderSoundIcons();
    renderDistractionNotice();
  };

  [
    elements.inputFocusDuration,
    elements.inputShortBreak,
    elements.inputLongBreak,
    elements.inputSessionsBeforeLong
  ].forEach(input => input.addEventListener('change', handleSettingChange));

  [
    elements.toggleFastTimer,
    elements.toggleAutoBreaks,
    elements.toggleAutoFocus,
    elements.toggleSound,
    elements.toggleNotifications,
    elements.toggleDistractionBlocker,
    elements.toggleBlockBreaks
  ].forEach(toggle => toggle.addEventListener('change', handleSettingChange));

  // Add Blocked Domain
  const handleAddDomain = async () => {
    const raw = elements.inputBlockDomain.value;
    const normalized = normalizeDomain(raw);
    if (!isValidDomain(normalized)) {
      alert('Please enter a valid website domain (e.g. youtube.com)');
      return;
    }
    if (!appSettings.blockedDomains.includes(normalized)) {
      appSettings.blockedDomains.push(normalized);
      await saveSettings(appSettings);
      await chrome.runtime.sendMessage({ type: 'SYNC_SETTINGS' });
      elements.inputBlockDomain.value = '';
      renderBlockedDomains();
    }
  };

  elements.btnAddDomain.addEventListener('click', handleAddDomain);
  elements.inputBlockDomain.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDomain();
    }
  });

  // Reset Modal
  elements.btnOpenResetModal.addEventListener('click', () => {
    elements.resetModal.classList.add('active');
  });

  elements.btnCancelReset.addEventListener('click', () => {
    elements.resetModal.classList.remove('active');
  });

  elements.btnConfirmReset.addEventListener('click', async () => {
    await resetAllData();
    elements.resetModal.classList.remove('active');
    await refreshData();
  });
}

/**
 * Switch view tabs
 * @param {string} tabKey
 */
function switchTab(tabKey) {
  elements.tabs.forEach(t => {
    const isTarget = t.getAttribute('data-tab') === tabKey;
    t.classList.toggle('active', isTarget);
    t.setAttribute('aria-selected', isTarget);
  });

  elements.panels.forEach(p => {
    const isTarget = p.id === `panel${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}`;
    p.classList.toggle('active', isTarget);
  });

  if (tabKey === 'insights') {
    renderInsights();
  }
}

/**
 * Smooth local countdown ticker
 */
function startLocalTicker() {
  if (timerTicker) clearInterval(timerTicker);

  timerTicker = setInterval(() => {
    if (currentTimer && currentTimer.status === SESSION_STATUS.RUNNING) {
      renderTimerDigitsOnly();
    }
  }, 500);
}

/**
 * Render all views
 */
function renderAll() {
  renderSoundIcons();
  renderTimer();
  renderTasks();
  renderInsights();
  renderSettings();
  renderDistractionNotice();
}

/**
 * Render sound icons state
 */
function renderSoundIcons() {
  const isSoundOn = Boolean(appSettings && appSettings.soundEnabled);
  elements.toggleSound.checked = isSoundOn;

  if (isSoundOn) {
    elements.soundIconSvg.innerHTML = `
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    `;
    elements.btnHeaderSound.setAttribute('title', 'Sound Enabled');
  } else {
    elements.soundIconSvg.innerHTML = `
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    `;
    elements.btnHeaderSound.setAttribute('title', 'Sound Muted');
  }
}

/**
 * Render main timer dial and status
 */
function renderTimer() {
  if (!currentTimer) return;

  // Badges
  elements.sessionModeBadge.textContent = formatModeLabel(currentTimer.mode);
  elements.sessionModeBadge.className = `mode-badge ${currentTimer.mode}`;

  const maxCycles = appSettings ? appSettings.sessionsBeforeLongBreak : 4;
  elements.sessionCycleBadge.textContent = `Cycle ${currentTimer.currentCycle || 1} of ${maxCycles}`;

  // Main Action Button State
  if (currentTimer.status === SESSION_STATUS.RUNNING) {
    elements.mainActionText.textContent = 'Pause';
    elements.mainActionIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    elements.timerStatusLabel.textContent = 'In Flow';
  } else if (currentTimer.status === SESSION_STATUS.PAUSED) {
    elements.mainActionText.textContent = 'Resume';
    elements.mainActionIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    elements.timerStatusLabel.textContent = 'Paused';
  } else {
    elements.mainActionText.textContent = 'Start';
    elements.mainActionIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    elements.timerStatusLabel.textContent = 'Ready to Flow';
  }

  // Active Task
  renderActiveTaskLabel();

  // Digits and Ring
  renderTimerDigitsOnly();
}

/**
 * Fast sub-second renderer for numbers and SVG progress
 */
function renderTimerDigitsOnly() {
  if (!currentTimer) return;

  const remaining = calculateRemainingSeconds(currentTimer, Date.now());
  const total = currentTimer.totalSeconds || (25 * 60);

  elements.timerDigits.textContent = formatTime(remaining);

  // Circular progress: offset 0 means full circle, CIRCUMFERENCE means empty
  const progressRatio = Math.max(0, Math.min(1, remaining / total));
  const offset = RING_CIRCUMFERENCE * (1 - progressRatio);
  elements.timerProgressRing.style.strokeDashoffset = offset;
}

/**
 * Render selected task label
 */
function renderActiveTaskLabel() {
  if (currentTimer && currentTimer.activeTaskId) {
    const task = appTasks.find(t => t.id === currentTimer.activeTaskId);
    if (task) {
      elements.activeTaskTitle.textContent = task.title;
      elements.activeTaskTitle.classList.remove('active-task-placeholder');
      elements.btnChangeActiveTask.textContent = 'Change';
      return;
    }
  }
  elements.activeTaskTitle.textContent = 'No task selected (optional)';
  elements.activeTaskTitle.classList.add('active-task-placeholder');
  elements.btnChangeActiveTask.textContent = 'Select';
}

/**
 * Distraction blocker status indicator
 */
function renderDistractionNotice() {
  if (!appSettings) return;

  const isConfigured = Boolean(appSettings.distractionBlockingEnabled);
  const isCurrentlyActive = isConfigured &&
    currentTimer &&
    currentTimer.status === SESSION_STATUS.RUNNING &&
    (currentTimer.mode === SESSION_MODES.FOCUS || appSettings.blockDuringBreaks);

  if (isCurrentlyActive) {
    elements.blockerDot.classList.add('active');
    elements.blockerNoticeText.textContent = `Distraction Blocker: Active (${appSettings.blockedDomains.length} sites)`;
  } else if (isConfigured) {
    elements.blockerDot.classList.remove('active');
    elements.blockerNoticeText.textContent = 'Distraction Blocker: Armed for focus';
  } else {
    elements.blockerDot.classList.remove('active');
    elements.blockerNoticeText.textContent = 'Distraction Blocker: Disabled';
  }
}

/**
 * Render Tasks Tab
 */
function renderTasks() {
  const filtered = filterTasks(appTasks, currentTaskFilter);

  elements.tasksList.innerHTML = '';
  if (filtered.length === 0) {
    elements.tasksEmptyState.style.display = 'block';
  } else {
    elements.tasksEmptyState.style.display = 'none';

    filtered.forEach(task => {
      const card = document.createElement('div');
      card.className = `task-card ${task.completed ? 'completed' : ''} ${currentTimer && currentTimer.activeTaskId === task.id ? 'active-task' : ''}`;

      // Checkbox
      const checkWrap = document.createElement('div');
      checkWrap.className = 'task-checkbox-wrapper';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', async (e) => {
        e.stopPropagation();
        appTasks = toggleTaskCompletion(appTasks, task.id);
        await saveTasks(appTasks);
        renderTasks();
        renderInsights();
      });
      checkWrap.appendChild(checkbox);

      // Content
      const content = document.createElement('div');
      content.className = 'task-content';
      content.style.cursor = 'pointer';
      content.addEventListener('click', async () => {
        // Toggle active task on timer
        const newActiveId = currentTimer.activeTaskId === task.id ? null : task.id;
        await chrome.runtime.sendMessage({ type: 'SELECT_TASK', taskId: newActiveId });
        currentTimer.activeTaskId = newActiveId;
        renderTimer();
        renderTasks();
      });

      const title = document.createElement('div');
      title.className = 'task-text';
      title.textContent = task.title;

      const meta = document.createElement('div');
      meta.className = 'task-meta';

      const prio = document.createElement('span');
      prio.className = `priority-tag ${task.priority}`;
      prio.textContent = task.priority;

      const pomo = document.createElement('span');
      pomo.className = 'task-pomo-count';
      pomo.textContent = `🍅 ${task.completedSessions || 0}/${task.estimatedSessions || 1}`;

      meta.appendChild(prio);
      meta.appendChild(pomo);
      content.appendChild(title);
      content.appendChild(meta);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'task-actions';

      const btnDelete = document.createElement('button');
      btnDelete.className = 'task-btn delete';
      btnDelete.title = 'Delete Task';
      btnDelete.innerHTML = `
        <svg class="icon-svg" viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      `;
      btnDelete.addEventListener('click', async (e) => {
        e.stopPropagation();
        appTasks = deleteTask(appTasks, task.id);
        if (currentTimer.activeTaskId === task.id) {
          currentTimer.activeTaskId = null;
          await chrome.runtime.sendMessage({ type: 'SELECT_TASK', taskId: null });
          renderTimer();
        }
        await saveTasks(appTasks);
        renderTasks();
      });

      actions.appendChild(btnDelete);

      card.appendChild(checkWrap);
      card.appendChild(content);
      card.appendChild(actions);

      elements.tasksList.appendChild(card);
    });
  }
}

/**
 * Render Insights Tab
 */
function renderInsights() {
  if (!appSettings) return;

  const daily = getDailyStats(appHistory, appTasks, appSettings);

  elements.statFocusMinutes.textContent = daily.focusMinutesToday;
  elements.statSessionsCount.textContent = daily.focusSessionsToday;
  elements.statTasksCount.textContent = daily.tasksCompletedToday;

  elements.goalMinutesProgress.textContent = `${daily.focusMinutesToday} / ${daily.goalMinutes}m`;
  elements.goalMinutesBar.style.width = `${daily.minutesPercent}%`;

  elements.goalSessionsProgress.textContent = `${daily.focusSessionsToday} / ${daily.goalSessions}`;
  elements.goalSessionsBar.style.width = `${daily.sessionsPercent}%`;

  elements.goalTasksProgress.textContent = `${daily.tasksCompletedToday} / ${daily.goalTasks}`;
  elements.goalTasksBar.style.width = `${daily.tasksPercent}%`;

  // 7-day Bar Chart
  const sevenDays = getLast7DaysStats(appHistory);
  const maxMins = Math.max(60, ...sevenDays.map(d => d.focusMinutes));

  elements.chart7Days.innerHTML = '';
  sevenDays.forEach(day => {
    const col = document.createElement('div');
    col.className = `bar-col ${day.isToday ? 'today' : ''} ${day.focusMinutes > 0 ? 'active-bar' : ''}`;
    col.title = `${day.dayLabel} (${day.dateLabel}): ${day.focusMinutes} focus minutes, ${day.sessionsCount} sessions`;

    const heightPct = Math.max(4, Math.round((day.focusMinutes / maxMins) * 100));

    const rect = document.createElement('div');
    rect.className = 'bar-rect';
    rect.style.height = `${heightPct}%`;

    const label = document.createElement('span');
    label.className = 'bar-label';
    label.textContent = day.dayLabel;

    col.appendChild(rect);
    col.appendChild(label);
    elements.chart7Days.appendChild(col);
  });
}

/**
 * Render Settings Tab
 */
function renderSettings() {
  if (!appSettings) return;

  elements.inputFocusDuration.value = appSettings.focusDurationMinutes;
  elements.inputShortBreak.value = appSettings.shortBreakMinutes;
  elements.inputLongBreak.value = appSettings.longBreakMinutes;
  elements.inputSessionsBeforeLong.value = appSettings.sessionsBeforeLongBreak;
  elements.toggleFastTimer.checked = Boolean(appSettings.devFastTimer);

  elements.toggleAutoBreaks.checked = Boolean(appSettings.autoStartBreaks);
  elements.toggleAutoFocus.checked = Boolean(appSettings.autoStartFocus);
  elements.toggleSound.checked = Boolean(appSettings.soundEnabled);
  elements.toggleNotifications.checked = Boolean(appSettings.notificationsEnabled);
  elements.toggleDistractionBlocker.checked = Boolean(appSettings.distractionBlockingEnabled);
  elements.toggleBlockBreaks.checked = Boolean(appSettings.blockDuringBreaks);

  renderBlockedDomains();
}

/**
 * Render Blocked Domains Tag Pills
 */
function renderBlockedDomains() {
  if (!appSettings || !appSettings.blockedDomains) return;

  elements.domainTagsList.innerHTML = '';
  appSettings.blockedDomains.forEach(domain => {
    const tag = document.createElement('span');
    tag.className = 'domain-tag';
    tag.textContent = domain;

    const btnRemove = document.createElement('button');
    btnRemove.className = 'domain-remove-btn';
    btnRemove.innerHTML = '&times;';
    btnRemove.title = `Remove ${domain}`;
    btnRemove.addEventListener('click', async () => {
      appSettings.blockedDomains = appSettings.blockedDomains.filter(d => d !== domain);
      await saveSettings(appSettings);
      await chrome.runtime.sendMessage({ type: 'SYNC_SETTINGS' });
      renderBlockedDomains();
      renderDistractionNotice();
    });

    tag.appendChild(btnRemove);
    elements.domainTagsList.appendChild(tag);
  });
}

// Start
document.addEventListener('DOMContentLoaded', init);
