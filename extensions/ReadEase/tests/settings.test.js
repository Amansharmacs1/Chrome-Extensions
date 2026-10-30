/**
 * ReadEase - Settings & Typography Unit Tests
 */

import {
  getDefaultSettings,
  getSettings,
  saveSettings,
  applySettingsToDOM,
  THEMES,
  FONT_FAMILIES,
  CONTENT_WIDTHS,
  LINE_SPACINGS
} from '../scripts/settings.js';
import { removeLocalStorage } from '../scripts/storage.js';

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

console.log('\n--- Running Settings & Typography Tests ---');

async function runTests() {
  await removeLocalStorage('readease_settings');

  // 1. Theme Registry
  const expectedThemes = ['paper', 'light', 'sepia', 'dark', 'contrast'];
  for (const tid of expectedThemes) {
    const theme = THEMES[tid];
    assert(Boolean(theme), `Theme "${tid}" exists in registry`);
    assert(typeof theme.name === 'string', `Theme "${tid}" has human name`);
    assert(Boolean(theme.bg), `Theme "${tid}" defines background color`);
    assert(Boolean(theme.text), `Theme "${tid}" defines text color`);
    assert(Boolean(theme.border), `Theme "${tid}" defines border color`);
  }

  // 2. Font Family Registry
  const expectedFonts = ['serif', 'sans', 'georgia', 'mono'];
  for (const fid of expectedFonts) {
    const font = FONT_FAMILIES[fid];
    assert(Boolean(font), `Font family "${fid}" exists`);
    assert(typeof font.css === 'string', `Font "${fid}" defines CSS font stack`);
  }

  // 3. Content Width & Line Spacing
  assert(Boolean(CONTENT_WIDTHS.narrow), 'Defines narrow content width');
  assert(Boolean(CONTENT_WIDTHS.comfortable), 'Defines comfortable content width');
  assert(Boolean(CONTENT_WIDTHS.wide), 'Defines wide content width');
  assert(Boolean(LINE_SPACINGS.compact), 'Defines compact line spacing');
  assert(Boolean(LINE_SPACINGS.normal), 'Defines normal line spacing');
  assert(Boolean(LINE_SPACINGS.spacious), 'Defines spacious line spacing');

  // 4. Default Settings
  const defaults = getDefaultSettings();
  assert(defaults.theme === 'paper', 'Default theme is Warm Paper');
  assert(defaults.fontFamily === 'serif', 'Default font family is Literary Serif');
  assert(defaults.fontSize === 18, 'Default font size is 18px');
  assert(defaults.lineSpacing === 'normal', 'Default line spacing is normal');
  assert(defaults.contentWidth === 'comfortable', 'Default content width is comfortable');
  assert(defaults.readingSpeedWpm === 225, 'Default reading speed is 225 WPM');

  // 5. Bounds Validation when saving settings
  const updated1 = await saveSettings({ fontSize: 99 });
  assert(updated1.fontSize === 28, 'Clamps upper font size to 28px');

  const updated2 = await saveSettings({ fontSize: 5 });
  assert(updated2.fontSize === 14, 'Clamps lower font size to 14px');

  const updated3 = await saveSettings({ readingSpeedWpm: 900 });
  assert(updated3.readingSpeedWpm === 450, 'Clamps upper WPM to 450');

  const updated4 = await saveSettings({ theme: 'nonexistent-theme' });
  assert(updated4.theme === 'paper', 'Falls back safely on unknown theme');

  // 6. DOM Application Mock
  const mockRoot = {
    attributes: {},
    style: {
      properties: {},
      setProperty(prop, val) {
        this.properties[prop] = val;
      }
    },
    classList: {
      classes: new Set(),
      add(cls) { this.classes.add(cls); },
      remove(cls) { this.classes.delete(cls); }
    },
    setAttribute(attr, val) {
      this.attributes[attr] = val;
    }
  };

  applySettingsToDOM({
    theme: 'sepia',
    fontFamily: 'sans',
    fontSize: 20,
    contentWidth: 'wide',
    lineSpacing: 'spacious',
    textAlign: 'justify',
    focusMode: true
  }, mockRoot);

  assert(mockRoot.attributes['data-theme'] === 'sepia', 'Applies data-theme="sepia" to root element');
  assert(mockRoot.style.properties['--reader-font-size'] === '20px', 'Sets --reader-font-size CSS property');
  assert(mockRoot.style.properties['--reader-max-width'] === '920px', 'Sets --reader-max-width for wide option');
  assert(mockRoot.style.properties['--reader-line-height'] === '2.08', 'Sets --reader-line-height for spacious');
  assert(mockRoot.style.properties['--reader-text-align'] === 'justify', 'Sets --reader-text-align to justify');
  assert(mockRoot.classList.classes.has('focus-reading-mode'), 'Applies focus-reading-mode class');

  console.log(`Settings Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
