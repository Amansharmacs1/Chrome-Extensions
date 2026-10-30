/**
 * FocusFlow - Dashboard Controller
 * Full-page command center for timer execution, task tracking, analytics, and blocker controls.
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
  getLast7DaysStats,
  getAllTimeStats,
  getTodaySessionTimeline
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
const dom = {
  // Header
  dashLiveBadge: document.getElementById('dashLiveBadge'),
  dashLiveDot: document.getElementById('dashLiveDot'),
  dashLiveStatusText: document.getElementById('dashLiveStatusText'),
  btnDashSound: document.getElementById('btnDashSound'),
  dashSoundSvg: document.getElementById('dashSoundSvg'),
  dashSoundLabel: document.getElementById('dashSoundLabel'),

  // Timer Hero
  dashModeBadge: document.getElementById('dashModeBadge'),
  dashCycleText: document.getElementById('dashCycleText'),
  dashProgressRing: document.getElementById('dashProgressRing'),
  dashDigits: document.getElementById('dashDigits'),
  dashStateLabel: document.getElementById('dashStateLabel'),
  dashActiveTaskTitle: document.getElementById('dashActiveTaskTitle'),
  btnDashChangeTask: document.getElementById('btnDashChangeTask'),
  dashActiveTaskBar: document.getElementById('dashActiveTaskBar'),

  // Controls
  btnDashMainAction: document.getElementById('btnDashMainAction'),
  dashMainText: document.getElementById('dashMainText'),
  dashMainIcon: document.getElementById('dashMainIcon'),
  btnDashReset: document.getElementById('btnDashReset'),
  btnDashSkip: document.getElementById('btnDashSkip'),

  // Blocker Hero Widget
  dashBlockerBadge: document.getElementById('dashBlockerBadge'),
  dashBlockerNotice: document.getElementById('dashBlockerNotice'),
  btnGoToBlocker: document.getElementById('btnGoToBlocker'),

  // Overview Metrics
  metricTodayMins: document.getElementById('metricTodayMins'),
  metricGoalMinsSub: document.getElementById('metricGoalMinsSub'),
  metricTodaySessions: document.getElementById('metricTodaySessions'),
  metricGoalSessionsSub: document.getElementById('metricGoalSessionsSub'),
  metricTodayTasks: document.getElementById('metricTodayTasks'),
  metricGoalTasksSub: document.getElementById('metricGoalTasksSub'),
  metricWeeklyMins: document.getElementById('metricWeeklyMins'),

  // Dashboard Tabs
  tabButtons: document.querySelectorAll('.dash-tab-button'),
  panels: document.querySelectorAll('.dash-panel'),

  // Analytics Panel
  dash7DayBarChart: document.getElementById('dash7DayBarChart'),
  statAllTimeMins: document.getElementById('statAllTimeMins'),
  statAvgDuration: document.getElementById('statAvgDuration'),
  statBestDay: document.getElementById('statBestDay'),
  timelineTableBody: document.getElementById('timelineTableBody'),
  timelineEmptyNotice: document.getElementById('timelineEmptyNotice'),

  // Tasks Panel
  dashFormAddTask: document.getElementById('dashFormAddTask'),
  dashInputTaskTitle: document.getElementById('dashInputTaskTitle'),
  dashInputTaskNotes: document.getElementById('dashInputTaskNotes'),
  dashSelectPriority: document.getElementById('dashSelectPriority'),
  dashInputEstimates: document.getElementById('dashInputEstimates'),
  dashFilterAll: document.getElementById('dashFilterAll'),
  dashFilterPending: document.getElementById('dashFilterPending'),
  dashFilterCompleted: document.getElementById('dashFilterCompleted'),
  dashFullTaskList: document.getElementById('dashFullTaskList'),

  // Blocker Panel
  dashToggleBlocker: document.getElementById('dashToggleBlocker'),
  dashToggleBlockBreaks: document.getElementById('dashToggleBlockBreaks'),
  dashInputDomain: document.getElementById('dashInputDomain'),
  dashBtnAddDomain: document.getElementById('dashBtnAddDomain'),
  dashBlocklistTags: document.getElementById('dashBlocklistTags'),

  // Settings Panel
  dashInputFocusDuration: document.getElementById('dashInputFocusDuration'),
  dashInputShortBreak: document.getElementById('dashInputShortBreak'),
  dashInputLongBreak: document.getElementById('dashInputLongBreak'),
  dashInputSessionsBeforeLong: document.getElementById('dashInputSessionsBeforeLong'),
  dashInputGoalMins: document.getElementById('dashInputGoalMins'),
  dashInputGoalSessions: document.getElementById('dashInputGoalSessions'),
  dashInputGoalTasks: document.getElementById('dashInputGoalTasks'),
  dashToggleFastTimer: document.getElementById('dashToggleFastTimer'),
  dashToggleAutoBreaks: document.getElementById('dashToggleAutoBreaks'),
  dashToggleAutoFocus: document.getElementById('dashToggleAutoFocus'),
  dashToggleNotifications: document.getElementById('dashToggleNotifications'),
  btnDashResetAll: document.getElementById('btnDashResetAll')
};

// State
let settings = null;
let timer = null;
let tasks = [];
let history = [];
let taskFilter = TASK_FILTERS.ALL;
let localInterval = null;
const CIRCUMFERENCE = 2 * Math.PI * 115; // 722.566

/**
 * Initialize Dashboard
 */
async function init() {
  settings = await loadSettings();
  timer = await loadTimerState();
  tasks = await loadTasks();
  history = await loadHistory();

  setupEventListeners();
  renderAll();
  startLocalTicker();

  // Listen for background state broadcasts
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TIMER_UPDATED') {
      timer = message.timer;
      renderTimer();
      renderLiveBadge();
      renderBlockerWidgets();
    } else if (message.type === 'TIMER_COMPLETED') {
      timer = message.timer;
      if (settings.soundEnabled) {
        if (message.previousMode === SESSION_MODES.FOCUS) {
          playFocusCompleteSound();
        } else {
          playBreakCompleteSound();
        }
      }
      refreshState();
    }
  });
}

/**
 * Refresh state from storage
 */
async function refreshState() {
  settings = await loadSettings();
  timer = await loadTimerState();
  tasks = await loadTasks();
  history = await loadHistory();
  renderAll();
}

/**
 * Wire Event Listeners
 */
function setupEventListeners() {
  // Tab switching
  dom.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      switchDashboardTab(target);
    });
  });

  // Sound toggle button in header
  dom.btnDashSound.addEventListener('click', async () => {
    settings.soundEnabled = !settings.soundEnabled;
    await saveSettings(settings);
    renderSound();
  });

  // Main Action button
  dom.btnDashMainAction.addEventListener('click', async () => {
    if (!timer) return;

    if (timer.status === SESSION_STATUS.IDLE) {
      const res = await chrome.runtime.sendMessage({
        type: 'START_TIMER',
        taskId: timer.activeTaskId
      });
      if (res && res.timer) timer = res.timer;
    } else if (timer.status === SESSION_STATUS.RUNNING) {
      const res = await chrome.runtime.sendMessage({ type: 'PAUSE_TIMER' });
      if (res && res.timer) timer = res.timer;
    } else if (timer.status === SESSION_STATUS.PAUSED) {
      const res = await chrome.runtime.sendMessage({ type: 'RESUME_TIMER' });
      if (res && res.timer) timer = res.timer;
    }
    renderTimer();
    renderLiveBadge();
    renderBlockerWidgets();
  });

  // Reset Session
  dom.btnDashReset.addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ type: 'RESET_TIMER' });
    if (res && res.timer) timer = res.timer;
    renderTimer();
    renderLiveBadge();
    renderBlockerWidgets();
  });

  // Skip Session
  dom.btnDashSkip.addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ type: 'SKIP_TIMER' });
    if (res && res.timer) timer = res.timer;
    renderTimer();
    renderLiveBadge();
    renderBlockerWidgets();
  });

  // Jump to tasks
  dom.btnDashChangeTask.addEventListener('click', () => switchDashboardTab('tasks'));
  dom.btnGoToBlocker.addEventListener('click', () => switchDashboardTab('blocker'));

  // Task Filters
  dom.dashFilterAll.addEventListener('click', () => setTaskFilter(TASK_FILTERS.ALL));
  dom.dashFilterPending.addEventListener('click', () => setTaskFilter(TASK_FILTERS.PENDING));
  dom.dashFilterCompleted.addEventListener('click', () => setTaskFilter(TASK_FILTERS.COMPLETED));

  // Add Task
  dom.dashFormAddTask.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = dom.dashInputTaskTitle.value.trim();
    if (!title) return;

    const newTask = createTask({
      title,
      notes: dom.dashInputTaskNotes.value.trim(),
      priority: dom.dashSelectPriority.value,
      estimatedSessions: Number(dom.dashInputEstimates.value) || 1
    });

    tasks.unshift(newTask);
    await saveTasks(tasks);
    dom.dashInputTaskTitle.value = '';
    dom.dashInputTaskNotes.value = '';
    renderTasks();
  });

  // Blocker add domain
  const addDomain = async () => {
    const raw = dom.dashInputDomain.value;
    const normalized = normalizeDomain(raw);
    if (!isValidDomain(normalized)) {
      alert('Please enter a valid website domain (e.g. reddit.com or youtube.com)');
      return;
    }
    if (!settings.blockedDomains.includes(normalized)) {
      settings.blockedDomains.push(normalized);
      await saveSettings(settings);
      await chrome.runtime.sendMessage({ type: 'SYNC_SETTINGS' });
      dom.dashInputDomain.value = '';
      renderBlockerWidgets();
    }
  };

  dom.dashBtnAddDomain.addEventListener('click', addDomain);
  dom.dashInputDomain.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDomain();
    }
  });

  // Blocker Toggles
  dom.dashToggleBlocker.addEventListener('change', async () => {
    settings.distractionBlockingEnabled = dom.dashToggleBlocker.checked;
    await saveSettings(settings);
    await chrome.runtime.sendMessage({ type: 'SYNC_SETTINGS' });
    renderBlockerWidgets();
  });

  dom.dashToggleBlockBreaks.addEventListener('change', async () => {
    settings.blockDuringBreaks = dom.dashToggleBlockBreaks.checked;
    await saveSettings(settings);
    await chrome.runtime.sendMessage({ type: 'SYNC_SETTINGS' });
    renderBlockerWidgets();
  });

  // Preferences Inputs
  const handleSettingsUpdate = async () => {
    settings.focusDurationMinutes = Number(dom.dashInputFocusDuration.value) || 25;
    settings.shortBreakMinutes = Number(dom.dashInputShortBreak.value) || 5;
    settings.longBreakMinutes = Number(dom.dashInputLongBreak.value) || 15;
    settings.sessionsBeforeLongBreak = Number(dom.dashInputSessionsBeforeLong.value) || 4;
    settings.dailyGoalMinutes = Number(dom.dashInputGoalMins.value) || 120;
    settings.dailyGoalSessions = Number(dom.dashInputGoalSessions.value) || 4;
    settings.dailyGoalTasks = Number(dom.dashInputGoalTasks.value) || 3;

    settings.devFastTimer = dom.dashToggleFastTimer.checked;
    settings.autoStartBreaks = dom.dashToggleAutoBreaks.checked;
    settings.autoStartFocus = dom.dashToggleAutoFocus.checked;
    settings.notificationsEnabled = dom.dashToggleNotifications.checked;

    await saveSettings(settings);
    await chrome.runtime.sendMessage({ type: 'SYNC_SETTINGS' });
    renderMetrics();
  };

  [
    dom.dashInputFocusDuration,
    dom.dashInputShortBreak,
    dom.dashInputLongBreak,
    dom.dashInputSessionsBeforeLong,
    dom.dashInputGoalMins,
    dom.dashInputGoalSessions,
    dom.dashInputGoalTasks
  ].forEach(inp => inp.addEventListener('change', handleSettingsUpdate));

  [
    dom.dashToggleFastTimer,
    dom.dashToggleAutoBreaks,
    dom.dashToggleAutoFocus,
    dom.dashToggleNotifications
  ].forEach(t => t.addEventListener('change', handleSettingsUpdate));

  // Reset All Data
  dom.btnDashResetAll.addEventListener('click', async () => {
    if (confirm('Are you sure you want to completely reset all FocusFlow tasks, history, and preferences?')) {
      await resetAllData();
      await refreshState();
    }
  });
}

/**
 * Switch dashboard tab
 * @param {string} tabKey
 */
function switchDashboardTab(tabKey) {
  dom.tabButtons.forEach(btn => {
    const isTarget = btn.getAttribute('data-tab') === tabKey;
    btn.classList.toggle('active', isTarget);
  });

  dom.panels.forEach(p => {
    const isTarget = p.id === `dashPanel${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}`;
    p.classList.toggle('active', isTarget);
  });

  if (tabKey === 'analytics') {
    renderAnalytics();
  }
}

/**
 * Set and highlight task filter
 * @param {string} filter
 */
function setTaskFilter(filter) {
  taskFilter = filter;
  [dom.dashFilterAll, dom.dashFilterPending, dom.dashFilterCompleted].forEach(b => b.classList.remove('active'));
  if (filter === TASK_FILTERS.ALL) dom.dashFilterAll.classList.add('active');
  if (filter === TASK_FILTERS.PENDING) dom.dashFilterPending.classList.add('active');
  if (filter === TASK_FILTERS.COMPLETED) dom.dashFilterCompleted.classList.add('active');
  renderTasks();
}

/**
 * Start smooth local ticker for dashboard
 */
function startLocalTicker() {
  if (localInterval) clearInterval(localInterval);
  localInterval = setInterval(() => {
    if (timer && timer.status === SESSION_STATUS.RUNNING) {
      renderDigitsOnly();
    }
  }, 500);
}

/**
 * Render All Views
 */
function renderAll() {
  renderSound();
  renderLiveBadge();
  renderTimer();
  renderMetrics();
  renderAnalytics();
  renderTasks();
  renderBlockerWidgets();
  renderSettingsInputs();
}

/**
 * Render Sound Header State
 */
function renderSound() {
  const isSoundOn = Boolean(settings && settings.soundEnabled);
  dom.dashSoundLabel.textContent = isSoundOn ? 'Sound On' : 'Muted';

  if (isSoundOn) {
    dom.dashSoundSvg.innerHTML = `
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    `;
  } else {
    dom.dashSoundSvg.innerHTML = `
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    `;
  }
}

/**
 * Render Header Live Badge
 */
function renderLiveBadge() {
  if (!timer) return;

  if (timer.status === SESSION_STATUS.RUNNING) {
    dom.dashLiveDot.style.background = '#00d2ff';
    dom.dashLiveDot.style.boxShadow = '0 0 10px #00d2ff';
    dom.dashLiveStatusText.textContent = `In Flow (${formatModeLabel(timer.mode)})`;
  } else if (timer.status === SESSION_STATUS.PAUSED) {
    dom.dashLiveDot.style.background = '#f59e0b';
    dom.dashLiveDot.style.boxShadow = '0 0 8px #f59e0b';
    dom.dashLiveStatusText.textContent = 'Paused';
  } else {
    dom.dashLiveDot.style.background = '#64748b';
    dom.dashLiveDot.style.boxShadow = 'none';
    dom.dashLiveStatusText.textContent = 'Ready';
  }
}

/**
 * Render Timer Dial & Controls
 */
function renderTimer() {
  if (!timer) return;

  dom.dashModeBadge.textContent = formatModeLabel(timer.mode);
  dom.dashModeBadge.className = `mode-badge-large ${timer.mode}`;

  const maxCycles = settings ? settings.sessionsBeforeLongBreak : 4;
  dom.dashCycleText.textContent = `Cycle ${timer.currentCycle || 1} of ${maxCycles}`;

  if (timer.status === SESSION_STATUS.RUNNING) {
    dom.dashMainText.textContent = 'Pause Session';
    dom.dashMainIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    dom.dashStateLabel.textContent = 'Flow Active';
  } else if (timer.status === SESSION_STATUS.PAUSED) {
    dom.dashMainText.textContent = 'Resume Session';
    dom.dashMainIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    dom.dashStateLabel.textContent = 'Paused';
  } else {
    dom.dashMainText.textContent = `Start ${formatModeLabel(timer.mode)}`;
    dom.dashMainIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    dom.dashStateLabel.textContent = 'Ready to Flow';
  }

  // Active task title
  if (timer.activeTaskId) {
    const task = tasks.find(t => t.id === timer.activeTaskId);
    dom.dashActiveTaskTitle.textContent = task ? task.title : 'No task selected';
  } else {
    dom.dashActiveTaskTitle.textContent = 'No task selected';
  }

  renderDigitsOnly();
}

/**
 * Digits only for timer
 */
function renderDigitsOnly() {
  if (!timer) return;

  const remaining = calculateRemainingSeconds(timer, Date.now());
  const total = timer.totalSeconds || (25 * 60);

  dom.dashDigits.textContent = formatTime(remaining);

  const ratio = Math.max(0, Math.min(1, remaining / total));
  const offset = CIRCUMFERENCE * (1 - ratio);
  dom.dashProgressRing.style.strokeDashoffset = offset;
}

/**
 * Render Metric Cards
 */
function renderMetrics() {
  if (!settings) return;

  const daily = getDailyStats(history, tasks, settings);
  const sevenDays = getLast7DaysStats(history);
  const weeklyTotal = sevenDays.reduce((sum, d) => sum + d.focusMinutes, 0);

  dom.metricTodayMins.textContent = `${daily.focusMinutesToday}m`;
  dom.metricGoalMinsSub.textContent = `Goal: ${daily.goalMinutes}m (${daily.minutesPercent}%)`;

  dom.metricTodaySessions.textContent = `${daily.focusSessionsToday}`;
  dom.metricGoalSessionsSub.textContent = `Goal: ${daily.goalSessions} (${daily.sessionsPercent}%)`;

  dom.metricTodayTasks.textContent = `${daily.tasksCompletedToday}`;
  dom.metricGoalTasksSub.textContent = `Goal: ${daily.goalTasks} (${daily.tasksPercent}%)`;

  dom.metricWeeklyMins.textContent = `${weeklyTotal}m`;
}

/**
 * Render Analytics Panel
 */
function renderAnalytics() {
  // 7-day Bar Chart
  const sevenDays = getLast7DaysStats(history);
  const maxMins = Math.max(60, ...sevenDays.map(d => d.focusMinutes));

  dom.dash7DayBarChart.innerHTML = '';
  sevenDays.forEach(day => {
    const col = document.createElement('div');
    col.className = `dash-bar-col ${day.isToday ? 'today' : ''} ${day.focusMinutes > 0 ? 'active-bar' : ''}`;
    col.title = `${day.dayLabel} (${day.dateLabel}): ${day.focusMinutes} focus minutes across ${day.sessionsCount} session(s)`;

    const heightPct = Math.max(4, Math.round((day.focusMinutes / maxMins) * 100));

    const rect = document.createElement('div');
    rect.className = 'dash-bar-rect';
    rect.style.height = `${heightPct}%`;

    const label = document.createElement('span');
    label.className = 'dash-bar-label';
    label.textContent = `${day.dayLabel} (${day.focusMinutes}m)`;

    col.appendChild(rect);
    col.appendChild(label);
    dom.dash7DayBarChart.appendChild(col);
  });

  // All-time Metrics
  const allTime = getAllTimeStats(history);
  dom.statAllTimeMins.textContent = `${allTime.totalFocusMinutes}m`;
  dom.statAvgDuration.textContent = `${allTime.averageDurationMinutes}m`;
  dom.statBestDay.textContent = allTime.mostProductiveDay || '—';

  // Today's Timeline Table
  const timeline = getTodaySessionTimeline(history);
  dom.timelineTableBody.innerHTML = '';

  if (timeline.length === 0) {
    dom.timelineEmptyNotice.style.display = 'block';
  } else {
    dom.timelineEmptyNotice.style.display = 'none';

    timeline.forEach(item => {
      const row = document.createElement('tr');

      const timeCell = document.createElement('td');
      const d = new Date(item.completedAt || item.endTime || item.startTime);
      timeCell.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const typeCell = document.createElement('td');
      typeCell.innerHTML = `<span style="color: var(--accent-cyan-bright); font-weight: 600;">Focus</span>`;

      const durCell = document.createElement('td');
      durCell.textContent = `${item.durationMinutes} min`;

      const taskCell = document.createElement('td');
      if (item.taskId) {
        const t = tasks.find(x => x.id === item.taskId);
        taskCell.textContent = t ? t.title : 'Task deleted';
      } else {
        taskCell.textContent = 'General Focus';
        taskCell.style.color = 'var(--text-muted)';
      }

      row.appendChild(timeCell);
      row.appendChild(typeCell);
      row.appendChild(durCell);
      row.appendChild(taskCell);
      dom.timelineTableBody.appendChild(row);
    });
  }
}

/**
 * Render Task Manager Panel
 */
function renderTasks() {
  const filtered = filterTasks(tasks, taskFilter);

  dom.dashFullTaskList.innerHTML = '';
  filtered.forEach(task => {
    const card = document.createElement('div');
    card.className = `dash-task-card ${task.completed ? 'completed' : ''} ${timer && timer.activeTaskId === task.id ? 'active-selection' : ''}`;

    const main = document.createElement('div');
    main.className = 'dash-task-main';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', async () => {
      tasks = toggleTaskCompletion(tasks, task.id);
      await saveTasks(tasks);
      renderTasks();
      renderMetrics();
    });

    const info = document.createElement('div');
    info.style.cursor = 'pointer';
    info.addEventListener('click', async () => {
      const newActive = timer.activeTaskId === task.id ? null : task.id;
      await chrome.runtime.sendMessage({ type: 'SELECT_TASK', taskId: newActive });
      timer.activeTaskId = newActive;
      renderTimer();
      renderTasks();
    });

    const title = document.createElement('div');
    title.className = 'dash-task-title';
    title.textContent = task.title;

    info.appendChild(title);
    if (task.notes) {
      const notes = document.createElement('div');
      notes.className = 'dash-task-notes';
      notes.textContent = task.notes;
      info.appendChild(notes);
    }

    main.appendChild(checkbox);
    main.appendChild(info);

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '12px';

    const tag = document.createElement('span');
    tag.className = `priority-tag ${task.priority}`;
    tag.textContent = task.priority;

    const pomo = document.createElement('span');
    pomo.style.fontSize = '12px';
    pomo.style.color = 'var(--text-secondary)';
    pomo.textContent = `🍅 ${task.completedSessions || 0}/${task.estimatedSessions || 1}`;

    const btnDelete = document.createElement('button');
    btnDelete.className = 'task-btn delete';
    btnDelete.title = 'Delete Task';
    btnDelete.innerHTML = `
      <svg class="svg-icon" viewBox="0 0 24 24">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
    `;
    btnDelete.addEventListener('click', async () => {
      tasks = deleteTask(tasks, task.id);
      if (timer.activeTaskId === task.id) {
        timer.activeTaskId = null;
        await chrome.runtime.sendMessage({ type: 'SELECT_TASK', taskId: null });
        renderTimer();
      }
      await saveTasks(tasks);
      renderTasks();
    });

    right.appendChild(tag);
    right.appendChild(pomo);
    right.appendChild(btnDelete);

    card.appendChild(main);
    card.appendChild(right);
    dom.dashFullTaskList.appendChild(card);
  });
}

/**
 * Render Distraction Blocker Widgets & Tags
 */
function renderBlockerWidgets() {
  if (!settings) return;

  const isEnabled = Boolean(settings.distractionBlockingEnabled);
  const isActive = isEnabled &&
    timer &&
    timer.status === SESSION_STATUS.RUNNING &&
    (timer.mode === SESSION_MODES.FOCUS || settings.blockDuringBreaks);

  if (isActive) {
    dom.dashBlockerBadge.style.background = 'rgba(16, 185, 129, 0.15)';
    dom.dashBlockerBadge.style.color = '#34d399';
    dom.dashBlockerBadge.textContent = 'Active & Guarding';
    dom.dashBlockerNotice.textContent = `Currently blocking ${settings.blockedDomains.length} distracting websites during this session.`;
  } else if (isEnabled) {
    dom.dashBlockerBadge.style.background = 'rgba(59, 130, 246, 0.15)';
    dom.dashBlockerBadge.style.color = '#38bdf8';
    dom.dashBlockerBadge.textContent = 'Armed for Focus';
    dom.dashBlockerNotice.textContent = 'Will automatically block websites when your focus countdown begins.';
  } else {
    dom.dashBlockerBadge.style.background = 'rgba(148, 163, 184, 0.15)';
    dom.dashBlockerBadge.style.color = '#94a3b8';
    dom.dashBlockerBadge.textContent = 'Disabled';
    dom.dashBlockerNotice.textContent = 'Distraction blocker is turned off.';
  }

  dom.dashToggleBlocker.checked = isEnabled;
  dom.dashToggleBlockBreaks.checked = Boolean(settings.blockDuringBreaks);

  // Tags
  dom.dashBlocklistTags.innerHTML = '';
  settings.blockedDomains.forEach(domain => {
    const tag = document.createElement('span');
    tag.className = 'domain-tag';
    tag.style.fontSize = '12px';
    tag.textContent = domain;

    const btnRemove = document.createElement('button');
    btnRemove.className = 'domain-remove-btn';
    btnRemove.innerHTML = '&times;';
    btnRemove.title = `Remove ${domain}`;
    btnRemove.addEventListener('click', async () => {
      settings.blockedDomains = settings.blockedDomains.filter(d => d !== domain);
      await saveSettings(settings);
      await chrome.runtime.sendMessage({ type: 'SYNC_SETTINGS' });
      renderBlockerWidgets();
    });

    tag.appendChild(btnRemove);
    dom.dashBlocklistTags.appendChild(tag);
  });
}

/**
 * Render Settings Panel Inputs
 */
function renderSettingsInputs() {
  if (!settings) return;

  dom.dashInputFocusDuration.value = settings.focusDurationMinutes;
  dom.dashInputShortBreak.value = settings.shortBreakMinutes;
  dom.dashInputLongBreak.value = settings.longBreakMinutes;
  dom.dashInputSessionsBeforeLong.value = settings.sessionsBeforeLongBreak;
  dom.dashInputGoalMins.value = settings.dailyGoalMinutes;
  dom.dashInputGoalSessions.value = settings.dailyGoalSessions;
  dom.dashInputGoalTasks.value = settings.dailyGoalTasks;

  dom.dashToggleFastTimer.checked = Boolean(settings.devFastTimer);
  dom.dashToggleAutoBreaks.checked = Boolean(settings.autoStartBreaks);
  dom.dashToggleAutoFocus.checked = Boolean(settings.autoStartFocus);
  dom.dashToggleNotifications.checked = Boolean(settings.notificationsEnabled);
}

// Start
document.addEventListener('DOMContentLoaded', init);
