/**
 * ColorPeek - Palette & State Manager
 * Coordinates palettes, recent color history, user preferences, and active color selection.
 */

import { getStorage, setStorage } from './storage.js';
import { parseColor } from './color-converter.js';

export const STORAGE_KEY_PALETTES = 'colorpeek_palettes';
export const STORAGE_KEY_RECENT = 'colorpeek_recent_colors';
export const STORAGE_KEY_SETTINGS = 'colorpeek_settings';
export const STORAGE_KEY_ACTIVE = 'colorpeek_active_color';

export const MAX_RECENT_COLORS = 24;

/**
 * Default starter palettes for new installations
 */
export const DEFAULT_PALETTES = [
  {
    id: 'pal-tailwind',
    name: 'Tailwind Accents',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
    colors: [
      { id: 'c-1', hex: '#3B82F6', name: 'Blue 500', note: 'Primary brand accent', addedAt: Date.now() },
      { id: 'c-2', hex: '#06B6D4', name: 'Cyan 500', note: 'Secondary highlight', addedAt: Date.now() },
      { id: 'c-3', hex: '#10B981', name: 'Emerald 500', note: 'Success status', addedAt: Date.now() },
      { id: 'c-4', hex: '#F59E0B', name: 'Amber 500', note: 'Warning indicator', addedAt: Date.now() },
      { id: 'c-5', hex: '#EF4444', name: 'Red 500', note: 'Critical alert', addedAt: Date.now() },
      { id: 'c-6', hex: '#8B5CF6', name: 'Violet 500', note: 'Creative focus', addedAt: Date.now() }
    ]
  },
  {
    id: 'pal-darkui',
    name: 'Cyberpunk Dark UI',
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 7200000,
    colors: [
      { id: 'c-7', hex: '#0F172A', name: 'Slate 900', note: 'Deep canvas base', addedAt: Date.now() },
      { id: 'c-8', hex: '#1E293B', name: 'Slate 800', note: 'Card surface', addedAt: Date.now() },
      { id: 'c-9', hex: '#38BDF8', name: 'Sky 400', note: 'Neon sky', addedAt: Date.now() },
      { id: 'c-10', hex: '#EC4899', name: 'Pink 500', note: 'Synthwave pink', addedAt: Date.now() },
      { id: 'c-11', hex: '#F43F5E', name: 'Rose 500', note: 'Neon pulse', addedAt: Date.now() }
    ]
  }
];

export const DEFAULT_SETTINGS = {
  preferredFormat: 'hex', // 'hex' | 'rgb' | 'hsl' | 'css-var'
  autoCopyOnPick: false,
  uppercaseHex: true,
  theme: 'dark'
};

export const DEFAULT_ACTIVE_COLOR = '#3B82F6';

/**
 * Gets all saved palettes with default fallback
 * @returns {Promise<Array<Object>>}
 */
export async function getPalettes() {
  const stored = await getStorage(STORAGE_KEY_PALETTES);
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }
  // Initialize with defaults if empty
  await setStorage(STORAGE_KEY_PALETTES, DEFAULT_PALETTES);
  return JSON.parse(JSON.stringify(DEFAULT_PALETTES));
}

/**
 * Saves palettes array to storage
 * @param {Array<Object>} palettes
 * @returns {Promise<void>}
 */
export async function savePalettes(palettes) {
  const safeList = Array.isArray(palettes) ? palettes : [];
  await setStorage(STORAGE_KEY_PALETTES, safeList);
}

/**
 * Gets a specific palette by ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getPaletteById(id) {
  const palettes = await getPalettes();
  return palettes.find(p => p.id === id) || null;
}

/**
 * Creates a new empty or pre-populated palette
 * @param {string} name
 * @param {Array<Object>} [colors=[]]
 * @returns {Promise<Object>}
 */
export async function createPalette(name, colors = []) {
  const palettes = await getPalettes();
  const trimmedName = (name || '').trim() || `Palette ${palettes.length + 1}`;

  const newPalette = {
    id: `pal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: trimmedName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    colors: Array.isArray(colors) ? colors : []
  };

  palettes.unshift(newPalette);
  await savePalettes(palettes);
  return newPalette;
}

/**
 * Renames an existing palette
 * @param {string} id
 * @param {string} newName
 * @returns {Promise<boolean>}
 */
export async function renamePalette(id, newName) {
  const palettes = await getPalettes();
  const target = palettes.find(p => p.id === id);
  if (!target) return false;

  target.name = (newName || '').trim() || target.name;
  target.updatedAt = Date.now();
  await savePalettes(palettes);
  return true;
}

/**
 * Deletes a palette by ID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deletePalette(id) {
  const palettes = await getPalettes();
  const filtered = palettes.filter(p => p.id !== id);
  if (filtered.length === palettes.length) return false;

  await savePalettes(filtered);
  return true;
}

/**
 * Adds a color to a palette
 * @param {string} paletteId
 * @param {Object} colorData - { hex, name, note }
 * @returns {Promise<Object|null>}
 */
export async function addColorToPalette(paletteId, colorData) {
  if (!colorData || !colorData.hex) return null;
  const parsed = parseColor(colorData.hex);
  if (!parsed) return null;

  const palettes = await getPalettes();
  const target = palettes.find(p => p.id === paletteId);
  if (!target) return null;

  const newEntry = {
    id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    hex: parsed.hex,
    name: (colorData.name || '').trim() || `Color ${target.colors.length + 1}`,
    note: (colorData.note || '').trim(),
    addedAt: Date.now()
  };

  target.colors.push(newEntry);
  target.updatedAt = Date.now();
  await savePalettes(palettes);
  return newEntry;
}

/**
 * Removes a color from a palette
 * @param {string} paletteId
 * @param {string} colorId
 * @returns {Promise<boolean>}
 */
export async function removeColorFromPalette(paletteId, colorId) {
  const palettes = await getPalettes();
  const target = palettes.find(p => p.id === paletteId);
  if (!target) return false;

  const prevLen = target.colors.length;
  target.colors = target.colors.filter(c => c.id !== colorId);
  if (target.colors.length === prevLen) return false;

  target.updatedAt = Date.now();
  await savePalettes(palettes);
  return true;
}

/**
 * Reorders a color in a palette
 * @param {string} paletteId
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {Promise<boolean>}
 */
export async function reorderPaletteColors(paletteId, fromIndex, toIndex) {
  const palettes = await getPalettes();
  const target = palettes.find(p => p.id === paletteId);
  if (!target) return false;

  const colors = target.colors;
  if (fromIndex < 0 || fromIndex >= colors.length || toIndex < 0 || toIndex >= colors.length) {
    return false;
  }

  const [moved] = colors.splice(fromIndex, 1);
  colors.splice(toIndex, 0, moved);
  target.updatedAt = Date.now();
  await savePalettes(palettes);
  return true;
}

/**
 * Gets recent colors history
 * @returns {Promise<Array<Object>>}
 */
export async function getRecentColors() {
  const stored = await getStorage(STORAGE_KEY_RECENT);
  return Array.isArray(stored) ? stored : [];
}

/**
 * Adds a color to recent history with deduplication
 * @param {string|Object} colorInput
 * @param {'eyedropper'|'inspector'|'manual'|'palette'} [source='manual']
 * @returns {Promise<Array<Object>>}
 */
export async function addRecentColor(colorInput, source = 'manual') {
  const parsed = parseColor(colorInput);
  if (!parsed) return await getRecentColors();

  const recents = await getRecentColors();
  const hex = parsed.hex;

  // Deduplication: remove existing entry with same HEX if present
  const filtered = recents.filter(item => item.hex.toUpperCase() !== hex.toUpperCase());

  const newEntry = {
    id: `rec-${Date.now()}`,
    hex,
    rgb: parsed.rgb,
    hsl: parsed.hsl,
    source,
    pickedAt: Date.now()
  };

  filtered.unshift(newEntry);
  const capped = filtered.slice(0, MAX_RECENT_COLORS);
  await setStorage(STORAGE_KEY_RECENT, capped);
  return capped;
}

/**
 * Clears recent colors history
 * @returns {Promise<void>}
 */
export async function clearRecentColors() {
  await setStorage(STORAGE_KEY_RECENT, []);
}

/**
 * Gets active selected color
 * @returns {Promise<string>} HEX string
 */
export async function getActiveColor() {
  const stored = await getStorage(STORAGE_KEY_ACTIVE);
  if (stored && parseColor(stored)) {
    return stored;
  }
  return DEFAULT_ACTIVE_COLOR;
}

/**
 * Sets active selected color
 * @param {string|Object} color
 * @returns {Promise<string>}
 */
export async function setActiveColor(color) {
  const parsed = parseColor(color);
  const hex = parsed ? parsed.hex : DEFAULT_ACTIVE_COLOR;
  await setStorage(STORAGE_KEY_ACTIVE, hex);
  return hex;
}

/**
 * Gets user preferences
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  const stored = await getStorage(STORAGE_KEY_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(stored || {}) };
}

/**
 * Saves user preferences
 * @param {Object} partial
 * @returns {Promise<Object>}
 */
export async function saveSettings(partial = {}) {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await setStorage(STORAGE_KEY_SETTINGS, updated);
  return updated;
}
