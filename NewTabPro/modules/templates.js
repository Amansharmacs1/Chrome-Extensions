/**
 * NewTab Pro - Workspace Templates Engine
 * Pre-configured dashboard setups tailored for specific workflows:
 * Minimalist Focus, Developer Hub, Student Study Hall, Habit & Productivity, and Executive.
 */

export const DASHBOARD_TEMPLATES = {
  default: {
    id: 'default',
    name: 'Balanced Flow (Default)',
    tagline: 'The classic balanced experience for general browsing.',
    theme: 'midnight',
    backgroundPreset: 'mesh-midnight',
    widgets: {
      clock: true,
      search: true,
      shortcuts: true,
      tasks: true,
      progress: true,
      scratchpad: true,
      weather: false,
      focusTimer: false,
      quote: true,
      habits: false,
      worldClock: false,
      calculator: false,
      quickTools: true
    }
  },
  minimalist: {
    id: 'minimalist',
    name: 'Zen Minimalist',
    tagline: 'Pure focus. Distraction-free clock, search, and a quiet focus timer.',
    theme: 'minimal',
    backgroundPreset: 'pure-dark',
    widgets: {
      clock: true,
      search: true,
      shortcuts: false,
      tasks: false,
      progress: false,
      scratchpad: false,
      weather: false,
      focusTimer: true,
      quote: true,
      habits: false,
      worldClock: false,
      calculator: false,
      quickTools: false
    }
  },
  developer: {
    id: 'developer',
    name: 'Developer Workstation',
    tagline: 'Engineered for coders with quick terminal tools, notes, tasks & search.',
    theme: 'aurora',
    backgroundPreset: 'mesh-midnight',
    widgets: {
      clock: true,
      search: true,
      shortcuts: true,
      tasks: true,
      progress: true,
      scratchpad: true,
      weather: false,
      focusTimer: true,
      quote: false,
      habits: false,
      worldClock: true,
      calculator: true,
      quickTools: true
    },
    shortcuts: [
      { title: 'GitHub', url: 'https://github.com', color: '#24292F' },
      { title: 'Stack Overflow', url: 'https://stackoverflow.com', color: '#F48024' },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', color: '#000000' },
      { title: 'ChatGPT', url: 'https://chatgpt.com', color: '#10A37F' },
      { title: 'Hacker News', url: 'https://news.ycombinator.com', color: '#FF6600' },
      { title: 'Dev.to', url: 'https://dev.to', color: '#0A0A0A' }
    ]
  },
  student: {
    id: 'student',
    name: 'Student Study Hall',
    tagline: 'Designed for research, exam prep, Pomodoro focus sessions, and calculations.',
    theme: 'light',
    backgroundPreset: 'light-clean',
    widgets: {
      clock: true,
      search: true,
      shortcuts: true,
      tasks: true,
      progress: true,
      scratchpad: true,
      weather: false,
      focusTimer: true,
      quote: true,
      habits: true,
      worldClock: false,
      calculator: true,
      quickTools: false
    },
    shortcuts: [
      { title: 'Google Scholar', url: 'https://scholar.google.com', color: '#4285F4' },
      { title: 'Wikipedia', url: 'https://wikipedia.org', color: '#006699' },
      { title: 'Google Docs', url: 'https://docs.google.com', color: '#4285F4' },
      { title: 'Quizlet', url: 'https://quizlet.com', color: '#4257B2' },
      { title: 'Canvas', url: 'https://canvas.instructure.com', color: '#E02424' },
      { title: 'Notion', url: 'https://notion.so', color: '#000000' }
    ]
  },
  habits: {
    id: 'habits',
    name: 'Habit & Goal Master',
    tagline: 'Prioritizes daily self-improvement, habit streaks, and task completion.',
    theme: 'ocean',
    backgroundPreset: 'deep-space',
    widgets: {
      clock: true,
      search: true,
      shortcuts: true,
      tasks: true,
      progress: true,
      scratchpad: false,
      weather: true,
      focusTimer: false,
      quote: true,
      habits: true,
      worldClock: false,
      calculator: false,
      quickTools: true
    }
  },
  executive: {
    id: 'executive',
    name: 'Global Executive',
    tagline: 'World timezones, weather briefing, agenda checklist, and clean links.',
    theme: 'midnight',
    backgroundPreset: 'sunset-glow',
    widgets: {
      clock: true,
      search: true,
      shortcuts: true,
      tasks: true,
      progress: false,
      scratchpad: true,
      weather: true,
      focusTimer: false,
      quote: false,
      habits: false,
      worldClock: true,
      calculator: true,
      quickTools: true
    }
  },
  atmosphere: {
    id: 'atmosphere',
    name: 'Live Weather Atmosphere',
    tagline: 'Real background dynamically reflecting the live weather of your location.',
    theme: 'atmosphere',
    backgroundPreset: 'live-weather',
    widgets: {
      clock: true,
      search: true,
      shortcuts: true,
      tasks: true,
      progress: true,
      scratchpad: false,
      weather: true,
      focusTimer: false,
      quote: true,
      habits: false,
      worldClock: false,
      calculator: false,
      quickTools: true
    }
  }
};

/**
 * Applies a chosen template configuration to dashboard state
 * @param {Object} state
 * @param {string} templateId
 * @param {boolean} [replaceShortcuts=false]
 * @returns {Object}
 */
export function applyTemplateToState(state, templateId, replaceShortcuts = false) {
  const tpl = DASHBOARD_TEMPLATES[templateId] || DASHBOARD_TEMPLATES.default;
  const next = JSON.parse(JSON.stringify(state));

  // 1. Theme and Background
  next.preferences.theme = tpl.theme;
  next.preferences.backgroundPreset = tpl.backgroundPreset;
  next.preferences.customBackground = '';

  // 2. Widget visibility
  next.widgets = next.widgets.map(w => {
    const isExplicit = tpl.widgets[w.id];
    return {
      ...w,
      enabled: isExplicit !== undefined ? Boolean(isExplicit) : w.enabled
    };
  });

  // Weather widget sync
  if (tpl.widgets.weather !== undefined) {
    next.weather.enabled = Boolean(tpl.widgets.weather);
  }

  // 3. Optional shortcuts override if requested
  if (replaceShortcuts && Array.isArray(tpl.shortcuts) && tpl.shortcuts.length > 0) {
    next.shortcuts = tpl.shortcuts.map((sc, i) => ({
      id: `sc-tpl-${Date.now()}-${i}`,
      title: sc.title,
      url: sc.url,
      color: sc.color || '#3B82F6',
      sortOrder: i,
      createdAt: Date.now()
    }));
  }

  return next;
}
