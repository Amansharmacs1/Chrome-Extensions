/**
 * NewTab Pro - Theme & Appearance Unit Tests
 */

import { THEMES, BACKGROUND_PRESETS } from '../modules/themes.js';

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}`);
    failed++;
  }
}

console.log('\n--- Running Theme & Background Tests ---');

// 1. Theme Registry
const requiredThemes = ['midnight', 'ocean', 'aurora', 'light', 'minimal'];
for (const themeId of requiredThemes) {
  const theme = THEMES[themeId];
  assert(Boolean(theme), `Theme "${themeId}" exists in registry`);
  assert(typeof theme.name === 'string', `Theme "${themeId}" has valid name`);
  assert(typeof theme.accent === 'string', `Theme "${themeId}" has accent color`);
  assert(['dark', 'light'].includes(theme.mode), `Theme "${themeId}" has valid mode`);
}

// 2. Background Presets
const presets = ['mesh-midnight', 'deep-space', 'sunset-glow', 'clean-slate', 'pure-dark', 'light-clean'];
for (const presetKey of presets) {
  const bg = BACKGROUND_PRESETS[presetKey];
  assert(Boolean(bg), `Background preset "${presetKey}" exists`);
  assert(typeof bg.css === 'string' && bg.css.length > 0, `Preset "${presetKey}" has CSS definition`);
}

console.log(`Theme Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
