/**
 * NewTab Pro - Customizable Widget Registry
 * Coordinates visibility, ordering, and layout rules for dashboard widgets.
 */

export const WIDGET_REGISTRY = [
  {
    id: 'clock',
    name: 'Clock & Greeting',
    description: 'Displays current time, date, and personalized greeting.',
    defaultEnabled: true,
    containerId: 'widget-clock',
    category: 'primary'
  },
  {
    id: 'search',
    name: 'Search Bar',
    description: 'Quick search bar with engine selection and direct URL navigation.',
    defaultEnabled: true,
    containerId: 'widget-search',
    category: 'primary'
  },
  {
    id: 'shortcuts',
    name: 'Quick Links',
    description: 'Grid of your favorite websites with custom colors and initials.',
    defaultEnabled: true,
    containerId: 'widget-shortcuts',
    category: 'primary'
  },
  {
    id: 'quickTools',
    name: 'Browser Launcher Tools',
    description: 'One-click launch buttons for Chrome downloads, bookmarks, history, and extensions.',
    defaultEnabled: true,
    containerId: 'widget-quickTools',
    category: 'primary'
  },
  {
    id: 'tasks',
    name: 'Task Manager',
    description: 'Daily to-do checklist with filtering and status tracking.',
    defaultEnabled: true,
    containerId: 'widget-tasks',
    category: 'secondary'
  },
  {
    id: 'progress',
    name: 'Daily Progress Ring',
    description: 'Visual circular completion ring for today\'s tasks.',
    defaultEnabled: true,
    containerId: 'widget-progress',
    category: 'secondary'
  },
  {
    id: 'habits',
    name: 'Habit Tracker & Streaks',
    description: 'Daily habit check-off with consecutive day streaks counter.',
    defaultEnabled: false,
    containerId: 'widget-habits',
    category: 'secondary'
  },
  {
    id: 'focusTimer',
    name: 'Focus Timer (Pomodoro)',
    description: '25-minute Pomodoro timer for deep work sessions and breaks.',
    defaultEnabled: false,
    containerId: 'widget-focusTimer',
    category: 'secondary'
  },
  {
    id: 'scratchpad',
    name: 'Quick Scratchpad',
    description: 'Temporary notepad for thoughts, snippets, and quick scratch text.',
    defaultEnabled: true,
    containerId: 'widget-scratchpad',
    category: 'secondary'
  },
  {
    id: 'calculator',
    name: 'Quick Calculator',
    description: 'Compact arithmetic calculator right in your new tab.',
    defaultEnabled: false,
    containerId: 'widget-calculator',
    category: 'secondary'
  },
  {
    id: 'worldClock',
    name: 'World Clock',
    description: 'Compare local times in major international timezones.',
    defaultEnabled: false,
    containerId: 'widget-worldClock',
    category: 'secondary'
  },
  {
    id: 'quote',
    name: 'Daily Quote & Inspiration',
    description: 'Curated quotes from thinkers, scientists, and creators.',
    defaultEnabled: true,
    containerId: 'widget-quote',
    category: 'utility'
  },
  {
    id: 'weather',
    name: 'Weather Conditions',
    description: 'Current temperature and weather conditions for your city.',
    defaultEnabled: false,
    containerId: 'widget-weather',
    category: 'utility'
  }
];

/**
 * Toggles a widget's enabled state
 * @param {Array} widgets
 * @param {string} widgetId
 * @param {boolean} [explicitState]
 * @returns {Array}
 */
export function toggleWidget(widgets, widgetId, explicitState = undefined) {
  return widgets.map(w => {
    if (w.id !== widgetId) return w;
    return {
      ...w,
      enabled: explicitState !== undefined ? Boolean(explicitState) : !w.enabled
    };
  });
}

/**
 * Reorders widget list by moving an item up or down
 * @param {Array} widgets
 * @param {string} widgetId
 * @param {'up'|'down'} direction
 * @returns {Array}
 */
export function reorderWidget(widgets, widgetId, direction) {
  const list = [...widgets].sort((a, b) => a.order - b.order);
  const index = list.findIndex(w => w.id === widgetId);
  if (index === -1) return list;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= list.length) return list;

  const [moved] = list.splice(index, 1);
  list.splice(targetIndex, 0, moved);

  return list.map((w, i) => ({ ...w, order: i }));
}

/**
 * Applies visibility of widgets to the DOM
 * @param {Array} widgets
 */
export function syncWidgetVisibilityToDOM(widgets) {
  if (typeof document === 'undefined') return;

  const widgetMap = new Map(widgets.map(w => [w.id, w.enabled]));

  for (const item of WIDGET_REGISTRY) {
    const el = document.getElementById(item.containerId);
    if (!el) continue;

    const isEnabled = widgetMap.has(item.id) ? widgetMap.get(item.id) : item.defaultEnabled;
    if (isEnabled) {
      el.classList.remove('widget-hidden');
    } else {
      el.classList.add('widget-hidden');
    }
  }
}
