/**
 * ReadEase - Settings & Typography Engine
 * Theme tokens, font configurations, spacing presets, and DOM style applicator.
 */

import { getLocalStorage, setLocalStorage } from './storage.js';

export const STORAGE_KEY_SETTINGS = 'readease_settings';

export const THEMES = {
  paper: {
    id: 'paper',
    name: 'Warm Paper',
    description: 'Natural soothing cream paper for long reading sessions',
    bg: '#FAF6ED',
    surface: '#F4ECE0',
    text: '#2C2825',
    textSecondary: '#6B625B',
    accent: '#0284C7',
    border: '#E8DDCF'
  },
  light: {
    id: 'light',
    name: 'Clean Light',
    description: 'Crisp, contemporary white with charcoal typography',
    bg: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#0F172A',
    textSecondary: '#475569',
    accent: '#2563EB',
    border: '#E2E8F0'
  },
  sepia: {
    id: 'sepia',
    name: 'Classic Sepia',
    description: 'Vintage amber tone reminiscent of classic printed books',
    bg: '#F5EBDC',
    surface: '#EDE0CC',
    text: '#3D2F1D',
    textSecondary: '#786248',
    accent: '#B45309',
    border: '#DECEB5'
  },
  dark: {
    id: 'dark',
    name: 'Midnight Dark',
    description: 'Gentle charcoal slate for night reading without eye strain',
    bg: '#121824',
    surface: '#1A2234',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    accent: '#38BDF8',
    border: '#2E3A52'
  },
  contrast: {
    id: 'contrast',
    name: 'OLED Black',
    description: 'Pure high-contrast black and white for maximum clarity',
    bg: '#000000',
    surface: '#121212',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    accent: '#38BDF8',
    border: '#2E2E2E'
  }
};

export const FONT_FAMILIES = {
  serif: {
    id: 'serif',
    name: 'Literary Serif',
    css: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif'
  },
  sans: {
    id: 'sans',
    name: 'System Sans',
    css: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  georgia: {
    id: 'georgia',
    name: 'Classic Georgia',
    css: 'Georgia, "Times New Roman", serif'
  },
  mono: {
    id: 'mono',
    name: 'Technical Mono',
    css: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'
  }
};

export const CONTENT_WIDTHS = {
  narrow: { id: 'narrow', name: 'Narrow', maxWidth: '620px' },
  comfortable: { id: 'comfortable', name: 'Comfortable', maxWidth: '750px' },
  wide: { id: 'wide', name: 'Wide', maxWidth: '920px' }
};

export const LINE_SPACINGS = {
  compact: { id: 'compact', name: 'Compact', value: '1.5' },
  normal: { id: 'normal', name: 'Normal', value: '1.78' },
  spacious: { id: 'spacious', name: 'Spacious', value: '2.08' }
};

export const DEFAULT_SETTINGS = {
  theme: 'paper',
  fontFamily: 'serif',
  fontSize: 18, // px
  lineSpacing: 'normal',
  paragraphSpacing: 'normal',
  contentWidth: 'comfortable',
  textAlign: 'left', // 'left' | 'justify'
  readingSpeedWpm: 225,
  focusMode: false,
  autoResume: true
};

/**
 * Returns a cloned copy of default settings
 * @returns {Object}
 */
export function getDefaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

/**
 * Loads user settings from storage with defaults fallback
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  const stored = await getLocalStorage(STORAGE_KEY_SETTINGS);
  if (!stored || typeof stored !== 'object') {
    return getDefaultSettings();
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

/**
 * Updates settings and saves to storage
 * @param {Object} partialSettings
 * @returns {Promise<Object>}
 */
export async function saveSettings(partialSettings = {}) {
  const current = await getSettings();
  const updated = { ...current, ...partialSettings };

  // Validate bounds
  if (updated.fontSize) {
    updated.fontSize = Math.max(14, Math.min(28, Number(updated.fontSize) || 18));
  }
  if (updated.readingSpeedWpm) {
    updated.readingSpeedWpm = Math.max(120, Math.min(450, Number(updated.readingSpeedWpm) || 225));
  }
  if (!THEMES[updated.theme]) {
    updated.theme = 'paper';
  }
  if (!FONT_FAMILIES[updated.fontFamily]) {
    updated.fontFamily = 'serif';
  }
  if (!CONTENT_WIDTHS[updated.contentWidth]) {
    updated.contentWidth = 'comfortable';
  }
  if (!LINE_SPACINGS[updated.lineSpacing]) {
    updated.lineSpacing = 'normal';
  }

  await setLocalStorage(STORAGE_KEY_SETTINGS, updated);
  return updated;
}

/**
 * Applies reader settings to the target DOM document/container
 * @param {Object} settings
 * @param {HTMLElement} [rootElement] defaults to document.documentElement
 */
export function applySettingsToDOM(settings, rootElement) {
  if (!rootElement && typeof document === 'undefined') return;
  const root = rootElement || document.documentElement;
  const safe = { ...DEFAULT_SETTINGS, ...settings };

  // Theme attribute
  root.setAttribute('data-theme', safe.theme);

  // CSS Custom Properties
  const fontObj = FONT_FAMILIES[safe.fontFamily] || FONT_FAMILIES.serif;
  const widthObj = CONTENT_WIDTHS[safe.contentWidth] || CONTENT_WIDTHS.comfortable;
  const lineObj = LINE_SPACINGS[safe.lineSpacing] || LINE_SPACINGS.normal;

  root.style.setProperty('--reader-font-family', fontObj.css);
  root.style.setProperty('--reader-font-size', `${safe.fontSize}px`);
  root.style.setProperty('--reader-max-width', widthObj.maxWidth);
  root.style.setProperty('--reader-line-height', lineObj.value);
  root.style.setProperty('--reader-text-align', safe.textAlign);
  root.style.setProperty(
    '--reader-paragraph-margin',
    safe.paragraphSpacing === 'relaxed' ? '1.8em' : '1.2em'
  );

  // Focus mode
  if (safe.focusMode) {
    root.classList.add('focus-reading-mode');
  } else {
    root.classList.remove('focus-reading-mode');
  }
}
