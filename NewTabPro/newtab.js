/**
 * NewTab Pro - Main Controller
 * Coordinates clock updates, search navigation, shortcut interactions,
 * task management, habit tracker, pomodoro focus timer, calculator,
 * world clock, daily inspiration quotes, workspace templates, and settings.
 */

import { storage, getDefaultState, migrateState } from './modules/storage.js';
import { formatTime, formatDate, getGreeting } from './modules/clock.js';
import { resolveSearchQuery, SEARCH_ENGINES, sanitizeUrl } from './modules/search.js';
import {
  createShortcut,
  updateShortcut,
  removeShortcut,
  getInitials,
  getFaviconUrl,
  PALETTE_COLORS
} from './modules/shortcuts.js';
import {
  createTask,
  toggleTask,
  deleteTask,
  filterTasks,
  calculateProgress,
  getDateKey
} from './modules/tasks.js';
import { Scratchpad } from './modules/scratchpad.js';
import { WeatherManager, geocodeCity } from './modules/weather.js';
import { THEMES, BACKGROUND_PRESETS, applyTheme } from './modules/themes.js';
import {
  WIDGET_REGISTRY,
  toggleWidget,
  reorderWidget,
  syncWidgetVisibilityToDOM
} from './modules/widgets.js';
import { FocusTimer } from './modules/focus-timer.js';
import {
  calculateStreak,
  createHabit,
  toggleHabitForToday,
  deleteHabit
} from './modules/habits.js';
import { getDailyQuote, getRandomQuote, CURATED_QUOTES } from './modules/quotes.js';
import { Calculator } from './modules/calculator.js';
import { MAJOR_TIMEZONES, getTimeInZone } from './modules/world-clock.js';
import { DASHBOARD_TEMPLATES, applyTemplateToState } from './modules/templates.js';
import { applyWeatherAtmosphereToDOM } from './modules/weather-atmosphere.js';

// Application State
let appState = getDefaultState();
let currentTaskFilter = 'all';
let clockIntervalId = null;
let worldClockIntervalId = null;
let scratchpadInstance = null;
let focusTimerInstance = null;
const calc = new Calculator();
let currentQuote = getDailyQuote();

// DOM Element References
const dom = {
  // Clock & Hero
  dashboardBackground: document.getElementById('dashboardBackground'),
  weatherAtmosphereOverlay: document.getElementById('weatherAtmosphereOverlay'),
  clockDisplay: document.getElementById('clockDisplay'),
  clockPeriod: document.getElementById('clockPeriod'),
  dateDisplay: document.getElementById('dateDisplay'),
  greetingDisplay: document.getElementById('greetingDisplay'),

  // Search
  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('searchInput'),
  searchClearBtn: document.getElementById('searchClearBtn'),
  searchEngineIcon: document.getElementById('searchEngineIcon'),

  // Quotes
  widgetQuote: document.getElementById('widget-quote'),
  quoteText: document.getElementById('quoteText'),
  quoteAuthor: document.getElementById('quoteAuthor'),
  copyQuoteBtn: document.getElementById('copyQuoteBtn'),
  shuffleQuoteBtn: document.getElementById('shuffleQuoteBtn'),

  // Quick Tools Launcher
  widgetQuickTools: document.getElementById('widget-quickTools'),
  quickToolsPills: document.querySelectorAll('.tool-pill'),

  // Shortcuts
  shortcutsGrid: document.getElementById('shortcutsGrid'),
  shortcutsEmpty: document.getElementById('shortcutsEmpty'),
  addShortcutBtn: document.getElementById('addShortcutBtn'),

  // Tasks
  taskAddForm: document.getElementById('taskAddForm'),
  taskInput: document.getElementById('taskInput'),
  tasksList: document.getElementById('tasksList'),
  tasksEmpty: document.getElementById('tasksEmpty'),
  tasksCountBadge: document.getElementById('tasksCountBadge'),
  filterTabs: document.querySelectorAll('.filter-tab'),

  // Habits Tracker
  widgetHabits: document.getElementById('widget-habits'),
  habitsList: document.getElementById('habitsList'),
  habitsStreakSummary: document.getElementById('habitsStreakSummary'),
  addHabitBtn: document.getElementById('addHabitBtn'),
  habitModal: document.getElementById('habitModal'),
  habitForm: document.getElementById('habitForm'),
  habitTitleInput: document.getElementById('habitTitleInput'),
  habitEmojiInput: document.getElementById('habitEmojiInput'),
  cancelHabitModalBtn: document.getElementById('cancelHabitModalBtn'),
  closeHabitModalBtn: document.getElementById('closeHabitModalBtn'),

  // Focus Timer (Pomodoro)
  widgetFocusTimer: document.getElementById('widget-focusTimer'),
  timerTimeDisplay: document.getElementById('timerTimeDisplay'),
  timerProgressFill: document.getElementById('timerProgressFill'),
  timerToggleBtn: document.getElementById('timerToggleBtn'),
  timerResetBtn: document.getElementById('timerResetBtn'),
  timerModeBtns: document.querySelectorAll('.timer-mode-btn'),
  pomodoroSessionsBadge: document.getElementById('pomodoroSessionsBadge'),

  // Progress
  progressRingCircle: document.getElementById('progressRingCircle'),
  progressPercent: document.getElementById('progressPercent'),
  progressSubtitle: document.getElementById('progressSubtitle'),

  // Calculator
  widgetCalculator: document.getElementById('widget-calculator'),
  calcDisplay: document.getElementById('calcDisplay'),
  calcKeypad: document.getElementById('calcKeypad'),
  calcClearBtn: document.getElementById('calcClearBtn'),

  // World Clock
  widgetWorldClock: document.getElementById('widget-worldClock'),
  worldClockList: document.getElementById('worldClockList'),

  // Scratchpad
  scratchpadTextarea: document.getElementById('scratchpadTextarea'),
  scratchpadStatus: document.getElementById('scratchpadStatus'),
  scratchpadStats: document.getElementById('scratchpadStats'),
  clearScratchpadBtn: document.getElementById('clearScratchpadBtn'),

  // Weather
  widgetWeather: document.getElementById('widget-weather'),
  weatherPill: document.getElementById('weatherPill'),
  weatherTemp: document.getElementById('weatherTemp'),
  weatherCity: document.getElementById('weatherCity'),

  // Quick Template Switcher
  quickTemplateBtn: document.getElementById('quickTemplateBtn'),
  activeTemplateBadge: document.getElementById('activeTemplateBadge'),

  // Settings
  openSettingsBtn: document.getElementById('openSettingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
  settingsTabBtns: document.querySelectorAll('.settings-tab-btn'),
  settingsPanels: document.querySelectorAll('.settings-panel'),

  // Settings: Templates
  templateCardsGrid: document.getElementById('templateCardsGrid'),
  tplReplaceShortcutsCheck: document.getElementById('tplReplaceShortcutsCheck'),

  // Settings: General
  prefUserName: document.getElementById('prefUserName'),
  prefTimeFormat: document.getElementById('prefTimeFormat'),
  prefShowSeconds: document.getElementById('prefShowSeconds'),
  prefSearchEngine: document.getElementById('prefSearchEngine'),
  prefOpenInNewTab: document.getElementById('prefOpenInNewTab'),

  // Settings: Appearance
  themeCardsList: document.getElementById('themeCardsList'),
  bgPresetsList: document.getElementById('bgPresetsList'),
  prefCustomBg: document.getElementById('prefCustomBg'),

  // Settings: Widgets
  widgetConfigList: document.getElementById('widgetConfigList'),

  // Settings: Weather
  weatherEnabledToggle: document.getElementById('weatherEnabledToggle'),
  weatherCityInput: document.getElementById('weatherCityInput'),
  searchCityBtn: document.getElementById('searchCityBtn'),
  weatherLookupStatus: document.getElementById('weatherLookupStatus'),
  weatherUnitSelect: document.getElementById('weatherUnitSelect'),

  // Settings: Data
  exportDataBtn: document.getElementById('exportDataBtn'),
  importDataInput: document.getElementById('importDataInput'),
  resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),

  // Shortcut Modal
  shortcutModal: document.getElementById('shortcutModal'),
  shortcutModalTitle: document.getElementById('shortcutModalTitle'),
  shortcutForm: document.getElementById('shortcutForm'),
  shortcutEditId: document.getElementById('shortcutEditId'),
  shortcutTitleInput: document.getElementById('shortcutTitleInput'),
  shortcutUrlInput: document.getElementById('shortcutUrlInput'),
  colorPickerList: document.getElementById('colorPickerList'),
  cancelShortcutModalBtn: document.getElementById('cancelShortcutModalBtn'),
  closeShortcutModalBtn: document.getElementById('closeShortcutModalBtn'),

  // Toast
  toastMessage: document.getElementById('toastMessage')
};

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
let toastTimer = null;
function showToast(message, duration = 2500) {
  if (!dom.toastMessage) return;
  dom.toastMessage.textContent = message;
  dom.toastMessage.hidden = false;

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toastMessage.hidden = true;
  }, duration);
}

// ==========================================
// CLOCK & GREETING
// ==========================================
function updateClock() {
  const now = new Date();
  const { timeStr, periodStr } = formatTime(now, {
    format: appState.preferences.timeFormat,
    showSeconds: appState.preferences.showSeconds
  });

  if (dom.clockDisplay) dom.clockDisplay.textContent = timeStr;
  if (dom.clockPeriod) {
    if (periodStr) {
      dom.clockPeriod.textContent = periodStr;
      dom.clockPeriod.hidden = false;
    } else {
      dom.clockPeriod.hidden = true;
    }
  }

  if (dom.dateDisplay) {
    dom.dateDisplay.textContent = formatDate(now);
  }

  if (dom.greetingDisplay) {
    dom.greetingDisplay.textContent = getGreeting(now, appState.preferences.userName);
  }
}

function initClock() {
  updateClock();
  if (clockIntervalId) clearInterval(clockIntervalId);
  clockIntervalId = setInterval(updateClock, 1000);
}

// ==========================================
// SEARCH BAR
// ==========================================
function updateSearchPlaceholder() {
  const engine = SEARCH_ENGINES[appState.preferences.searchEngine] || SEARCH_ENGINES.google;
  if (dom.searchInput) {
    dom.searchInput.placeholder = engine.placeholder;
  }
}

function handleSearchSubmit(e) {
  if (e) e.preventDefault();
  const query = (dom.searchInput?.value || '').trim();
  if (!query) return;

  const result = resolveSearchQuery(query, appState.preferences.searchEngine);
  window.location.href = result.targetUrl;
}

function initSearch() {
  updateSearchPlaceholder();

  if (dom.searchForm) {
    dom.searchForm.addEventListener('submit', handleSearchSubmit);
  }

  if (dom.searchInput) {
    dom.searchInput.addEventListener('input', () => {
      const hasVal = Boolean(dom.searchInput.value.trim());
      if (dom.searchClearBtn) dom.searchClearBtn.hidden = !hasVal;
    });
  }

  if (dom.searchClearBtn) {
    dom.searchClearBtn.addEventListener('click', () => {
      if (dom.searchInput) {
        dom.searchInput.value = '';
        dom.searchClearBtn.hidden = true;
        dom.searchInput.focus();
      }
    });
  }
}

// ==========================================
// DAILY QUOTE / INSPIRATION
// ==========================================
function renderQuote(q = currentQuote) {
  if (!dom.quoteText || !dom.quoteAuthor) return;
  dom.quoteText.textContent = q.text;
  dom.quoteAuthor.textContent = `— ${q.author}`;
}

function initQuotes() {
  if (typeof appState.quote?.currentQuoteIndex === 'number' && CURATED_QUOTES[appState.quote.currentQuoteIndex]) {
    currentQuote = CURATED_QUOTES[appState.quote.currentQuoteIndex];
  } else {
    currentQuote = getDailyQuote();
  }
  renderQuote(currentQuote);

  if (dom.shuffleQuoteBtn) {
    dom.shuffleQuoteBtn.addEventListener('click', async () => {
      const { quote, index } = getRandomQuote(appState.quote?.currentQuoteIndex || 0);
      currentQuote = quote;
      renderQuote(currentQuote);
      appState.quote = { currentQuoteIndex: index };
      await storage.save(appState);
    });
  }

  if (dom.copyQuoteBtn) {
    dom.copyQuoteBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(`"${currentQuote.text}" — ${currentQuote.author}`);
        showToast('Quote copied to clipboard');
      } catch {
        showToast('Failed to copy');
      }
    });
  }
}

// ==========================================
// QUICK TOOLS / BROWSER LAUNCHER
// ==========================================
function initQuickTools() {
  dom.quickToolsPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const targetUrl = pill.dataset.url;
      if (!targetUrl) return;

      try {
        if (typeof chrome !== 'undefined' && chrome.tabs && typeof chrome.tabs.create === 'function') {
          chrome.tabs.create({ url: targetUrl });
        } else {
          window.open(targetUrl, '_blank');
        }
      } catch {
        window.open(targetUrl, '_blank');
      }
    });
  });
}

// ==========================================
// SHORTCUTS
// ==========================================
let selectedShortcutColor = PALETTE_COLORS[0];

function renderShortcuts() {
  if (!dom.shortcutsGrid) return;
  dom.shortcutsGrid.innerHTML = '';

  const list = [...appState.shortcuts].sort((a, b) => a.sortOrder - b.sortOrder);

  if (list.length === 0) {
    if (dom.shortcutsEmpty) dom.shortcutsEmpty.hidden = false;
    return;
  }
  if (dom.shortcutsEmpty) dom.shortcutsEmpty.hidden = true;

  list.forEach(shortcut => {
    const card = document.createElement('a');
    card.className = 'shortcut-card';
    card.href = shortcut.url;
    card.dataset.id = shortcut.id;

    if (appState.preferences.openInNewTab) {
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    }

    const badge = document.createElement('div');
    badge.className = 'shortcut-badge';
    if (shortcut.color) {
      badge.style.boxShadow = `0 4px 14px ${shortcut.color}33`;
    }

    const faviconUrl = getFaviconUrl(shortcut.url, 64);

    const img = document.createElement('img');
    img.className = 'shortcut-icon-img';
    img.alt = shortcut.title;
    img.src = faviconUrl;
    img.loading = 'lazy';

    const fallbackInitials = document.createElement('span');
    fallbackInitials.className = 'shortcut-fallback-initials';
    fallbackInitials.style.display = 'none';
    fallbackInitials.textContent = getInitials(shortcut.title, shortcut.url);

    img.addEventListener('error', () => {
      try {
        const domain = new URL(shortcut.url).hostname;
        const googleFallback = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
        if (img.src !== googleFallback && !img.dataset.failedOnce) {
          img.dataset.failedOnce = 'true';
          img.src = googleFallback;
          return;
        }
      } catch {}

      img.style.display = 'none';
      badge.style.backgroundColor = shortcut.color || '#3B82F6';
      fallbackInitials.style.display = 'block';
    });

    img.addEventListener('load', () => {
      img.style.display = 'block';
      fallbackInitials.style.display = 'none';
    });

    badge.appendChild(img);
    badge.appendChild(fallbackInitials);

    const title = document.createElement('span');
    title.className = 'shortcut-title';
    title.textContent = shortcut.title;
    title.title = `${shortcut.title} (${shortcut.url})`;

    // Action overlay (Edit / Delete)
    const actions = document.createElement('div');
    actions.className = 'shortcut-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'shortcut-action-btn';
    editBtn.title = 'Edit shortcut';
    editBtn.setAttribute('aria-label', `Edit ${shortcut.title}`);
    editBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
    editBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openEditShortcutModal(shortcut);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'shortcut-action-btn';
    deleteBtn.title = 'Delete shortcut';
    deleteBtn.setAttribute('aria-label', `Delete ${shortcut.title}`);
    deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    deleteBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      appState.shortcuts = removeShortcut(appState.shortcuts, shortcut.id);
      await storage.save(appState);
      renderShortcuts();
      showToast('Shortcut removed');
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(badge);
    card.appendChild(title);
    card.appendChild(actions);

    dom.shortcutsGrid.appendChild(card);
  });
}

function renderColorPickerSwatches() {
  if (!dom.colorPickerList) return;
  dom.colorPickerList.innerHTML = '';

  PALETTE_COLORS.forEach(color => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = `color-swatch-btn ${color === selectedShortcutColor ? 'selected' : ''}`;
    swatch.style.backgroundColor = color;
    swatch.setAttribute('aria-label', `Select color ${color}`);
    swatch.addEventListener('click', () => {
      selectedShortcutColor = color;
      document.querySelectorAll('.color-swatch-btn').forEach(btn => btn.classList.remove('selected'));
      swatch.classList.add('selected');
    });
    dom.colorPickerList.appendChild(swatch);
  });
}

function openAddShortcutModal() {
  if (!dom.shortcutModal) return;
  dom.shortcutModalTitle.textContent = 'Add Shortcut';
  dom.shortcutEditId.value = '';
  dom.shortcutTitleInput.value = '';
  dom.shortcutUrlInput.value = '';
  selectedShortcutColor = PALETTE_COLORS[0];
  renderColorPickerSwatches();
  dom.shortcutModal.showModal();
  dom.shortcutTitleInput.focus();
}

function openEditShortcutModal(shortcut) {
  if (!dom.shortcutModal) return;
  dom.shortcutModalTitle.textContent = 'Edit Shortcut';
  dom.shortcutEditId.value = shortcut.id;
  dom.shortcutTitleInput.value = shortcut.title;
  dom.shortcutUrlInput.value = shortcut.url;
  selectedShortcutColor = shortcut.color || PALETTE_COLORS[0];
  renderColorPickerSwatches();
  dom.shortcutModal.showModal();
  dom.shortcutTitleInput.focus();
}

async function handleShortcutFormSubmit(e) {
  e.preventDefault();
  const id = dom.shortcutEditId.value;
  const title = dom.shortcutTitleInput.value.trim();
  const rawUrl = dom.shortcutUrlInput.value.trim();

  const validatedUrl = sanitizeUrl(rawUrl);
  if (!validatedUrl) {
    showToast('Invalid web URL. Please use http:// or https://');
    return;
  }

  if (id) {
    appState.shortcuts = updateShortcut(appState.shortcuts, id, {
      title,
      url: validatedUrl,
      color: selectedShortcutColor
    });
    showToast('Shortcut updated');
  } else {
    const newSc = createShortcut({
      title,
      url: validatedUrl,
      color: selectedShortcutColor,
      sortOrder: appState.shortcuts.length
    });
    appState.shortcuts.push(newSc);
    showToast('Shortcut added');
  }

  await storage.save(appState);
  renderShortcuts();
  dom.shortcutModal.close();
}

function initShortcuts() {
  renderShortcuts();
  renderColorPickerSwatches();

  if (dom.addShortcutBtn) {
    dom.addShortcutBtn.addEventListener('click', openAddShortcutModal);
  }

  if (dom.shortcutForm) {
    dom.shortcutForm.addEventListener('submit', handleShortcutFormSubmit);
  }

  if (dom.cancelShortcutModalBtn) {
    dom.cancelShortcutModalBtn.addEventListener('click', () => dom.shortcutModal.close());
  }

  if (dom.closeShortcutModalBtn) {
    dom.closeShortcutModalBtn.addEventListener('click', () => dom.shortcutModal.close());
  }
}

// ==========================================
// TASKS & PROGRESS
// ==========================================
function updateProgressDisplay() {
  const stats = calculateProgress(appState.tasks, getDateKey());
  const percent = stats.percentage;

  if (dom.progressPercent) dom.progressPercent.textContent = `${percent}%`;
  if (dom.progressSubtitle) {
    dom.progressSubtitle.textContent = `${stats.completed} of ${stats.total} tasks completed`;
  }

  if (dom.tasksCountBadge) {
    dom.tasksCountBadge.textContent = String(stats.pending);
  }

  if (dom.progressRingCircle) {
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    dom.progressRingCircle.style.strokeDashoffset = offset;
  }
}

function renderTasks() {
  if (!dom.tasksList) return;
  dom.tasksList.innerHTML = '';

  const todayKey = getDateKey();
  const filtered = filterTasks(appState.tasks, currentTaskFilter, todayKey);

  if (filtered.length === 0) {
    if (dom.tasksEmpty) dom.tasksEmpty.hidden = false;
    updateProgressDisplay();
    return;
  }
  if (dom.tasksEmpty) dom.tasksEmpty.hidden = true;

  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;

    const left = document.createElement('div');
    left.className = 'task-left';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`);
    checkbox.addEventListener('change', async () => {
      appState.tasks = toggleTask(appState.tasks, task.id);
      await storage.save(appState);
      renderTasks();
    });

    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title;
    titleSpan.addEventListener('click', async () => {
      appState.tasks = toggleTask(appState.tasks, task.id);
      await storage.save(appState);
      renderTasks();
    });

    left.appendChild(checkbox);
    left.appendChild(titleSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-delete-btn';
    deleteBtn.title = 'Delete task';
    deleteBtn.setAttribute('aria-label', `Delete task "${task.title}"`);
    deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    deleteBtn.addEventListener('click', async () => {
      appState.tasks = deleteTask(appState.tasks, task.id);
      await storage.save(appState);
      renderTasks();
      showToast('Task deleted');
    });

    li.appendChild(left);
    li.appendChild(deleteBtn);
    dom.tasksList.appendChild(li);
  });

  updateProgressDisplay();
}

async function handleTaskAdd(e) {
  if (e) e.preventDefault();
  const title = (dom.taskInput?.value || '').trim();
  if (!title) return;

  try {
    const newTask = createTask(title, getDateKey());
    appState.tasks.push(newTask);
    await storage.save(appState);

    if (dom.taskInput) dom.taskInput.value = '';
    renderTasks();
  } catch (err) {
    showToast(err.message);
  }
}

function initTasks() {
  renderTasks();

  if (dom.taskAddForm) {
    dom.taskAddForm.addEventListener('submit', handleTaskAdd);
  }

  dom.filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dom.filterTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentTaskFilter = tab.dataset.filter || 'all';
      renderTasks();
    });
  });
}

// ==========================================
// HABITS TRACKER & STREAKS
// ==========================================
function renderHabits() {
  if (!dom.habitsList) return;
  dom.habitsList.innerHTML = '';

  const todayKey = getDateKey();
  const habits = Array.isArray(appState.habits) ? appState.habits : [];

  let completedTodayCount = 0;

  habits.forEach(habit => {
    const isDone = Boolean(habit.history && habit.history[todayKey]);
    if (isDone) completedTodayCount++;
    const streak = calculateStreak(habit, todayKey);

    const li = document.createElement('li');
    li.className = 'habit-item';

    const left = document.createElement('div');
    left.className = 'habit-left';

    const checkBtn = document.createElement('button');
    checkBtn.className = `habit-check-btn ${isDone ? 'done' : ''}`;
    checkBtn.setAttribute('aria-label', `Toggle habit ${habit.title}`);
    checkBtn.innerHTML = isDone ? '✓' : '';
    checkBtn.addEventListener('click', async () => {
      appState.habits = toggleHabitForToday(appState.habits, habit.id, todayKey);
      await storage.save(appState);
      renderHabits();
    });

    const titleSpan = document.createElement('span');
    titleSpan.className = 'habit-title';
    titleSpan.textContent = `${habit.icon || '⭐'} ${habit.title}`;

    left.appendChild(checkBtn);
    left.appendChild(titleSpan);

    const right = document.createElement('div');
    right.className = 'habit-right';

    const streakBadge = document.createElement('span');
    streakBadge.className = 'habit-streak-badge';
    streakBadge.textContent = `🔥 ${streak}d`;

    const delBtn = document.createElement('button');
    delBtn.className = 'habit-delete-btn';
    delBtn.title = 'Delete habit';
    delBtn.setAttribute('aria-label', `Delete habit ${habit.title}`);
    delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    delBtn.addEventListener('click', async () => {
      appState.habits = deleteHabit(appState.habits, habit.id);
      await storage.save(appState);
      renderHabits();
      showToast('Habit removed');
    });

    right.appendChild(streakBadge);
    right.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(right);
    dom.habitsList.appendChild(li);
  });

  if (dom.habitsStreakSummary) {
    dom.habitsStreakSummary.textContent = `${completedTodayCount}/${habits.length} Today`;
  }
}

function initHabits() {
  renderHabits();

  if (dom.addHabitBtn) {
    dom.addHabitBtn.addEventListener('click', () => {
      if (!dom.habitModal) return;
      dom.habitTitleInput.value = '';
      dom.habitEmojiInput.value = '🔥';
      dom.habitModal.showModal();
      dom.habitTitleInput.focus();
    });
  }

  if (dom.cancelHabitModalBtn) {
    dom.cancelHabitModalBtn.addEventListener('click', () => dom.habitModal.close());
  }

  if (dom.closeHabitModalBtn) {
    dom.closeHabitModalBtn.addEventListener('click', () => dom.habitModal.close());
  }

  if (dom.habitForm) {
    dom.habitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (dom.habitTitleInput?.value || '').trim();
      const emoji = (dom.habitEmojiInput?.value || '🔥').trim();

      if (!title) return;

      try {
        const newHabit = createHabit(title, emoji);
        if (!Array.isArray(appState.habits)) appState.habits = [];
        appState.habits.push(newHabit);
        await storage.save(appState);
        renderHabits();
        dom.habitModal.close();
        showToast('Habit added');
      } catch (err) {
        showToast(err.message);
      }
    });
  }
}

// ==========================================
// FOCUS TIMER (POMODORO)
// ==========================================
function updateFocusTimerUI(state) {
  if (dom.timerTimeDisplay) {
    dom.timerTimeDisplay.textContent = state.formatted;
  }
  if (dom.timerProgressFill) {
    dom.timerProgressFill.style.width = `${state.progressPercent}%`;
  }
  if (dom.timerToggleBtn) {
    dom.timerToggleBtn.textContent = state.isRunning ? 'Pause' : (state.mode === 'focus' ? 'Start Focus' : 'Start Break');
    dom.timerToggleBtn.className = state.isRunning ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm';
  }
  if (dom.pomodoroSessionsBadge) {
    dom.pomodoroSessionsBadge.textContent = `${state.sessionsCompleted} Sessions`;
  }

  dom.timerModeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });
}

function initFocusTimer() {
  const saved = appState.focusTimer || { mode: 'focus', timeLeft: 1500, sessionsCompleted: 0 };

  focusTimerInstance = new FocusTimer({
    mode: saved.mode,
    timeLeft: saved.timeLeft,
    sessionsCompleted: saved.sessionsCompleted,
    onTick: (state) => {
      updateFocusTimerUI(state);
    },
    onComplete: (state) => {
      updateFocusTimerUI(state);
      showToast(`🎉 ${state.modeName} session completed!`);
      // Update state in storage
      appState.focusTimer.sessionsCompleted = state.sessionsCompleted;
      storage.save(appState);
    }
  });

  updateFocusTimerUI(focusTimerInstance.getState());

  if (dom.timerToggleBtn) {
    dom.timerToggleBtn.addEventListener('click', () => {
      focusTimerInstance.toggle();
    });
  }

  if (dom.timerResetBtn) {
    dom.timerResetBtn.addEventListener('click', () => {
      focusTimerInstance.reset();
    });
  }

  dom.timerModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      focusTimerInstance.setMode(mode);
    });
  });
}

// ==========================================
// QUICK CALCULATOR
// ==========================================
function initCalculator() {
  if (!dom.calcKeypad) return;

  dom.calcKeypad.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const action = target.dataset.calc;
    if (!action) return;

    if (action >= '0' && action <= '9') {
      calc.inputDigit(action);
    } else if (action === '.') {
      calc.inputDecimal();
    } else if (action === 'clear') {
      calc.reset();
    } else if (action === 'sign') {
      calc.toggleSign();
    } else if (action === 'percent') {
      calc.inputPercent();
    } else if (action === '=') {
      calc.calculateResult();
    } else {
      // Operator +, -, ×, ÷
      calc.performOperation(action);
    }

    if (dom.calcDisplay) {
      dom.calcDisplay.textContent = calc.display;
    }
  });

  if (dom.calcClearBtn) {
    dom.calcClearBtn.addEventListener('click', () => {
      calc.reset();
      if (dom.calcDisplay) dom.calcDisplay.textContent = '0';
    });
  }
}

// ==========================================
// WORLD CLOCK
// ==========================================
function updateWorldClock() {
  if (!dom.worldClockList) return;
  dom.worldClockList.innerHTML = '';

  const now = new Date();
  const format = appState.preferences.timeFormat || '12h';
  const cityIds = appState.worldClock?.cities || ['lon', 'nyc', 'tyo'];

  cityIds.forEach(id => {
    const zone = MAJOR_TIMEZONES.find(z => z.id === id);
    if (!zone) return;

    const { timeStr, period, offsetLabel } = getTimeInZone(zone.timezone, now, format);

    const item = document.createElement('div');
    item.className = 'world-clock-item';

    const info = document.createElement('div');
    info.className = 'world-city-info';

    const name = document.createElement('span');
    name.className = 'world-city-name';
    name.textContent = zone.name;

    const offset = document.createElement('span');
    offset.className = 'world-city-offset';
    offset.textContent = `${zone.country} • ${offsetLabel}`;

    info.appendChild(name);
    info.appendChild(offset);

    const timeWrap = document.createElement('div');
    timeWrap.className = 'world-city-time-wrap';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'world-city-time';
    timeSpan.textContent = timeStr;

    timeWrap.appendChild(timeSpan);
    if (period) {
      const periodSpan = document.createElement('span');
      periodSpan.className = 'world-city-period';
      periodSpan.textContent = period;
      timeWrap.appendChild(periodSpan);
    }

    item.appendChild(info);
    item.appendChild(timeWrap);
    dom.worldClockList.appendChild(item);
  });
}

function initWorldClock() {
  updateWorldClock();
  if (worldClockIntervalId) clearInterval(worldClockIntervalId);
  worldClockIntervalId = setInterval(updateWorldClock, 30000); // refresh every 30s
}

// ==========================================
// SCRATCHPAD
// ==========================================
function updateScratchpadStats(content) {
  const stats = Scratchpad.getStats(content);
  if (dom.scratchpadStats) {
    dom.scratchpadStats.textContent = `${stats.characters} characters • ${stats.words} words`;
  }
}

function initScratchpad() {
  if (dom.scratchpadTextarea) {
    dom.scratchpadTextarea.value = appState.scratchpad.content || '';
    updateScratchpadStats(appState.scratchpad.content);
  }

  scratchpadInstance = new Scratchpad({
    debounceMs: 400,
    onSave: async (content) => {
      appState.scratchpad.content = content;
      appState.scratchpad.lastUpdated = Date.now();
      await storage.save(appState);
    }
  });

  if (dom.scratchpadTextarea) {
    dom.scratchpadTextarea.addEventListener('input', (e) => {
      const val = e.target.value;
      updateScratchpadStats(val);

      scratchpadInstance.update(val, (status) => {
        if (!dom.scratchpadStatus) return;
        if (status === 'saving') {
          dom.scratchpadStatus.textContent = 'Saving...';
          dom.scratchpadStatus.className = 'status-indicator saving';
        } else if (status === 'saved') {
          dom.scratchpadStatus.textContent = 'Saved';
          dom.scratchpadStatus.className = 'status-indicator saved';
        } else if (status === 'error') {
          dom.scratchpadStatus.textContent = 'Save error';
          dom.scratchpadStatus.className = 'status-indicator';
        }
      });
    });
  }

  if (dom.clearScratchpadBtn) {
    dom.clearScratchpadBtn.addEventListener('click', async () => {
      if (dom.scratchpadTextarea) {
        dom.scratchpadTextarea.value = '';
        updateScratchpadStats('');
      }
      appState.scratchpad.content = '';
      appState.scratchpad.lastUpdated = Date.now();
      await storage.save(appState);
      showToast('Scratchpad cleared');
    });
  }

  window.addEventListener('beforeunload', () => {
    if (scratchpadInstance) {
      scratchpadInstance.flush();
    }
  });
}

// ==========================================
// WEATHER
// ==========================================
async function updateWeatherUI() {
  if (!appState.weather.enabled) {
    if (dom.widgetWeather) dom.widgetWeather.classList.add('widget-hidden');
    return;
  }

  if (dom.widgetWeather) dom.widgetWeather.classList.remove('widget-hidden');

  const res = await WeatherManager.loadWeather(appState.weather);
  if (res.status === 'updated') {
    appState.weather.cachedData = res.data;
    appState.weather.lastFetched = Date.now();
    await storage.save(appState);
  }

  const data = res.data || appState.weather.cachedData;

  if (appState.preferences.theme === 'atmosphere') {
    syncThemeAndAtmosphere();
  }

  if (data && dom.weatherTemp && dom.weatherCity) {
    dom.weatherTemp.textContent = `${data.temperature}${data.unit}`;
    dom.weatherCity.textContent = appState.weather.city || 'Local';
    if (dom.weatherPill) {
      dom.weatherPill.title = `${data.conditionLabel} in ${appState.weather.city || 'your city'}`;
    }
  } else if (res.status === 'unconfigured') {
    if (dom.weatherTemp) dom.weatherTemp.textContent = '--°';
    if (dom.weatherCity) dom.weatherCity.textContent = 'Set City';
  } else {
    if (dom.weatherTemp) dom.weatherTemp.textContent = '--°';
    if (dom.weatherCity) dom.weatherCity.textContent = 'Offline';
  }
}

function initWeather() {
  updateWeatherUI();

  if (dom.weatherPill) {
    dom.weatherPill.addEventListener('click', () => {
      openSettingsToTab('tab-weather');
    });
  }
}

// ==========================================
// WORKSPACE TEMPLATES
// ==========================================
function renderTemplatesGallery() {
  if (!dom.templateCardsGrid) return;
  dom.templateCardsGrid.innerHTML = '';

  const activeId = appState.preferences.activeTemplate || 'default';

  Object.values(DASHBOARD_TEMPLATES).forEach(tpl => {
    const card = document.createElement('div');
    card.className = `template-card ${tpl.id === activeId ? 'active' : ''}`;

    const header = document.createElement('div');
    header.className = 'template-card-header';

    const title = document.createElement('h5');
    title.className = 'template-card-title';
    title.textContent = tpl.name;

    const themeBadge = document.createElement('span');
    themeBadge.className = 'badge';
    themeBadge.textContent = tpl.theme.toUpperCase();

    header.appendChild(title);
    header.appendChild(themeBadge);

    const tagline = document.createElement('p');
    tagline.className = 'template-card-tagline';
    tagline.textContent = tpl.tagline;

    const applyBtn = document.createElement('button');
    applyBtn.className = `btn btn-sm ${tpl.id === activeId ? 'btn-secondary' : 'btn-primary'} template-apply-btn`;
    applyBtn.textContent = tpl.id === activeId ? 'Current Template' : 'Apply Template';
    applyBtn.disabled = tpl.id === activeId;

    applyBtn.addEventListener('click', async () => {
      const replaceShortcuts = Boolean(dom.tplReplaceShortcutsCheck?.checked);
      appState = applyTemplateToState(appState, tpl.id, replaceShortcuts);
      appState.preferences.activeTemplate = tpl.id;
      await storage.save(appState);

      syncAllUI();
      renderTemplatesGallery();
      showToast(`Applied ${tpl.name} template!`);
    });

    card.appendChild(header);
    card.appendChild(tagline);
    card.appendChild(applyBtn);

    dom.templateCardsGrid.appendChild(card);
  });

  if (dom.activeTemplateBadge) {
    const current = DASHBOARD_TEMPLATES[activeId] || DASHBOARD_TEMPLATES.default;
    dom.activeTemplateBadge.textContent = current.name.split(' ')[0];
  }
}

function initTemplates() {
  renderTemplatesGallery();

  if (dom.quickTemplateBtn) {
    dom.quickTemplateBtn.addEventListener('click', () => {
      openSettingsToTab('tab-templates');
    });
  }
}

// ==========================================
// THEMES & APPEARANCE
// ==========================================
function renderThemeSettings() {
  if (!dom.themeCardsList) return;
  dom.themeCardsList.innerHTML = '';

  Object.values(THEMES).forEach(th => {
    const card = document.createElement('div');
    card.className = `theme-card-option ${th.id === appState.preferences.theme ? 'active' : ''}`;
    card.dataset.theme = th.id;

    const strip = document.createElement('div');
    strip.className = 'theme-preview-strip';

    const c1 = document.createElement('div');
    c1.className = 'theme-preview-color';
    c1.style.backgroundColor = th.accent;

    const c2 = document.createElement('div');
    c2.className = 'theme-preview-color';
    c2.style.backgroundColor = th.accentCyan;

    strip.appendChild(c1);
    strip.appendChild(c2);

    const name = document.createElement('span');
    name.className = 'theme-name';
    name.textContent = th.name;

    card.appendChild(strip);
    card.appendChild(name);

    card.addEventListener('click', async () => {
      appState.preferences.theme = th.id;
      syncThemeAndAtmosphere();
      await storage.save(appState);
      renderThemeSettings();

      if (th.id === 'atmosphere' && !appState.weather.city) {
        showToast('Live Atmosphere active! Add your city in Weather tab to reflect local skies.');
      } else {
        showToast(`Applied ${th.name} theme`);
      }
    });

    dom.themeCardsList.appendChild(card);
  });

  if (!dom.bgPresetsList) return;
  dom.bgPresetsList.innerHTML = '';

  Object.entries(BACKGROUND_PRESETS).forEach(([key, preset]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `bg-preset-option ${key === appState.preferences.backgroundPreset ? 'active' : ''}`;
    btn.style.background = preset.css;
    btn.textContent = preset.name;
    btn.addEventListener('click', async () => {
      appState.preferences.backgroundPreset = key;
      appState.preferences.customBackground = '';
      if (dom.prefCustomBg) dom.prefCustomBg.value = '';

      applyTheme({
        themeId: appState.preferences.theme,
        bgPreset: key,
        customBg: ''
      });
      await storage.save(appState);
      renderThemeSettings();
      showToast(`Background: ${preset.name}`);
    });
    dom.bgPresetsList.appendChild(btn);
  });
}

// ==========================================
// WIDGET CONFIGURATION & REORDERING
// ==========================================
function renderWidgetSettings() {
  if (!dom.widgetConfigList) return;
  dom.widgetConfigList.innerHTML = '';

  const sorted = [...appState.widgets].sort((a, b) => a.order - b.order);

  sorted.forEach((w, idx) => {
    const reg = WIDGET_REGISTRY.find(r => r.id === w.id);
    if (!reg) return;

    const item = document.createElement('div');
    item.className = 'widget-config-item';

    const left = document.createElement('div');
    left.className = 'widget-config-left';

    const name = document.createElement('span');
    name.className = 'widget-config-name';
    name.textContent = reg.name;

    const desc = document.createElement('span');
    desc.className = 'widget-config-desc';
    desc.textContent = reg.description;

    left.appendChild(name);
    left.appendChild(desc);

    const right = document.createElement('div');
    right.className = 'widget-config-right';

    const reorderWrap = document.createElement('div');
    reorderWrap.className = 'widget-reorder-btns';

    const upBtn = document.createElement('button');
    upBtn.className = 'widget-reorder-btn';
    upBtn.innerHTML = '↑';
    upBtn.title = 'Move up';
    upBtn.disabled = idx === 0;
    upBtn.addEventListener('click', async () => {
      appState.widgets = reorderWidget(appState.widgets, w.id, 'up');
      await storage.save(appState);
      renderWidgetSettings();
      syncWidgetVisibilityToDOM(appState.widgets);
    });

    const downBtn = document.createElement('button');
    downBtn.className = 'widget-reorder-btn';
    downBtn.innerHTML = '↓';
    downBtn.title = 'Move down';
    downBtn.disabled = idx === sorted.length - 1;
    downBtn.addEventListener('click', async () => {
      appState.widgets = reorderWidget(appState.widgets, w.id, 'down');
      await storage.save(appState);
      renderWidgetSettings();
      syncWidgetVisibilityToDOM(appState.widgets);
    });

    reorderWrap.appendChild(upBtn);
    reorderWrap.appendChild(downBtn);

    const switchLabel = document.createElement('label');
    switchLabel.className = 'switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = w.enabled;
    input.addEventListener('change', async () => {
      appState.widgets = toggleWidget(appState.widgets, w.id, input.checked);
      if (w.id === 'weather') {
        appState.weather.enabled = input.checked;
        if (dom.weatherEnabledToggle) dom.weatherEnabledToggle.checked = input.checked;
        updateWeatherUI();
      }
      await storage.save(appState);
      syncWidgetVisibilityToDOM(appState.widgets);
    });

    const slider = document.createElement('span');
    slider.className = 'slider';

    switchLabel.appendChild(input);
    switchLabel.appendChild(slider);

    right.appendChild(reorderWrap);
    right.appendChild(switchLabel);

    item.appendChild(left);
    item.appendChild(right);
    dom.widgetConfigList.appendChild(item);
  });
}

// ==========================================
// SETTINGS MODAL & TABS
// ==========================================
function openSettingsToTab(tabId) {
  if (!dom.settingsModal) return;

  dom.settingsTabBtns.forEach(btn => {
    const isTarget = btn.dataset.tab === tabId;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });

  dom.settingsPanels.forEach(panel => {
    const isTarget = panel.id === tabId;
    panel.classList.toggle('active', isTarget);
    panel.hidden = !isTarget;
  });

  populateSettingsFields();
  dom.settingsModal.showModal();
}

function populateSettingsFields() {
  if (dom.prefUserName) dom.prefUserName.value = appState.preferences.userName || '';
  if (dom.prefTimeFormat) dom.prefTimeFormat.value = appState.preferences.timeFormat || '12h';
  if (dom.prefShowSeconds) dom.prefShowSeconds.checked = Boolean(appState.preferences.showSeconds);
  if (dom.prefSearchEngine) dom.prefSearchEngine.value = appState.preferences.searchEngine || 'google';
  if (dom.prefOpenInNewTab) dom.prefOpenInNewTab.checked = Boolean(appState.preferences.openInNewTab);
  if (dom.prefCustomBg) dom.prefCustomBg.value = appState.preferences.customBackground || '';

  if (dom.weatherEnabledToggle) dom.weatherEnabledToggle.checked = Boolean(appState.weather.enabled);
  if (dom.weatherCityInput) dom.weatherCityInput.value = appState.weather.city || '';
  if (dom.weatherUnitSelect) dom.weatherUnitSelect.value = appState.weather.unit || 'c';

  renderTemplatesGallery();
  renderThemeSettings();
  renderWidgetSettings();
}

function initSettings() {
  if (dom.openSettingsBtn) {
    dom.openSettingsBtn.addEventListener('click', () => openSettingsToTab('tab-templates'));
  }

  if (dom.closeSettingsModalBtn) {
    dom.closeSettingsModalBtn.addEventListener('click', () => dom.settingsModal.close());
  }

  dom.settingsTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      openSettingsToTab(tabId);
    });
  });

  // General tab change listeners
  if (dom.prefUserName) {
    dom.prefUserName.addEventListener('input', async (e) => {
      appState.preferences.userName = e.target.value.trim();
      await storage.save(appState);
      updateClock();
    });
  }

  if (dom.prefTimeFormat) {
    dom.prefTimeFormat.addEventListener('change', async (e) => {
      appState.preferences.timeFormat = e.target.value;
      await storage.save(appState);
      updateClock();
      updateWorldClock();
    });
  }

  if (dom.prefShowSeconds) {
    dom.prefShowSeconds.addEventListener('change', async (e) => {
      appState.preferences.showSeconds = e.target.checked;
      await storage.save(appState);
      updateClock();
    });
  }

  if (dom.prefSearchEngine) {
    dom.prefSearchEngine.addEventListener('change', async (e) => {
      appState.preferences.searchEngine = e.target.value;
      await storage.save(appState);
      updateSearchPlaceholder();
    });
  }

  if (dom.prefOpenInNewTab) {
    dom.prefOpenInNewTab.addEventListener('change', async (e) => {
      appState.preferences.openInNewTab = e.target.checked;
      await storage.save(appState);
      renderShortcuts();
    });
  }

  if (dom.prefCustomBg) {
    dom.prefCustomBg.addEventListener('change', async (e) => {
      const val = e.target.value.trim();
      appState.preferences.customBackground = val;
      applyTheme({
        themeId: appState.preferences.theme,
        bgPreset: appState.preferences.backgroundPreset,
        customBg: val
      });
      await storage.save(appState);
    });
  }

  // Weather tab listeners
  if (dom.weatherEnabledToggle) {
    dom.weatherEnabledToggle.addEventListener('change', async (e) => {
      appState.weather.enabled = e.target.checked;
      appState.widgets = toggleWidget(appState.widgets, 'weather', e.target.checked);
      await storage.save(appState);
      syncWidgetVisibilityToDOM(appState.widgets);
      updateWeatherUI();
    });
  }

  if (dom.weatherUnitSelect) {
    dom.weatherUnitSelect.addEventListener('change', async (e) => {
      appState.weather.unit = e.target.value;
      appState.weather.lastFetched = 0;
      await storage.save(appState);
      updateWeatherUI();
    });
  }

  if (dom.searchCityBtn) {
    dom.searchCityBtn.addEventListener('click', async () => {
      const city = (dom.weatherCityInput?.value || '').trim();
      if (!city) return;

      if (dom.weatherLookupStatus) dom.weatherLookupStatus.textContent = 'Searching city...';

      try {
        const geo = await geocodeCity(city);
        if (geo) {
          appState.weather.city = `${geo.name}, ${geo.country}`;
          appState.weather.latitude = geo.latitude;
          appState.weather.longitude = geo.longitude;
          appState.weather.lastFetched = 0;

          if (dom.weatherLookupStatus) {
            dom.weatherLookupStatus.textContent = `Found: ${geo.name}, ${geo.country}`;
          }
          await storage.save(appState);
          updateWeatherUI();
          showToast(`Location set to ${geo.name}`);
        } else {
          if (dom.weatherLookupStatus) {
            dom.weatherLookupStatus.textContent = 'City not found. Try a different spelling.';
          }
        }
      } catch (err) {
        if (dom.weatherLookupStatus) {
          dom.weatherLookupStatus.textContent = 'Network error while searching city.';
        }
      }
    });
  }

  // Data management: Export JSON
  if (dom.exportDataBtn) {
    dom.exportDataBtn.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `newtab-pro-backup-${getDateKey()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Export downloaded');
    });
  }

  // Data management: Import JSON
  if (dom.importDataInput) {
    dom.importDataInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          appState = migrateState(parsed);
          await storage.save(appState);
          syncAllUI();
          showToast('Configuration imported successfully');
          dom.settingsModal.close();
        } catch {
          showToast('Invalid backup file. Please select a valid JSON configuration.');
        }
      };
      reader.readAsText(file);
    });
  }

  // Data management: Reset
  if (dom.resetDefaultsBtn) {
    dom.resetDefaultsBtn.addEventListener('click', async () => {
      const confirmed = window.confirm('Are you sure you want to reset NewTab Pro to factory defaults? All custom shortcuts, tasks, and notes will be cleared.');
      if (confirmed) {
        appState = await storage.reset();
        syncAllUI();
        showToast('Reset to factory defaults');
        dom.settingsModal.close();
      }
    });
  }
}

// ==========================================
// GLOBAL SHORTCUTS & EVENT LISTENERS
// ==========================================
function initGlobalShortcuts() {
  window.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

    if (e.key === '/' && !isTyping) {
      e.preventDefault();
      dom.searchInput?.focus();
    }

    if (e.key === ',' && !isTyping && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      openSettingsToTab('tab-templates');
    }

    if (e.key === 'Escape') {
      if (dom.shortcutModal && dom.shortcutModal.open) dom.shortcutModal.close();
      if (dom.habitModal && dom.habitModal.open) dom.habitModal.close();
      if (dom.settingsModal && dom.settingsModal.open) dom.settingsModal.close();
    }
  });
}

// ==========================================
// MASTER INITIALIZATION & ATMOSPHERE
// ==========================================
function syncThemeAndAtmosphere() {
  if (appState.preferences.theme === 'atmosphere') {
    const cached = appState.weather?.cachedData;
    if (cached && typeof cached.weatherCode === 'number') {
      applyWeatherAtmosphereToDOM({
        weatherCode: cached.weatherCode,
        isDay: cached.isDay !== undefined ? cached.isDay : true,
        container: dom.dashboardBackground,
        overlay: dom.weatherAtmosphereOverlay
      });
      document.documentElement.setAttribute('data-theme', 'atmosphere');
    } else {
      applyTheme({
        themeId: 'atmosphere',
        bgPreset: 'live-weather',
        customBg: ''
      });
      if (dom.weatherAtmosphereOverlay) {
        dom.weatherAtmosphereOverlay.className = 'weather-atmosphere-layer fx-sunbeam';
      }
    }
  } else {
    if (dom.weatherAtmosphereOverlay) {
      dom.weatherAtmosphereOverlay.className = 'weather-atmosphere-layer';
    }
    applyTheme({
      themeId: appState.preferences.theme,
      bgPreset: appState.preferences.backgroundPreset,
      customBg: appState.preferences.customBackground
    });
  }
}

function syncAllUI() {
  syncThemeAndAtmosphere();
  syncWidgetVisibilityToDOM(appState.widgets);
  updateClock();
  updateSearchPlaceholder();
  renderQuote();
  renderShortcuts();
  renderTasks();
  renderHabits();
  updateWorldClock();
  initScratchpad();
  updateWeatherUI();
}

async function init() {
  try {
    appState = await storage.load();

    storage.subscribe((newState) => {
      appState = newState;
      syncAllUI();
    });

    syncAllUI();
    initClock();
    initSearch();
    initQuotes();
    initQuickTools();
    initShortcuts();
    initTasks();
    initHabits();
    initFocusTimer();
    initCalculator();
    initWorldClock();
    initWeather();
    initTemplates();
    initSettings();
    initGlobalShortcuts();
  } catch (err) {
    console.warn('[NewTabPro Init Error]:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
